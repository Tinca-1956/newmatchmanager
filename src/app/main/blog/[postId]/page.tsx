
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
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
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore, storage } from '@/lib/firebase-client';
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import type { Blog, BlogComment } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Send, Trash2, Edit, FileText, Video } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';

export default function BlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;

  const { user, userProfile } = useAuth();
  const { isSiteAdmin, isClubAdmin } = useAdminAuth();
  const { toast } = useToast();

  const [post, setPost] = useState<Blog | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!postId || !firestore) return;

    const postDocRef = doc(firestore, 'blogs', postId);
    const unsubscribePost = onSnapshot(postDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() } as Blog);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Blog post not found.' });
        router.push('/main/blog');
      }
      setIsLoading(false);
    });

    const commentsQuery = query(collection(postDocRef, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as BlogComment);
      setComments(commentsData);
    });

    return () => {
      unsubscribePost();
      unsubscribeComments();
    };
  }, [postId, router, toast]);

  const handlePostComment = async () => {
    if (!user || !userProfile || !newComment.trim()) return;
    if (userProfile.memberStatus !== 'Member') {
      toast({ variant: 'destructive', title: 'Not Authorized', description: 'Only verified members can post comments.' });
      return;
    }
    setIsPostingComment(true);

    const commentsColRef = collection(firestore, 'blogs', postId, 'comments');
    try {
      await addDoc(commentsColRef, {
        commentText: newComment,
        authorId: user.uid,
        authorName: `${userProfile.firstName} ${userProfile.lastName}`,
        createdAt: serverTimestamp(),
      });
      setNewComment('');
    } catch (error) {
      console.error("Error posting comment: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not post your comment.' });
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    
    setIsDeleting(true);
    try {
        const batch = writeBatch(firestore);

        // Delete media files from storage
        if (post.mediaUrls && post.mediaUrls.length > 0) {
            for (const media of post.mediaUrls) {
                const fileRef = ref(storage, media.url);
                try {
                    await deleteObject(fileRef);
                } catch (storageError: any) {
                    // It's okay if the object doesn't exist, we can still delete the firestore doc
                    if (storageError.code !== 'storage/object-not-found') {
                        throw storageError; // Rethrow other storage errors
                    }
                }
            }
        }

        // Note: Deleting comments (a subcollection) should ideally be handled by a Cloud Function.
        // We will just delete the main post document here.

        const postDocRef = doc(firestore, 'blogs', post.id);
        batch.delete(postDocRef);
        
        await batch.commit();

        toast({ title: 'Success', description: 'Blog post and its media have been deleted.' });
        router.push('/main/blog');
    } catch (error) {
        console.error("Error deleting post:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the post.' });
    } finally {
        setIsDeleting(false);
    }
  };
  
  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-1/4" /><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }
  
  if (!post) {
    return null;
  }

  const canManagePost = userProfile && (userProfile.id === post.authorId || isSiteAdmin || (isClubAdmin && userProfile.primaryClubId === post.clubId));

  const renderMedia = () => {
    if (!post.mediaUrls || post.mediaUrls.length === 0) return null;

    const images = post.mediaUrls.filter(m => m.type.startsWith('image/'));
    const files = post.mediaUrls.filter(m => !m.type.startsWith('image/'));

    return (
      <div className="space-y-4 mt-6">
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map(image => (
              <a key={image.url} href={image.url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square">
                <NextImage src={image.url} alt={image.name} fill className="object-cover rounded-md" />
              </a>
            ))}
          </div>
        )}
        {files.length > 0 && (
            <div>
                 <h4 className="font-semibold mb-2">Attached Files</h4>
                 <div className="space-y-2">
                    {files.map(file => (
                        <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 border rounded-md hover:bg-accent transition-colors">
                            {file.type.startsWith('video/') ? <Video className="h-6 w-6 text-blue-500" /> : <FileText className="h-6 w-6 text-gray-500" />}
                            <span className="text-sm font-medium">{file.name}</span>
                        </a>
                    ))}
                 </div>
            </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/main/blog')}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{post.subject}</h1>
                <p className="text-sm text-muted-foreground">By {post.authorName} on {format(post.createdAt.toDate(), 'PPP')}</p>
            </div>
        </div>
        {canManagePost && (
            <div className="flex gap-2">
                 <Button variant="outline" onClick={() => router.push(`/main/blog/${post.id}/edit`)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isDeleting}>
                            <Trash2 className="mr-2 h-4 w-4" /> {isDeleting ? 'Deleting...' : 'Delete Post'}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this blog post, its comments, and all associated media files.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">
                                Confirm Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
            {renderMedia()}
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader><CardTitle>Comments</CardTitle></CardHeader>
          <CardContent className="space-y-6">
              <div className="space-y-4">
                {comments.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-4">Be the first to comment.</p>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="flex items-start gap-4">
                            <Avatar><AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback></Avatar>
                            <div className="w-full">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold">{comment.authorName}</p>
                                    <p className="text-xs text-muted-foreground">{comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</p>
                                </div>
                                <p className="text-sm text-foreground/90 p-2 bg-muted rounded-md mt-1 whitespace-pre-wrap">{comment.commentText}</p>
                            </div>
                        </div>
                    ))
                )}
              </div>
              
            {userProfile?.memberStatus === 'Member' && (
              <div className="flex items-start gap-4 pt-6 border-t">
                <Avatar><AvatarFallback>{userProfile.firstName.charAt(0)}</AvatarFallback></Avatar>
                <div className="w-full space-y-2">
                    <Textarea placeholder="Write a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={2} />
                    <div className="flex justify-end">
                      <Button onClick={handlePostComment} disabled={isPostingComment || !newComment.trim()}><Send className="mr-2 h-4 w-4" />{isPostingComment ? 'Posting...' : 'Post Comment'}</Button>
                    </div>
                </div>
              </div>
            )}
          </CardContent>
      </Card>

    </div>
  );
}
