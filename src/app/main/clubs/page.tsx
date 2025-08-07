
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import { Edit, Upload, Shield, PlusCircle, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { firestore, storage } from '@/lib/firebase-client';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, writeBatch, where, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import type { Club, ClubStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const getClubStatus = (club: Club): ClubStatus => {
  if (club.subscriptionExpiryDate) {
    const expiryDate = club.subscriptionExpiryDate instanceof Timestamp 
      ? club.subscriptionExpiryDate.toDate() 
      : club.subscriptionExpiryDate;
    if (new Date() > expiryDate) {
      return 'Suspended';
    }
  }
  return 'Active';
}

export default function ClubsPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const { isSiteAdmin, isClubAdmin, loading: adminLoading } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Partial<Club> | null>(null);

  useEffect(() => {
    if (adminLoading) {
      setIsLoading(true);
      return;
    }
    if (!firestore) return;

    setIsLoading(true);
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));

    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
        let clubsData = snapshot.docs.map(doc => {
            const data = doc.data() as Omit<Club, 'id'>;
            return {
                id: doc.id,
                ...data,
                status: getClubStatus(data as Club),
            } as Club;
        });
        
        setClubs(clubsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching clubs: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, adminLoading]);

  const handleOpenDialog = (club: Club) => {
    setSelectedClub(club);
    setUploadProgress(0);
    setIsDialogOpen(true);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSelectedClub(prev => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClub?.id) return;
    
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
        
        await updateDoc(clubDocRef, dataToUpdate as any); // Use 'as any' to bypass strict type checking on the partial object.
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
  
  const handleDeleteClub = async (clubId: string) => {
    if (!firestore || !storage) {
        toast({ variant: 'destructive', title: 'Error', description: 'System is not ready for this operation.' });
        return;
    }
    setIsSaving(true);
    toast({ title: 'Deleting...', description: 'Please wait while all club data is being removed.' });

    try {
        const batch = writeBatch(firestore);

        // --- Firestore Deletions ---
        // 1. Delete users with primaryClubId
        const usersQuery = query(collection(firestore, 'users'), where('primaryClubId', '==', clubId));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach(doc => batch.delete(doc.ref));
        
        // 2. Delete series
        const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', clubId));
        const seriesSnapshot = await getDocs(seriesQuery);
        seriesSnapshot.forEach(doc => batch.delete(doc.ref));

        // 3. Find matches to identify results to delete
        const matchesQuery = query(collection(firestore, 'matches'), where('clubId', '==', clubId));
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchIds = matchesSnapshot.docs.map(doc => doc.id);

        // 4. Delete results associated with those matches
        if (matchIds.length > 0) {
            // Firestore 'in' queries are limited to 30 items.
            // We need to chunk the deletions if there are many matches.
            const chunkArray = <T>(arr: T[], size: number) =>
                Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                    arr.slice(i * size, i * size + size)
                );

            const matchIdChunks = chunkArray(matchIds, 30);
            for (const chunk of matchIdChunks) {
                const resultsQuery = query(collection(firestore, 'results'), where('matchId', 'in', chunk));
                const resultsSnapshot = await getDocs(resultsQuery);
                resultsSnapshot.forEach(doc => batch.delete(doc.ref));
            }
        }
        
        // 5. Delete the matches themselves
        matchesSnapshot.forEach(doc => batch.delete(doc.ref));

        // 6. Delete the club itself
        batch.delete(doc(firestore, 'clubs', clubId));

        await batch.commit();

        // --- Storage Deletion ---
        const clubStorageRef = ref(storage, `clubs/${clubId}`);
        const res = await listAll(clubStorageRef);
        await Promise.all(res.items.map(itemRef => deleteObject(itemRef)));


        toast({ title: 'Success!', description: 'Club and all associated data have been deleted.' });
    } catch (error) {
        console.error("Error deleting club:", error);
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the club and its data. Check console for details.' });
    } finally {
        setIsSaving(false);
    }
  }

  
  if (isLoading || adminLoading) {
      return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
                 <Skeleton className="h-10 w-40" />
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
              <Button onClick={() => router.push('/main/clubs/create')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Club
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
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                        <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
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
                        <TableCell>
                           {club.subscriptionExpiryDate ? format((club.subscriptionExpiryDate as Timestamp).toDate(), 'dd/MM/yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                            <Badge variant={club.status === 'Active' ? 'default' : 'destructive'}>{club.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           {(isSiteAdmin || (isClubAdmin && club.id === userProfile?.primaryClubId)) && (
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(club)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}
                             {isSiteAdmin && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the club <span className="font-bold">{club.name}</span>, and all of its associated members, series, matches, and results.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive hover:bg-destructive/90"
                                            onClick={() => handleDeleteClub(club.id)}
                                        >
                                            Delete
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
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
