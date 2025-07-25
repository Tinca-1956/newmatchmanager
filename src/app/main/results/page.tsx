
'use client';

import { Suspense, useState, useEffect } from 'react';
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
import { Download } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs, orderBy, Timestamp, doc, onSnapshot, getDoc } from 'firebase/firestore';
import type { Result, Series, User, Club, Match } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { ResultsModal } from '@/components/results-modal';

interface MatchWithWinner extends Match {
    winnerName: string;
}

function ResultsPageComponent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();

  const [matches, setMatches] = useState<MatchWithWinner[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');

  const [clubName, setClubName] = useState<string>('');
  const [pageTitle, setPageTitle] = useState('Results');
  
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Effect to get the user's primary club or all clubs for admin
  useEffect(() => {
    if (adminLoading || !user || !firestore) return;

    const fetchInitialData = async () => {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (isSiteAdmin) {
                const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
                const clubsSnapshot = await getDocs(clubsQuery);
                const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
                setClubs(clubsData);
                setSelectedClubId(userData.primaryClubId || (clubsData.length > 0 ? clubsData[0].id : ''));
            } else {
                setSelectedClubId(userData.primaryClubId || '');
            }
        }
    };
    fetchInitialData();
  }, [user, isSiteAdmin, adminLoading]);

  // Effect to fetch series for the selected club
  useEffect(() => {
      if (!selectedClubId || !firestore) {
        setSeries([]);
        return;
      }
      const clubDocRef = doc(firestore, 'clubs', selectedClubId);
      const unsubscribeClub = onSnapshot(clubDocRef, (clubDoc) => {
        setClubName(clubDoc.exists() ? clubDoc.data().name : 'Selected Club');
      });

      const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', selectedClubId));
      const unsubscribeSeries = onSnapshot(seriesQuery, (snapshot) => {
          const seriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Series));
          setSeries(seriesData);
      });

      return () => {
          unsubscribeClub();
          unsubscribeSeries();
      }
  }, [selectedClubId, firestore]);
  
  // Effect to fetch matches and winners based on filters
  useEffect(() => {
    if (!selectedClubId || !firestore) {
        setMatches([]);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    let matchesQuery = query(
        collection(firestore, 'matches'), 
        where('clubId', '==', selectedClubId),
        where('status', '==', 'Completed'),
        orderBy('date', 'desc')
    );

    if (selectedSeriesId) {
      matchesQuery = query(matchesQuery, where('seriesId', '==', selectedSeriesId));
    }
    
    const unsubscribe = onSnapshot(matchesQuery, async (matchesSnapshot) => {
        const matchesData = matchesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: (doc.data().date as Timestamp).toDate(),
        } as Match));
        
        try {
            const matchesWithWinners = await Promise.all(matchesData.map(async (match) => {
                const resultsQuery = query(
                    collection(firestore, 'results'),
                    where('matchId', '==', match.id),
                    where('position', '==', 1),
                    limit(1)
                );
                const resultsSnapshot = await getDocs(resultsQuery);
                const winner = resultsSnapshot.empty ? 'N/A' : (resultsSnapshot.docs[0].data() as Result).userName;
                return { ...match, winnerName: winner };
            }));

            setMatches(matchesWithWinners);
        } catch (error) {
            console.error("Error fetching winners:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch match winners."});
        }
        
        setIsLoading(false);

        // Update Page Title
        if (selectedSeriesId) {
            const seriesName = series.find(s => s.id === selectedSeriesId)?.name || 'Series';
            setPageTitle(`${seriesName} Results`);
        } else {
            setPageTitle(`${clubName} Results`);
        }

    }, (error) => {
      console.error("Error fetching matches: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch matches. Check Firestore indexes.' });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [selectedClubId, selectedSeriesId, firestore, series, clubName, toast]);

  const handleRowClick = (match: Match) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  }

  const renderResultList = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-8 w-24" /></TableCell>
        </TableRow>
      ));
    }

    if (matches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="h-24 text-center">
            No completed matches found for the current selection.
          </TableCell>
        </TableRow>
      );
    }

    return matches.map((match) => (
      <TableRow key={match.id} onClick={() => handleRowClick(match)} className="cursor-pointer">
        <TableCell>{format(match.date, 'PPP')}</TableCell>
        <TableCell className="font-medium">{match.seriesName}</TableCell>
        <TableCell>{match.name}</TableCell>
        <TableCell>{match.winnerName}</TableCell>
        <TableCell>
            <Badge variant="default">{match.status}</Badge>
        </TableCell>
      </TableRow>
    ));
  };
  
  return (
    <>
        <div className="flex flex-col gap-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Results</h1>
            <p className="text-muted-foreground">View results for completed matches.</p>
        </div>
        
        <Card>
            <CardHeader>
            <div className="flex items-start justify-between">
                <div>
                    <CardTitle>{pageTitle}</CardTitle>
                    <CardDescription>A list of all completed matches for the selected filters. Click a row to see full results.</CardDescription>
                </div>
                <Button variant="outline" size="sm" disabled>
                    <Download className="mr-2 h-4 w-4" />
                    Export All
                </Button>
            </div>
            </CardHeader>
            <CardContent>
            <div className="flex flex-wrap items-center gap-4 mb-4">
                {isSiteAdmin && (
                    <div className="flex items-center gap-2">
                        <Label htmlFor="club-filter" className="text-nowrap">Club</Label>
                        <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                            <SelectTrigger id="club-filter" className="w-52">
                                <SelectValue placeholder="Select a club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {clubs.map((club) => (
                                    <SelectItem key={club.id} value={club.id}>
                                        {club.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Label htmlFor="series-filter" className="text-nowrap">Series</Label>
                    <Select value={selectedSeriesId} onValueChange={(value) => setSelectedSeriesId(value === 'all' ? '' : value)} disabled={series.length === 0}>
                        <SelectTrigger id="series-filter" className="w-52">
                            <SelectValue placeholder="Filter by series..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Series</SelectItem>
                            {series.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Series</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Winner</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {renderResultList()}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
        </div>
        {selectedMatch && (
            <ResultsModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                match={selectedMatch}
            />
        )}
    </>
  );
}


export default function ResultsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResultsPageComponent />
        </Suspense>
    )
}

    