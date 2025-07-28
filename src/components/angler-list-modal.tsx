
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore';
import type { Match, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, XIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AnglerListModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string | null;
}

export function AnglerListModal({ isOpen, onClose, matchId }: AnglerListModalProps) {
  const [match, setMatch] = useState<Match | null>(null);
  const [availableAnglers, setAvailableAnglers] = useState<User[]>([]);
  const [anglersToAssign, setAnglersToAssign] = useState<User[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && matchId && firestore) {
      const fetchMatchAndAnglers = async () => {
        setIsLoading(true);
        setAnglersToAssign([]); // Reset on open
        try {
          const matchDocRef = doc(firestore, 'matches', matchId);
          const matchDoc = await getDoc(matchDocRef);
          if (!matchDoc.exists()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Match not found.' });
            setIsLoading(false);
            return;
          }
          const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
          setMatch(matchData);

          const usersQuery = query(collection(firestore, 'users'), where('primaryClubId', '==', matchData.clubId));
          const usersSnapshot = await getDocs(usersQuery);
          const allClubUsers = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));

          const registeredIds = new Set(matchData.registeredAnglers || []);
          const available = allClubUsers.filter(u => !registeredIds.has(u.id));

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

  const handleAddAngler = (angler: User) => {
    setAvailableAnglers(prev => prev.filter(a => a.id !== angler.id));
    setAnglersToAssign(prev => [...prev, angler]);
  };

  const handleRemoveAngler = (angler: User) => {
    setAnglersToAssign(prev => prev.filter(a => a.id !== angler.id));
    setAvailableAnglers(prev => [...prev, angler]);
  };

  const handleSaveAssignments = async () => {
    if (!matchId || !match || !firestore || anglersToAssign.length === 0) {
      toast({ title: 'No changes', description: 'No anglers were selected to be added.' });
      return;
    }
    
    const newTotal = match.registeredCount + anglersToAssign.length;
    if (newTotal > match.capacity) {
      toast({
        variant: 'destructive',
        title: 'Capacity Exceeded',
        description: `Adding these anglers would exceed the match capacity of ${match.capacity}.`,
      });
      return;
    }

    setIsSaving(true);
    try {
      const matchDocRef = doc(firestore, 'matches', matchId);
      const batch = writeBatch(firestore);

      const anglerIdsToAdd = anglersToAssign.map(a => a.id);
      
      batch.update(matchDocRef, {
        registeredAnglers: [...(match.registeredAnglers || []), ...anglerIdsToAdd],
        registeredCount: newTotal
      });

      await batch.commit();

      toast({ title: 'Success', description: `${anglersToAssign.length} angler(s) have been added to the match.` });
      onClose();
    } catch (error) {
      console.error("Error saving assignments: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the angler assignments.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!matchId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Assign Anglers to: {match?.name || 'Test Match'}</DialogTitle>
          <DialogDescription>
            Select members from the left list to assign them to the match on the right.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 pt-4">
          {/* Available Club Members */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Available Club Members</h3>
            <Card>
              <CardContent className="p-2">
                <ScrollArea className="h-72">
                  {isLoading ? (
                    <div className="p-2 space-y-2">
                        {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                  ) : availableAnglers.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      No available members.
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                        {availableAnglers.map(angler => (
                        <button
                            key={angler.id}
                            onClick={() => handleAddAngler(angler)}
                            className="w-full flex items-center justify-between text-sm p-2 rounded-md hover:bg-accent"
                        >
                            <span>{`${angler.firstName} ${angler.lastName}`}</span>
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* To Be Assigned */}
          <div>
            <h3 className="text-lg font-semibold mb-2">To Be Assigned ({anglersToAssign.length})</h3>
            <Card>
              <CardContent className="p-2">
                <ScrollArea className="h-72">
                   {anglersToAssign.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      Select members to assign.
                    </div>
                  ) : (
                     <div className="space-y-1 p-2">
                        {anglersToAssign.map(angler => (
                           <div key={angler.id} className="w-full flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                                <span>{`${angler.firstName} ${angler.lastName}`}</span>
                                <button onClick={() => handleRemoveAngler(angler)} className="p-1 rounded-full hover:bg-destructive/20 text-destructive">
                                    <XIcon className="h-4 w-4"/>
                                </button>
                            </div>
                        ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSaveAssignments} disabled={isSaving || anglersToAssign.length === 0}>
            {isSaving ? 'Saving...' : 'Save Assignments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
