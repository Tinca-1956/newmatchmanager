
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
import { Button } from '@/components/ui/button';
import { Trophy, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { collection, onSnapshot, doc, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Series, Club, Match, Result } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Badge } from '@/components/ui/badge';

interface SeriesWithMatchCount extends Series {
    matchCount: number;
}

interface AnglerStanding {
    rank: number;
    userName: string;
    totalRank: number;
}

type ResultWithSectionRank = Result & { sectionPosition?: number };

export default function SeriesAnglerPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [seriesList, setSeriesList] = useState<SeriesWithMatchCount[]>([]);
  const [clubName, setClubName] = useState<string>('');
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isStandingsModalOpen, setIsStandingsModalOpen] = useState(false);
  const [isStandingsLoading, setIsStandingsLoading] = useState(false);

  const [selectedSeriesForAction, setSelectedSeriesForAction] = useState<SeriesWithMatchCount | null>(null);
  const [leagueStandings, setLeagueStandings] = useState<AnglerStanding[]>([]);

  // Effect to set the initial club for fetching data
  useEffect(() => {
    if (authLoading || !firestore) return;

    // Fetch all clubs for the dropdown
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setAllClubs(clubsData);
      if (!selectedClubId) {
         if (userProfile?.primaryClubId && clubsData.some(c => c.id === userProfile.primaryClubId)) {
            setSelectedClubId(userProfile.primaryClubId);
         } else if (clubsData.length > 0) {
            setSelectedClubId(clubsData[0].id);
         }
      }
    });
    return () => unsubscribe();
  }, [authLoading, userProfile, selectedClubId]);


  // Main data fetching effect for Series
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      setSeriesList([]);
      setIsLoading(true);
      return;
    }
    
    setIsLoading(true);

    const clubDocRef = doc(firestore, 'clubs', selectedClubId);
    const unsubscribeClub = onSnapshot(clubDocRef, (clubDoc) => {
      setClubName(clubDoc.exists() ? clubDoc.data().name : 'Selected Club');
    });

    const seriesQuery = query(collection(firestore, 'series'), where("clubId", "==", selectedClubId));
    
    const unsubscribeSeries = onSnapshot(seriesQuery, async (seriesSnapshot) => {
      const seriesData = seriesSnapshot.docs.map(s => ({id: s.id, ...s.data()}) as Series);

      try {
        const matchesQuery = query(collection(firestore, 'matches'), where('clubId', '==', selectedClubId));
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(m => m.data() as Match);

        const seriesWithCounts = seriesData.map(series => {
          const matchCount = matchesData.filter(m => m.seriesId === series.id).length;
          return {
            ...series,
            matchCount: matchCount,
          };
        });

        setSeriesList(seriesWithCounts);
      } catch (error) {
        console.error("Error fetching match counts:", error);
        setSeriesList(seriesData.map(s => ({...s, matchCount: 0})));
      } finally {
        setIsLoading(false);
      }
    }, (error) => {
        console.error("Error fetching series: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch series.' });
        setIsLoading(false);
    });

    return () => {
        unsubscribeClub();
        unsubscribeSeries();
    };
  }, [selectedClubId, toast]);
  
  const handleOpenStandingsModal = async (series: SeriesWithMatchCount) => {
    if (!firestore) return;
    setSelectedSeriesForAction(series);
    setIsStandingsModalOpen(true);
    setIsStandingsLoading(true);

    try {
        const matchesQuery = query(collection(firestore, 'matches'), where('seriesId', '==', series.id));
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
        const registeredAnglersByMatch = new Map(matchesData.map(match => [match.id, new Set(match.registeredAnglers)]));

        const resultsQuery = query(collection(firestore, 'results'), where('seriesId', '==', series.id));
        const resultsSnapshot = await getDocs(resultsQuery);
        const allResultsData = resultsSnapshot.docs.map(doc => doc.data() as Result);
        
        const validResultsData = allResultsData.filter(result => {
            const registeredAnglers = registeredAnglersByMatch.get(result.matchId);
            return registeredAnglers ? registeredAnglers.has(result.userId) : false;
        });

        const resultsByMatch: { [matchId: string]: Result[] } = {};
        validResultsData.forEach(result => {
            if (!resultsByMatch[result.matchId]) {
                resultsByMatch[result.matchId] = [];
            }
            resultsByMatch[result.matchId].push(result);
        });
        
        const resultsWithSectionRank: ResultWithSectionRank[] = [];
        for (const matchId in resultsByMatch) {
            const matchResults = resultsByMatch[matchId];
            const processedResults = calculateSectionRanks(matchResults);
            resultsWithSectionRank.push(...processedResults);
        }

        const anglerTotals: { [userId: string]: { userName: string; totalRank: number } } = {};
        
        resultsWithSectionRank.forEach(result => {
            const rank = result.sectionPosition;
            if (typeof rank === 'number' && rank > 0) {
                if (!anglerTotals[result.userId]) {
                    anglerTotals[result.userId] = {
                        userName: result.userName,
                        totalRank: 0,
                    };
                }
                anglerTotals[result.userId].totalRank += rank;
            }
        });

        const standings = Object.values(anglerTotals)
            .sort((a, b) => a.totalRank - b.totalRank)
            .map((angler, index) => ({
                rank: index + 1,
                userName: angler.userName,
                totalRank: angler.totalRank,
            }));
            
        setLeagueStandings(standings);
    } catch (error) {
        console.error("Error calculating standings: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not calculate league standings.' });
    } finally {
        setIsStandingsLoading(false);
    }
  }

  const calculateSectionRanks = (results: Result[]): ResultWithSectionRank[] => {
    const resultsCopy: ResultWithSectionRank[] = results.map(r => ({ ...r }));
    
    const resultsBySection: { [key: string]: ResultWithSectionRank[] } = {};
    resultsCopy.forEach(result => {
      if (result.section) {
        if (!resultsBySection[result.section]) {
          resultsBySection[result.section] = [];
        }
        resultsBySection[result.section].push(result);
      }
    });

    for (const section in resultsBySection) {
        const sectionResultsWithWeight = resultsBySection[section]
            .filter(r => r.status === 'OK' && r.weight > 0)
            .sort((a, b) => b.weight - a.weight);

        sectionResultsWithWeight.forEach((result, index) => {
            const original = resultsCopy.find(r => r.userId === result.userId);
            if (original) {
              original.sectionPosition = index + 1;
            }
        });

        const lastSectionRank = sectionResultsWithWeight.length;
        const dnwSectionRank = lastSectionRank + 1;

        resultsBySection[section].forEach(result => {
            if (['DNF', 'DNW', 'DSQ'].includes(result.status || '')) {
                const original = resultsCopy.find(r => r.userId === result.userId);
                if (original) {
                    original.sectionPosition = dnwSectionRank;
                }
            }
        });
    }

    return resultsCopy;
  }

  const renderSeriesList = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-10 w-[80px]" /></TableCell>
          </TableRow>
      ));
    }

    if (seriesList.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center">
            No series found for this club.
          </TableCell>
        </TableRow>
      );
    }

    return seriesList.map((series) => (
       <TableRow key={series.id}>
          <TableCell className="font-medium">{series.name}</TableCell>
          <TableCell>{series.matchCount}</TableCell>
          <TableCell className="text-right space-x-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button asChild variant="outline" size="icon">
                             <Link href={`/main/matches?seriesId=${series.id}`}>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left"><p>View Matches</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => handleOpenStandingsModal(series)} disabled={series.matchCount === 0}>
                            <Trophy className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left"><p>View league standings</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </TableCell>
        </TableRow>
    ));
  }
  
  if (authLoading) {
    return <div className="space-y-4">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-6 w-3/4" />
      <Card><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
    </div>
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Series</h1>
          <p className="text-muted-foreground">View match series and league standings.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Label htmlFor="club-filter" className="text-nowrap">Clubs</Label>
                <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={allClubs.length === 0}>
                    <SelectTrigger id="club-filter" className="w-52">
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
      </div>

      <Card>
        <CardHeader>
            <CardTitle>{clubName || 'Select a club'} Series</CardTitle>
            <CardDescription>A list of all match series for the selected club.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Series Name</TableHead>
                <TableHead>Match Count</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderSeriesList()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {selectedSeriesForAction && (
        <Dialog open={isStandingsModalOpen} onOpenChange={setIsStandingsModalOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>League Standings: {selectedSeriesForAction.name}</DialogTitle>
                    <DialogDescription>
                         Overall standings based on the sum of section positions from all completed matches in this series.
                         {selectedSeriesForAction.isCompleted ? (
                            <span className="font-bold block pt-2">SERIES COMPLETE</span>
                        ) : (
                            <span className="font-bold block pt-2">SERIES IN PROGRESS</span>
                        )}
                        <span className="text-xs text-muted-foreground block pt-2">
                            The total points represent each anglers total points for all matches in the series. Where anglers did not attend a match in the series they are awarded maximum points. The match secretary will finalise the league standings after the final match has been completed
                        </span>
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Rank</TableHead>
                                <TableHead>Angler Name</TableHead>
                                <TableHead>Total Points</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isStandingsLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    </TableRow>
                                ))
                            ) : leagueStandings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No results with rankings recorded for this series yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                leagueStandings.map((angler) => (
                                    <TableRow key={angler.userName}>
                                        <TableCell>
                                            <Badge variant="outline">{angler.rank}</Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{angler.userName}</TableCell>
                                        <TableCell>{angler.totalRank}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <DialogFooter className="sm:justify-end">
                    <Button type="button" variant="default" onClick={() => setIsStandingsModalOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
