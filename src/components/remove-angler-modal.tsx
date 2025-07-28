
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
import { collection, query, where, getDocs, doc, updateDoc, arrayRemove, increment } from 'firebase/firestore';
import type { Match, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

interface RemoveAnglerModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
}

interface AnglerDetails {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
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

export function RemoveAnglerModal({ isOpen, onClose, match }: RemoveAnglerModalProps) {
  const [registeredAnglers, setRegisteredAnglers] = useState<AnglerDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRegisteredAnglers = async () => {
      if (isOpen && match && firestore) {
        setIsLoading(true);
        if (!match.registeredAnglers || match.registeredAnglers.length === 0) {
            setRegisteredAnglers([]);
            setIsLoading(false);
            return;
        }

        try {
          const usersData = await getDocsInChunks<AnglerDetails>(match.registeredAnglers, 'users');
          setRegisteredAnglers(usersData);
        } catch (error) {
          console.error("Error fetching registered anglers:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load registered anglers.' });
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchRegisteredAnglers();
  }, [isOpen, match, toast]);

  const handleRemoveAngler = async (anglerId: string) => {
    if (!match || !firestore) return;

    setIsDeleting(anglerId);
    try {
        const matchDocRef = doc(firestore, 'matches', match.id);
        await updateDoc(matchDocRef, {
            registeredAnglers: arrayRemove(anglerId),
            registeredCount: increment(-1)
        });

        setRegisteredAnglers(prev => prev.filter(angler => angler.id !== anglerId));
        toast({ title: 'Success', description: 'Angler has been removed from the match.' });
    } catch (error) {
        console.error("Error removing angler:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the angler.' });
    } finally {
        setIsDeleting(null);
    }
  };

  if (!match) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Remove Anglers from: {match.name}</DialogTitle>
          <DialogDescription>
            Click the delete button to instantly remove an angler from this match. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-hidden pt-4">
             <ScrollArea className="h-full pr-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Angler</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({length: 4}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-9 w-24" /></TableCell>
                                </TableRow>
                            ))
                        ) : registeredAnglers.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={2} className="text-center h-24">
                                    No anglers are registered for this match.
                                </TableCell>
                            </TableRow>
                        ) : (
                            registeredAnglers.map(angler => (
                                <TableRow key={angler.id}>
                                    <TableCell className="font-medium">
                                        <div>
                                            <p>{`${angler.firstName} ${angler.lastName}`}</p>
                                            <p className="text-xs text-muted-foreground">{angler.email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            variant="destructive" 
                                            size="sm"
                                            onClick={() => handleRemoveAngler(angler.id)}
                                            disabled={isDeleting === angler.id}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            {isDeleting === angler.id ? 'Deleting...' : 'Delete'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>

        <DialogFooter className="pt-4">
            <Button variant="outline" onClick={onClose}>
                Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
