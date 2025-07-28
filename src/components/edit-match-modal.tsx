
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { firestore } from '@/lib/firebase-client';
import { doc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Match, Series, MatchStatus } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

interface EditMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
}

export function EditMatchModal({ isOpen, onClose, match }: EditMatchModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [editedMatch, setEditedMatch] = useState<Match | null>(null);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);

  useEffect(() => {
    if (match) {
      // Create a mutable copy for editing
      setEditedMatch({ ...match });
    }
  }, [match]);

  useEffect(() => {
    if (isOpen && match && firestore) {
      const fetchSeries = async () => {
        setIsLoadingSeries(true);
        try {
          const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', match.clubId));
          const seriesSnapshot = await getDocs(seriesQuery);
          const seriesData = seriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Series));
          setSeriesList(seriesData);
        } catch (error) {
          console.error("Error fetching series:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load series list.' });
        } finally {
          setIsLoadingSeries(false);
        }
      };
      fetchSeries();
    }
  }, [isOpen, match, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedMatch(prev => prev ? { ...prev, [name]: value } : null);
  };
  
  const handleSelectChange = (name: keyof Match, value: string) => {
    if (!editedMatch) return;
    const selectedSeries = seriesList.find(s => s.id === value);
    setEditedMatch(prev => prev ? { 
        ...prev, 
        [name]: value,
        // Also update seriesName if seriesId is changed
        ...(name === 'seriesId' && { seriesName: selectedSeries?.name || '' })
    } : null);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
        setEditedMatch(prev => prev ? { ...prev, date } : null);
    }
  };

  const handleSaveChanges = async () => {
    if (!editedMatch || !firestore) return;
    
    setIsSaving(true);
    try {
        const matchDocRef = doc(firestore, 'matches', editedMatch.id);
        
        // Convert JS Date back to Firestore Timestamp if it was changed
        const dataToSave = {
            ...editedMatch,
            date: editedMatch.date instanceof Date ? Timestamp.fromDate(editedMatch.date) : editedMatch.date
        };

        await updateDoc(matchDocRef, dataToSave);
        toast({ title: 'Success', description: 'Match details updated successfully.' });
        onClose();
    } catch (error) {
        console.error("Error updating match:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update match.' });
    } finally {
        setIsSaving(false);
    }
  };

  if (!editedMatch) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Match</DialogTitle>
          <DialogDescription>Update the details for "{match?.name}".</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="name">Match Name</Label>
                <Input id="name" name="name" value={editedMatch.name} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="seriesId">Series</Label>
                {isLoadingSeries ? <Skeleton className="h-10 w-full" /> : (
                    <Select value={editedMatch.seriesId} onValueChange={(value) => handleSelectChange('seriesId', value)}>
                        <SelectTrigger id="seriesId">
                            <SelectValue placeholder="Select a series" />
                        </SelectTrigger>
                        <SelectContent>
                            {seriesList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location / Venue</Label>
            <Input id="location" name="location" value={editedMatch.location} onChange={handleInputChange} />
          </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="date">Match Date</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !editedMatch.date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedMatch.date ? format(editedMatch.date instanceof Timestamp ? editedMatch.date.toDate() : editedMatch.date, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={editedMatch.date instanceof Timestamp ? editedMatch.date.toDate() : editedMatch.date}
                        onSelect={handleDateChange}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
            </div>
             <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={editedMatch.status} onValueChange={(value) => handleSelectChange('status', value as MatchStatus)}>
                    <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Upcoming">Upcoming</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Weigh-in">Weigh-in</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label htmlFor="drawTime">Draw Time</Label>
                <Input id="drawTime" name="drawTime" type="time" value={editedMatch.drawTime} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input id="startTime" name="startTime" type="time" value={editedMatch.startTime} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input id="endTime" name="endTime" type="time" value={editedMatch.endTime} onChange={handleInputChange} />
            </div>
          </div>
          
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" name="capacity" type="number" value={editedMatch.capacity} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="paidPlaces">Paid Places</Label>
                <Input id="paidPlaces" name="paidPlaces" type="number" value={editedMatch.paidPlaces} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="registeredCount"># Registered</Label>
                <Input id="registeredCount" name="registeredCount" value={editedMatch.registeredCount} readOnly />
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Match'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
