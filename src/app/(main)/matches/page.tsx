
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
import { PlusCircle, Edit, CalendarIcon, User as UserIcon, Medal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { collection, addDoc, onSnapshot, doc, updateDoc, query, where, Timestamp, arrayUnion, increment, getDocs, getDoc } from 'firebase/firestore';
import type { Match, Series, User, MatchStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RegisterIcon } from '@/components/icons/register-icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    registeredAnglers: [],
};

type AnglerDetails = Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;

export default function MatchesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [matches, setMatches] = useState<Match[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isViewRegisteredDialogOpen, setIsViewRegisteredDialogOpen] = useState(false);
  
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [registeredAnglersDetails, setRegisteredAnglersDetails] = useState<AnglerDetails[]>([]);
  const [isLoadingAnglers, setIsLoadingAnglers] = useState(false);
  const [formState, setFormState] = useState<Omit<Match, 'id' | 'clubId' | 'seriesName'>>(EMPTY_MATCH);


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
                            registeredAnglers: data.registeredAnglers || [],
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

   const handleOpenEditDialog = (e: React.MouseEvent, match: Match) => {
    e.stopPropagation();
    setSelectedMatch(match);
    const { id, clubId, seriesName, ...rest } = match;
    setFormState(rest);
    setIsEditDialogOpen(true);
  };
  
   const handleOpenCreateDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMatch(null);
    setFormState(EMPTY_MATCH);
    setIsEditDialogOpen(true);
  }

  const handleOpenRegisterDialog = (e: React.MouseEvent, match: Match) => {
    e.stopPropagation();
    setSelectedMatch(match);
    setIsRegisterDialogOpen(true);
  };
  
  const handleFormChange = (field: keyof typeof formState, value: any) => {
    setFormState(prev => ({...prev, [field]: value}));
  };

  const handleViewRegisteredClick = async (match: Match) => {
    if (!firestore) return;
    setSelectedMatch(match);
    setIsViewRegisteredDialogOpen(true);
    setIsLoadingAnglers(true);
    
    if (!match.registeredAnglers || match.registeredAnglers.length === 0) {
      setRegisteredAnglersDetails([]);
      setIsLoadingAnglers(false);
      return;
    }

    try {
      // Firestore 'in' query can take up to 30 elements at a time.
      // Chunk the angler IDs to handle more than 30.
      const anglerIds = match.registeredAnglers;
      const anglersData: AnglerDetails[] = [];
      const chunks = [];

      for (let i = 0; i < anglerIds.length; i += 30) {
        chunks.push(anglerIds.slice(i, i + 30));
      }
      
      for (const chunk of chunks) {
         if (chunk.length === 0) continue;
         const usersCollection = collection(firestore, 'users');
         const q = query(usersCollection, where('__name__', 'in', chunk));
         const querySnapshot = await getDocs(q);

         const chunkData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              firstName: data.firstName || 'N/A',
              lastName: data.lastName || 'N/A',
              email: data.email || 'N/A',
            } as AnglerDetails;
         });
         anglersData.push(...chunkData);
      }
      
      setRegisteredAnglersDetails(anglersData);
    } catch (error) {
      console.error("Error fetching registered anglers: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch registered angler details.',
      });
    } finally {
      setIsLoadingAnglers(false);
    }
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
        setIsEditDialogOpen(false);
    } catch (error) {
        console.error('Error saving match:', error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the match. Please try again.' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleRegister = async () => {
    if (!user || !selectedMatch || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot register at this time.' });
        return;
    }

    setIsSaving(true);
    try {
        const matchDocRef = doc(firestore, 'matches', selectedMatch.id);
        await updateDoc(matchDocRef, {
            registeredAnglers: arrayUnion(user.uid),
            registeredCount: increment(1)
        });
        toast({ title: 'Registered!', description: `You have been registered for ${selectedMatch.name}.` });
        setIsRegisterDialogOpen(false);
        setSelectedMatch(null);
    } catch (error) {
        console.error('Error registering for match:', error);
        toast({ variant: 'destructive', title: 'Registration Failed', description: 'Could not register for the match. Please try again.' });
    } finally {
        setIsSaving(false);
    }
  };
  
  const canEdit = currentUserProfile?.role === 'Site Admin' || currentUserProfile?.role === 'Club Admin';

  const renderMatchList = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-10 w-[180px]" /></TableCell>
          </TableRow>
      ));
    }

    if (matches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="h-24 text-center">
            No matches found. Create the first one!
          </TableCell>
        </TableRow>
      );
    }

    return matches.map((match) => {
      const isRegistered = user ? match.registeredAnglers.includes(user.uid) : false;
      const isFull = match.registeredCount >= match.capacity;

      return (
       <TableRow key={match.id} onClick={() => handleViewRegisteredClick(match)} className="cursor-pointer">
          <TableCell>
            <div className="text-sm text-muted-foreground">{match.seriesName}</div>
          </TableCell>
          <TableCell>
            <div className="font-medium">{match.name}</div>
          </TableCell>
          <TableCell>{match.location}</TableCell>
          <TableCell>{format(match.date, 'EEE, dd MMM yyyy')}</TableCell>
          <TableCell>{match.capacity}</TableCell>
          <TableCell>{match.registeredCount}</TableCell>
          <TableCell>{match.status}</TableCell>
          <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Medal className="h-4 w-4"/>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                    <p>Display realtime results</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9"
                          onClick={(e) => handleOpenRegisterDialog(e, match)}
                          disabled={isRegistered || isFull || match.status !== 'Upcoming'}
                        >
                          <RegisterIcon className="h-5 w-5"/>
                        </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                      <p>{isRegistered ? 'Already Registered' : 'Register for this match'}</p>
                  </TooltipContent>
              </Tooltip>
            </TooltipProvider>
             {canEdit && (
                <Button variant="outline" size="sm" onClick={(e) => handleOpenEditDialog(e, match)}>
                    <Edit className="h-4 w-4"/>
                </Button>
            )}
          </TableCell>
        </TableRow>
    )});
  }

  const renderAnglerList = () => {
    if (isLoadingAnglers) {
      return Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-48" />
            </div>
        </div>
      ));
    }

    if (registeredAnglersDetails.length === 0) {
        return <p className="text-muted-foreground p-4 text-center">No anglers registered yet.</p>;
    }

    return registeredAnglersDetails.map((angler) => (
        <div key={angler.id} className="flex items-center gap-3 p-2 border-b">
            <Avatar className="h-9 w-9">
                <AvatarFallback><UserIcon className="h-5 w-5"/></AvatarFallback>
            </Avatar>
            <div>
              <span>{angler.firstName} {angler.lastName}</span>
              <p className="text-sm text-muted-foreground">{angler.email}</p>
            </div>
        </div>
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
            <Button onClick={handleOpenCreateDialog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Match
            </Button>
        )}
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Upcoming & Recent Matches</CardTitle>
            <CardDescription>A list of all matches for your club. Click a row to see registered anglers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Series</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Registered</TableHead>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                                    onSelect={(date) => date && handleFormChange('date', date)}
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
      
      {selectedMatch && (
        <AlertDialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Registration</AlertDialogTitle>
                    <AlertDialogDescription>
                        Do you want to register for the <strong>{selectedMatch.seriesName}</strong> match: <strong>{selectedMatch.name}</strong> on <strong>{format(selectedMatch.date, 'PPP')}</strong>?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedMatch(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRegister} disabled={isSaving}>
                        {isSaving ? 'Registering...' : 'Yes, Register'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      {selectedMatch && (
        <Dialog open={isViewRegisteredDialogOpen} onOpenChange={setIsViewRegisteredDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registered Anglers</DialogTitle>
                    <DialogDescription>
                        List of anglers registered for {selectedMatch.name}.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-72 w-full mt-4">
                    {renderAnglerList()}
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsViewRegisteredDialogOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
