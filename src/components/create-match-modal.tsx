
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
import { collection, query, where, getDocs, Timestamp, writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Match, Series, PublicUpcomingMatch } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string | null;
}

const initialMatchState: Omit<Match, 'id' | 'clubId' | 'seriesName' | 'registeredCount' | 'registeredAnglers'> = {
  name: '',
  seriesId: '',
  location: '',
  googleMapsLink: '',
  date: new Date(),
  status: 'Upcoming',
  drawTime: '08:00',
  startTime: '09:30',
  endTime: '14:30',
  capacity: 20,
  paidPlaces: 3,
};

export function CreateMatchModal({ isOpen, onClose, clubId }: CreateMatchModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [newMatch, setNewMatch] = useState(initialMatchState);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);

  useEffect(() => {
    if (isOpen && clubId && firestore) {
      const fetchSeries = async () => {
        setIsLoadingSeries(true);
        try {
          const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', clubId));
          const seriesSnapshot = await getDocs(seriesQuery);
          const seriesData = seriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Series));
          setSeriesList(seriesData);
          if (seriesData.length > 0) {
            setNewMatch(prev => ({...prev, seriesId: seriesData[0].id}));
          }
        } catch (error) {
          console.error("Error fetching series:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load series list.' });
        } finally {
          setIsLoadingSeries(false);
        }
      };
      fetchSeries();
    }
  }, [isOpen, clubId, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setNewMatch(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };
  
  const handleSelectChange = (name: keyof Omit<Match, 'id' | 'clubId'>, value: string) => {
    setNewMatch(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
        setNewMatch(prev => ({ ...prev, date }));
    }
  };

  const handleSaveChanges = async () => {
    if (!clubId || !newMatch.seriesId || !newMatch.name || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all required fields.' });
        return;
    };
    
    setIsSaving(true);
    try {
        const batch = writeBatch(firestore);
        const newMatchRef = doc(collection(firestore, 'matches')); // Correctly generate a new doc ref

        const selectedSeries = seriesList.find(s => s.id === newMatch.seriesId);
        const matchDate = Timestamp.fromDate(newMatch.date);

        const dataToSave: Omit<Match, 'id'> = {
            ...newMatch,
            clubId,
            seriesName: selectedSeries?.name || '',
            date: matchDate,
            registeredCount: 0,
            registeredAnglers: [],
        };
        batch.set(newMatchRef, dataToSave);

        // Also write to publicUpcomingMatches if status is Upcoming
        if (dataToSave.status === 'Upcoming') {
            const publicUpcomingMatchRef = doc(firestore, 'publicUpcomingMatches', newMatchRef.id);
            const publicData: PublicUpcomingMatch = {
                id: newMatchRef.id,
                clubId: dataToSave.clubId,
                seriesId: dataToSave.seriesId,
                seriesName: dataToSave.seriesName,
                name: dataToSave.name,
                location: dataToSave.location,
                date: dataToSave.date,
                drawTime: dataToSave.drawTime,
                startTime: dataToSave.startTime,
                endTime: dataToSave.endTime,
                status: dataToSave.status,
            };
            batch.set(publicUpcomingMatchRef, publicData);
        }

        await batch.commit();

        toast({ title: 'Success', description: 'New match has been created.' });
        setNewMatch(initialMatchState); // Reset form
        onClose();
    } catch (error) {
        console.error("Error creating match:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create match.' });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Match</DialogTitle>
          <DialogDescription>Fill in the details for the new match.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="name">Match Name</Label>
                <Input id="name" name="name" value={newMatch.name} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="seriesId">Series</Label>
                {isLoadingSeries ? <Skeleton className="h-10 w-full" /> : (
                    <Select value={newMatch.seriesId} onValueChange={(value) => handleSelectChange('seriesId', value)} required>
                        <SelectTrigger id="seriesId">
                            <SelectValue placeholder="Select a series" />
                        </SelectTrigger>
                        <SelectContent>
                            {seriesList.length === 0 ? (
                                <SelectItem value="no-series" disabled>No series found for this club</SelectItem>
                            ) : (
                                seriesList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                            )}
                        </SelectContent>
                    </Select>
                )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location / Venue</Label>
            <Input id="location" name="location" value={newMatch.location} onChange={handleInputChange} required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="googleMapsLink">Google Maps Link</Label>
            <Input id="googleMapsLink" name="googleMapsLink" value={newMatch.googleMapsLink || ''} onChange={handleInputChange} placeholder="https://maps.app.goo.gl/..." />
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
                        !newMatch.date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newMatch.date ? format(newMatch.date, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={newMatch.date}
                        onSelect={handleDateChange}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
            </div>
             <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Input id="status" name="status" value={newMatch.status} disabled />
            </div>
          </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label htmlFor="drawTime">Draw Time</Label>
                <Input id="drawTime" name="drawTime" type="time" value={newMatch.drawTime} onChange={handleInputChange} required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input id="startTime" name="startTime" type="time" value={newMatch.startTime} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input id="endTime" name="endTime" type="time" value={newMatch.endTime} onChange={handleInputChange} required />
            </div>
          </div>
          
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" name="capacity" type="number" value={newMatch.capacity} onChange={handleInputChange} required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="paidPlaces">Paid Places</Label>
                <Input id="paidPlaces" name="paidPlaces" type="number" value={newMatch.paidPlaces} onChange={handleInputChange} required />
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveChanges} disabled={isSaving || !newMatch.seriesId}>
            {isSaving ? 'Saving...' : 'Create Match'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
