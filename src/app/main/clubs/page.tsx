
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { PlusCircle, Edit, Upload, Shield } from 'lucide-react';
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
import { firestore, storage } from '@/lib/firebase-client';
import { collection, addDoc, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';

const initialClubState: Omit<Club, 'id'> = {
  name: '',
  description: '',
  imageUrl: '',
};

export default function ClubsPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const { isSiteAdmin, isClubAdmin, loading: adminLoading } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedClub, setSelectedClub] = useState<Partial<Club>>(initialClubState);

  useEffect(() => {
    if (!firestore || adminLoading) {
        setIsLoading(adminLoading);
        return;
    }

    setIsLoading(true);
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));

    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
        let clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        
        // If user is a Club Admin but not a Site Admin, they can see all clubs, but can only edit their own.
        // This remains unchanged as the edit button logic handles the permissions.
        setClubs(clubsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching clubs: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, adminLoading]);

  const handleOpenDialog = (mode: 'create' | 'edit', club?: Club) => {
    setDialogMode(mode);
    setUploadProgress(0);
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
    if (!firestore || !selectedClub?.name) {
        toast({ variant: 'destructive', title: 'Error', description: 'Club name is required.' });
        return;
    }
    
    setIsSaving(true);
    let dataToUpdate: Partial<Club> = {};

    try {
        if (dialogMode === 'edit' && 'id' in selectedClub && selectedClub.id) {
            // Logic for editing an existing club
            const clubDocRef = doc(firestore, 'clubs', selectedClub.id);
            
            if (isClubAdmin && !isSiteAdmin) {
                // Club Admins can only update description and imageUrl
                dataToUpdate = {
                    description: selectedClub.description,
                    imageUrl: selectedClub.imageUrl,
                };
            } else {
                // Site Admins can update everything
                dataToUpdate = { ...selectedClub };
                delete dataToUpdate.id; // Don't try to write the id field back to the document
            }
            
            await updateDoc(clubDocRef, dataToUpdate);
            toast({ title: 'Success!', description: 'Club updated successfully.' });

        } else if (dialogMode === 'create' && isSiteAdmin) {
            // Logic for creating a new club (only Site Admins can do this)
            const newClubData = { ...selectedClub };
            delete newClubData.id;
            await addDoc(collection(firestore, 'clubs'), newClubData);
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !storage || !selectedClub?.id) {
      return;
    }
    const file = e.target.files[0];
    const storageRef = ref(storage, `clubs/${selectedClub.id}/logo-${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setIsUploading(true);
    setUploadProgress(0);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
        toast({ variant: 'destructive', title: 'Upload failed', description: 'Could not upload the logo.' });
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setSelectedClub(prev => ({ ...prev!, imageUrl: downloadURL }));
        setIsUploading(false);
        toast({ title: 'Success!', description: 'Logo uploaded. Remember to save your changes.' });
      }
    );
  };
  
  if (adminLoading) {
      return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            <Card>
                <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
                <CardContent><Skeleton className="h-48 w-full" /></CardContent>
            </Card>
        </div>
      );
  }

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
                  <TableHead className="w-16">Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                        <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                        </TableRow>
                    ))
                ) : (
                    clubs.map(club => (
                    <TableRow key={club.id}>
                        <TableCell>
                            {club.imageUrl ? (
                                <Image src={club.imageUrl} alt={club.name} width={40} height={40} className="rounded-full" />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                    <Shield className="h-6 w-6 text-muted-foreground" />
                                </div>
                            )}
                        </TableCell>
                        <TableCell className="font-medium">{club.name}</TableCell>
                        <TableCell>{club.description}</TableCell>
                        <TableCell className="text-right">
                           {(isSiteAdmin || (isClubAdmin && club.id === userProfile?.primaryClubId)) && (
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('edit', club)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}
                        </TableCell>
                    </TableRow>
                    ))
                )}
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
                        <Input 
                            id="name" 
                            name="name" 
                            value={selectedClub.name || ''} 
                            onChange={handleInputChange} 
                            className="col-span-3" 
                            required 
                            disabled={!isSiteAdmin && dialogMode === 'edit'} // Club admins cannot edit the name
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Description</Label>
                        <Textarea id="description" name="description" value={selectedClub.description || ''} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    {dialogMode === 'edit' && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="logo" className="text-right">Logo</Label>
                        <div className="col-span-3 space-y-2">
                          <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                            <Upload className="mr-2 h-4 w-4" />
                            {isUploading ? 'Uploading...' : 'Upload Logo'}
                          </Button>
                          {isUploading && <Progress value={uploadProgress} className="w-full h-2" />}
                          {selectedClub.imageUrl && (
                            <div className="mt-2 flex items-center gap-4">
                               <p className="text-xs text-muted-foreground">Current:</p>
                               <Image src={selectedClub.imageUrl} alt="Current logo" width={40} height={40} className="rounded-md" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSaving || isUploading}>
                    {isSaving ? 'Saving...' : 'Save Club'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
