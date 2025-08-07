
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
import { Edit, Upload, Shield } from 'lucide-react';
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
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';

export default function ClubsClubAdminPage() {
  const { toast } = useToast();
  const { userProfile, loading: authLoading } = useAuth();
  const { isSiteAdmin, isClubAdmin, loading: adminLoading } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Partial<Club> | null>(null);

  useEffect(() => {
    if (authLoading || adminLoading) {
      setIsLoading(true);
      return;
    }
    if (!firestore || !userProfile?.primaryClubId) {
        setIsLoading(false);
        return;
    };

    setIsLoading(true);
    const clubDocRef = doc(firestore, 'clubs', userProfile.primaryClubId);

    const unsubscribe = onSnapshot(clubDocRef, (doc) => {
        if (doc.exists()) {
            setClub({ id: doc.id, ...doc.data() } as Club);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Primary club not found.' });
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching club: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your club.' });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, userProfile, authLoading, adminLoading]);

  const handleOpenDialog = (clubToEdit: Club) => {
    setSelectedClub(clubToEdit);
    setUploadProgress(0);
    setIsDialogOpen(true);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSelectedClub(prev => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClub?.id || !firestore) return;
    
    setIsSaving(true);
    try {
        const clubDocRef = doc(firestore, 'clubs', selectedClub.id);
        
        let dataToUpdate: Partial<Club>;
        if (isSiteAdmin) {
            const { id, ...restOfClub } = selectedClub;
            dataToUpdate = restOfClub;
        } else {
             dataToUpdate = {
                description: selectedClub.description || '',
                imageUrl: selectedClub.imageUrl || '',
            };
        }
        
        await updateDoc(clubDocRef, dataToUpdate as any);
        toast({ title: 'Success!', description: 'Club updated successfully.' });
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
        setSelectedClub(prev => (prev ? { ...prev, imageUrl: downloadURL } : null));
        setIsUploading(false);
        toast({ title: 'Success!', description: 'Logo uploaded. Remember to save your changes.' });
      }
    );
  };
  
  if (isLoading || adminLoading) {
      return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
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
            <h1 className="text-3xl font-bold tracking-tight">My Club</h1>
            <p className="text-muted-foreground">View and manage your primary club.</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Club Details</CardTitle>
            <CardDescription>Details for your primary club.</CardDescription>
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
                    <TableRow>
                    <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                    </TableRow>
                ) : club ? (
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
                           {(isSiteAdmin || isClubAdmin) && (
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(club)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}
                        </TableCell>
                    </TableRow>
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No primary club found. Please set one in your profile.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {selectedClub && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSubmit}>
                  <DialogHeader>
                      <DialogTitle>Edit Club</DialogTitle>
                      <DialogDescription>
                      Editing {selectedClub.name}.
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
                              disabled={!isSiteAdmin}
                          />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="description" className="text-right">Description</Label>
                          <Textarea id="description" name="description" value={selectedClub.description || ''} onChange={handleInputChange} className="col-span-3" />
                      </div>
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
      )}
    </>
  );
}
