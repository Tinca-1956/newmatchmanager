
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
import { Shuffle, ArrowDownUp } from 'lucide-react';
import { Textarea } from './ui/textarea';

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

  const [startPeg, setStartPeg] = useState('');
  const [endPeg, setEndPeg] = useState('');
  const [excludePegs, setExcludePegs] = useState('');
  const [pegList, setPegList] = useState('');


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
  
  const handleShuffle = () => {
    setAnglerData(prev => {
        const shuffled = [...prev];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    });
  };
  
  const handleCreatePegList = () => {
    const start = parseInt(startPeg, 10);
    const end = parseInt(endPeg, 10);

    if (isNaN(start) || isNaN(end) || start > end) {
        toast({
            variant: 'destructive',
            title: 'Invalid Range',
            description: 'Please enter a valid start and end number for the peg range.',
        });
        return;
    }

    const excluded = excludePegs.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
    const excludedSet = new Set(excluded);

    const newList = [];
    for (let i = start; i <= end; i++) {
        if (!excludedSet.has(i)) {
            newList.push(i);
        }
    }
    setPegList(newList.join(', '));
  };
  
   const handleAssignPegs = () => {
    let availablePegs = pegList.split(',').map(p => p.trim()).filter(p => p !== '');
    if (availablePegs.length < anglerData.length) {
      toast({
        variant: 'destructive',
        title: 'Not Enough Pegs',
        description: `There are ${availablePegs.length} pegs in the list, but ${anglerData.length} anglers need a peg.`,
      });
      return;
    }

    // Shuffle the available pegs for random assignment
    for (let i = availablePegs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePegs[i], availablePegs[j]] = [availablePegs[j], availablePegs[i]];
    }
    
    const updatedAnglerData = anglerData.map((angler, index) => {
        return { ...angler, peg: availablePegs[index] };
    });
    
    const remainingPegs = availablePegs.slice(anglerData.length);

    setAnglerData(updatedAnglerData);
    setPegList(remainingPegs.join(', '));

    toast({
        title: 'Pegs Assigned',
        description: 'Pegs have been randomly assigned to all anglers.'
    })
  };

  const handleSortByPeg = () => {
    setAnglerData(prev => {
        const sorted = [...prev].sort((a, b) => {
            const pegA = parseInt(a.peg, 10);
            const pegB = parseInt(b.peg, 10);

            if (isNaN(pegA) && isNaN(pegB)) return 0; // Both non-numeric, keep order
            if (isNaN(pegA)) return 1; // Put non-numeric pegs at the end
            if (isNaN(pegB)) return -1; // Keep non-numeric pegs at the end

            return pegA - pegB;
        });
        return sorted;
    });
    toast({
        title: 'Sorted by Peg',
        description: 'The angler list has been sorted by peg number.'
    });
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
          <DialogTitle className="text-2xl">Draw Pegs: {match.name} (Capacity = {match.capacity})</DialogTitle>
          <DialogDescription>
            Assign pegs and sections to the registered anglers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="start-peg">START#</Label>
              <Input id="start-peg" type="number" value={startPeg} onChange={e => setStartPeg(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-peg">END#</Label>
              <Input id="end-peg" type="number" value={endPeg} onChange={e => setEndPeg(e.target.value)} />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="exclude-pegs">EXCL#</Label>
              <Input id="exclude-pegs" placeholder="e.g. 5,12" value={excludePegs} onChange={e => setExcludePegs(e.target.value)}/>
            </div>
             <Button onClick={handleCreatePegList} variant="outline" className="w-full">
                Create List
            </Button>
            <Button onClick={handleShuffle} variant="outline" className="w-full">
              <Shuffle className="mr-2 h-4 w-4" />
              Shuffle
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="peg-list">PEG LIST</Label>
            <Textarea id="peg-list" value={pegList} readOnly className="min-h-[80px]" />
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

        <DialogFooter className="pt-4 items-center justify-between w-full">
            <div className="flex gap-2">
                <Button onClick={handleAssignPegs} variant="secondary" disabled={pegList.length === 0}>
                    Assign Pegs
                </Button>
                <Button onClick={handleSortByPeg} variant="secondary" disabled={anglerData.length === 0}>
                    <ArrowDownUp className="mr-2 h-4 w-4" />
                    Sort by Peg
                </Button>
            </div>
            <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>
                    Cancel
                </Button>
                <Button onClick={handleSavePegs} disabled={isSaving || isLoading}>
                    {isSaving ? 'Saving...' : 'Save Pegs'}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
