

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
import { PlusCircle, Edit, CalendarIcon, HelpCircle, Scale, Trophy, FileText } from 'lucide-react';
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
import { collection, addDoc, onSnapshot, doc, updateDoc, query, where, Timestamp, arrayUnion, increment, getDocs, getDoc, deleteDoc, writeBatch, orderBy } from 'firebase/firestore';
import type { Match, Series, User, MatchStatus, Result } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RegisterIcon } from '@/components/icons/register-icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

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

type AnglerDetails = Pick<User, 'id' | 'firstName' | 'lastName'> & {
  peg: string;
  section: string;
};


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
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  
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
    if (match.registeredCount >= match.capacity) {
      toast({
        variant: 'destructive',
        title: 'Registration Full',
        description:
          'This match registration list has reached the maximum number of anglers that the location can comfortably accommodate',
      });
      return;
    }
    setSelectedMatch(match);
    setIsRegisterDialogOpen(true);
  };
  
  const handleFormChange = (field: keyof typeof formState, value: any) => {
    setFormState(prev => ({...prev, [field]: value}));
  };

  const handleViewRegisteredClick = async (e: React.MouseEvent, match: Match) => {
    e.stopPropagation();
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
      const anglerIds = match.registeredAnglers;
      
      const userChunks: string[][] = [];
      for (let i = 0; i < anglerIds.length; i += 30) {
        userChunks.push(anglerIds.slice(i, i + 30));
      }
      
      const usersMap = new Map<string, Pick<User, 'id' | 'firstName' | 'lastName'>>();
      for (const chunk of userChunks) {
         if (chunk.length === 0) continue;
         const usersQuery = query(collection(firestore, 'users'), where('__name__', 'in', chunk));
         const querySnapshot = await getDocs(usersQuery);
         querySnapshot.forEach(doc => {
            const data = doc.data();
            usersMap.set(doc.id, {
              id: doc.id,
              firstName: data.firstName || 'N/A',
              lastName: data.lastName || 'N/A',
            });
         });
      }

      const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', match.id));
      const resultsSnapshot = await getDocs(resultsQuery);
      const resultsMap = new Map<string, Result>();
      resultsSnapshot.forEach(doc => {
        const result = doc.data() as Result;
        resultsMap.set(result.userId, result);
      });
      
      const anglersData: AnglerDetails[] = anglerIds.map(id => {
        const user = usersMap.get(id);
        const result = resultsMap.get(id);
        return {
          id: id,
          firstName: user?.firstName || 'Unknown',
          lastName: user?.lastName || 'Angler',
          peg: result?.peg || '-',
          section: result?.section || '-',
        };
      }).sort((a, b) => a.lastName.localeCompare(b.lastName));
      
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

    if (selectedMatch && formState.status === 'Cancelled') {
        setIsCancelConfirmOpen(true);
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

  const handleConfirmCancel = async () => {
    if (!selectedMatch || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No match selected to cancel.' });
      return;
    }

    setIsSaving(true);
    try {
      const batch = writeBatch(firestore);

      // 1. Delete the match document
      const matchDocRef = doc(firestore, 'matches', selectedMatch.id);
      batch.delete(matchDocRef);

      // 2. Find and delete all associated results
      const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', selectedMatch.id));
      const resultsSnapshot = await getDocs(resultsQuery);
      resultsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      toast({ title: 'Success', description: `Match "${selectedMatch.name}" and all its results have been cancelled.` });

      setIsEditDialogOpen(false);
      setIsCancelConfirmOpen(false);
      setSelectedMatch(null);
    } catch (error) {
      console.error('Error cancelling match:', error);
      toast({ variant: 'destructive', title: 'Cancellation Failed', description: 'Could not cancel the match. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const getMatchDisplayStatus = (match: Match): MatchStatus => {
    if (match.status === 'Cancelled') {
      return 'Cancelled';
    }
    if (match.status === 'Completed') {
      return 'Completed';
    }

    const now = new Date();
    const matchDate = match.date instanceof Date ? match.date : (match.date as Timestamp).toDate();
    
    const copyMatchDate = (d: Date) => new Date(d.getTime());

    const drawTime = copyMatchDate(matchDate);
    const [drawHours, drawMinutes] = match.drawTime.split(':').map(Number);
    drawTime.setHours(drawHours, drawMinutes, 0, 0);

    const endTime = copyMatchDate(matchDate);
    const [endHours, endMinutes] = match.endTime.split(':').map(Number);
    endTime.setHours(endHours, endMinutes, 0, 0);

    const weighInEndTime = new Date(endTime.getTime() + 60 * 60000); // 60 minutes after end time

    if (now > endTime && now <= weighInEndTime) {
      return 'Weigh-in';
    }
     if (now > weighInEndTime) {
      return 'Completed';
    }
    if (now > drawTime) {
      return 'In Progress';
    }
    return 'Upcoming';
  };
  
  const canEdit = currentUserProfile?.role === 'Site Admin' || currentUserProfile?.role === 'Club Admin';
  const canWeighIn = currentUserProfile?.role === 'Site Admin' || currentUserProfile?.role === 'Club Admin' || currentUserProfile?.role === 'Marshal';

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
      const displayStatus = getMatchDisplayStatus(match);
      const isFull = match.registeredCount >= match.capacity;
      const isRegisterDisabled = isRegistered || displayStatus !== 'Upcoming';

      return (
       <TableRow key={match.id}>
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
          <TableCell>{displayStatus}</TableCell>
          <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={(e) => handleViewRegisteredClick(e, match)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Display angler list</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="outline" size="icon" className="h-9 w-9">
                      <Link href={`/results?clubId=${match.clubId}&seriesId=${match.seriesId}&matchId=${match.id}&view=modal`}>
                        <Trophy className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                      <p>View full results</p>
                  </TooltipContent>
              </Tooltip>
               {canWeighIn && (
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="outline" size="icon" className="h-9 w-9">
                      <Link href={`/matches/${match.id}/weigh-in`}>
                        <Scale className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Weigh-in</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={isRegisterDisabled ? 0 : -1}>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={(e) => handleOpenRegisterDialog(e, match)}
                      disabled={isRegisterDisabled}
                    >
                      <RegisterIcon className="h-5 w-5" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left">
                    {isRegistered 
                        ? <p>You are registered for this match. To unregister go to your PROFILE page.</p> 
                        : displayStatus !== 'Upcoming'
                        ? <p>Registration is closed for this match.</p>
                        : <p>Register for this match</p>
                    }
                </TooltipContent>
              </Tooltip>
             {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={(e) => handleOpenEditDialog(e, match)}>
                        <Edit className="h-4 w-4"/>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Edit match details</p>
                  </TooltipContent>
                </Tooltip>
            )}
            </TooltipProvider>
          </TableCell>
        </TableRow>
    )});
  }

  const renderAnglerList = () => {
    if (isLoadingAnglers) {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (registeredAnglersDetails.length === 0) {
        return <p className="text-muted-foreground p-4 text-center">No anglers registered yet.</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Section</TableHead>
            <TableHead>Peg</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registeredAnglersDetails.map((angler) => (
            <TableRow key={angler.id}>
              <TableCell>{angler.firstName}</TableCell>
              <TableCell>{angler.lastName}</TableCell>
              <TableCell>{angler.section}</TableCell>
              <TableCell>{angler.peg}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
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
                                <SelectItem value="Weigh-in">Weigh-in</SelectItem>
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
        <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will cancel the match: <strong>{selectedMatch.name}</strong>.
                        This action cannot be undone and will remove the match and all associated results permanently.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Go Back</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirmCancel}
                        disabled={isSaving}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isSaving ? 'Cancelling...' : 'Yes, Cancel Match'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      {selectedMatch && (
        <Dialog open={isViewRegisteredDialogOpen} onOpenChange={setIsViewRegisteredDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Angler List</DialogTitle>
                    <DialogDescription>
                        List of anglers registered for {selectedMatch.name}.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-72 w-full mt-4">
                    {renderAnglerList()}
                </ScrollArea>
                <DialogFooter className="sm:justify-between items-center pt-4">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 text-muted-foreground cursor-help">
                                    <HelpCircle className="h-4 w-4" />
                                    <span className="text-xs">Unregister for match</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start">
                                <p>Go to the Profile page to unregister.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <Button variant="outline" onClick={() => setIsViewRegisteredDialogOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

