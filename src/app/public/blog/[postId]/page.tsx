
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import type { PublicPostData } from '@/lib/types';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import NextImage from 'next/image';
import { Calendar, User } from 'lucide-react';

export default function PublicBlogPostPage() {
  const params = useParams();
  const postId = params.postId as string;
  const [post, setPost] = useState<PublicPostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !firestore) return;

    setIsLoading(true);
    const docRef = doc(firestore, 'publicBlogPosts', postId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setPost(docSnap.data() as PublicPostData);
        setError(null);
      } else {
        setError('This blog post could not be found.');
        setPost(null);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching public post:", err);
      setError('An error occurred while fetching the post.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4">
        <div className="space-y-8">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="aspect-video w-full" />
            <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="container mx-auto max-w-4xl py-12 px-4 text-center">
            <h1 className="text-2xl font-bold text-destructive">{error}</h1>
        </div>
    );
  }

  if (!post) {
    return null;
  }
  
  const publicationDate = post.publishedAt instanceof Timestamp ? post.publishedAt.toDate() : new Date();

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card className="overflow-hidden">
        {post.coverImageUrl && (
          <div className="relative aspect-video w-full">
            <NextImage
              src={post.coverImageUrl}
              alt={post.subject}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-4xl font-extrabold tracking-tight lg:text-5xl">{post.subject}</CardTitle>
          <CardDescription className="pt-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {post.clubName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{post.clubName}</span>
                </div>
              )}
              {post.authorName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>By {post.authorName}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Published on {format(publicationDate, 'PPP')}</span>
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p>{post.snippet}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
