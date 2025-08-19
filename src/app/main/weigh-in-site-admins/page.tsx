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
import { Scale, ArrowRight, Terminal, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, query, where, getDocs, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import type { Match, Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export default function WeighInSelectionPage() {
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [matches, setMatches] = useState<Match[]>([]);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);

  // Effect to fetch all clubs for Site Admin dropdown
  useEffect(() => {
    if (!isSiteAdmin || !firestore) {
        setIsLoading(false);
        return;
    }

    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setAllClubs(clubsData);
        if (!selectedClubId && userProfile?.primaryClubId && clubsData.some(c => c.id === userProfile.primaryClubId)) {
            setSelectedClubId(userProfile.primaryClubId);
        } else if (!selectedClubId && clubsData.length > 0) {
            setSelectedClubId(clubsData[0].id);
        }
    }, (error) => {
        console.error("Error fetching clubs:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load clubs.' });
    });

    return () => unsubscribe();
  }, [isSiteAdmin, firestore, toast, userProfile, selectedClubId]);


  // Fetch matches for the selected club
  useEffect(() => {
    if (!firestore || !selectedClubId) {
      setMatches([]);
      setIsLoading(true);
      return;
    }

    setIsLoading(true);

    const matchesQuery = query(collection(firestore, 'matches'), where('clubId', '==', selectedClubId));
    
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
      console.error("Error fetching matches: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch matches for the selected club.' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClubId, toast]);
  
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
        const term = searchTerm.toLowerCase();
        const searchMatch = !term ||
               match.seriesName.toLowerCase().includes(term) ||
               match.name.toLowerCase().includes(term);
        const completedMatch = !hideCompleted || match.status !== 'Completed';
        return searchMatch && completedMatch;
    });
  }, [matches, searchTerm, hideCompleted]);

  const handleGoToWeighIn = (matchId: string) => {
    router.push(`/main/matches/${matchId}/weigh-in`);
  };
  
  if (adminLoading) {
    return <Skeleton className="w-full h-96" />;
  }
  
  if (!isSiteAdmin) {
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

  const selectedClubName = allClubs.find(c => c.id === selectedClubId)?.name || 'Selected Club';

  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Weigh-in Selection</h1>
                <p className="text-muted-foreground">Select a match to manage its weigh-in.</p>
            </div>
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
        </div>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Matches for {selectedClubName}</CardTitle>
                        <CardDescription>
                            This list shows all matches for the selected club.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                         <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search series or match name..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="hide-completed" checked={hideCompleted} onCheckedChange={(checked) => setHideCompleted(!!checked)} />
                            <Label htmlFor="hide-completed" className="text-sm font-medium leading-none">
                                Hide Completed
                            </Label>
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
                        <TableHead>Status</TableHead>
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
                                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-10 w-28" /></TableCell>
                            </TableRow>
                        ))
                    ) : filteredMatches.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No matches found for this club.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredMatches.map(match => (
                            <TableRow key={match.id}>
                                <TableCell>{format(match.date, 'PPP')}</TableCell>
                                <TableCell>{match.seriesName}</TableCell>
                                <TableCell className="font-medium">{match.name}</TableCell>
                                <TableCell><Badge variant="outline">{match.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button onClick={() => handleGoToWeighIn(match.id)}>
                                        <Scale className="mr-2 h-4 w-4" />
                                        Go to Weigh-in
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
