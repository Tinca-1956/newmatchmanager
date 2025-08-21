
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
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { Blog, BlogComment } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Send, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';

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
    
    // Simple confirmation dialog
    if (!window.confirm("Are you sure you want to delete this entire blog post and all its comments? This cannot be undone.")) {
        return;
    }

    try {
        await deleteDoc(doc(firestore, 'blogs', post.id));
        toast({ title: 'Success', description: 'Blog post deleted.' });
        router.push('/main/blog');
    } catch (error) {
        console.error("Error deleting post: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the post.' });
    }
  };
  
  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-1/4" /><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }
  
  if (!post) {
    return null; // or a 'not found' component
  }

  const canManagePost = userProfile && (userProfile.id === post.authorId || isSiteAdmin || (isClubAdmin && userProfile.primaryClubId === post.clubId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/main/blog')}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{post.subject}</h1>
                <p className="text-sm text-muted-foreground">
                    By {post.authorName} on {format(post.createdAt.toDate(), 'PPP')}
                </p>
            </div>
        </div>
        {canManagePost && (
            <div className="flex gap-2">
                 <Button variant="outline" onClick={() => router.push(`/main/blog/${post.id}/edit`)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="destructive" onClick={handleDeletePost}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Post
                </Button>
            </div>
        )}
      </div>

      <Card>
        <CardContent 
          className="pt-6 prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </Card>
      
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
                                <p className="text-sm text-foreground/90 p-2 bg-muted rounded-md mt-1 whitespace-pre-wrap">{comment.commentText}</p>
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
  );
}
