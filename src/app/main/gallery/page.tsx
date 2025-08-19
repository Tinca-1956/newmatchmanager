
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import NextImage from 'next/image';
import { ImageIcon, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore, storage } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Match, Club, Series } from '@/lib/types';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

const MAX_IMAGE_WIDTH = 1920; // Resize images to a max width of 1920px

export default function GalleryPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const { isSiteAdmin, isClubAdmin, loading: adminLoading } = useAdminAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);


    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [seriesForClub, setSeriesForClub] = useState<Series[]>([]);
    const [matchesForSeries, setMatchesForSeries] = useState<Match[]>([]);
    
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    const [isLoadingClubs, setIsLoadingClubs] = useState(true);
    const [isLoadingSeries, setIsLoadingSeries] = useState(false);
    const [isLoadingMatches, setIsLoadingMatches] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const canManage = isSiteAdmin || isClubAdmin;

    // Fetch all clubs
    useEffect(() => {
        if (authLoading || !firestore) return;
        const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
        const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setAllClubs(clubsData);
            if (!selectedClubId && userProfile?.primaryClubId) {
                setSelectedClubId(userProfile.primaryClubId);
            } else if (!selectedClubId && clubsData.length > 0) {
                setSelectedClubId(clubsData[0].id);
            }
            setIsLoadingClubs(false);
        }, (error) => {
             console.error("Error fetching clubs:", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not load clubs.' });
             setIsLoadingClubs(false);
        });
        return () => unsubscribe();
    }, [authLoading, userProfile, firestore, toast, selectedClubId]);

    // Fetch series for selected club
    useEffect(() => {
        setSeriesForClub([]);
        setMatchesForSeries([]);
        setSelectedSeriesId('');
        setSelectedMatch(null);
        if (!selectedClubId || !firestore) return;

        setIsLoadingSeries(true);
        const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', selectedClubId));
        const unsubscribe = onSnapshot(seriesQuery, (snapshot) => {
            const seriesData = snapshot.docs.map(s => ({ id: s.id, ...s.data() } as Series));
            setSeriesForClub(seriesData);
            setIsLoadingSeries(false);
        }, (error) => {
            console.error("Error fetching series:", error);
            setIsLoadingSeries(false);
        });
        return () => unsubscribe();
    }, [selectedClubId]);

    // Fetch matches for selected series
    useEffect(() => {
        setSelectedMatch(null);
        if (!selectedSeriesId || !firestore) {
            setMatchesForSeries([]); // Clear matches if no series is selected
            return;
        }

        setIsLoadingMatches(true);
        const matchesQuery = query(
          collection(firestore, 'matches'), 
          where('seriesId', '==', selectedSeriesId)
        );
        const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
            const matchesData = snapshot.docs.map(m => {
                const data = m.data();
                return {
                    id: m.id,
                    ...data,
                    // Handle Timestamps from Firestore
                    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
                } as Match;
            });
            setMatchesForSeries(matchesData);
            setIsLoadingMatches(false);
        }, (error) => {
            console.error("Error fetching matches:", error);
            setIsLoadingMatches(false);
        });
        return () => unsubscribe();
    }, [selectedSeriesId]);

    // This effect ensures that when a new match is selected, the local state reflects it.
    // It also handles real-time updates from Firestore if the selected match document changes.
    useEffect(() => {
      if (!selectedMatch?.id || !firestore) return;

      const matchDocRef = doc(firestore, 'matches', selectedMatch.id);
      const unsubscribe = onSnapshot(matchDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
           setSelectedMatch({
                id: doc.id,
                ...data,
                date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
            } as Match);
        } else {
            // The match was deleted, so we clear it from state
            setSelectedMatch(null);
            toast({ variant: 'destructive', title: 'Match Not Found', description: 'The selected match may have been deleted.'})
        }
      });
      
      return () => unsubscribe();
    }, [selectedMatch?.id, firestore, toast]);

    const handleSelectMatch = (matchId: string) => {
        const match = matchesForSeries.find(m => m.id === matchId) || null;
        setSelectedMatch(match);
    };
    
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
        if (!event.target.files || !selectedMatch || !storage || !firestore) return;

        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        const matchDocRef = doc(firestore, 'matches', selectedMatch.id);
        let successfulUploads = 0;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const resizedBlob = await resizeImage(file);
                const storageRef = ref(storage, `matches/${selectedMatch.id}/${Date.now()}-${file.name}`);
                const uploadTask = uploadBytesResumable(storageRef, resizedBlob);

                await new Promise<void>((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            const overallProgress = ((i + (snapshot.bytesTransferred / snapshot.totalBytes)) / files.length) * 100;
                            setUploadProgress(overallProgress);
                        },
                        (error) => {
                            console.error('Upload failed:', error);
                            toast({ 
                                variant: 'destructive', 
                                title: `Upload Failed`, 
                                description: 'Permission denied. Please check your storage security rules.'
                            });
                            reject(error);
                        },
                        async () => {
                            try {
                                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                await updateDoc(matchDocRef, {
                                    mediaUrls: arrayUnion(downloadURL),
                                });
                                successfulUploads++;
                                resolve();
                            } catch(firestoreError) {
                                console.error("Firestore update failed:", firestoreError);
                                reject(firestoreError);
                            }
                        }
                    );
                });
            } catch (error) {
                console.error(`Error with file ${file.name}:`, error)
                break;
            }
        }
        
        setIsUploading(false);
        if(successfulUploads > 0) {
            toast({ title: 'Upload Complete', description: `${successfulUploads} of ${files.length} image(s) uploaded successfully.` });
        }
        
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
  
    const handleDeleteImage = async (imageUrl: string) => {
        if (!storage || !firestore || !selectedMatch?.id) return;

        setIsDeleting(imageUrl);
        try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);

            const matchDocRef = doc(firestore, 'matches', selectedMatch.id);
            await updateDoc(matchDocRef, {
                mediaUrls: arrayRemove(imageUrl)
            });
            toast({ title: 'Success', description: 'Image deleted successfully.' });
        } catch (error) {
            console.error("Error deleting image:", error);
            toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the image.' });
        } finally {
            setIsDeleting(null);
        }
    };

    const renderGallery = () => {
        if (!selectedMatch) {
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">Select a match to view its gallery.</p>
                </div>
            )
        }
        
        if (!selectedMatch.mediaUrls || selectedMatch.mediaUrls.length === 0) {
             return (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">No photos have been uploaded for this match yet.</p>
                </div>
            )
        }

        return (
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
                <CarouselContent>
                {selectedMatch.mediaUrls.map((url, index) => (
                    <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <div className="p-1">
                        <Card>
                        <CardContent className="flex aspect-square items-center justify-center p-0 overflow-hidden rounded-lg">
                           <div className="relative w-full h-full group">
                             <NextImage
                                src={url}
                                alt={`Match image ${index + 1}`}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                style={{ objectFit: 'cover' }}
                                className="rounded-lg"
                                />
                            {canManage && (
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
                            )}
                           </div>
                        </CardContent>
                        </Card>
                    </div>
                    </CarouselItem>
                ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Image Gallery</h1>
                <p className="text-muted-foreground">View photos from past matches.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Filter Images</CardTitle>
                    <CardDescription>Select a club, series, and match to view its image gallery.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="club-select">Club</Label>
                             {isLoadingClubs ? <Skeleton className="h-10 w-full" /> : (
                                <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={allClubs.length === 0}>
                                    <SelectTrigger id="club-select">
                                        <SelectValue placeholder="Select a club..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allClubs.map((club) => (
                                            <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="series-select">Series</Label>
                            {isLoadingSeries ? <Skeleton className="h-10 w-full" /> : (
                                <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId} disabled={!selectedClubId || seriesForClub.length === 0}>
                                    <SelectTrigger id="series-select">
                                        <SelectValue placeholder="Select a series..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {seriesForClub.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="match-select">Match</Label>
                             {isLoadingMatches ? <Skeleton className="h-10 w-full" /> : (
                                <Select onValueChange={handleSelectMatch} disabled={!selectedSeriesId || matchesForSeries.length === 0} value={selectedMatch?.id || ''}>
                                    <SelectTrigger id="match-select">
                                        <SelectValue placeholder="Select a match..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {matchesForSeries.map((m) => {
                                            const date = m.date instanceof Timestamp ? m.date.toDate() : m.date;
                                            return (
                                                <SelectItem key={m.id} value={m.id}>
                                                    {m.name} ({format(date, 'dd/MM/yy')})
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
                             )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{selectedMatch ? `Gallery: ${selectedMatch.name}` : 'Gallery'}</CardTitle>
                    <CardDescription>{selectedMatch ? `${selectedMatch.seriesName} - ${format(selectedMatch.date instanceof Timestamp ? selectedMatch.date.toDate() : selectedMatch.date, 'PPP')}` : 'Select a match to see photos'}</CardDescription>
                </CardHeader>
                <CardContent>
                   {renderGallery()}
                </CardContent>
                {canManage && selectedMatch && (
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
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}

