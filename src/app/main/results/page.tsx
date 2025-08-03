
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { Button } from '@/components/ui/button';
import { Download, Terminal } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


type ResultWithSectionRank = ResultType & { sectionRank?: number };

export default function ResultsPage() {
    const { user, userProfile } = useAuth();
    const { toast } = useToast();
    const { isSiteAdmin, isClubAdmin, loading: adminLoading } = useAdminAuth();

    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [seriesForClub, setSeriesForClub] = useState<Series[]>([]);
    const [matchesForSeries, setMatchesForSeries] = useState<Match[]>([]);
    const [resultsForMatch, setResultsForMatch] = useState<ResultWithSectionRank[]>([]);

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
                if (isSiteAdmin) {
                    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
                    const clubsSnapshot = await getDocs(clubsQuery);
                    const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
                    setAllClubs(clubsData);
                    if (userProfile?.primaryClubId) {
                      setSelectedClubId(userProfile.primaryClubId);
                    }
                } else if (userProfile?.primaryClubId) {
                    const clubDocRef = doc(firestore, 'clubs', userProfile.primaryClubId);
                    const clubDoc = await getDoc(clubDocRef);
                    if (clubDoc.exists()) {
                        const primaryClub = { id: clubDoc.id, ...clubDoc.data() } as Club;
                        setAllClubs([primaryClub]);
                        setSelectedClubId(primaryClub.id);
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

    }, [user, userProfile, isSiteAdmin, adminLoading, toast]);

    // Step 2: Handle Club Selection -> Fetch Series
    useEffect(() => {
        setSeriesForClub([]);
        setMatchesForSeries([]);
        setResultsForMatch([]);
        setSelectedSeriesId('');
        setSelectedMatchId('');

        if (!selectedClubId || !firestore) {
            return;
        }

        setIsLoadingSeries(true);
        const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', selectedClubId));
        const unsubscribe = onSnapshot(seriesQuery, (seriesSnapshot) => {
            const seriesData = seriesSnapshot.docs.map(s => ({ id: s.id, ...s.data() } as Series));
            setSeriesForClub(seriesData);
            setIsLoadingSeries(false);
        }, (error) => {
            console.error("Error fetching series:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch series for the selected club.' });
            setIsLoadingSeries(false);
        });

        return () => unsubscribe();
    }, [selectedClubId, toast]);

    // Step 3: Handle Series Selection -> Fetch Matches
    useEffect(() => {
        setMatchesForSeries([]);
        setResultsForMatch([]);
        setSelectedMatchId('');
        
        if (!selectedSeriesId || !firestore) {
            return;
        }

        setIsLoadingMatches(true);
        const matchesQuery = query(
            collection(firestore, 'matches'),
            where('seriesId', '==', selectedSeriesId)
        );
        
        const unsubscribe = onSnapshot(matchesQuery, (matchesSnapshot) => {
            const matchesData = matchesSnapshot.docs.map(m => ({
                id: m.id,
                ...m.data(),
                date: (m.data().date as Timestamp).toDate(),
            } as Match));
            setMatchesForSeries(matchesData);
            setIsLoadingMatches(false);
        }, (error) => {
            console.error("Error fetching matches:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch matches for the selected series.' });
            setIsLoadingMatches(false);
        });
        
        return () => unsubscribe();
    }, [selectedSeriesId, toast]);

    // Step 4: Handle Match Selection -> Fetch Results
    useEffect(() => {
        setResultsForMatch([]);

        if (!selectedMatchId || !firestore) {
            return;
        }

        setIsLoadingResults(true);
        const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', selectedMatchId));
        const unsubscribe = onSnapshot(resultsQuery, (resultsSnapshot) => {
            const resultsData = resultsSnapshot.docs.map(r => r.data() as ResultType);
            const resultsWithRanks = calculateAllRanks(resultsData);
            setResultsForMatch(resultsWithRanks);
            setIsLoadingResults(false);
        }, (error) => {
            console.error("Error fetching results:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch results for the selected match.' });
            setIsLoadingResults(false);
        });
        
        return () => unsubscribe();
    }, [selectedMatchId, toast]);
    
    const calculateAllRanks = (results: ResultType[]): ResultWithSectionRank[] => {
        // Calculate overall position
        const sortedByWeight = [...results]
          .filter(r => r.status === 'OK' && r.weight > 0)
          .sort((a, b) => b.weight - a.weight);

        const positionMap = new Map<string, number>();
        sortedByWeight.forEach((result, index) => {
          positionMap.set(result.userId, index + 1);
        });
        
        const lastOverallRank = sortedByWeight.length;
        const dnwOverallRank = lastOverallRank + 1;

        const resultsWithOverallRank = results.map(r => {
            let position: number | null = null;
            if (r.status === 'OK' && r.weight > 0) {
                position = positionMap.get(r.userId) || null;
            } else if (['DNW', 'DNF', 'DSQ'].includes(r.status || '')) {
                position = dnwOverallRank;
            }
            return { ...r, position };
        });

        // Calculate section ranks
        const finalResults: ResultWithSectionRank[] = resultsWithOverallRank.map(r => ({ ...r }));
        
        const resultsBySection: { [key: string]: ResultWithSectionRank[] } = {};
        finalResults.forEach(result => {
            const section = result.section || 'default';
            if (!resultsBySection[section]) {
                resultsBySection[section] = [];
            }
            resultsBySection[section].push(result);
        });

        for (const sectionKey in resultsBySection) {
            const sectionResults = resultsBySection[sectionKey];
            
            const sectionSortedByWeight = sectionResults
                .filter(r => r.status === 'OK' && r.weight > 0)
                .sort((a, b) => b.weight - a.weight);

            const lastSectionRank = sectionSortedByWeight.length;
            const dnwSectionRank = lastSectionRank + 1;

            sectionResults.forEach(result => {
                const originalIndex = finalResults.findIndex(r => r.userId === result.userId && r.matchId === result.matchId);
                if (originalIndex !== -1) {
                    if (result.status === 'OK' && result.weight > 0) {
                        const rank = sectionSortedByWeight.findIndex(r => r.userId === result.userId);
                        finalResults[originalIndex].sectionRank = rank !== -1 ? rank + 1 : undefined;
                    } else if (['DNW', 'DNF', 'DSQ'].includes(result.status || '')) {
                        finalResults[originalIndex].sectionRank = dnwSectionRank;
                    }
                }
            });
        }
    
        return finalResults;
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
                return (a.sectionRank || 999) - (b.sectionRank || 999);
            });
        }
        if (sortBy === 'Peg') {
             return resultsCopy.sort((a, b) => {
                const pegA = a.peg || '';
                const pegB = b.peg || '';
                return pegA.localeCompare(pegB, undefined, { numeric: true, sensitivity: 'base' });
            });
        }
        return resultsCopy;
    }, [resultsForMatch, sortBy]);

    const handleDownloadPdf = () => {
        if (sortedResults.length === 0 || !selectedMatchId) return;
        
        const selectedMatch = matchesForSeries.find(m => m.id === selectedMatchId);
        const selectedClub = allClubs.find(c => c.id === selectedClubId);
        if (!selectedMatch || !selectedClub) return;

        const doc = new jsPDF({ unit: 'mm' });
        const paidPlaces = selectedMatch.paidPlaces || 0;
        
        const clubTitle = selectedClub.name;
        const matchTitle = `Full Results: ${selectedMatch.name}`;
        const subtitle = `${selectedMatch.seriesName} - ${format(selectedMatch.date as Date, 'PPP')}`;

        doc.setFontSize(22);
        doc.text(clubTitle, 14, 22);
        doc.setFontSize(16);
        doc.text(matchTitle, 14, 30);
        doc.setFontSize(12);
        doc.text(subtitle, 14, 38);
        
        (doc as any).autoTable({
            startY: 45,
            head: [['Overall', 'Name', 'Kg', 'Peg', 'Section', 'Sec Rank', 'Payout', 'Status']],
            body: sortedResults.map(r => [
                r.position,
                r.userName,
                r.weight.toFixed(3),
                r.peg || '',
                r.section || '',
                r.sectionRank || '',
                r.payout ? `¤${r.payout.toFixed(2)}` : '-',
                r.status || 'OK'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [34, 49, 63] },
            didParseCell: function(data: any) {
                const row = data.row;
                const position = row.cells[0].raw;
                if (typeof position === 'number' && position > 0 && position <= paidPlaces) {
                    data.cell.styles.fillColor = '#dcfce7'; // green-100
                }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(10);
        doc.text("Results by MATCHMANAGER.ME", 14, finalY + 10);

        doc.save(`results-${selectedMatch.name.replace(/\s+/g, '-')}.pdf`);
    };

    const renderResultsList = () => {
        const selectedMatch = matchesForSeries.find(m => m.id === selectedMatchId);
        const paidPlaces = selectedMatch?.paidPlaces || 0;

        if (isLoadingResults) {
            return Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
            ));
        }

        if (sortedResults.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                       {selectedMatchId ? "No results found for this match." : "Select a match to view results."}
                    </TableCell>
                </TableRow>
            );
        }

        return sortedResults.map(result => {
            const isPaidPlace = result.position !== null && paidPlaces > 0 && result.position <= paidPlaces;
            return (
                <TableRow 
                    key={result.userId}
                    className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}
                >
                    <TableCell>{result.position}</TableCell>
                    <TableCell className="font-medium">{result.userName}</TableCell>
                    <TableCell>{result.peg || '-'}</TableCell>
                    <TableCell>{result.section || '-'}</TableCell>
                    <TableCell>{result.sectionRank || '-'}</TableCell>
                    <TableCell>{result.weight.toFixed(3)}</TableCell>
                    <TableCell>{result.payout ? `¤${result.payout.toFixed(2)}` : '-'}</TableCell>
                    <TableCell><Badge variant="outline">{result.status || 'OK'}</Badge></TableCell>
                </TableRow>
            );
        });
    };
    
    if (adminLoading) {
      return <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-6 w-3/4" />
        <Card><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    }

    if (userProfile?.memberStatus === 'Pending' && !isSiteAdmin && !isClubAdmin) {
      return (
          <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>
                  Your membership is currently pending approval. You do not have permission to view this page.
              </AlertDescription>
          </Alert>
      );
    }

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
                    <div className="flex flex-wrap items-end gap-4 mb-6">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="club-filter">Club</Label>
                            <Select 
                                value={selectedClubId} 
                                onValueChange={(value) => setSelectedClubId(value)}
                                disabled={isLoadingClubs || allClubs.length === 0}
                            >
                                <SelectTrigger id="club-filter" className="w-[200px]">
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
                                onValueChange={(value) => setSelectedSeriesId(value)}
                                disabled={!selectedClubId || isLoadingSeries}
                            >
                                <SelectTrigger id="series-filter" className="w-[200px]">
                                    <SelectValue placeholder="Select a series..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {isLoadingSeries ? (
                                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                                    ) : seriesForClub.length === 0 && selectedClubId ? (
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
                                onValueChange={(value) => setSelectedMatchId(value)}
                                disabled={!selectedSeriesId || isLoadingMatches}
                            >
                                <SelectTrigger id="match-filter" className="w-[200px]">
                                    <SelectValue placeholder="Select a match..." />
                                </SelectTrigger>
                                <SelectContent>
                                     {isLoadingMatches ? (
                                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                                     ) : matchesForSeries.length === 0 && selectedSeriesId ? (
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
                                <SelectTrigger id="sort-by" className="w-[180px]">
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
                                <TableHead>Section Rank</TableHead>
                                <TableHead>Weight (Kg)</TableHead>
                                <TableHead>Payout</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {renderResultsList()}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-6">
                    <Button
                        onClick={handleDownloadPdf}
                        disabled={sortedResults.length === 0}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
