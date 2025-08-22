'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { PublicBlogPost } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import NextImage from 'next/image';
import { format } from 'date-fns';

export default function PublicPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState<PublicBlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !firestore) {
      setError('Invalid post request.');
      setIsLoading(false);
      return;
    }

    const fetchPost = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const postDocRef = doc(firestore, 'publicBlogPosts', postId);
        const docSnap = await getDoc(postDocRef);

        if (docSnap.exists()) {
          setPost(docSnap.data() as PublicBlogPost);
        } else {
          setError('This blog post could not be found.');
        }
      } catch (e: any) {
        console.error(e);
        setError('There was an error loading this post. It may have been removed.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <h2 className="text-2xl font-bold text-destructive">{error}</h2>
        <Button onClick={() => router.push('/public/dashboard')} className="mt-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!post) {
    return null; // Should be covered by error state, but as a fallback.
  }

  return (
    <div className="max-w-4xl mx-auto">
       <Button variant="ghost" onClick={() => router.push('/public/dashboard')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Posts
        </Button>
      <Card>
        {post.coverImageUrl && (
          <div className="relative aspect-video w-full">
            <NextImage
              src={post.coverImageUrl}
              alt={post.subject}
              fill
              className="object-cover rounded-t-lg"
            />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-4xl font-bold tracking-tight">{post.subject}</CardTitle>
          <CardDescription>
            By {post.authorName} for {post.clubName} on {format(post.publishedAt.toDate(), 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-muted-foreground italic">
            "{post.snippet}"
          </p>
        </CardContent>
        <CardFooter className="flex-col items-center gap-4 bg-muted/50 p-6 text-center">
            <p className="font-semibold">Want to read the full article?</p>
            <p className="text-sm text-muted-foreground">Log in or create an account to view the full post and participate in comments.</p>
             <Button asChild>
                <Link href="/auth/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login to Read More
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
