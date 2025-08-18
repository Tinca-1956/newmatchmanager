
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
  TableHead,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, doc, getDocs, writeBatch } from 'firebase/firestore';
import type { Match, User, Result } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface DrawPegsModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
}

interface AnglerDrawData {
  userId: string;
  userName: string;
  peg: string;
  section: string;
  resultDocId?: string; // Existing result document ID
}

async function getDocsInChunks<T extends { id: string }>(ids: string[], collectionName: string): Promise<Map<string, T>> {
    if (!ids.length) return new Map();
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) {
        chunks.push(ids.slice(i, i + 30));
    }

    const resultsMap = new Map<string, T>();
    for (const chunk of chunks) {
        if (chunk.length === 0) continue;
        const q = query(collection(firestore, collectionName), where('__name__', 'in', chunk));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => resultsMap.set(doc.id, { id: doc.id, ...doc.data() } as T));
    }
    return resultsMap;
}

export function DrawPegsModal({ isOpen, onClose, match }: DrawPegsModalProps) {
  const [anglerData, setAnglerData] = useState<AnglerDrawData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && match && firestore) {
      const fetchAnglerData = async () => {
        setIsLoading(true);
        if (!match.registeredAnglers || match.registeredAnglers.length === 0) {
            setAnglerData([]);
            setIsLoading(false);
            return;
        }

        try {
          const usersMap = await getDocsInChunks<User>(match.registeredAnglers, 'users');
          
          const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', match.id));
          const resultsSnapshot = await getDocs(resultsQuery);
          const resultsMap = new Map(resultsSnapshot.docs.map(doc => [doc.data().userId, { id: doc.id, ...doc.data() } as Result & { id: string }]));

          const data = match.registeredAnglers.map(id => {
            const user = usersMap.get(id);
            const result = resultsMap.get(id);
            return {
              userId: id,
              userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown Angler',
              peg: result?.peg || '',
              section: result?.section || '',
              resultDocId: result?.id,
            };
          }).filter(item => usersMap.has(item.userId));

          setAnglerData(data);
        } catch (error) {
          console.error("Error fetching angler data:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load angler data.' });
        } finally {
          setIsLoading(false);
        }
      };
      fetchAnglerData();
    }
  }, [isOpen, match, toast]);

  const handleInputChange = (userId: string, field: 'peg' | 'section', value: string) => {
    setAnglerData(prev =>
      prev.map(angler =>
        angler.userId === userId ? { ...angler, [field]: value } : angler
      )
    );
  };
  
  const handleSavePegs = async () => {
    if (!match || !firestore) return;
    setIsSaving(true);
    try {
        const batch = writeBatch(firestore);

        anglerData.forEach(angler => {
            if (angler.resultDocId) {
                // Update existing result document
                const resultRef = doc(firestore, 'results', angler.resultDocId);
                batch.update(resultRef, { peg: angler.peg, section: angler.section });
            } else {
                // Create new result document if one doesn't exist
                const newResultRef = doc(collection(firestore, 'results'));
                batch.set(newResultRef, {
                    matchId: match.id,
                    seriesId: match.seriesId,
                    clubId: match.clubId,
                    date: match.date,
                    userId: angler.userId,
                    userName: angler.userName,
                    peg: angler.peg,
                    section: angler.section,
                    weight: 0,
                    status: 'NYW',
                    position: null,
                    payout: 0,
                });
            }
        });
        
        await batch.commit();
        toast({ title: 'Success', description: 'Pegs and sections have been saved.' });
        onClose();
    } catch (error) {
        console.error("Error saving pegs:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save peg data.' });
    } finally {
        setIsSaving(false);
    }
  };

  if (!match) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-auto max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Draw Pegs: {match.name}</DialogTitle>
          <DialogDescription>
            Assign pegs and sections to the registered anglers.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="start-peg">START#</Label>
            <Input id="start-peg" type="number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-peg">END#</Label>
            <Input id="end-peg" type="number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exclude-pegs">EXCL#</Label>
            <Input id="exclude-pegs" placeholder="e.g. 5,12,19" />
          </div>
        </div>
        
        <div className="flex-grow overflow-hidden pt-4">
             <ScrollArea className="h-full pr-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Angler Name</TableHead>
                            <TableHead className="w-[100px]">Peg</TableHead>
                            <TableHead className="w-[100px]">Section</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({length: 5}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : anglerData.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">
                                    No anglers are registered for this match.
                                </TableCell>
                            </TableRow>
                        ) : (
                            anglerData.map(angler => (
                                <TableRow key={angler.userId}>
                                    <TableCell className="font-medium align-middle">{angler.userName}</TableCell>
                                    <TableCell>
                                        <Input 
                                            value={angler.peg}
                                            onChange={(e) => handleInputChange(angler.userId, 'peg', e.target.value)}
                                            placeholder="Peg #"
                                        />
                                    </TableCell>
                                    <TableCell>
                                         <Input 
                                            value={angler.section}
                                            onChange={(e) => handleInputChange(angler.userId, 'section', e.target.value)}
                                            placeholder="Section"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>

        <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={onClose}>
                Cancel
            </Button>
            <Button onClick={handleSavePegs} disabled={isSaving || isLoading}>
                {isSaving ? 'Saving...' : 'Save Pegs'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
