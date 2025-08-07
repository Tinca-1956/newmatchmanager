
'use client';

import { useState, useEffect } from 'react';
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
import { Scale, ArrowRight, Terminal } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { Match, Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function WeighInSelectionPage() {
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [matches, setMatches] = useState<Match[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('all');
  
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all clubs for the filter dropdown
  useEffect(() => {
    if (!isSiteAdmin || !firestore) return;

    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setClubs(clubsData);
    });
    return () => unsubscribe();
  }, [isSiteAdmin]);

  // Fetch all weigh-in ready matches
  useEffect(() => {
    if (!firestore || !isSiteAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const matchesQuery = query(
        collection(firestore, 'matches'),
        where('status', 'in', ['In Progress', 'Weigh-in', 'Completed'])
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
      console.error("Error fetching matches: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch matches ready for weigh-in.' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isSiteAdmin, toast]);

  const filteredMatches = matches.filter(match => {
      if (selectedClubId === 'all') return true;
      return match.clubId === selectedClubId;
  });

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

  return (
    <div className="flex flex-col gap-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Weigh-in Selection</h1>
            <p className="text-muted-foreground">Select a match to manage its weigh-in.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Matches Ready for Weigh-in</CardTitle>
                <CardDescription>
                    This list shows matches that are currently in progress or ready for weigh-in.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                    <Label htmlFor="club-filter">Filter by Club</Label>
                    <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                        <SelectTrigger id="club-filter" className="w-[280px]">
                            <SelectValue placeholder="Select a club..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Clubs</SelectItem>
                            {clubs.map(club => (
                                <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

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
                                No matches are currently ready for weigh-in.
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
                                        <Scale className="mr-2" />
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
