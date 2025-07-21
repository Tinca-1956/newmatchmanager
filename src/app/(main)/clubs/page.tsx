'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [newClubName, setNewClubName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      return;
    }

    const clubsCollection = collection(firestore, 'clubs');
    const unsubscribe = onSnapshot(
      clubsCollection,
      (snapshot) => {
        const clubsData = snapshot.docs.map(doc => {
            const data = doc.data();
            // Convert Firestore Timestamp to JS Date
            const expiryDate = data.subscriptionExpiryDate instanceof Timestamp 
                ? data.subscriptionExpiryDate.toDate() 
                : data.subscriptionExpiryDate;
            return {
                id: doc.id,
                ...data,
                subscriptionExpiryDate: expiryDate,
            } as Club
        });
        setClubs(clubsData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching clubs: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch clubs from the database.',
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);
  
  const handleEditClick = (club: Club) => {
    setSelectedClub(club);
    setIsEditDialogOpen(true);
  }
  
  const handleUpdateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClub || !firestore) return;

    setIsSaving(true);
    try {
        const clubDocRef = doc(firestore, 'clubs', selectedClub.id);
        const dataToUpdate: Partial<Club> = {
            name: selectedClub.name,
            country: selectedClub.country,
            state: selectedClub.state,
            subscriptionExpiryDate: selectedClub.subscriptionExpiryDate,
        };

        await updateDoc(clubDocRef, dataToUpdate);

        toast({
            title: 'Success!',
            description: `Club "${selectedClub.name}" has been updated.`,
        });
        setIsEditDialogOpen(false);
        setSelectedClub(null);
    } catch (error) {
        console.error('Error updating document: ', error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not update the club. Please try again.',
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Club name cannot be empty.',
      });
      return;
    }
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not initialized.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'clubs'), {
        name: newClubName,
        description: 'A new fantastic club!', // Default description
        imageUrl: `https://placehold.co/40x40`,
        country: '',
        state: '',
        subscriptionExpiryDate: null,
      });
      toast({
        title: 'Success!',
        description: `Club "${newClubName}" has been created.`,
      });
      setNewClubName('');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error adding document: ', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not create the new club. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClub = async (clubId: string, clubName: string) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not initialized.',
      });
      return;
    }
    try {
      await deleteDoc(doc(firestore, 'clubs', clubId));
      toast({
        title: 'Club Deleted',
        description: `Club "${clubName}" has been removed.`,
      });
    } catch (error) {
      console.error('Error deleting document: ', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Could not delete the club. Please try again.',
      });
    }
  };
  
  const renderClubList = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
         <div key={i} className="flex items-center justify-between p-4 border-b last:border-b-0">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[250px]" />
              </div>
            </div>
            <Skeleton className="h-10 w-[120px]" />
          </div>
      ));
    }

    if (clubs.length === 0) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          No clubs found. Create the first one!
        </div>
      );
    }

    return clubs.map((club) => (
       <div
          key={club.id}
          className="flex items-center justify-between p-4 border-b last:border-b-0"
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12" data-ai-hint="fishing club">
              <AvatarImage src={club.imageUrl} alt={club.name} />
              <AvatarFallback>{club.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{club.name}</p>
              <p className="text-sm text-muted-foreground">
                {club.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleEditClick(club)}>
                <Edit className="mr-2 h-4 w-4"/>
                View Details
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the 
                    <span className="font-bold"> {club.name}</span> club and all of its data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteClub(club.id, club.name)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
    ));
  }


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clubs</h1>
          <p className="text-muted-foreground">
            Browse and manage your fishing clubs.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Club
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {renderClubList()}
          </div>
        </CardContent>
      </Card>

       <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateClub}>
            <DialogHeader>
              <DialogTitle>Create a New Club</DialogTitle>
              <DialogDescription>
                Enter the name for your new club. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="club-name" className="text-right">
                  Club Name
                </Label>
                <Input
                  id="club-name"
                  value={newClubName}
                  onChange={(e) => setNewClubName(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Lakeside Casters"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Club'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {selectedClub && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleUpdateClub}>
                    <DialogHeader>
                        <DialogTitle>Edit Club Details</DialogTitle>
                        <DialogDescription>
                            Modify the details for {selectedClub.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-club-name" className="text-right">
                                Club Name
                            </Label>
                            <Input
                                id="edit-club-name"
                                value={selectedClub.name}
                                onChange={(e) => setSelectedClub({ ...selectedClub, name: e.target.value })}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-country" className="text-right">
                                Country
                            </Label>
                            <Input
                                id="edit-country"
                                value={selectedClub.country || ''}
                                onChange={(e) => setSelectedClub({ ...selectedClub, country: e.target.value })}
                                className="col-span-3"
                                placeholder="e.g., United Kingdom"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-state" className="text-right">
                                State/County
                            </Label>
                            <Input
                                id="edit-state"
                                value={selectedClub.state || ''}
                                onChange={(e) => setSelectedClub({ ...selectedClub, state: e.target.value })}
                                className="col-span-3"
                                placeholder="e.g., West Midlands"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-expiry" className="text-right">
                                Expiry Date
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "col-span-3 justify-start text-left font-normal",
                                        !selectedClub.subscriptionExpiryDate && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedClub.subscriptionExpiryDate ? (
                                        format(selectedClub.subscriptionExpiryDate, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={selectedClub.subscriptionExpiryDate}
                                        onSelect={(date) => setSelectedClub({ ...selectedClub, subscriptionExpiryDate: date || undefined })}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
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
