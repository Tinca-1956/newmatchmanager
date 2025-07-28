
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Upload, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
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
import { doc, getDoc, updateDoc, arrayUnion, DocumentSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { Match, Club, User } from '@/lib/types';

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

  useEffect(() => {
    if (!matchId || !firestore) {
      setIsLoading(false);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const matchDocRef = doc(firestore, 'matches', matchId);
        const matchDoc = await getDoc(matchDocRef);

        if (!matchDoc.exists()) {
          toast({ variant: 'destructive', title: 'Error', description: 'Match not found.' });
          setIsLoading(false);
          return;
        }
        const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
        setMatchData(matchData);

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
        console.error('Error fetching match details:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch match details.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [matchId, user, toast]);
  
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
    if (!event.target.files || !matchId || !storage) return;

    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const uploadedUrls: string[] = [];

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
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        uploadedUrls.push(downloadURL);
                        resolve();
                    }
                );
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: `Could not upload ${file.name}. Please try again.` });
            // continue to next file
        }
    }
    
    if (uploadedUrls.length > 0 && firestore) {
      const matchDocRef = doc(firestore, 'matches', matchId);
      await updateDoc(matchDocRef, {
        mediaUrls: arrayUnion(...uploadedUrls),
      });
      // Refresh match data to show new images
      setMatchData(prev => prev ? { ...prev, mediaUrls: [...(prev.mediaUrls || []), ...uploadedUrls] } : null);
    }

    toast({ title: 'Upload Complete', description: `${uploadedUrls.length} of ${files.length} images uploaded successfully.` });
    setIsUploading(false);
    
    // Reset file input
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };


  const renderDetails = () => {
    if (isLoading) {
      return <div className="space-y-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-6 w-1/2" /><Skeleton className="h-6 w-2/3" /></div>;
    }
    if (!matchDetails) return <p>Match details not found.</p>;
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p><strong className="text-foreground">Club:</strong> {matchDetails.clubName}</p>
        <p><strong className="text-foreground">Series:</strong> {matchDetails.seriesName}</p>
        <p><strong className="text-foreground">Match:</strong> {matchDetails.matchName}</p>
        <p><strong className="text-foreground">Location:</strong> {matchDetails.location}</p>
        <p><strong className="text-foreground">Angler:</strong> {anglerName}</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {matchData.mediaUrls.map((url, index) => (
          <div key={index} className="relative aspect-square w-full overflow-hidden rounded-md">
            <NextImage src={url} alt={`Match image ${index + 1}`} fill style={{ objectFit: 'cover' }} />
          </div>
        ))}
      </div>
    );
  };

  return (
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
            <CardDescription>Upload and view images for this match.</CardDescription>
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
  );
}


    