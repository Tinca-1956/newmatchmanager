
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

    const [clubs, setClubs] = useState<Club[]>([]);
    const [series, setSeries] = useState<Series[]>([]);
    const [allMatchesForClub, setAllMatchesForClub] = useState<Match[]>([]);
    const [results, setResults] = useState<ResultRowData[]>([]);

    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>('all');
    const [selectedMatchId, setSelectedMatchId] = useState<string>('all');
    
    const [isLoading, setIsLoading] = useState(true);

    // Step 1: Determine the club to show (user's primary or admin's selection)
    useEffect(() => {
        if (adminLoading || !user || !firestore) return;

        const determineClub = async () => {
            setIsLoading(true);
            try {
                if (isSiteAdmin) {
                    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
                    const clubsSnapshot = await getDocs(clubsQuery);
                    const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
                    setClubs(clubsData);
                    if (clubsData.length > 0) {
                        setSelectedClubId(clubsData[0].id);
                    } else {
                        setIsLoading(false);
                    }
                } else {
                    const userDocRef = doc(firestore, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data() as User;
                        setSelectedClubId(userData.primaryClubId || '');
                    } else {
                        setIsLoading(false);
                    }
                }
            } catch (error) {
                console.error("Error determining club:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not determine the club to display.' });
                setIsLoading(false);
            }
        };

        determineClub();
    }, [user, isSiteAdmin, adminLoading, toast]);

    // Step 2: Once a club is selected, fetch all necessary data for that club
    useEffect(() => {
        if (!selectedClubId || !firestore) {
            setSeries([]);
            setAllMatchesForClub([]);
            setResults([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        
        const fetchClubData = async () => {
            try {
                // Fetch series for the club
                const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', selectedClubId), orderBy('name'));
                const seriesSnapshot = await getDocs(seriesQuery);
                const seriesData = seriesSnapshot.docs.map(s => ({ id: s.id, ...s.data() } as Series));
                setSeries(seriesData);

                // Fetch all completed matches for the club
                const matchesQuery = query(
                    collection(firestore, 'matches'),
                    where('clubId', '==', selectedClubId),
                    where('status', '==', 'Completed'),
                    orderBy('date', 'desc')
                );
                const matchesSnapshot = await getDocs(matchesQuery);
                const matchesData = matchesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: (doc.data().date as Timestamp).toDate(),
                } as Match));
                setAllMatchesForClub(matchesData);
                
            } catch (error) {
                console.error("Error fetching club data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch series and matches.' });
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchClubData();

    }, [selectedClubId, firestore, toast]);

    // Step 3: Filter the already-fetched matches to generate results for the table
     useEffect(() => {
        const generateResults = async () => {
            setIsLoading(true);
            let matchesToProcess = allMatchesForClub;

            if (selectedSeriesId !== 'all') {
                matchesToProcess = matchesToProcess.filter(m => m.seriesId === selectedSeriesId);
            }

            if (selectedMatchId !== 'all') {
                matchesToProcess = matchesToProcess.filter(m => m.id === selectedMatchId);
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
                setResults(resolvedResults);

            } catch (error) {
                console.error("Error processing results: ", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not generate results list.' });
            } finally {
                 setIsLoading(false);
            }
        };

        if (allMatchesForClub.length > 0) {
            generateResults();
        } else {
            setResults([]);
        }

    }, [allMatchesForClub, selectedSeriesId, selectedMatchId, toast]);

    const filteredMatchesForDropdown = useMemo(() => {
        if (selectedSeriesId === 'all') {
            return allMatchesForClub;
        }
        return allMatchesForClub.filter(m => m.seriesId === selectedSeriesId);
    }, [allMatchesForClub, selectedSeriesId]);

    const renderResultsList = () => {
        if (isLoading) {
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

        if (results.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        No completed matches found with the selected filters.
                    </TableCell>
                </TableRow>
            );
        }

        return results.map(result => (
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
                        {isSiteAdmin && (
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="club-filter">Club</Label>
                                <Select 
                                    value={selectedClubId} 
                                    onValueChange={(value) => {
                                        setSelectedClubId(value);
                                        setSelectedSeriesId('all');
                                        setSelectedMatchId('all');
                                    }} 
                                    disabled={clubs.length === 0}
                                >
                                    <SelectTrigger id="club-filter" className="w-64">
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
                         <div className="flex flex-col gap-1.5">
                            <Label htmlFor="series-filter">Series</Label>
                            <Select 
                                value={selectedSeriesId} 
                                onValueChange={(value) => {
                                    setSelectedSeriesId(value);
                                    setSelectedMatchId('all');
                                }} 
                                disabled={!selectedClubId || isLoading}
                            >
                                <SelectTrigger id="series-filter" className="w-64">
                                    <SelectValue placeholder="Select a series..." />
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
                         <div className="flex flex-col gap-1.5">
                            <Label htmlFor="match-filter">Match</Label>
                            <Select 
                                value={selectedMatchId} 
                                onValueChange={setSelectedMatchId} 
                                disabled={!selectedClubId || isLoading || filteredMatchesForDropdown.length === 0}
                            >
                                <SelectTrigger id="match-filter" className="w-64">
                                    <SelectValue placeholder="Select a match..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Matches</SelectItem>
                                    {filteredMatchesForDropdown.map((m) => (
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
