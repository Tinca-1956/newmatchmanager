
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowRight, NotebookText, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, query, where, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import type { Match, Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function MatchReportsPage() {
  const { isSiteAdmin, isClubAdmin, loading: adminLoading } = useAdminAuth();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [matches, setMatches] = useState<Match[]>([]);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Effect to set the initial club for fetching matches
  useEffect(() => {
    if (adminLoading) return;

    if (isSiteAdmin) {
      const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
      const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setAllClubs(clubsData);
        if (!selectedClubId && userProfile?.primaryClubId && clubsData.some(c => c.id === userProfile.primaryClubId)) {
            setSelectedClubId(userProfile.primaryClubId);
        } else if (!selectedClubId && clubsData.length > 0) {
            setSelectedClubId(clubsData[0].id);
        }
      });
      return () => unsubscribe();
    } else if (userProfile?.primaryClubId) {
      // For Club Admins, fetch only their primary club for the name display
      const clubDocRef = doc(firestore, 'clubs', userProfile.primaryClubId);
      getDoc(clubDocRef).then(docSnap => {
        if(docSnap.exists()){
            setAllClubs([{ id: docSnap.id, ...docSnap.data() } as Club]);
        }
      });
      setSelectedClubId(userProfile.primaryClubId);
    }
  }, [isSiteAdmin, adminLoading, userProfile, selectedClubId]);

  // Fetch completed matches for the selected club
  useEffect(() => {
    if (!firestore || !selectedClubId) {
      setMatches([]);
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    const matchesQuery = query(
        collection(firestore, 'matches'), 
        where('clubId', '==', selectedClubId),
        where('status', '==', 'Completed')
    );
    
    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: (data.date as Timestamp).toDate(),
        } as Match;
      });
      matchesData.sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());
      setMatches(matchesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching completed matches: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch matches for the selected club.' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClubId, toast]);
  
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
        const term = searchTerm.toLowerCase();
        return !term || 
               match.seriesName.toLowerCase().includes(term) ||
               match.name.toLowerCase().includes(term);
    });
  }, [matches, searchTerm]);

  const handleGoToReview = (matchId: string) => {
    router.push(`/main/matches/${matchId}/review`);
  };
  
  if (adminLoading) {
    return <Skeleton className="w-full h-96" />;
  }

  if (!isSiteAdmin && !isClubAdmin) {
    return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
                You do not have permission to access this page.
            </AlertDescription>
        </Alert>
    );
  }

  const selectedClubName = allClubs.find(c => c.id === selectedClubId)?.name || 'Your Club';

  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Match Reports</h1>
                <p className="text-muted-foreground">Select a completed match to view or write a report.</p>
            </div>
        </div>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Completed Matches for {selectedClubName}</CardTitle>
                        <CardDescription>
                            Select a match to view or add a report.
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-4">
                        {isSiteAdmin && (
                             <div className="flex items-center gap-2">
                                <Label htmlFor="club-filter" className="text-nowrap">Club</Label>
                                <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={allClubs.length === 0}>
                                    <SelectTrigger id="club-filter" className="w-[180px]">
                                        <SelectValue placeholder="Select a club..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allClubs.map((club) => (
                                            <SelectItem key={club.id} value={club.id}>
                                                {club.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search reports..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Series</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-10 w-40" /></TableCell>
                            </TableRow>
                        ))
                    ) : filteredMatches.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No completed matches found for this club.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredMatches.map(match => (
                            <TableRow key={match.id}>
                                <TableCell>{format(match.date, 'PPP')}</TableCell>
                                <TableCell>{match.seriesName}</TableCell>
                                <TableCell className="font-medium">{match.name}</TableCell>
                                <TableCell>{match.location}</TableCell>
                                <TableCell className="text-right">
                                    <Button onClick={() => handleGoToReview(match.id)}>
                                        <NotebookText className="mr-2 h-4 w-4" />
                                        View / Edit Report
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
