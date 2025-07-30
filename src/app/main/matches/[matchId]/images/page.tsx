
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Upload, Image as ImageIcon, X, AlertCircle, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import NextImage from 'next/image';

import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore, storage } from '@/lib/firebase-client';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, DocumentSnapshot, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Match, Club, User } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
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

interface MatchDetails {
  clubName: string;
  seriesName: string;
  matchName: string;
  location: string;
}

const MAX_IMAGE_WIDTH = 1920; // Resize images to a max width of 1920px

export default function ManageImagesPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const matchId = params.matchId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [matchData, setMatchData] = useState<Match | null>(null);
  const [anglerName, setAnglerName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Store URL of image being deleted

  useEffect(() => {
    if (!matchId || !firestore) {
      setIsLoading(false);
      return;
    }
    
    // Subscribe to match updates
    const matchDocRef = doc(firestore, 'matches', matchId);
    const unsubscribe = onSnapshot(matchDocRef, async (matchDoc) => {
       if (!matchDoc.exists()) {
          toast({ variant: 'destructive', title: 'Error', description: 'Match not found.' });
          setIsLoading(false);
          return;
        }
        const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
        setMatchData(matchData);

        if (!matchDetails) { // Only fetch these details once
            setIsLoading(true);
            try {
                let clubName = 'N/A';
                if (matchData.clubId) {
                  const clubDocRef = doc(firestore, 'clubs', matchData.clubId);
                  const clubDoc = await getDoc(clubDocRef);
                  if (clubDoc.exists()) {
                    clubName = (clubDoc.data() as Club).name;
                  }
                }

                setMatchDetails({
                  clubName: clubName,
                  seriesName: matchData.seriesName,
                  matchName: matchData.name,
                  location: matchData.location,
                });

                if (user) {
                  const userDocRef = doc(firestore, 'users', user.uid);
                  const userDoc = await getDoc(userDocRef);
                  if (userDoc.exists()) {
                    const userData = userDoc.data() as User;
                    setAnglerName(`${userData.firstName} ${userData.lastName}`);
                  }
                }
            } catch (error) {
                 console.error('Error fetching initial details:', error);
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch match details.' });
            } finally {
                setIsLoading(false);
            }
        }
    });

    return () => unsubscribe();
  }, [matchId, user, toast, matchDetails]);
  
  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > MAX_IMAGE_WIDTH) {
            height = (MAX_IMAGE_WIDTH / width) * height;
            width = MAX_IMAGE_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          }, 'image/jpeg', 0.8); // 80% quality
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !matchId || !storage || !firestore) return;

    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const matchDocRef = doc(firestore, 'matches', matchId);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const resizedBlob = await resizeImage(file);
            const storageRef = ref(storage, `matches/${matchId}/${Date.now()}-${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, resizedBlob);

            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        const overallProgress = (i / files.length) * 100 + progress / files.length;
                        setUploadProgress(overallProgress);
                    },
                    (error) => {
                        console.error('Upload failed:', error);
                        reject(error);
                    },
                    async () => {
                        try {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            // THIS IS THE FIX: Update Firestore immediately after getting the URL
                            await updateDoc(matchDocRef, {
                                mediaUrls: arrayUnion(downloadURL),
                            });
                            resolve();
                        } catch(firestoreError) {
                            console.error("Firestore update failed:", firestoreError);
                            reject(firestoreError);
                        }
                    }
                );
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: `Could not upload ${file.name}. Please try again.` });
            continue; // continue to next file
        }
    }
    
    // The onSnapshot listener will handle the UI update automatically.
    // The toast message is now a success indicator for the entire process.
    toast({ title: 'Upload Complete', description: `${files.length} image(s) uploaded successfully.` });
    setIsUploading(false);
    
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const handleDeleteImage = async (imageUrl: string) => {
    if (!storage || !firestore || !matchId) return;

    setIsDeleting(imageUrl);
    try {
        // Delete from Storage
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);

        // Delete from Firestore
        const matchDocRef = doc(firestore, 'matches', matchId);
        await updateDoc(matchDocRef, {
            mediaUrls: arrayRemove(imageUrl)
        });

        // Local state will be updated by the onSnapshot listener
        toast({ title: 'Success', description: 'Image deleted successfully.' });
    } catch (error) {
        console.error("Error deleting image:", error);
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the image.' });
    } finally {
        setIsDeleting(null);
    }
  };


  const renderDetails = () => {
    if (isLoading) {
      return <div className="space-y-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-6 w-1/2" /><Skeleton className="h-6 w-2/3" /></div>;
    }
    if (!matchDetails) return <p>Match details not found.</p>;
    return (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div className="space-y-2">
            <p><strong className="text-foreground">Club:</strong> {matchDetails.clubName}</p>
            <p><strong className="text-foreground">Series:</strong> {matchDetails.seriesName}</p>
            <p><strong className="text-foreground">Match:</strong> {matchDetails.matchName}</p>
            <p><strong className="text-foreground">Location:</strong> {matchDetails.location}</p>
            <p><strong className="text-foreground">Angler:</strong> {anglerName}</p>
        </div>
        <Button
            variant="default"
            onClick={() => setIsGalleryOpen(true)}
            disabled={!matchData?.mediaUrls || matchData.mediaUrls.length === 0}
        >
            <Eye className="mr-2 h-4 w-4" />
            View Gallery ({matchData?.mediaUrls?.length || 0})
        </Button>
      </div>
    );
  };
  
  const renderImageGrid = () => {
     if (isLoading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      );
    }
    
    if (!matchData?.mediaUrls || matchData.mediaUrls.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg text-center p-4">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No images have been uploaded for this match yet.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {matchData.mediaUrls.map((url, index) => (
          <div key={index} className="relative group aspect-square w-full overflow-hidden rounded-md">
            <NextImage src={url} alt={`Match image ${index + 1}`} fill style={{ objectFit: 'cover' }} />
             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button
                            variant="destructive"
                            size="icon"
                            disabled={isDeleting === url}
                        >
                            {isDeleting === url ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the image.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteImage(url)}>
                            Delete
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-3xl font-bold tracking-tight">Manage Images</h1><p className="text-muted-foreground">Upload and view photos for this match.</p></div>
        </div>
        
        <Card>
          <CardHeader><CardTitle>Match Details</CardTitle><CardDescription>You are managing images for the following match.</CardDescription></CardHeader>
          <CardContent>{renderDetails()}</CardContent>
        </Card>
        
        <Card>
          <CardHeader>
              <CardTitle>Image Gallery</CardTitle>
              <CardDescription>Upload images or hover over an image to delete it.</CardDescription>
          </CardHeader>
          <CardContent>
              {renderImageGrid()}
          </CardContent>
          <CardFooter className="flex-col items-start gap-4 border-t pt-6">
              <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
              />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? `Uploading...` : 'Upload Images'}
              </Button>
              {isUploading && (
                  <div className="w-full">
                      <Progress value={uploadProgress} className="w-full" />
                      <p className="text-sm text-muted-foreground mt-2">{Math.round(uploadProgress)}% complete</p>
                  </div>
              )}
              <Alert variant="default" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertTitle className="text-blue-800 dark:text-blue-300">Tip</AlertTitle>
                  <AlertDescription className="text-blue-700 dark:text-blue-400">
                      You can select multiple images to upload at once. Images are automatically resized for faster uploads.
                  </AlertDescription>
              </Alert>
          </CardFooter>
        </Card>
      </div>

       <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-4xl w-full h-auto max-h-[90vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle>Image Gallery: {matchDetails?.matchName}</DialogTitle>
          </DialogHeader>
          <div className="flex-grow flex items-center justify-center overflow-hidden">
            {matchData?.mediaUrls && matchData.mediaUrls.length > 0 && (
                <Carousel className="w-full max-w-2xl">
                    <CarouselContent>
                        {matchData.mediaUrls.map((url, index) => (
                            <CarouselItem key={index}>
                                <div className="relative aspect-video w-full">
                                    <NextImage 
                                        src={url} 
                                        alt={`Match gallery image ${index + 1}`} 
                                        fill 
                                        style={{ objectFit: 'contain' }}
                                    />
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

    