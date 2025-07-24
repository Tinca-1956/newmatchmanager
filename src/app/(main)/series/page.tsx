

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
import { PlusCircle, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, addDoc, onSnapshot, doc, updateDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Series, User, Club, Match } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SeriesWithMatchCount extends Series {
    matchCount: number;
}


export default function SeriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [seriesList, setSeriesList] = useState<SeriesWithMatchCount[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [clubName, setClubName] = useState<string>('');
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [newSeriesName, setNewSeriesName] = useState('');

  // Fetch current user profile
  useEffect(() => {
    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
        if (userDoc.exists()) {
            const userProfile = { id: userDoc.id, ...userDoc.data() } as User;
            setCurrentUserProfile(userProfile);
            // For non-admins, set the selected club to their primary club
            if (userProfile.role !== 'Site Admin' && userProfile.primaryClubId) {
                setSelectedClubId(userProfile.primaryClubId);
            }
        } else {
            setIsLoading(false);
        }
    });

    return () => unsubscribeUser();
  }, [user]);

  // Fetch all clubs if user is a site admin
  useEffect(() => {
    if (currentUserProfile?.role === 'Site Admin' && firestore) {
        const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
        const unsubscribeClubs = onSnapshot(clubsQuery, (snapshot) => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setAllClubs(clubsData);
            if (!selectedClubId && clubsData.length > 0) {
                setSelectedClubId(clubsData[0].id); // Default to first club
            }
        });
        return () => unsubscribeClubs();
    }
  }, [currentUserProfile, selectedClubId]);


  // Fetch series and matches for the selected club
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      setSeriesList([]);
      setClubName(currentUserProfile?.role === 'Site Admin' ? 'Please select a club' : 'No Club Selected');
      if (selectedClubId) setIsLoading(false);
      return;
    }
    
    setIsLoading(true);

    const clubDocRef = doc(firestore, 'clubs', selectedClubId);
    const unsubscribeClub = onSnapshot(clubDocRef, (clubDoc) => {
      setClubName(clubDoc.exists() ? clubDoc.data().name : 'Selected Club');
    });

    const seriesQuery = query(collection(firestore, 'series'), where("clubId", "==", selectedClubId));
    
    const unsubscribeSeries = onSnapshot(seriesQuery, async (seriesSnapshot) => {
      const seriesData = seriesSnapshot.docs.map(s => ({id: s.id, ...s.data()}) as Series);

      try {
        const matchesQuery = query(collection(firestore, 'matches'), where('clubId', '==', selectedClubId));
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(m => m.data() as Match);

        const seriesWithCounts = seriesData.map(series => {
          const matchCount = matchesData.filter(m => m.seriesId === series.id).length;
          return {
            ...series,
            matchCount: matchCount,
          };
        });

        setSeriesList(seriesWithCounts);
      } catch (error) {
        console.error("Error fetching matches:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch matches for series calculation.'
        });
      } finally {
        setIsLoading(false);
      }
    }, (error) => {
        console.error("Error fetching series: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch series.' });
        setIsLoading(false);
    });

    return () => {
        unsubscribeClub();
        unsubscribeSeries();
    };

  }, [selectedClubId, toast, currentUserProfile]);
  
  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeriesName.trim() || !selectedClubId || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Series name and a selected club are required.' });
      return;
    }
    
    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'series'), {
        name: newSeriesName,
        clubId: selectedClubId
      });
      toast({ title: 'Success!', description: `Series "${newSeriesName}" created.` });
      setNewSeriesName('');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating series:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not create series.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (series: Series) => {
    setSelectedSeries(series);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeries || !firestore) return;

    setIsSaving(true);
    try {
        const seriesDocRef = doc(firestore, 'series', selectedSeries.id);
        await updateDoc(seriesDocRef, {
            name: selectedSeries.name,
        });
        toast({ title: 'Success!', description: `Series "${selectedSeries.name}" updated.` });
        setIsEditDialogOpen(false);
        setSelectedSeries(null);
    } catch (error) {
        console.error('Error updating series:', error);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update series.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const canEdit = currentUserProfile?.role === 'Site Admin' || currentUserProfile?.role === 'Club Admin';

  const renderSeriesList = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
            {canEdit && <TableCell className="text-right"><Skeleton className="h-10 w-[80px]" /></TableCell>}
          </TableRow>
      ));
    }

    if (seriesList.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={canEdit ? 3 : 2} className="h-24 text-center">
            No series found for this club. Create the first one!
          </TableCell>
        </TableRow>
      );
    }

    return seriesList.map((series) => (
       <TableRow key={series.id}>
          <TableCell className="font-medium">{series.name}</TableCell>
          <TableCell>{series.matchCount}</TableCell>
          {canEdit && (
            <TableCell className="text-right">
              <TooltipProvider>
                <div className="inline-flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => handleEditClick(series)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>Edit Series Details</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </TableCell>
          )}
        </TableRow>
    ));
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Series</h1>
          <p className="text-muted-foreground">Manage your match series here.</p>
        </div>
        <div className="flex items-center gap-4">
            {currentUserProfile?.role === 'Site Admin' && (
                <div className="flex items-center gap-2">
                    <Label htmlFor="club-filter" className="text-nowrap">Clubs</Label>
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={allClubs.length === 0}>
                        <SelectTrigger id="club-filter" className="w-52">
                            <SelectValue placeholder="Select a club..." />
                        </SelectTrigger>
                        <SelectContent>
                            {allClubs.map((club) => (
                                <SelectItem key={club.id} value={club.id}>
                                    {club.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            {canEdit && (
                <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!selectedClubId}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Series
                </Button>
            )}
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>{clubName} Series</CardTitle>
            <CardDescription>A list of all match series for the selected club.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Series Name</TableHead>
                <TableHead>Match Count</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderSeriesList()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateSeries}>
            <DialogHeader>
              <DialogTitle>Create New Series</DialogTitle>
              <DialogDescription>
                Enter a name for the new series. It will be associated with the currently selected club: <span className="font-semibold">{clubName}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="series-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="series-name"
                  value={newSeriesName}
                  onChange={(e) => setNewSeriesName(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Summer League 2024"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Creating...' : 'Create Series'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {selectedSeries && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleUpdateSeries}>
                    <DialogHeader>
                        <DialogTitle>Edit Series</DialogTitle>
                        <DialogDescription>
                            Update details for {selectedSeries.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-series-name">Series Name</Label>
                            <Input
                                id="edit-series-name"
                                value={selectedSeries.name}
                                onChange={(e) => setSelectedSeries({ ...selectedSeries, name: e.target.value })}
                                required
                            />
                        </div>
                         <p className="text-sm text-muted-foreground pt-4">Match counts are now calculated automatically. You can no longer edit them here.</p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
