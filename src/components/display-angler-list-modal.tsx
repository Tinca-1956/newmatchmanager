
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
  TableHeader,
  TableRow,
  TableHead
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Match, User, Result } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface DisplayAnglerListModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
}

interface AnglerDetails {
    id: string;
    firstName: string;
    lastName: string;
    peg?: string;
    section?: string;
}

// Helper function to fetch documents in chunks
async function getDocsInChunks<T>(ids: string[], collectionName: string): Promise<T[]> {
    if (!ids.length) return [];
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) {
        chunks.push(ids.slice(i, i + 30));
    }

    const results: T[] = [];
    for (const chunk of chunks) {
        const usersQuery = query(collection(firestore, collectionName), where('__name__', 'in', chunk));
        const snapshot = await getDocs(usersQuery);
        snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() } as T));
    }
    return results;
}

export function DisplayAnglerListModal({ isOpen, onClose, match }: DisplayAnglerListModalProps) {
  const [anglerDetails, setAnglerDetails] = useState<AnglerDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && match && firestore) {
      const fetchAnglerDetails = async () => {
        setIsLoading(true);
        if (!match.registeredAnglers || match.registeredAnglers.length === 0) {
            setAnglerDetails([]);
            setIsLoading(false);
            return;
        }

        try {
          // Fetch user documents for registered anglers in chunks
          const usersData = await getDocsInChunks<User>(match.registeredAnglers, 'users');

          // Fetch results for the match to get peg and section
          const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', match.id));
          const resultsSnapshot = await getDocs(resultsQuery);
          const resultsData = resultsSnapshot.docs.map(d => d.data() as Result);
          const resultsMap = new Map(resultsData.map(r => [r.userId, r]));

          // Combine the data
          const combinedDetails = usersData.map(user => {
            const result = resultsMap.get(user.id);
            return {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                peg: result?.peg || '-',
                section: result?.section || '-',
            };
          });

          setAnglerDetails(combinedDetails);
        } catch (error) {
          console.error("Error fetching angler details:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load angler details.' });
        } finally {
          setIsLoading(false);
        }
      };
      fetchAnglerDetails();
    }
  }, [isOpen, match, toast]);
  
  const handleDownloadPdf = () => {
    if (!match || anglerDetails.length === 0) return;
    
    const doc = new jsPDF();
    
    const title = `Angler List: ${match.name}`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    (doc as any).autoTable({
        startY: 30,
        head: [['First Name', 'Last Name', 'Section', 'Peg']],
        body: anglerDetails.map(a => [
            a.firstName,
            a.lastName,
            a.section,
            a.peg
        ]),
        theme: 'grid',
        styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [34, 49, 63], textColor: [255, 255, 255] }
    });

    doc.save(`angler-list-${match.name.replace(/\s+/g, '-')}.pdf`);
  };

  if (!match) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Angler List: {match.name}</DialogTitle>
          <DialogDescription>
            A view-only list of anglers registered for this match.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-hidden pt-4">
             <ScrollArea className="h-full pr-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>First Name</TableHead>
                            <TableHead>Last Name</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead>Peg</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({length: 5}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                </TableRow>
                            ))
                        ) : anglerDetails.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">
                                    No anglers are registered for this match yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            anglerDetails.map(angler => (
                                <TableRow key={angler.id}>
                                    <TableCell>{angler.firstName}</TableCell>
                                    <TableCell>{angler.lastName}</TableCell>
                                    <TableCell>{angler.section}</TableCell>
                                    <TableCell>{angler.peg}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>

        <DialogFooter className="pt-4">
            <Button variant="outline" onClick={handleDownloadPdf} disabled={anglerDetails.length === 0}>
                <Download className="mr-2 h-4 w-4" />
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
