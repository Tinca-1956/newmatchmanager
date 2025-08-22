
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import type { PublicPostData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import NextImage from 'next/image';
import Link from 'next/link';

export default function PublicBlogPostPage() {
  const params = useParams();
  const postId = params.postId as string;
  const [post, setPost] = useState<PublicPostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!postId || !firestore) {
      setIsLoading(false);
      return;
    }

    const docRef = doc(firestore, 'publicBlogPosts', postId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setPost(docSnap.data() as PublicPostData);
        } else {
          setPost(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching public post:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [postId]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl py-12 px-4">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        <Skeleton className="aspect-video w-full mb-8" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    );
  }

  if (!post) {
    notFound();
    return null;
  }

  const publishedDate = post.publishedAt instanceof Timestamp ? post.publishedAt.toDate() : new Date();

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl md:text-4xl">{post.subject}</CardTitle>
          <CardDescription>
            Posted by {post.authorName || 'Admin'} in {post.clubName} on {format(publishedDate, 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {post.coverImageUrl && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <NextImage
                src={post.coverImageUrl}
                alt={`Cover image for ${post.subject}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
              />
            </div>
          )}
          <p className="text-muted-foreground whitespace-pre-wrap text-lg leading-relaxed">
            {post.snippet}
          </p>
          <p className="text-center pt-4">
             <Link href="/auth/login" className="text-primary hover:underline font-semibold">
                Sign in to read more...
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
