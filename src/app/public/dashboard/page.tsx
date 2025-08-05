
'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, Timestamp, orderBy, getDocs, limit } from 'firebase/firestore';
import type { Club, Match, Result, MatchStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { MapPin, Trophy } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const getCalculatedStatus = (match: Match): MatchStatus => {
  const now = new Date();
  
  let matchDate: Date;
  if (match.date instanceof Timestamp) {
    matchDate = match.date.toDate();
  } else if (match.date instanceof Date) {
    matchDate = match.date;
  } else {
    // Fallback for invalid date format
    return match.status;
  }

  // Basic check for valid time strings
  if (!match.drawTime || !match.endTime || !match.drawTime.includes(':') || !match.endTime.includes(':')) {
    return match.status;
  }

  const [drawHours, drawMinutes] = match.drawTime.split(':').map(Number);
  const drawDateTime = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate(), drawHours, drawMinutes);

  const [endHours, endMinutes] = match.endTime.split(':').map(Number);
  const endDateTime = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate(), endHours, endMinutes);
  
  const weighInProgressUntil = new Date(endDateTime.getTime() + 90 * 60 * 1000);

  if (match.status === 'Cancelled') return 'Cancelled';
  if (now > weighInProgressUntil) return 'Completed';
  if (now > endDateTime) return 'Weigh-in';
  if (now > drawDateTime) return 'In Progress';
  
  return 'Upcoming';
};


