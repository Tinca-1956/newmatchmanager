
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, addDoc, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import type { Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import Image from 'next/image';

const initialClubState: Omit<Club, 'id'> = {
  name: '',
  description: '',
  imageUrl: '',
};

export default function ClubsPage() {
  const { toast } = useToast();
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedClub, setSelectedClub] = useState<Club | Omit<Club, 'id'>>(initialClubState);

  useEffect(() => {
    if (!firestore) {
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));

    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setClubs(clubsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching clubs: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleOpenDialog = (mode: 'create' | 'edit', club?: Club) => {
    setDialogMode(mode);
    if (mode === 'edit' && club) {
        setSelectedClub(club);
    } else {
        setSelectedClub(initialClubState);
    }
    setIsDialogOpen(true);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSelectedClub(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !selectedClub.name) {
        toast({ variant: 'destructive', title: 'Error', description: 'Club name is required.' });
        return;
    }
    
    setIsSaving(true);
    const clubData = {
      ...selectedClub,
      imageUrl: selectedClub.imageUrl || 'https://placehold.co/100x100.png',
    };

    try {
        if (dialogMode === 'edit' && 'id' in selectedClub) {
            const clubDocRef = doc(firestore, 'clubs', selectedClub.id);
            await updateDoc(clubDocRef, clubData);
            toast({ title: 'Success!', description: 'Club updated successfully.' });
        } else {
            await addDoc(collection(firestore, 'clubs'), clubData);
            toast({ title: 'Success!', description: 'Club created successfully.' });
        }
        setIsDialogOpen(false);
    } catch (error) {
        console.error('Error saving club:', error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the club.' });
    } finally {
        setIsSaving(false);
    }
  };

  const renderClubList = () => {
    if (isLoading || adminLoading) {
      return Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-10 w-10 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-64" />
          </TableCell>
          {isSiteAdmin && (
            <TableCell>
              <Skeleton className="h-8 w-8 rounded-md" />
            </TableCell>
          )}
        </TableRow>
      ));
    }
    
    return clubs.map(club => (
      <TableRow key={club.id}>
        <TableCell>
             <Image
                src={club.imageUrl || 'https://placehold.co/100x100.png'}
                alt={club.name}
                width={40}
                height={40}
                className="rounded-full"
                data-ai-hint="club logo"
            />
        </TableCell>
        <TableCell className="font-medium">{club.name}</TableCell>
        <TableCell>{club.description}</TableCell>
        {isSiteAdmin && (
            <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('edit', club)}>
                    <Edit className="h-4 w-4" />
                </Button>
            </TableCell>
        )}
      </TableRow>
    ));
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clubs</h1>
            <p className="text-muted-foreground">View and manage all clubs in the system.</p>
          </div>
          {isSiteAdmin && (
            <Button onClick={() => handleOpenDialog('create')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Club
            </Button>
          )}
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>All Clubs</CardTitle>
            <CardDescription>A list of all registered fishing clubs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  {isSiteAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderClubList()}
              </TableBody>
            </Table>
          </CardContent>
           {clubs.length > 5 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">
                    Showing {clubs.length} of {clubs.length} clubs.
                </p>
            </CardFooter>
          )}
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{dialogMode === 'create' ? 'Create New Club' : 'Edit Club'}</DialogTitle>
                    <DialogDescription>
                    {dialogMode === 'create' ? 'Add a new club to the system.' : `Editing ${selectedClub.name}.`}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" name="name" value={selectedClub.name} onChange={handleInputChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Description</Label>
                        <Textarea id="description" name="description" value={selectedClub.description} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="imageUrl" className="text-right">Image URL</Label>
                        <Input id="imageUrl" name="imageUrl" value={selectedClub.imageUrl} onChange={handleInputChange} className="col-span-3" placeholder="https://placehold.co/100x100.png" />
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
    </>
  );
}
