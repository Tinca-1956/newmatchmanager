
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
  TableHeader,
  TableRow,
  TableHead
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import type { Match, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Search } from 'lucide-react';

interface AnglerListModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string | null;
}

export function AnglerListModal({ isOpen, onClose, matchId }: AnglerListModalProps) {
  const [match, setMatch] = useState<Match | null>(null);
  const [registeredAnglers, setRegisteredAnglers] = useState<User[]>([]);
  const [availableAnglers, setAvailableAnglers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && matchId && firestore) {
      const fetchMatchAndAnglers = async () => {
        setIsLoading(true);
        try {
          // Fetch match details
          const matchDocRef = doc(firestore, 'matches', matchId);
          const matchDoc = await getDoc(matchDocRef);
          if (!matchDoc.exists()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Match not found.' });
            setIsLoading(false);
            return;
          }
          const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
          setMatch(matchData);

          // Fetch all users in the club
          const usersQuery = query(collection(firestore, 'users'), where('primaryClubId', '==', matchData.clubId));
          const usersSnapshot = await getDocs(usersQuery);
          const allClubUsers = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));

          // Separate registered vs available anglers
          const registeredIds = new Set(matchData.registeredAnglers || []);
          const registered = allClubUsers.filter(u => registeredIds.has(u.id));
          const available = allClubUsers.filter(u => !registeredIds.has(u.id));

          setRegisteredAnglers(registered);
          setAvailableAnglers(available);

        } catch (error) {
          console.error("Error fetching match/angler data:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load angler data.' });
        } finally {
          setIsLoading(false);
        }
      };
      fetchMatchAndAnglers();
    }
  }, [isOpen, matchId, toast]);

  const handleAddAngler = async (angler: User) => {
    if (!matchId || !firestore || !match) return;

    if (match.registeredCount >= match.capacity) {
        toast({
            variant: 'destructive',
            title: 'Match Full',
            description: 'Cannot add more anglers, the match has reached its capacity.',
        });
        return;
    }

    try {
        const matchDocRef = doc(firestore, 'matches', matchId);
        await updateDoc(matchDocRef, {
            registeredAnglers: arrayUnion(angler.id),
            registeredCount: increment(1)
        });

        // Update local state
        setRegisteredAnglers(prev => [...prev, angler]);
        setAvailableAnglers(prev => prev.filter(a => a.id !== angler.id));
        setMatch(prev => prev ? { ...prev, registeredCount: prev.registeredCount + 1 } : null);

        toast({ title: 'Success', description: `${angler.firstName} ${angler.lastName} added to match.` });
    } catch (error) {
        console.error("Error adding angler: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add angler to the match.' });
    }
  };

  const handleRemoveAngler = async (angler: User) => {
    if (!matchId || !firestore) return;

    try {
        const matchDocRef = doc(firestore, 'matches', matchId);
        await updateDoc(matchDocRef, {
            registeredAnglers: arrayRemove(angler.id),
            registeredCount: increment(-1)
        });

        // Update local state
        setAvailableAnglers(prev => [...prev, angler]);
        setRegisteredAnglers(prev => prev.filter(a => a.id !== angler.id));
        setMatch(prev => prev ? { ...prev, registeredCount: prev.registeredCount - 1 } : null);

        toast({ title: 'Success', description: `${angler.firstName} ${angler.lastName} removed from match.` });
    } catch (error) {
        console.error("Error removing angler: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not remove angler from the match.' });
    }
  };

  const filteredAvailableAnglers = useMemo(() => {
    return availableAnglers.filter(angler => 
        `${angler.firstName} ${angler.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableAnglers, searchTerm]);

  const renderAnglerTable = (anglers: User[], action: 'add' | 'remove') => {
    if (isLoading) {
        return <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
    }
    if (anglers.length === 0) {
        return <TableRow><TableCell colSpan={3} className="text-center h-24">No anglers found.</TableCell></TableRow>
    }
    return anglers.map(angler => (
        <TableRow key={angler.id}>
            <TableCell>{`${angler.firstName} ${angler.lastName}`}</TableCell>
            <TableCell>{angler.email}</TableCell>
            <TableCell className="text-right">
                <Button 
                    variant={action === 'add' ? 'outline' : 'destructive'} 
                    size="icon"
                    onClick={() => action === 'add' ? handleAddAngler(angler) : handleRemoveAngler(angler)}
                >
                    {action === 'add' ? <PlusCircle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                </Button>
            </TableCell>
        </TableRow>
    ));
  }

  if (!matchId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Manage Anglers: {match?.name || ''}</DialogTitle>
          <DialogDescription>
            Add or remove anglers from this match. Capacity: {match?.registeredCount} / {match?.capacity}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 flex-grow overflow-hidden pt-4">
            {/* Registered Anglers */}
            <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold">Registered Anglers</h3>
                <ScrollArea className="h-full border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderAnglerTable(registeredAnglers, 'remove')}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>

            {/* Available Anglers */}
            <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold">Available Club Members</h3>
                <div className="relative">
                     <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                     <Input 
                        placeholder="Search for an angler..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                     />
                </div>
                <ScrollArea className="h-full border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {renderAnglerTable(filteredAvailableAnglers, 'add')}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
