
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { collection, query, where, getDocs, orderBy, doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { Match, Result, Club } from '@/lib/types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Download } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';


interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
}

type ResultWithSectionRank = Result & { sectionRank?: number };

export function ResultsModal({ isOpen, onClose, match }: ResultsModalProps) {
  const [results, setResults] = useState<ResultWithSectionRank[]>([]);
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'Overall' | 'Section' | 'Peg'>('Overall');
  const { toast } = useToast();


  useEffect(() => {
    if (!isOpen || !match || !firestore) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    // Fetch Club info once
    const clubDocRef = doc(firestore, 'clubs', match.clubId);
    getDoc(clubDocRef).then(clubDoc => {
        if (clubDoc.exists()) {
            setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
        }
    });

    // Subscribe to real-time updates for results
    const resultsQuery = query(
      collection(firestore, 'results'),
      where('matchId', '==', match.id)
    );
    
    const unsubscribe = onSnapshot(resultsQuery, (snapshot) => {
        const resultsData = snapshot.docs.map(doc => doc.data() as Result);
        
        // Calculate ranks
        const resultsBySection: { [key: string]: Result[] } = {};
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
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching match results:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load results.' });
        setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount or when modal closes/match changes

  }, [isOpen, match, toast]);

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
    if (!match || sortedResults.length === 0 || !club) return;
    
    const doc = new jsPDF({ unit: 'mm' });
    
    const clubTitle = club.name;
    const title = `Full Results: ${match.name}`;
    const subtitle = `${match.seriesName} - ${format(match.date as Date, 'PPP')}`;
    const paidPlaces = match?.paidPlaces || 0;

    doc.setFontSize(22);
    doc.text(clubTitle, 14, 22);
    doc.setFontSize(16);
    doc.text(title, 14, 30);
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
    doc.text("NOTE: Anglers highlighted are those that are in overall paid places.", 14, finalY + 10);
    doc.text("Results by MATCHMANAGER.ME", 14, finalY + 15);

    doc.save(`results-${match.name.replace(/\s+/g, '-')}.pdf`);
  };

  if (!match) return null;
  
  const paidPlaces = match.paidPlaces || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Full Results: {match.name}</DialogTitle>
          <DialogDescription>
            {match.seriesName} - {format(match.date as Date, 'PPP')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end">
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

        <div className="relative flex-1 -mx-6 px-6">
            <ScrollArea className="absolute inset-0">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Overall</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Kg</TableHead>
                    <TableHead>Peg</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Section Rank</TableHead>
                    <TableHead>Payout</TableHead>
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
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                    ))
                ) : sortedResults.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center h-24">
                            No results have been recorded for this match yet.
                        </TableCell>
                    </TableRow>
                ) : (
                    sortedResults.map((result) => {
                      const isPaidPlace = result.position !== null && paidPlaces > 0 && result.position <= paidPlaces;
                      return (
                        <TableRow 
                          key={`${result.userId}-${result.peg}`}
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
                            <TableCell>{result.payout ? `¤${result.payout.toFixed(2)}` : '-'}</TableCell>
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
        </div>

        <DialogFooter className="pt-4 sm:justify-between">
            <div className="text-sm text-muted-foreground">
                <p>Results by MATCHMANAGER.ME</p>
                <p>NOTE: Anglers highlighted are those in overall paid places.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadPdf} disabled={sortedResults.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Download as PDF
              </Button>
              <Button variant="default" onClick={onClose}>
                Close
              </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

declare global {
  interface Window {
    jsPDF: any;
  }
}
