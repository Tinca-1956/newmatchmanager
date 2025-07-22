

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import type { Club, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';

export default function ClubsPage() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [newClubName, setNewClubName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore || !user) {
      setIsLoading(false);
      return;
    }

    // Fetch current user's profile
    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
        if(doc.exists()){
            setCurrentUserProfile({ id: doc.id, ...doc.data() } as User);
        }
    });

    const clubsCollection = collection(firestore, 'clubs');
    const unsubscribeClubs = onSnapshot(
      clubsCollection,
      (snapshot) => {
        const clubsData = snapshot.docs.map(doc => {
            const data = doc.data();
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

    return () => {
        unsubscribeUser();
        unsubscribeClubs();
    };
  }, [toast, user]);
  
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
            description: selectedClub.description,
            country: selectedClub.country,
            state: selectedClub.state,
            subscriptionExpiryDate: selectedClub.subscriptionExpiryDate,
        };

        await updateDoc(clubDocRef, dataToUpdate as { [x: string]: any });

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
        description: 'A new fantastic club!',
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

  const handleDeleteClub = async () => {
    if (!firestore || !selectedClub) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No club selected or Firestore is not initialized.',
      });
      return;
    }
    try {
      await deleteDoc(doc(firestore, 'clubs', selectedClub.id));
      toast({
        title: 'Club Deleted',
        description: `Club "${selectedClub.name}" has been removed.`,
      });
      setIsDeleteDialogOpen(false);
      setIsEditDialogOpen(false);
      setSelectedClub(null);
    } catch (error) {
      console.error('Error deleting document: ', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Could not delete the club. Please try again. You may not have the required permissions.',
      });
    }
  };
  
  const renderClubList = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell>
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[250px]" />
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-10 w-[120px]" />
            </TableCell>
          </TableRow>
      ));
    }

    if (clubs.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={2} className="h-24 text-center">
            No clubs found. Create the first one!
          </TableCell>
        </TableRow>
      );
    }

    return clubs.map((club) => (
       <TableRow key={club.id}>
          <TableCell>
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
          </TableCell>
          <TableCell className="text-right">
            <Button variant="outline" onClick={() => handleEditClick(club)}>
                <Edit className="mr-2 h-4 w-4"/>
                View Details
            </Button>
          </TableCell>
        </TableRow>
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
        {currentUserProfile?.role === 'Site Admin' && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Club
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
            <CardTitle>All Clubs</CardTitle>
            <CardDescription>A list of all clubs in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderClubList()}
            </TableBody>
          </Table>
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
        <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setIsDeleteDialogOpen(false); // Close delete dialog if edit dialog is closed
            }
            setIsEditDialogOpen(isOpen);
        }}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleUpdateClub}>
                    <DialogHeader>
                        <DialogTitle>Edit Club Details</DialogTitle>
                        <DialogDescription>
                            Modify the details for {selectedClub.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="edit-club-name" className="text-right pt-2">
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
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="edit-description" className="text-right pt-2">
                                Description
                            </Label>
                            <Textarea
                                id="edit-description"
                                value={selectedClub.description}
                                onChange={(e) => setSelectedClub({ ...selectedClub, description: e.target.value })}
                                className="col-span-3"
                                placeholder="A brief description of the club."
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
                                        selected={new Date(selectedClub.subscriptionExpiryDate || '')}
                                        onSelect={(date) => setSelectedClub({ ...selectedClub, subscriptionExpiryDate: date || undefined })}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-between">
                         {currentUserProfile?.role === 'Site Admin' && (
                            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant="destructive">Delete Club</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the 
                                            <span className="font-bold"> {selectedClub.name}</span> club and all of its data.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDeleteClub}
                                            className="bg-destructive hover:bg-destructive/90"
                                        >
                                            Continue
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                         )}
                        <div className="flex gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
