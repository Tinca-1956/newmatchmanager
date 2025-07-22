
'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, QueryConstraint, Timestamp, orderBy } from 'firebase/firestore';
import type { Club, User, Result, Series, Match } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';


interface MatchResultSummary {
  matchId: string;
  matchName: string;
  seriesName: string;
  date: Date;
  venue: string;
  winnerName: string;
}

function weightLbsOz(totalOz: number) {
    if (typeof totalOz !== 'number' || isNaN(totalOz)) return '0lbs 0oz';
    const lbs = Math.floor(totalOz / 16);
    const oz = totalOz % 16;
    return `${lbs}lbs ${oz}oz`;
}

export default function ResultsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('all');
  
  const [matchesList, setMatchesList] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('all');

  const [results, setResults] = useState<MatchResultSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // For modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalResults, setModalResults] = useState<Result[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [selectedMatchForModal, setSelectedMatchForModal] = useState<MatchResultSummary | null>(null);

  // Fetch all clubs for the dropdown
  useEffect(() => {
    if (!firestore) return;
    const clubsCollection = collection(firestore, 'clubs');
    const unsubscribe = onSnapshot(clubsCollection, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
    });
    return () => unsubscribe();
  }, []);

  // Set default selected club once user data is available
  useEffect(() => {
    if (user && !authLoading && !selectedClubId) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then(doc => {
        if (doc.exists()) {
          const userData = doc.data() as User;
          if (userData.primaryClubId) {
            setSelectedClubId(userData.primaryClubId);
          } else if (clubs.length > 0) {
            setSelectedClubId(clubs[0].id);
          }
        } else if (clubs.length > 0) {
            setSelectedClubId(clubs[0].id);
        }
      });
    }
     if (!user && !authLoading && clubs.length > 0 && !selectedClubId) {
        setSelectedClubId(clubs[0].id);
    }
  }, [user, authLoading, clubs, selectedClubId]);

  // Fetch series for the selected club
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      setSeriesList([]);
      return;
    }
    const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', selectedClubId));
    const unsubscribe = onSnapshot(seriesQuery, (snapshot) => {
      const seriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Series));
      setSeriesList(seriesData);
      setSelectedSeriesId('all'); // Reset to all series when club changes
      setMatchesList([]); // Clear matches list
      setSelectedMatchId('all'); // Reset match selection
    }, (error) => {
        console.error("Error fetching series: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch series for the selected club.'
        });
    });

    return () => unsubscribe();
  }, [selectedClubId, toast]);
  
  // Fetch matches for the selected series
  useEffect(() => {
    if (selectedSeriesId === 'all' || !firestore) {
      setMatchesList([]);
      return;
    }
    const matchesQuery = query(collection(firestore, 'matches'), where('seriesId', '==', selectedSeriesId));
    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: (data.date as Timestamp).toDate(),
        } as Match
      });
      setMatchesList(matchesData);
      setSelectedMatchId('all'); // Reset match selection
    }, (error) => {
        console.error("Error fetching matches: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch matches for the selected series.'
        });
    });

    return () => unsubscribe();
  }, [selectedSeriesId, toast]);


  // Fetch results based on filters
  useEffect(() => {
    if (!selectedClubId || !firestore) {
        setResults([]);
        if(selectedClubId) setIsLoading(false);
        return;
    }

    setIsLoading(true);
    
    const queryConstraints: QueryConstraint[] = [
        where('clubId', '==', selectedClubId),
        where('position', '==', 1)
    ];

    if (selectedSeriesId !== 'all') {
        queryConstraints.push(where('seriesId', '==', selectedSeriesId));
    }
    if (selectedMatchId !== 'all') {
        queryConstraints.push(where('matchId', '==', selectedMatchId));
    }
    
    const resultsQuery = query(collection(firestore, 'results'), ...queryConstraints);

    const unsubscribe = onSnapshot(resultsQuery, async (snapshot) => {
        if (snapshot.empty) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        const winnerResults = snapshot.docs.map(doc => doc.data() as Result);
        
        const matchIds = [...new Set(winnerResults.map(r => r.matchId))];
        
        const matchDetailsMap = new Map();
        if(matchIds.length > 0) {
            // Firestore 'in' query supports up to 30 elements. Chunking is needed for more.
            const chunks = [];
            for (let i = 0; i < matchIds.length; i += 30) {
                chunks.push(matchIds.slice(i, i + 30));
            }

            for (const chunk of chunks) {
                 if (chunk.length === 0) continue;
                 const matchesQuery = query(collection(firestore, 'matches'), where('__name__', 'in', chunk));
                 const matchesSnapshot = await getDocs(matchesQuery);
                 matchesSnapshot.forEach(doc => {
                    matchDetailsMap.set(doc.id, doc.data());
                 });
            }
        }

        const summarizedResults: MatchResultSummary[] = winnerResults.map(result => {
            const match = matchDetailsMap.get(result.matchId);
            return {
                matchId: result.matchId,
                matchName: match?.name || 'Unknown Match',
                seriesName: match?.seriesName || 'Unknown Series',
                venue: match?.location || 'Unknown Venue',
                date: (result.date as any).toDate(),
                winnerName: result.userName,
            };
        }).sort((a,b) => b.date.getTime() - a.date.getTime()); // Sort by most recent date

        setResults(summarizedResults);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching results: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch match results.'
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClubId, selectedSeriesId, selectedMatchId, toast]);

  const handleRowClick = async (result: MatchResultSummary) => {
    if (!firestore) return;
    
    setSelectedMatchForModal(result);
    setIsModalOpen(true);
    setIsModalLoading(true);
    setModalResults([]);
    
    try {
      const resultsQuery = query(
        collection(firestore, 'results'),
        where('matchId', '==', result.matchId),
        orderBy('position', 'asc') // Sort by rank
      );
      const snapshot = await getDocs(resultsQuery);
      const fullResults = snapshot.docs.map(doc => doc.data() as Result);
      setModalResults(fullResults);
    } catch (error) {
      console.error("Error fetching full results:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch the full results for this match.'
      });
    } finally {
      setIsModalLoading(false);
    }
  };

  const renderResultsList = () => {
    if (isLoading) {
      return Array.from({ length: 4 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          </TableRow>
      ));
    }

    if (results.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            No results found for this selection.
          </TableCell>
        </TableRow>
      );
    }
    
    return results.map((result) => (
       <TableRow key={result.matchId} onClick={() => handleRowClick(result)} className="cursor-pointer">
          <TableCell>{format(result.date, 'PPP')}</TableCell>
          <TableCell className="font-medium">{result.seriesName}</TableCell>
          <TableCell>{result.matchName}</TableCell>
          <TableCell>{result.winnerName}</TableCell>
        </TableRow>
    ))
  }
  
  const renderModalResults = () => {
    if (isModalLoading) {
        return Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            </TableRow>
        ));
    }
    
    if (modalResults.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            No results recorded for this match.
          </TableCell>
        </TableRow>
      );
    }

    return modalResults.map((result) => (
      <TableRow key={result.userId}>
        <TableCell>
          {result.position ? <Badge variant="outline">{result.position}</Badge> : '-'}
        </TableCell>
        <TableCell className="font-medium">{result.userName}</TableCell>
        <TableCell>{weightLbsOz(result.weight)}</TableCell>
        <TableCell>{result.status || 'OK'}</TableCell>
      </TableRow>
    ));
  };


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Results</h1>
          <p className="text-muted-foreground">View match results here.</p>
        </div>
        <div className="flex items-end gap-4">
            <div className="grid w-52 gap-1.5">
                <Label htmlFor="club-filter">Club</Label>
                <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                    <SelectTrigger id="club-filter">
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
            <div className="grid w-52 gap-1.5">
                <Label htmlFor="series-filter">Series</Label>
                <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId} disabled={seriesList.length === 0}>
                    <SelectTrigger id="series-filter">
                        <SelectValue placeholder="Select a series..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Series</SelectItem>
                        {seriesList.map((series) => (
                            <SelectItem key={series.id} value={series.id}>
                                {series.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div className="grid w-52 gap-1.5">
                <Label htmlFor="match-filter">Match</Label>
                <Select value={selectedMatchId} onValueChange={setSelectedMatchId} disabled={matchesList.length === 0}>
                    <SelectTrigger id="match-filter">
                        <SelectValue placeholder="Select a match..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Matches</SelectItem>
                        {matchesList.map((match) => (
                            <SelectItem key={match.id} value={match.id}>
                                {match.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Completed Match Results</CardTitle>
          <CardDescription>
            A summary of results for the selected filters. Click a row to see full results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Winner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderResultsList()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {selectedMatchForModal && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Full Results: {selectedMatchForModal.matchName}</DialogTitle>
                    <DialogDescription>
                       {selectedMatchForModal.seriesName} - {format(selectedMatchForModal.date, 'PPP')}
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Rank</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Weight</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderModalResults()}
                        </TableBody>
                    </Table>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

    