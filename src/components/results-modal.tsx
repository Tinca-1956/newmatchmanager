
'use client';

import { useState, useEffect } from 'react';
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
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Match, Result } from '@/lib/types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
}

type ResultWithSectionRank = Result & { sectionRank?: number };

export function ResultsModal({ isOpen, onClose, match }: ResultsModalProps) {
  const [results, setResults] = useState<ResultWithSectionRank[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && match && firestore) {
      const fetchResults = async () => {
        setIsLoading(true);
        try {
          const resultsQuery = query(
            collection(firestore, 'results'),
            where('matchId', '==', match.id),
            orderBy('position', 'asc')
          );
          const resultsSnapshot = await getDocs(resultsQuery);
          const resultsData = resultsSnapshot.docs.map(doc => doc.data() as Result);
          
          // Calculate section ranks
          const resultsBySection: { [key: string]: Result[] } = {};
          resultsData.forEach(result => {
              if (result.section) {
                  if (!resultsBySection[result.section]) {
                      resultsBySection[result.section] = [];
                  }
                  resultsBySection[result.section].push(result);
              }
          });

          const rankedResults: ResultWithSectionRank[] = [...resultsData];

          for (const section in resultsBySection) {
              const sectionResults = resultsBySection[section]
                  .filter(r => r.weight > 0)
                  .sort((a, b) => b.weight - a.weight);
              
              sectionResults.forEach((result, index) => {
                  const originalResult = rankedResults.find(r => r.userId === result.userId);
                  if (originalResult) {
                      originalResult.sectionRank = index + 1;
                  }
              });
          }

          setResults(rankedResults);
        } catch (error) {
          console.error("Error fetching match results:", error);
          // Handle toast notification here if needed
        } finally {
          setIsLoading(false);
        }
      };
      fetchResults();
    }
  }, [isOpen, match]);

  const handleDownloadPdf = () => {
    if (!match || results.length === 0) return;
    
    const doc = new jsPDF();
    
    const title = `Full Results: ${match.name}`;
    const subtitle = `${match.seriesName} - ${format(match.date as Date, 'PPP')}`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(12);
    doc.text(subtitle, 14, 30);
    
    (doc as any).autoTable({
        startY: 40,
        head: [['Overall', 'Name', 'Kg', 'Peg', 'Section', 'Section Rank', 'Status']],
        body: results.map(r => [
            r.position,
            r.userName,
            r.weight.toFixed(3),
            r.peg || '',
            r.section || '',
            r.sectionRank || '',
            r.status || 'OK'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 49, 63] }
    });

    doc.save(`results-${match.name.replace(/\s+/g, '-')}.pdf`);
  };

  if (!match) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Full Results: {match.name}</DialogTitle>
          <DialogDescription>
            {match.seriesName} - {format(match.date as Date, 'PPP')}
          </DialogDescription>
        </DialogHeader>

        {/* Placeholder for Sort Results dropdown */}
        <div className="py-4">
            {/* <Select defaultValue="overall">
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort Results" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="overall">Overall</SelectItem>
                    <SelectItem value="section">By Section</SelectItem>
                </SelectContent>
            </Select> */}
        </div>
        
        <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-6">
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
                ) : (
                    results.map((result) => (
                    <TableRow key={result.userId}>
                        <TableCell>
                            <Badge variant="secondary" className="rounded-full w-8 h-8 flex items-center justify-center">{result.position}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{result.userName}</TableCell>
                        <TableCell>{result.weight.toFixed(3)}</TableCell>
                        <TableCell>{result.peg || '-'}</TableCell>
                        <TableCell>{result.section || '-'}</TableCell>
                        <TableCell>{result.sectionRank || '-'}</TableCell>
                        <TableCell>
                            <Badge variant={result.status === 'OK' ? 'outline' : 'destructive'}>{result.status}</Badge>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
            </ScrollArea>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={handleDownloadPdf} disabled={results.length === 0}>
            Download as PDF
          </Button>
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
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

    