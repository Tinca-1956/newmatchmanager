
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, CalendarIcon, ClockIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, addDoc, onSnapshot, doc, updateDoc, query, where, getDoc, Timestamp } from 'firebase/firestore';
import type { Match, Series, User, MatchStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const EMPTY_MATCH: Omit<Match, 'id' | 'clubId' | 'seriesName'> = {
    seriesId: '',
    name: '',
    location: '',
    date: new Date(),
    status: 'Upcoming',
    drawTime: '08:00',
    startTime: '09:00',
    endTime: '15:00',
    capacity: 20,
    registeredCount: 0,
};


export default function MatchesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [matches, setMatches] = useState<Match[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [formState, setFormState] = useState(EMPTY_MATCH);


  useEffect(() => {
    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }

    let unsubscribeMatches: () => void = () => {};
    let unsubscribeSeries: () => void = () => {};

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, async (userDoc) => {
        if (unsubscribeMatches) unsubscribeMatches();
        if (unsubscribeSeries) unsubscribeSeries();
        
        if (userDoc.exists()) {
            const userProfile = { id: userDoc.id, ...userDoc.data() } as User;
            setCurrentUserProfile(userProfile);
            
            const primaryClubId = userProfile.primaryClubId;
            if (primaryClubId) {
                // Fetch Series
                const seriesCollection = collection(firestore, 'series');
                const seriesQuery = query(seriesCollection, where("clubId", "==", primaryClubId));
                unsubscribeSeries = onSnapshot(seriesQuery, (snapshot) => {
                    const seriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Series));
                    setSeriesList(seriesData);
                });

                // Fetch Matches
                const matchesCollection = collection(firestore, 'matches');
                const matchesQuery = query(matchesCollection, where("clubId", "==", primaryClubId));
                unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
                    const matchesData = snapshot.docs.map(doc => {
                         const data = doc.data();
                         return {
                            id: doc.id,
                            ...data,
                            date: (data.date as Timestamp).toDate(),
                         } as Match
                    });
                    setMatches(matchesData);
                    setIsLoading(false);
                }, (error) => {
                    console.error("Error fetching matches: ", error);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch matches.'});
                    setIsLoading(false);
                });

            } else {
                setMatches([]);
                setSeriesList([]);
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    });

    return () => {
        unsubscribeUser();
        unsubscribeMatches();
        unsubscribeSeries();
    };
  }, [user, toast]);

   const handleOpenDialog = (match: Match | null) => {
    if (match) {
        setSelectedMatch(match);
        setFormState(match);
    } else {
        setSelectedMatch(null);
        setFormState(EMPTY_MATCH);
    }
    setIsDialogOpen(true);
  };
  
  const handleFormChange = (field: keyof typeof formState, value: any) => {
    setFormState(prev => ({...prev, [field]: value}));
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile?.primaryClubId || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'User profile not loaded.' });
        return;
    }

    setIsSaving(true);
    
    const series = seriesList.find(s => s.id === formState.seriesId);
    if (!series) {
        toast({ variant: 'destructive', title: 'Error', description: 'Invalid series selected.' });
        setIsSaving(false);
        return;
    }

    const dataToSave = { ...formState, clubId: currentUserProfile.primaryClubId, seriesName: series.name };

    try {
        if (selectedMatch) {
            // Update existing match
            const matchDocRef = doc(firestore, 'matches', selectedMatch.id);
            await updateDoc(matchDocRef, dataToSave as { [x: string]: any });
            toast({ title: 'Success!', description: `Match "${dataToSave.name}" updated.` });
        } else {
            // Create new match
            await addDoc(collection(firestore, 'matches'), dataToSave);
            toast({ title: 'Success!', description: `Match "${dataToSave.name}" created.` });
        }
        setIsDialogOpen(false);
    } catch (error) {
        console.error('Error saving match:', error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the match. Please try again.' });
    } finally {
        setIsSaving(false);
    }
  };
  
  const canEdit = currentUserProfile?.role === 'Site Admin' || currentUserProfile?.role === 'Club Admin';

  const renderMatchList = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-10 w-[80px]" /></TableCell>
          </TableRow>
      ));
    }

    if (matches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="h-24 text-center">
            No matches found. Create the first one!
          </TableCell>
        </TableRow>
      );
    }

    return matches.map((match) => (
       <TableRow key={match.id}>
          <TableCell>
            <div className="font-medium">{match.name}</div>
            <div className="text-sm text-muted-foreground">{match.seriesName}</div>
          </TableCell>
          <TableCell>{match.location}</TableCell>
          <TableCell>{format(match.date, 'EEE, dd MMM yyyy')}</TableCell>
          <TableCell>{match.status}</TableCell>
          <TableCell className="text-right">
             {canEdit && (
                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(match)}>
                    <Edit className="mr-2 h-4 w-4"/>
                    Edit
                </Button>
            )}
          </TableCell>
        </TableRow>
    ));
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
          <p className="text-muted-foreground">Manage your club's matches here.</p>
        </div>
        {canEdit && (
            <Button onClick={() => handleOpenDialog(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Match
            </Button>
        )}
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Upcoming & Recent Matches</CardTitle>
            <CardDescription>A list of all matches for your club.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderMatchList()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveMatch}>
            <DialogHeader>
              <DialogTitle>{selectedMatch ? 'Edit Match' : 'Create New Match'}</DialogTitle>
              <DialogDescription>
                Fill in the details for your match. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="match-name">Match Name</Label>
                        <Input id="match-name" value={formState.name} onChange={(e) => handleFormChange('name', e.target.value)} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="series">Series</Label>
                        <Select value={formState.seriesId} onValueChange={(value) => handleFormChange('seriesId', value)} required>
                            <SelectTrigger id="series">
                                <SelectValue placeholder="Select a series" />
                            </SelectTrigger>
                            <SelectContent>
                                {seriesList.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="location">Location / Venue</Label>
                    <Input id="location" value={formState.location} onChange={(e) => handleFormChange('location', e.target.value)} required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="match-date">Match Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !formState.date && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formState.date ? format(formState.date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={formState.date}
                                    onSelect={(date) => handleFormChange('date', date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={formState.status} onValueChange={(value) => handleFormChange('status', value as MatchStatus)}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Upcoming">Upcoming</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="draw-time">Draw Time</Label>
                        <Input id="draw-time" type="time" value={formState.drawTime} onChange={(e) => handleFormChange('drawTime', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="start-time">Start Time</Label>
                        <Input id="start-time" type="time" value={formState.startTime} onChange={(e) => handleFormChange('startTime', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="end-time">End Time</Label>
                        <Input id="end-time" type="time" value={formState.endTime} onChange={(e) => handleFormChange('endTime', e.target.value)} />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="capacity">Capacity (Max Anglers)</Label>
                        <Input id="capacity" type="number" value={formState.capacity} onChange={(e) => handleFormChange('capacity', Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="registered">Registered Anglers</Label>
                        <Input id="registered" type="number" value={formState.registeredCount} onChange={(e) => handleFormChange('registeredCount', Number(e.target.value))} disabled/>
                    </div>
                </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Match'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
