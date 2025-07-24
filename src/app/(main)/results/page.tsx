

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, QueryConstraint, Timestamp } from 'firebase/firestore';
import type { Club, User, Result, Series, Match, MatchStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cn } from '@/lib/utils';


interface MatchResultSummary {
  matchId: string;
  matchName: string;
  seriesName: string;
  date: Date;
  venue: string;
  winnerName: string;
  status: MatchStatus;
  paidPlaces: number;
}

type SortOption = 'Overall' | 'Section' | 'Peg';

type ResultWithSectionRank = Result & { 
  sectionPosition?: number;
  isOverallWinner?: boolean;
  isSectionWinner?: boolean;
};

const formatWeightKg = (weight: number | undefined | null): string => {
  if (weight === undefined || weight === null) return '0.000';
  return weight.toFixed(3);
};


export default function ResultsPage() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
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
  const [sortOption, setSortOption] = useState<SortOption>('Overall');
  const resultsTableRef = useRef<HTMLDivElement>(null);

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
    const clubIdParam = searchParams.get('clubId');
    if (clubIdParam) {
      setSelectedClubId(clubIdParam);
      return;
    }

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
  }, [user, authLoading, clubs, selectedClubId, searchParams]);

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
      
      const seriesIdParam = searchParams.get('seriesId');
      if (seriesData.some(s => s.id === seriesIdParam)) {
        setSelectedSeriesId(seriesIdParam!);
      } else {
        setSelectedSeriesId('all'); 
      }
      setMatchesList([]); 
      setSelectedMatchId('all');
    }, (error) => {
        console.error("Error fetching series: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch series for the selected club.'
        });
    });

    return () => unsubscribe();
  }, [selectedClubId, toast, searchParams]);
  
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
      const matchIdParam = searchParams.get('matchId');
      if (matchesData.some(m => m.id === matchIdParam)) {
        setSelectedMatchId(matchIdParam!);
      } else {
         setSelectedMatchId('all');
      }
    }, (error) => {
        console.error("Error fetching matches: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch matches for the selected series.'
        });
    });

    return () => unsubscribe();
  }, [selectedSeriesId, toast, searchParams]);


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
        
        const matchDetailsMap = new Map<string, Match>();
        if(matchIds.length > 0) {
            const chunks = [];
            for (let i = 0; i < matchIds.length; i += 30) {
                chunks.push(matchIds.slice(i, i + 30));
            }

            for (const chunk of chunks) {
                 if (chunk.length === 0) continue;
                 const matchesQuery = query(collection(firestore, 'matches'), where('__name__', 'in', chunk));
                 const matchesSnapshot = await getDocs(matchesQuery);
                 matchesSnapshot.forEach(doc => {
                    matchDetailsMap.set(doc.id, doc.data() as Match);
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
                status: match?.status || 'Completed',
                paidPlaces: match?.paidPlaces || 0,
            };
        }).sort((a,b) => b.date.getTime() - a.date.getTime()); 

        setResults(summarizedResults);
        setIsLoading(false);
        
        const viewModal = searchParams.get('view') === 'modal';
        const urlMatchId = searchParams.get('matchId');
        if (viewModal && urlMatchId && summarizedResults.length > 0) {
            const targetMatch = summarizedResults.find(r => r.matchId === urlMatchId);
            if (targetMatch) {
                handleRowClick(targetMatch);
            }
        }

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
  }, [selectedClubId, selectedSeriesId, selectedMatchId, toast, searchParams]);

  const handleRowClick = async (result: MatchResultSummary) => {
    if (!firestore) return;
    
    setSelectedMatchForModal(result);
    setSortOption('Overall'); // Reset sort on new modal open
    setIsModalOpen(true);
    setIsModalLoading(true);
    setModalResults([]);
    
    try {
      const resultsQuery = query(
        collection(firestore, 'results'),
        where('matchId', '==', result.matchId)
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

  const handleDownloadPdf = async () => {
    if (!selectedMatchForModal) {
      toast({ variant: 'destructive', title: 'Error', description: 'No match data to generate PDF.' });
      return;
    }

    const doc = new jsPDF();
    const clubName = clubs.find(c => c.id === selectedClubId)?.name || 'Match Results';
    const { seriesName, matchName, date, status } = selectedMatchForModal;

    // Header
    doc.setFontSize(18);
    doc.text(clubName, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${seriesName} - ${matchName}`, doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`${format(date, 'PPP')} - Status: ${status} - Results Sorted by ${sortOption}`, doc.internal.pageSize.getWidth() / 2, 38, { align: 'center' });
    
    // Table
    const tableData = sortedModalResults.map(r => [
      r.position || '-',
      r.userName,
      formatWeightKg(r.weight),
      r.peg || '-',
      r.section || '-',
      r.sectionPosition || '-',
      r.status || 'OK'
    ]);

    (doc as any).autoTable({
      startY: 45,
      head: [['Overall', 'Name', 'Kg', 'Peg', 'Section', 'Section Rank', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [22, 163, 74], // A green color for the header
        textColor: 255,
        fontSize: 10,
      },
      styles: {
        fontSize: 8,
        minCellHeight: 7, 
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 15 }, // Overall
        1: { cellWidth: 'auto' }, // Name
        2: { cellWidth: 20 }, // Kg
        3: { cellWidth: 15 }, // Peg
        4: { cellWidth: 15 }, // Section
        5: { cellWidth: 20 }, // Section Rank
        6: { cellWidth: 15 }, // Status
      },
      didParseCell: function (data: any) {
        const row = data.row.raw;
        const cell = data.cell;
        const result = sortedModalResults[data.row.index];
        if (data.column.index === 1) { // 'Name' column
            if (result.isOverallWinner) {
                cell.styles.textColor = [255, 0, 0]; // Red
            } else if (result.isSectionWinner) {
                cell.styles.textColor = [0, 128, 0]; // Green
            }
        }
      }
    });

    doc.save(`results-${matchName.replace(/ /g, '_')}.pdf`);
  };

  const processedModalResults = useMemo(() => {
    if (!selectedMatchForModal || modalResults.length === 0) return [];

    const resultsCopy: ResultWithSectionRank[] = modalResults.map(r => ({ ...r, isOverallWinner: false, isSectionWinner: false }));
    const paidPlaces = selectedMatchForModal.paidPlaces || 0;

    // 1. Assign overall ranks
    const rankedWithWeight = resultsCopy
      .filter(r => r.status === 'OK' && (r.weight || 0) > 0)
      .sort((a, b) => (b.weight || 0) - (a.weight || 0));
    
    rankedWithWeight.forEach((result, index) => {
        const original = resultsCopy.find(r => r.userId === result.userId);
        if (original) original.position = index + 1;
    });

    const lastPlaceRank = rankedWithWeight.length;
    resultsCopy.forEach(result => {
        if (['DNF', 'DNW', 'DSQ'].includes(result.status || '')) {
            result.position = lastPlaceRank + 1;
        }
    });

    // 2. Assign section ranks (for all anglers)
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
            .filter(r => r.status === 'OK' && (r.weight || 0) > 0)
            .sort((a, b) => (b.weight || 0) - (a.weight || 0));
        
        sectionResultsWithWeight.forEach((result, index) => {
            const original = resultsCopy.find(r => r.userId === result.userId);
            if(original) original.sectionPosition = index + 1;
        });
        
        const lastSectionRank = sectionResultsWithWeight.length;
        const dnwSectionRank = lastSectionRank + 1;
        resultsBySection[section].forEach(result => {
            if(['DNF', 'DNW', 'DSQ'].includes(result.status || '')) {
                const original = resultsCopy.find(r => r.userId === result.userId);
                if(original) original.sectionPosition = dnwSectionRank;
            }
        });
    }

    // 3. Identify overall winners for highlighting
    const overallWinnerIds = new Set<string>();
    if (paidPlaces > 0) {
        resultsCopy
            .filter(r => r.position !== null && r.position! <= paidPlaces)
            .forEach(r => {
              overallWinnerIds.add(r.userId);
              r.isOverallWinner = true;
            });
    }

    // 4. Identify section winners for highlighting (excluding overall winners)
    for (const section in resultsBySection) {
        const sectionWinner = resultsBySection[section]
            .filter(r => !overallWinnerIds.has(r.userId) && r.sectionPosition !== undefined)
            .sort((a, b) => (a.sectionPosition || Infinity) - (b.sectionPosition || Infinity))[0];
        
        if (sectionWinner) {
            const original = resultsCopy.find(r => r.userId === sectionWinner.userId);
            if (original) original.isSectionWinner = true;
        }
    }

    return resultsCopy;
  }, [modalResults, selectedMatchForModal]);

  const sortedModalResults = useMemo(() => {
    const resultsCopy = [...processedModalResults];
    switch (sortOption) {
      case 'Section':
        return resultsCopy.sort((a, b) => {
          const sectionA = a.section || '';
          const sectionB = b.section || '';
          if (sectionA < sectionB) return -1;
          if (sectionA > sectionB) return 1;
          return (a.position || Infinity) - (b.position || Infinity);
        });
      case 'Peg':
         return resultsCopy.sort((a, b) => {
          const pegA = parseInt(a.peg || '0', 10);
          const pegB = parseInt(b.peg || '0', 10);
          return pegA - pegB;
        });
      case 'Overall':
      default:
        return resultsCopy.sort((a, b) => (a.position || Infinity) - (b.position || Infinity));
    }
  }, [processedModalResults, sortOption]);

  const renderResultsList = () => {
    if (isLoading) {
      return Array.from({ length: 4 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          </TableRow>
      ));
    }

    if (results.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="h-24 text-center">
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
          <TableCell>{result.status}</TableCell>
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
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            </TableRow>
        ));
    }
    
    if (sortedModalResults.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="h-24 text-center">
            No results recorded for this match.
          </TableCell>
        </TableRow>
      );
    }

    return sortedModalResults.map((result) => (
      <TableRow key={result.userId}>
        <TableCell>
          {result.position ? <Badge variant="outline">{result.position}</Badge> : '-'}
        </TableCell>
        <TableCell className={cn("font-medium", {
            "text-red-600": result.isOverallWinner,
            "text-green-600": result.isSectionWinner,
        })}>{result.userName}</TableCell>
        <TableCell>{formatWeightKg(result.weight)}</TableCell>
        <TableCell>{result.peg || '-'}</TableCell>
        <TableCell>{result.section || '-'}</TableCell>
        <TableCell>
          {result.sectionPosition || '-'}
        </TableCell>
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
                <TableHead>Status</TableHead>
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
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Full Results: {selectedMatchForModal.matchName}</DialogTitle>
                    <DialogDescription>
                       {selectedMatchForModal.seriesName} - {format(selectedMatchForModal.date, 'PPP')}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-4">
                    <Label htmlFor="sort-results">Sort Results</Label>
                    <Select value={sortOption} onValueChange={(value: SortOption) => setSortOption(value)}>
                        <SelectTrigger id="sort-results" className="w-48">
                            <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Overall">Overall</SelectItem>
                            <SelectItem value="Section">Section</SelectItem>
                            <SelectItem value="Peg">Peg</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="mt-4 max-h-[60vh] overflow-y-auto bg-background">
                    <div ref={resultsTableRef} className="p-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Overall</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Kg</TableHead>
                                    <TableHead>Peg</TableHead>
                                    <TableHead>Section</TableHead>
                                    <TableHead>Section Rank</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderModalResults()}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={handleDownloadPdf}>Download as PDF</Button>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
