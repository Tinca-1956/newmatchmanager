
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import type { PublicPostData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import NextImage from 'next/image';

export default function PublicBlogPostPage() {
  const params = useParams();
  const postId = params.postId as string;
  const [post, setPost] = useState<PublicPostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !firestore) {
      setError('Post not found.');
      setIsLoading(false);
      return;
    }

    const postDocRef = doc(firestore, 'publicBlogPosts', postId);
    const unsubscribe = onSnapshot(postDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as PublicPostData;
        setPost(data);
      } else {
        setError('This blog post could not be found.');
      }
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setError('An error occurred while fetching the post.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl py-12">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12">{error}</div>;
  }

  if (!post) {
    return <div className="text-center py-12">Post not found.</div>;
  }

  const publishedDate = post.publishedAt instanceof Timestamp 
    ? post.publishedAt.toDate()
    : new Date();

  return (
    <div className="container mx-auto max-w-3xl py-12">
        <Button asChild variant="outline" className="mb-8">
            <Link href="/public/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Link>
        </Button>
        <Card className="overflow-hidden">
            {post.coverImageUrl && (
                <div className="relative w-full aspect-video">
                    <NextImage 
                        src={post.coverImageUrl} 
                        alt={post.subject} 
                        fill 
                        className="object-cover"
                    />
                </div>
            )}
            <CardHeader>
                <CardTitle className="text-4xl font-bold">{post.subject}</CardTitle>
                <CardDescription>
                    Posted {post.authorName && `by ${post.authorName} `} 
                    {post.clubName && `in ${post.clubName} `} 
                    on {format(publishedDate, 'PPP')}
                </CardDescription>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none text-lg">
                <p>{post.snippet}</p>
                 <div className="text-center mt-8">
                    <Link href="/auth/login" className="text-primary hover:underline">
                        Sign in to read more...
                    </Link>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
