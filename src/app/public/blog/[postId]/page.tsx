
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import { PublicBlogPost } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import NextImage from 'next/image';

export default function PublicBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState<PublicBlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !firestore) {
      setIsLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        const postDocRef = doc(firestore, 'publicBlogPosts', postId);
        const docSnap = await getDoc(postDocRef);
        if (docSnap.exists()) {
          setPost(docSnap.data() as PublicBlogPost);
        } else {
          setError('This blog post could not be found.');
        }
      } catch (e) {
        console.error(e);
        setError('You do not have permission to view this content. Please check your Firestore security rules to allow public access to the "publicBlogPosts" collection.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <h2 className="text-xl font-semibold text-destructive">Error</h2>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <Button onClick={() => router.push('/public/dashboard')} className="mt-6">
            Return to Dashboard
        </Button>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <Card className="max-w-4xl mx-auto my-8">
        <CardHeader>
             {post.coverImageUrl && (
                <div className="relative aspect-video w-full mb-6">
                    <NextImage 
                        src={post.coverImageUrl} 
                        alt={post.subject} 
                        fill 
                        className="object-cover rounded-md"
                    />
                </div>
            )}
            <CardTitle className="text-3xl md:text-4xl">{post.subject}</CardTitle>
            <CardDescription>
                By {post.authorName} for {post.clubName} on {format(post.publishedAt.toDate(), 'PPP')}
            </CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
           <p>{post.snippet}</p>
           <div className="mt-12 text-center p-6 bg-muted rounded-lg">
                <h3 className="text-xl font-semibold">Want to read more?</h3>
                <p className="mt-2 text-muted-foreground">Join the club to get access to the full post, comments, and more.</p>
                <Button asChild className="mt-4">
                    <a href="/auth/login">Sign In or Register</a>
                </Button>
           </div>
        </CardContent>
    </Card>
  );
}
