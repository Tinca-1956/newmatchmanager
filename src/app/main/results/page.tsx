
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, query, where, getDocs, getDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import type { Match, User, Club, Series, Result as ResultType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/use-admin-auth';

export default function ResultsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { isSiteAdmin, loading: adminLoading } = useAdminAuth();

    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [seriesForClub, setSeriesForClub] = useState<Series[]>([]);
    const [matchesForSeries, setMatchesForSeries] = useState<Match[]>([]);
    const [resultsForMatch, setResultsForMatch] = useState<ResultType[]>([]);

    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
    const [selectedMatchId, setSelectedMatchId] = useState<string>('');
    const [sortBy, setSortBy] = useState<'Overall' | 'Section' | 'Peg'>('Overall');
    
    const [isLoadingClubs, setIsLoadingClubs] = useState(true);
    const [isLoadingSeries, setIsLoadingSeries] = useState(false);
    const [isLoadingMatches, setIsLoadingMatches] = useState(false);
    const [isLoadingResults, setIsLoadingResults] = useState(false);

    // Step 1: Fetch clubs for the dropdown (or user's primary club)
    useEffect(() => {
        if (adminLoading || !firestore || !user) {
            if(!adminLoading) setIsLoadingClubs(false);
            return;
        };

        const fetchClubs = async () => {
            setIsLoadingClubs(true);
            try {
                const userDocRef = doc(firestore, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                const userData = userDoc.exists() ? userDoc.data() as User : null;

                if (isSiteAdmin) {
                    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
                    const clubsSnapshot = await getDocs(clubsQuery);
                    const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
                    setAllClubs(clubsData);
                    if (userData?.primaryClubId) {
                      setSelectedClubId(userData.primaryClubId);
                      handleClubChange(userData.primaryClubId, true);
                    }
                } else if (userData?.primaryClubId) {
                    const clubDocRef = doc(firestore, 'clubs', userData.primaryClubId);
                    const clubDoc = await getDoc(clubDocRef);
                    if (clubDoc.exists()) {
                        const primaryClub = { id: clubDoc.id, ...clubDoc.data() } as Club;
                        setAllClubs([primaryClub]);
                        setSelectedClubId(primaryClub.id);
                        handleClubChange(primaryClub.id, true);
                    }
                }
            } catch (error) {
                 console.error("Error fetching clubs:", error);
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
            } finally {
                setIsLoadingClubs(false);
            }
        };
        
        fetchClubs();

    }, [user, isSiteAdmin, adminLoading, toast]);

    // Step 2: Handle Club Selection -> Fetch Series
    const handleClubChange = (clubId: string, isInitialLoad = false) => {
        if (!clubId || !firestore) return;
        
        if (!isInitialLoad) {
            setSelectedClubId(clubId);
            setSelectedSeriesId('');
            setSelectedMatchId('');
            setMatchesForSeries([]);
            setResultsForMatch([]);
        }

        setIsLoadingSeries(true);
        try {
            const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', clubId));
            const unsubscribe = onSnapshot(seriesQuery, (seriesSnapshot) => {
                const seriesData = seriesSnapshot.docs.map(s => ({ id: s.id, ...s.data() } as Series));
                setSeriesForClub(seriesData);
                setIsLoadingSeries(false);
            }, (error) => {
                console.error("Error fetching series:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch series for the selected club.' });
                setIsLoadingSeries(false);
            });
            // Note: This immediate unsubscribe might not be ideal in a fully reactive app, but fits the current direct-fetch model.
            // For a real-time app, you'd return the unsubscribe function from useEffect.
        } catch (error) {
             console.error("Error setting up series fetch:", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch series for the selected club.' });
             setIsLoadingSeries(false);
        }
    };

    // Step 3: Handle Series Selection -> Fetch Matches
    const handleSeriesChange = async (seriesId: string) => {
        if (!seriesId || !firestore) return;

        setSelectedSeriesId(seriesId);
        setSelectedMatchId('');
        setResultsForMatch([]);

        setIsLoadingMatches(true);
        try {
            const matchesQuery = query(collection(firestore, 'matches'), where('seriesId', '==', seriesId));
            const matchesSnapshot = await getDocs(matchesQuery);
            const matchesData = matchesSnapshot.docs.map(m => ({
                id: m.id,
                ...m.data(),
                date: (m.data().date as Timestamp).toDate(),
            } as Match));
            setMatchesForSeries(matchesData);
        } catch (error) {
            console.error("Error fetching matches:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch matches for the selected series.' });
        } finally {
            setIsLoadingMatches(false);
        }
    };

    // Step 4: Handle Match Selection -> Fetch Results
    const handleMatchChange = async (matchId: string) => {
        if (!matchId || !firestore) return;

        setSelectedMatchId(matchId);
        setResultsForMatch([]);

        setIsLoadingResults(true);
        try {
            const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', matchId));
            const resultsSnapshot = await getDocs(resultsQuery);
            const resultsData = resultsSnapshot.docs.map(r => r.data() as ResultType);
            setResultsForMatch(resultsData);
        } catch (error) {
            console.error("Error fetching results:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch results for the selected match.' });
        } finally {
            setIsLoadingResults(false);
        }
    };

    const sortedResults = useMemo(() => {
        const resultsCopy = [...resultsForMatch];
        if (sortBy === 'Overall') {
            return resultsCopy.sort((a, b) => (a.position || 999) - (b.position || 999));
        }
        if (sortBy === 'Section') {
            return resultsCopy.sort((a, b) => {
                const sectionA = a.section || '';
                const sectionB = b.section || '';
                if (sectionA < sectionB) return -1;
                if (sectionA > sectionB) return 1;
                return (a.position || 999) - (b.position || 999);
            });
        }
        if (sortBy === 'Peg') {
             return resultsCopy.sort((a, b) => {
                const pegA = a.peg || '';
                const pegB = b.peg || '';
                // Basic alphanumeric sort for pegs like 'A1', 'A2', 'B1'
                return pegA.localeCompare(pegB, undefined, { numeric: true, sensitivity: 'base' });
            });
        }
        return resultsCopy;
    }, [resultsForMatch, sortBy]);

    const renderResultsList = () => {
        if (isLoadingResults) {
            return Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
            ));
        }

        if (sortedResults.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                       {selectedMatchId ? "No results found for this match." : "Select a match to view results."}
                    </TableCell>
                </TableRow>
            );
        }

        return sortedResults.map(result => (
            <TableRow key={result.userId}>
                <TableCell>{result.position}</TableCell>
                <TableCell className="font-medium">{result.userName}</TableCell>
                <TableCell>{result.peg || '-'}</TableCell>
                <TableCell>{result.section || '-'}</TableCell>
                <TableCell>{result.weight.toFixed(3)}</TableCell>
                <TableCell><Badge variant="outline">{result.status || 'OK'}</Badge></TableCell>
            </TableRow>
        ));
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Results</h1>
                <p className="text-muted-foreground">View match results here.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Completed Match Results</CardTitle>
                    <CardDescription>Filter and view results from completed matches.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-4 mb-6">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="club-filter">Club</Label>
                            <Select 
                                value={selectedClubId} 
                                onValueChange={handleClubChange}
                                disabled={isLoadingClubs || allClubs.length === 0}
                            >
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
                         <div className="flex flex-col gap-1.5">
                            <Label htmlFor="series-filter">Series</Label>
                            <Select 
                                value={selectedSeriesId} 
                                onValueChange={handleSeriesChange} 
                                disabled={!selectedClubId || isLoadingSeries}
                            >
                                <SelectTrigger id="series-filter" className="w-52">
                                    <SelectValue placeholder="Select a series..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {seriesForClub.length === 0 && selectedClubId ? (
                                        <SelectItem value="none" disabled>No series found</SelectItem>
                                    ) : (
                                        seriesForClub.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="flex flex-col gap-1.5">
                            <Label htmlFor="match-filter">Match</Label>
                            <Select 
                                value={selectedMatchId} 
                                onValueChange={handleMatchChange} 
                                disabled={!selectedSeriesId || isLoadingMatches}
                            >
                                <SelectTrigger id="match-filter" className="w-52">
                                    <SelectValue placeholder="Select a match..." />
                                </SelectTrigger>
                                <SelectContent>
                                     {matchesForSeries.length === 0 && selectedSeriesId ? (
                                        <SelectItem value="none" disabled>No matches found</SelectItem>
                                    ) : (
                                        matchesForSeries.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.name} ({format(m.date, 'dd-MM-yy')})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="sort-by">Sort by</Label>
                            <Select
                                value={sortBy}
                                onValueChange={(value) => setSortBy(value as 'Overall' | 'Section' | 'Peg')}
                                disabled={resultsForMatch.length === 0}
                            >
                                <SelectTrigger id="sort-by" className="w-48">
                                    <SelectValue placeholder="Sort by..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Overall">Overall</SelectItem>
                                    <SelectItem value="Section">Section</SelectItem>
                                    <SelectItem value="Peg">Peg</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Position</TableHead>
                                <TableHead>Angler</TableHead>
                                <TableHead>Peg</TableHead>
                                <TableHead>Section</TableHead>
                                <TableHead>Weight (Kg)</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {renderResultsList()}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
