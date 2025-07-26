
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import type { Match, Result as ResultType } from '@/lib/types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Download, ArrowLeft } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';


type ResultWithSectionRank = ResultType & { sectionRank?: number };

export default function MobileResultsPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const matchId = params.matchId as string;

    const [match, setMatch] = useState<Match | null>(null);
    const [results, setResults] = useState<ResultWithSectionRank[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'Overall' | 'Section' | 'Peg'>('Overall');

    useEffect(() => {
        if (!matchId || !firestore) {
            setIsLoading(false);
            return;
        }
        
        const fetchMatchAndResults = async () => {
            setIsLoading(true);
            try {
                // Fetch match details
                const matchDocRef = doc(firestore, 'matches', matchId);
                const matchDoc = await getDoc(matchDocRef);
                if (matchDoc.exists()) {
                    const matchData = matchDoc.data();
                     setMatch({ 
                        id: matchDoc.id,
                        ...matchData,
                        date: (matchData.date as Timestamp).toDate(),
                    } as Match);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Match not found.' });
                    router.back();
                    return;
                }

                // Fetch results
                const resultsQuery = query(
                    collection(firestore, 'results'),
                    where('matchId', '==', matchId)
                );
                const resultsSnapshot = await getDocs(resultsQuery);
                const resultsData = resultsSnapshot.docs.map(doc => doc.data() as ResultType);
                
                // Calculate section ranks
                const resultsBySection: { [key: string]: ResultType[] } = {};
                resultsData.forEach(result => {
                    if (result.section) {
                        if (!resultsBySection[result.section]) {
                            resultsBySection[result.section] = [];
                        }
                        resultsBySection[result.section].push(result);
                    }
                });

                const rankedResults: ResultWithSectionRank[] = [...resultsData].map(r => ({...r}));

                for (const section in resultsBySection) {
                    const sectionResults = resultsBySection[section]
                        .filter(r => r.status === 'OK' && r.weight > 0)
                        .sort((a, b) => b.weight - a.weight);
                    
                    const lastSectionRank = sectionResults.length;
                    const dnwSectionRank = lastSectionRank + 1;

                    resultsBySection[section].forEach(result => {
                        const originalResult = rankedResults.find(r => r.userId === result.userId);
                        if (originalResult) {
                            if(result.status === 'OK' && result.weight > 0) {
                                const rank = sectionResults.findIndex(r => r.userId === result.userId);
                                originalResult.sectionRank = rank !== -1 ? rank + 1 : undefined;
                            } else if (['DNW', 'DNF', 'DSQ'].includes(result.status || '')) {
                                originalResult.sectionRank = dnwSectionRank;
                            }
                        }
                    });
                }
                
                setResults(rankedResults);
            } catch (error) {
                console.error("Error fetching match results:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load results.'});
            } finally {
                setIsLoading(false);
            }
        };
        fetchMatchAndResults();
    }, [matchId, router, toast]);

    const sortedResults = useMemo(() => {
        const resultsCopy = [...results];
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
    }, [results, sortBy]);

    const handleDownloadPdf = () => {
        if (!match || sortedResults.length === 0) return;
        
        const doc = new jsPDF();
        
        const title = `Full Results: ${match.name}`;
        const subtitle = `${match.seriesName} - ${format(match.date as Date, 'PPP')}`;
        const paidPlaces = match?.paidPlaces || 0;

        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(12);
        doc.text(subtitle, 14, 30);
        
        (doc as any).autoTable({
            startY: 40,
            head: [['Overall', 'Name', 'Kg', 'Peg', 'Section', 'Section Rank', 'Status']],
            body: sortedResults.map(r => [
                r.position,
                r.userName,
                r.weight.toFixed(3),
                r.peg || '',
                r.section || '',
                r.sectionRank || '',
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
        doc.text("NOTE: Anglers highlighted are those that are in overall paid places.", 14, finalY + 10);

        doc.save(`results-${match.name.replace(/\s+/g, '-')}.pdf`);
    };

    const paidPlaces = match?.paidPlaces || 0;

    return (
        <Card className="h-full flex flex-col border-0 shadow-none rounded-none">
             <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                     <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                        {isLoading ? <Skeleton className="h-7 w-48 mb-2" /> : <CardTitle>{match?.name}</CardTitle>}
                        {isLoading ? <Skeleton className="h-5 w-64" /> : <CardDescription>{match?.seriesName} - {match?.date ? format(match.date, 'PPP') : ''}</CardDescription>}
                    </div>
                    <div className="w-10"></div>
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow overflow-hidden">
                <div className="flex justify-end mb-4">
                    <div className="flex flex-col gap-1.5 w-[180px]">
                        <Label htmlFor="sort-by">Sort by</Label>
                        <Select
                            value={sortBy}
                            onValueChange={(value) => setSortBy(value as 'Overall' | 'Section' | 'Peg')}
                            disabled={results.length === 0}
                        >
                            <SelectTrigger id="sort-by">
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
                <ScrollArea className="h-[calc(100%-68px)]">
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
                        {isLoading ? (
                            Array.from({ length: 10 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            </TableRow>
                            ))
                        ) : sortedResults.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">
                                    No results have been recorded for this match yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedResults.map((result) => {
                            const isPaidPlace = result.position !== null && paidPlaces > 0 && result.position <= paidPlaces;
                            return (
                                <TableRow 
                                key={result.userId}
                                className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}
                                >
                                    <TableCell>
                                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">
                                            {result.position || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{result.userName}</TableCell>
                                    <TableCell>{result.weight.toFixed(3)}</TableCell>
                                    <TableCell>{result.peg || '-'}</TableCell>
                                    <TableCell>{result.section || '-'}</TableCell>
                                    <TableCell>{result.sectionRank || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={result.status === 'OK' ? 'outline' : 'secondary'}>{result.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            )
                            })
                        )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-4 flex-col items-start gap-4">
                 <p className="text-xs text-muted-foreground">
                    NOTE: Anglers highlighted are those in overall paid places.
                </p>
                <Button variant="outline" onClick={handleDownloadPdf} disabled={sortedResults.length === 0} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download as PDF
                </Button>
            </CardFooter>
        </Card>
    );
}

declare global {
  interface Window {
    jsPDF: any;
  }
}
