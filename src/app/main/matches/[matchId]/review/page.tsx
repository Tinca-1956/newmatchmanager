
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Send,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import NextImage from 'next/image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore, storage } from '@/lib/firebase-client';
import { doc, getDoc, updateDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import type { Match, Club, User, MatchReview, Comment } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format, formatDistanceToNow } from 'date-fns';

const MAX_IMAGE_WIDTH = 1024;

export default function MatchReviewPage() {
  const router = useRouter();
  const params = useParams();
  const { user, userProfile } = useAuth();
  const { isClubAdmin, isSiteAdmin } = useAdminAuth();
  const { toast } = useToast();
  const matchId = params.matchId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [match, setMatch] = useState<Match | null>(null);
  const [review, setReview] = useState<MatchReview | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  const [reviewContent, setReviewContent] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  
  const canManageReview = isClubAdmin || isSiteAdmin;

  // Fetch match, review, and comments data
  useEffect(() => {
    if (!matchId || !firestore) return;

    // Fetch match data once
    const matchDocRef = doc(firestore, 'matches', matchId);
    getDoc(matchDocRef).then(docSnap => {
        if (docSnap.exists()) {
            setMatch(docSnap.data() as Match);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Match not found.'});
            router.push('/main/reports');
        }
    });

    // Subscribe to review data
    const reviewDocRef = doc(firestore, 'matchReviews', matchId);
    const unsubscribeReview = onSnapshot(reviewDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as MatchReview;
            setReview(data);
            setReviewContent(data.reviewContent || '');
            setReviewImages(data.reviewImages || []);
        }
        setIsLoading(false);
    });
    
    // Subscribe to comments
    const commentsQuery = query(collection(reviewDocRef, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
        const commentsData = snapshot.docs.map(d => ({id: d.id, ...d.data()}) as Comment);
        setComments(commentsData);
    });


    return () => {
        unsubscribeReview();
        unsubscribeComments();
    }
  }, [matchId, router, toast]);

  const handleSaveReview = async () => {
    if (!user || !matchId) return;
    setIsSavingReview(true);
    
    const reviewDocRef = doc(firestore, 'matchReviews', matchId);
    const data: Partial<MatchReview> = {
      reviewContent: reviewContent,
      reviewImages: reviewImages,
      authorId: user.uid,
      lastUpdated: serverTimestamp()
    };
    
    try {
        await setDoc(reviewDocRef, data, { merge: true });
        toast({ title: 'Success', description: 'Match review has been saved.' });
    } catch(error) {
        console.error("Error saving review: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save the review.' });
    } finally {
        setIsSavingReview(false);
    }
  };
  
  const handlePostComment = async () => {
    if (!user || !userProfile || !newComment.trim()) return;
    if (userProfile.memberStatus !== 'Member') {
        toast({variant: 'destructive', title: 'Not Authorized', description: 'Only verified members can post comments.'});
        return;
    }
    setIsPostingComment(true);

    const reviewDocRef = doc(firestore, 'matchReviews', matchId);
    const commentsColRef = collection(reviewDocRef, 'comments');
    
    try {
        await addDoc(commentsColRef, {
            commentText: newComment,
            authorId: user.uid,
            authorName: `${userProfile.firstName} ${userProfile.lastName}`,
            createdAt: serverTimestamp()
        });
        setNewComment('');
    } catch(error) {
        console.error("Error posting comment: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not post your comment.' });
    } finally {
        setIsPostingComment(false);
    }
  }
  
  // Image handling similar to gallery page
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
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob conversion failed'));
          }, 'image/jpeg', 0.8);
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !matchId) return;
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const resizedBlob = await resizeImage(file);
            const storageRef = ref(storage, `matchReviews/${matchId}/${Date.now()}-${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, resizedBlob);

            const downloadURL = await new Promise<string>((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = ((i + (snapshot.bytesTransferred / snapshot.totalBytes)) / files.length) * 100;
                        setUploadProgress(progress);
                    },
                    (error) => reject(error),
                    async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
                );
            });
            setReviewImages(prev => [...prev, downloadURL]);
        } catch (error) {
            console.error(`Error with file ${file.name}:`, error)
            toast({ variant: 'destructive', title: `Upload Failed`, description: 'Could not upload image.'});
            break;
        }
    }
    
    setIsUploading(false);
    toast({ title: 'Upload Complete', description: 'Images added. Remember to save the review to persist them.' });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteImage = (imageUrl: string) => {
      setReviewImages(prev => prev.filter(url => url !== imageUrl));
  };


  if (isLoading) {
      return (
          <div className="space-y-4">
              <Skeleton className="h-12 w-1/4" />
              <Card><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
              <Card><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
          </div>
      )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Match Report</h1>
          <p className="text-muted-foreground">{match?.seriesName} - {match?.name}</p>
        </div>
      </div>

      {/* Admin Review Section */}
      <Card>
          <CardHeader>
              <CardTitle>Match Review</CardTitle>
              {canManageReview && <CardDescription>Write a review and add photos for this match. Click "Save Review" when you're done.</CardDescription>}
              {!review && !canManageReview && <CardDescription>No review has been written for this match yet.</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
              {canManageReview ? (
                  <>
                    <div className="space-y-2">
                        <Label htmlFor="reviewContent">Review Content</Label>
                        <Textarea id="reviewContent" value={reviewContent} onChange={(e) => setReviewContent(e.target.value)} className="min-h-[200px]" placeholder="Write the match report here..." />
                    </div>
                    <div className="space-y-4">
                        <Label>Review Images</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {reviewImages.map((url, index) => (
                                <div key={index} className="relative group aspect-square">
                                    <NextImage src={url} alt={`Review image ${index+1}`} fill style={{objectFit: 'cover'}} className="rounded-md" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                        <Button variant="destructive" size="icon" onClick={() => handleDeleteImage(url)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                       <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" disabled={isUploading}/>
                       <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} variant="outline">
                           <Upload className="mr-2 h-4 w-4" />{isUploading ? 'Uploading...' : 'Upload Images'}
                       </Button>
                       {isUploading && <Progress value={uploadProgress} className="w-full" />}
                    </div>
                    <div className="flex justify-end pt-4 border-t">
                      <Button onClick={handleSaveReview} disabled={isSavingReview}>
                        {isSavingReview ? 'Saving...' : 'Save Review'}
                      </Button>
                    </div>
                  </>
              ) : (
                 review ? (
                      <div className="space-y-4">
                          <p className="text-sm whitespace-pre-wrap p-4 bg-muted rounded-md">{review.reviewContent}</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {review.reviewImages?.map((url, index) => (
                                <div key={index} className="relative aspect-video">
                                    <NextImage src={url} alt={`Review image ${index+1}`} fill style={{objectFit: 'cover'}} className="rounded-md" />
                                </div>
                            ))}
                          </div>
                      </div>
                  ) : null
              )}
          </CardContent>
      </Card>

      {/* Comments Section */}
       <Card>
          <CardHeader>
              <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="space-y-4">
                {comments.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-4">Be the first to comment.</p>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="flex items-start gap-4">
                            <Avatar>
                                <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="w-full">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold">{comment.authorName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                    </p>
                                </div>
                                <p className="text-sm text-foreground/90 p-2 bg-muted rounded-md mt-1">{comment.commentText}</p>
                            </div>
                        </div>
                    ))
                )}
              </div>
              
            {userProfile?.memberStatus === 'Member' && (
              <div className="flex items-start gap-4 pt-6 border-t">
                <Avatar>
                    <AvatarFallback>{userProfile.firstName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="w-full space-y-2">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={2}
                    />
                    <div className="flex justify-end">
                      <Button onClick={handlePostComment} disabled={isPostingComment || !newComment.trim()}>
                        <Send className="mr-2 h-4 w-4" />
                        {isPostingComment ? 'Posting...' : 'Post Comment'}
                      </Button>
                    </div>
                </div>
              </div>
            )}
          </CardContent>
      </Card>
    </div>
  )
}