export default function PublicDashboardPage() {
    const { toast } = useToast();
    
    const [clubs, setClubs] = useState<Club[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

    const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
    const [recentResults, setRecentResults] = useState<Result[]>([]);
    const [recentMatchDetails, setRecentMatchDetails] = useState<Match | null>(null);

    const [isLoadingClubs, setIsLoadingClubs] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    
    // This new state will gate the data fetching useEffects
    const [isClubReady, setIsClubReady] = useState(false);

    // Step 1: Fetch all clubs to populate the dropdown
    useEffect(() => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot connect to database.' });
            setIsLoadingClubs(false);
            return;
        }

        const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
        
        const unsubscribe = getDocs(clubsQuery).then(snapshot => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setClubs(clubsData);
            if (clubsData.length > 0) {
                // Set the first club as the default selection
                setSelectedClubId(clubsData[0].id);
            }
        }).catch(error => {
            console.error("Error fetching clubs: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the list of clubs.' });
        }).finally(() => {
            setIsLoadingClubs(false);
        });

    }, [toast]);
    
    // Step 2: Once a club is selected, set the ready flag
    useEffect(() => {
        if (selectedClubId) {
            setIsClubReady(true);
        }
    }, [selectedClubId]);


    // Step 3: Fetch matches and results ONLY when the club is ready
    useEffect(() => {
        // Gate this entire effect until we have a selected club
        if (!isClubReady || !selectedClubId || !firestore) {
            return;
        }

        setIsLoadingData(true);

        const fetchAllData = async () => {
             try {
                // Combined query for all matches in the selected club
                const allMatchesQuery = query(
                    collection(firestore, 'matches'),
                    where('clubId', '==', selectedClubId)
                );

                const allMatchesSnapshot = await getDocs(allMatchesQuery);
                const matchesData = allMatchesSnapshot.docs.map(doc => {
                    const data = doc.data();
                    let date = data.date;
                    if (date instanceof Timestamp) {
                        date = date.toDate();
                    }
                    return {
                        id: doc.id,
                        ...data,
                        date,
                    } as Match;
                });
                
                // --- Filter for Upcoming Matches ---
                const trulyUpcoming = matchesData
                    .filter(match => ['Upcoming', 'In Progress'].includes(getCalculatedStatus(match)))
                    .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime())
                    .slice(0, 5); // Limit to 5 upcoming
                
                setUpcomingMatches(trulyUpcoming);

                // --- Filter for Recent Results ---
                const completedMatches = matchesData
                    .filter(match => ['Completed', 'Weigh-in'].includes(getCalculatedStatus(match)))
                    .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());
                
                if (completedMatches.length > 0) {
                    const recentMatch = completedMatches[0];
                    setRecentMatchDetails(recentMatch);
                    
                    const resultsQuery = query(
                        collection(firestore, 'results'),
                        where('matchId', '==', recentMatch.id),
                        orderBy('position', 'asc')
                    );
                    const resultsSnapshot = await getDocs(resultsQuery);
                    const resultsData = resultsSnapshot.docs.map(d => d.data() as Result);
                    
                    setRecentResults(resultsData);
                } else {
                    setRecentResults([]);
                    setRecentMatchDetails(null);
                }
            } catch (error) {
                 console.error("Error fetching match data:", error);
                 toast({ variant: 'destructive', title: 'Data Error', description: 'Could not fetch matches or results.' });
                 setUpcomingMatches([]);
                 setRecentResults([]);
                 setRecentMatchDetails(null);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchAllData();

    }, [isClubReady, selectedClubId, toast]);


  const renderUpcomingMatches = () => {
    if (isLoadingData) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
        </TableRow>
      ));
    }

    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
            No upcoming matches scheduled for this club.
          </TableCell>
        </TableRow>
      );
    }

    return upcomingMatches.map(match => (
      <TableRow key={match.id}>
        <TableCell>
            <div className="flex flex-col">
                <span className="font-medium">{format(match.date as Date, 'EEE, dd MMM')}</span>
                <span className="text-xs text-muted-foreground">{match.seriesName}</span>
            </div>
        </TableCell>
        <TableCell>{match.name}</TableCell>
        <TableCell>
             <div className="flex items-center gap-2">
                <div>
                    <span>{match.location}</span>
                    <span className="text-xs text-muted-foreground block">{getCalculatedStatus(match)}</span>
                </div>
                {match.googleMapsLink && (
                  <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                  </Link>
                )}
            </div>
        </TableCell>
      </TableRow>
    ));
  };
  
  const renderRecentResults = () => {
    if (isLoadingData) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
      ));
    }

    if (recentResults.length === 0) {
      return (
        <TableRow>
            <TableCell colSpan={3} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Trophy className="h-8 w-8" />
                    <p>No recent results found for this club.</p>
                </div>
            </TableCell>
        </TableRow>
      );
    }

    return recentResults.map(result => (
      <TableRow key={result.userId}>
        <TableCell>
          <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
            {result.position || '-'}
          </div>
        </TableCell>
        <TableCell className="font-medium">{result.userName}</TableCell>
        <TableCell className="text-muted-foreground">{result.weight.toFixed(3)}kg</TableCell>
      </TableRow>
    ));
  };

    const renderPage = () => {
        if (isLoadingClubs) {
             return (
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                        </div>
                    </div>
                </div>
            );
        }

        if (clubs.length === 0) {
             return (
                <div className="text-center py-12">
                    <h2 className="text-2xl font-semibold mb-2">No Clubs Available</h2>
                    <p className="text-muted-foreground">There are no fishing clubs set up in the system yet.</p>
                </div>
            );
        }

        return (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Upcoming Matches</CardTitle>
                        <CardDescription>The next 5 matches for the selected club.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Series</TableHead>
                                    <TableHead>Match</TableHead>
                                    <TableHead>Venue & Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderUpcomingMatches()}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Recent Results</CardTitle>
                        <CardDescription>
                            {recentMatchDetails && recentMatchDetails.date ? `${recentMatchDetails.name} on ${format(recentMatchDetails.date, 'dd/MM/yy')}` : 'Last completed match'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Pos</TableHead>
                                    <TableHead>Angler</TableHead>
                                    <TableHead>Weight</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderRecentResults()}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <main className="flex flex-col gap-8 p-4 md:p-8">
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Public Dashboard</h1>
                    <p className="text-muted-foreground">
                    Welcome! View upcoming matches and recent results for our clubs.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Label htmlFor="club-select" className="text-sm">Club:</Label>
                    {isLoadingClubs ? <Skeleton className="h-10 w-48" /> : (
                         <Select value={selectedClubId || ''} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                            <SelectTrigger id="club-select" className="w-full md:w-48">
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
                    )}
                </div>
            </header>
            
            <div className="mt-4">
                {renderPage()}
            </div>
        </main>
    )
}

    