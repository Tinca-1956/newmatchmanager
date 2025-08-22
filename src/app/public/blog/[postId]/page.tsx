
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { PublicBlogPost } from '@/lib/types';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogIn } from 'lucide-react';
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
      setError('Invalid post ID or database connection.');
      setIsLoading(false);
      return;
    }

    const postDocRef = doc(firestore, 'publicBlogPosts', postId);
    const unsubscribe = onSnapshot(postDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Omit<PublicBlogPost, 'id'>;
        setPost({ id: docSnap.id, ...data });
        setError(null);
      } else {
        setError('This blog post could not be found. It may have been removed.');
        setPost(null);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching public post:", err);
      setError('There was an error loading this post.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4">
        <Skeleton className="h-12 w-3/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="aspect-video w-full mb-8" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }
  
  if (error) {
      return (
          <div className="container mx-auto max-w-4xl py-12 px-4 text-center">
              <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
              <p className="text-muted-foreground">{error}</p>
               <Button onClick={() => router.push('/public/dashboard')} className="mt-8">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Dashboard
              </Button>
          </div>
      )
  }

  if (!post) {
    return null; // Should be handled by error state
  }
  
  const publishedDate = post.publishedAt instanceof Timestamp 
    ? post.publishedAt.toDate()
    : new Date(); // Fallback

  return (
    <div className="container mx-auto max-w-4xl py-8 sm:py-12 px-4">
      <article className="bg-card p-6 sm:p-8 rounded-lg shadow-md">
        <header className="mb-8">
            <p className="text-sm text-muted-foreground mb-2">
                Published by {post.authorName} of {post.clubName} on {format(publishedDate, 'PPP')}
            </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            {post.subject}
          </h1>
        </header>
        
        {post.coverImageUrl && (
            <div className="relative aspect-video w-full mb-8 rounded-md overflow-hidden">
                <NextImage
                    src={post.coverImageUrl}
                    alt={`Cover image for ${post.subject}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 66vw"
                />
            </div>
        )}
        
        <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
            <p>{post.snippet}</p>
        </div>

        <footer className="text-center border-t pt-8">
            <h2 className="text-xl font-semibold mb-2">Want to read more?</h2>
            <p className="text-muted-foreground mb-4">
                Log in or sign up to read the full article and join the conversation.
            </p>
            <Button asChild size="lg">
                <a href="/auth/login">
                    <LogIn className="mr-2 h-5 w-5" />
                    Login to Read More
                </a>
            </Button>
        </footer>
      </article>
    </div>
  );
}
