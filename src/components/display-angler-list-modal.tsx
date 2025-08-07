
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
import type { Match, User, Club } from '@/lib/types';
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
}

export function DisplayAnglerListModal({ isOpen, onClose, match }: DisplayAnglerListModalProps) {
  const [anglerDetails, setAnglerDetails] = useState<AnglerDetails[]>([]);
  const [club, setClub] = useState<Club | null>(null);
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
          // Fetch Club info
          const clubDocRef = doc(firestore, 'clubs', match.clubId);
          const clubDoc = await getDoc(clubDocRef);
          if (clubDoc.exists()) {
            setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
          }

          // Fetch all users in the club, just like the working "Add Anglers" modal
          const usersQuery = query(collection(firestore, 'users'), where('primaryClubId', '==', match.clubId));
          const usersSnapshot = await getDocs(usersQuery);
          const allClubUsers = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
          
          // Filter the full list to get only the registered anglers
          const registeredAnglerIds = new Set(match.registeredAnglers);
          const registeredUsers = allClubUsers.filter(user => registeredAnglerIds.has(user.id));

          const combinedDetails = registeredUsers.map(user => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
          }));

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
    if (!match || anglerDetails.length === 0 || !club) return;
    
    const doc = new jsPDF({ unit: 'mm' });
    
    const clubTitle = club.name;
    const title = `Angler List: ${match.name}`;
    
    doc.setFontSize(22);
    doc.text(clubTitle, 14, 22);
    doc.setFontSize(18);
    doc.text(title, 14, 30);
    
    (doc as any).autoTable({
        startY: 40,
        head: [['Angler Name', 'Section', 'Peg', 'Weight (kg)', 'Match Fee', 'Pool Fee', 'Payout']],
        body: anglerDetails.map(a => [
            `${a.firstName} ${a.lastName}`,
            '', // Blank for Section
            '', // Blank for Peg
            '', // Blank for Weight
            '', // Blank for Match Fee
            '', // Blank for Pool Fee
            '', // Blank for Payout
        ]),
        theme: 'grid',
        styles: { 
            lineColor: [0, 0, 0], // Black grid lines
            lineWidth: 0.1,
            minCellHeight: 8 // Set row height to 8mm
        },
        headStyles: { 
            fillColor: [34, 49, 63], 
            textColor: [255, 255, 255]
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.text("Results by MATCHMANAGER.ME", 14, finalY + 10);

    doc.save(`angler-list-${match.name.replace(/\s+/g, '-')}.pdf`);
  };

  if (!match) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Angler List: {match.name}</DialogTitle>
          <DialogDescription>
            A printable list of registered anglers for pre-match administration.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-hidden pt-4">
             <ScrollArea className="h-full pr-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Angler Name</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead>Peg</TableHead>
                            <TableHead>Weight (kg)</TableHead>
                            <TableHead>Match Fee</TableHead>
                            <TableHead>Pool Fee</TableHead>
                            <TableHead>Payout</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({length: 5}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                </TableRow>
                            ))
                        ) : anglerDetails.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">
                                    No anglers are registered for this match yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            anglerDetails.map(angler => (
                                <TableRow key={angler.id}>
                                    <TableCell className="font-medium">{angler.firstName} {angler.lastName}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>

        <DialogFooter className="pt-4 sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Results by MATCHMANAGER.ME
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPdf} disabled={anglerDetails.length === 0}>
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
