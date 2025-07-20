'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, addDoc, getDocs, onSnapshot } from 'firebase/firestore';
import type { Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
        const clubsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Club));
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
      });
      toast({
        title: 'Success!',
        description: `Club "${newClubName}" has been created.`,
      });
      setNewClubName('');
      setIsDialogOpen(false);
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
          <Button variant="outline">View Details</Button>
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
        <Button onClick={() => setIsDialogOpen(true)}>
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

       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Club'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}