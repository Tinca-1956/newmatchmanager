
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
import { collection, onSnapshot, query, where, getDocs, getDoc, doc, orderBy, Timestamp, limit } from 'firebase/firestore';
import type { Match, User, Club, Series, Result as ResultType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/use-admin-auth';

interface ResultRowData extends Match {
    winnerName: string;
}

export default function ResultsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { isSiteAdmin, loading: adminLoading } = useAdminAuth();

    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [seriesForClub, setSeriesForClub] = useState<Series[]>([]);
    const [allMatchesForClub, setAllMatchesForClub] = useState<Match[]>([]);
    const [displayResults, setDisplayResults] = useState<ResultRowData[]>([]);

    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>('all');
    const [selectedMatchId, setSelectedMatchId] = useState<string>('all');
    
    const [isLoadingClubs, setIsLoadingClubs] = useState(true);
    const [isLoadingDependents, setIsLoadingDependents] = useState(false);
    const [isDisplayLoading, setIsDisplayLoading] = useState(false);

    // Step 1: Fetch clubs for the dropdown (or user's primary club)
    useEffect(() => {
        if (adminLoading || !firestore || !user) {
            if(!adminLoading) setIsLoadingClubs(false);
            return;
        };

        const fetchClubs = async () => {
            setIsLoadingClubs(true);
            try {
                if (isSiteAdmin) {
                    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
                    const clubsSnapshot = await getDocs(clubsQuery);
                    const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
                    setAllClubs(clubsData);
                } else {
                    const userDocRef = doc(firestore, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data() as User;
                        if (userData.primaryClubId) {
                            const clubDocRef = doc(firestore, 'clubs', userData.primaryClubId);
                            const clubDoc = await getDoc(clubDocRef);
                            if (clubDoc.exists()) {
                                const primaryClub = { id: clubDoc.id, ...clubDoc.data() } as Club;
                                setAllClubs([primaryClub]);
                                setSelectedClubId(primaryClub.id); // Auto-select for non-admin
                            }
                        }
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

    }, [user, isSiteAdmin, adminLoading, firestore, toast]);

    // Step 2: When a club is selected, fetch its series and all matches
    useEffect(() => {
        if (!selectedClubId || !firestore) {
            setSeriesForClub([]);
            setAllMatchesForClub([]);
            return;
        }

        const fetchClubDependentData = async () => {
            setIsLoadingDependents(true);
            try {
                // Fetch series for the club
                const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', selectedClubId));
                const seriesSnapshot = await getDocs(seriesQuery);
                const seriesData = seriesSnapshot.docs.map(s => ({ id: s.id, ...s.data() } as Series));
                setSeriesForClub(seriesData);
                
                // Fetch all completed matches for the club
                const matchesQuery = query(
                    collection(firestore, 'matches'),
                    where('clubId', '==', selectedClubId),
                    where('status', '==', 'Completed')
                );
                const matchesSnapshot = await getDocs(matchesQuery);
                const matchesData = matchesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: (doc.data().date as Timestamp).toDate(),
                } as Match));
                setAllMatchesForClub(matchesData);

            } catch (error) {
                console.error("Error fetching club dependent data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch series and matches for the selected club.' });
            } finally {
                setIsLoadingDependents(false);
            }
        };

        fetchClubDependentData();
    }, [selectedClubId, firestore, toast]);
    
   
    // Step 3: When matches or filters change, calculate and set the results to be displayed
    useEffect(() => {
        const generateResultsForDisplay = async () => {
            if (!firestore) return;
            setIsDisplayLoading(true);

            let matchesToProcess = [...allMatchesForClub];

            if (selectedSeriesId !== 'all') {
                matchesToProcess = matchesToProcess.filter(m => m.seriesId === selectedSeriesId);
            }

            if (selectedMatchId !== 'all') {
                matchesToProcess = matchesToProcess.filter(m => m.id === selectedMatchId);
            }

            if (matchesToProcess.length === 0) {
                setDisplayResults([]);
                setIsDisplayLoading(false);
                return;
            }

            try {
                const resultsPromises = matchesToProcess.map(async (match) => {
                    const winnerQuery = query(
                        collection(firestore, 'results'),
                        where('matchId', '==', match.id),
                        where('position', '==', 1),
                        limit(1)
                    );
                    const winnerSnapshot = await getDocs(winnerQuery);
                    const winnerName = winnerSnapshot.empty ? 'N/A' : (winnerSnapshot.docs[0].data() as ResultType).userName;
                    return { ...match, winnerName };
                });
                
                const resolvedResults = await Promise.all(resultsPromises);
                // Sort results by date descending
                resolvedResults.sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());
                setDisplayResults(resolvedResults);

            } catch (error) {
                console.error("Error processing results for display: ", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not generate the results list.' });
            } finally {
                 setIsDisplayLoading(false);
            }
        };
        
        if (allMatchesForClub.length > 0) {
            generateResultsForDisplay();
        } else {
            setDisplayResults([]);
            setIsDisplayLoading(false);
        }

    }, [allMatchesForClub, selectedSeriesId, selectedMatchId, firestore, toast]);
    
    // Memoized list of completed matches for the dropdown
    const completedMatchesForDropdown = useMemo(() => {
        let matches = allMatchesForClub.filter(m => m.status === 'Completed');
        if (selectedSeriesId !== 'all') {
            matches = matches.filter(m => m.seriesId === selectedSeriesId);
        }
        return matches;
    }, [allMatchesForClub, selectedSeriesId]);

    const handleClubChange = (clubId: string) => {
        setSelectedClubId(clubId);
        setSelectedSeriesId('all');
        setSelectedMatchId('all');
    };

    const handleSeriesChange = (seriesId: string) => {
        setSelectedSeriesId(seriesId);
        setSelectedMatchId('all');
    };

    const renderResultsList = () => {
        if (isDisplayLoading) {
            return Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
            ));
        }

        if (displayResults.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        {!selectedClubId ? "Please select a club to view results." : "No completed matches found with the selected filters."}
                    </TableCell>
                </TableRow>
            );
        }

        return displayResults.map(result => (
            <TableRow key={result.id}>
                <TableCell>{format(result.date, 'PPP')}</TableCell>
                <TableCell className="font-medium">{result.seriesName}</TableCell>
                <TableCell>{result.name}</TableCell>
                <TableCell>{result.winnerName}</TableCell>
                <TableCell><Badge variant="outline">{result.status}</Badge></TableCell>
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
                                disabled={isLoadingClubs || !isSiteAdmin}
                            >
                                <SelectTrigger id="club-filter" className="w-64">
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
                                disabled={!selectedClubId || isLoadingDependents}
                            >
                                <SelectTrigger id="series-filter" className="w-64">
                                    <SelectValue placeholder="Select a series..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Series</SelectItem>
                                    {seriesForClub.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="flex flex-col gap-1.5">
                            <Label htmlFor="match-filter">Match</Label>
                            <Select 
                                value={selectedMatchId} 
                                onValueChange={setSelectedMatchId} 
                                disabled={!selectedClubId || isLoadingDependents || completedMatchesForDropdown.length === 0}
                            >
                                <SelectTrigger id="match-filter" className="w-64">
                                    <SelectValue placeholder="Select a match..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Matches</SelectItem>
                                    {completedMatchesForDropdown.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name} ({format(m.date, 'dd-MM-yy')})
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
                           {renderResultsList()}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
