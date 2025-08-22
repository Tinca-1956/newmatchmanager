
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import type { PublicBlogPost } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, LogIn, Rss } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import NextImage from 'next/image';
import PublicHeader from '@/components/public-header';
import PublicFooter from '@/components/public-footer';

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
        setError('The post ID is missing or the database is not available.');
        return;
    };

    const fetchPost = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const postDocRef = doc(firestore, 'publicBlogPosts', postId);
        const docSnap = await getDoc(postDocRef);

        if (docSnap.exists()) {
          setPost(docSnap.data() as PublicBlogPost);
        } else {
          setError('This blog post could not be found. It may have been removed.');
        }
      } catch (err) {
        console.error('Error fetching public blog post:', err);
        setError('A database error occurred while trying to load this post.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);
  
  if (isLoading) {
    return (
        <div className="p-4 md:p-8 space-y-6">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-96 w-full" />
        </div>
    )
  }
  
  if (error) {
      return (
          <div className="p-4 md:p-8 text-center">
              <Rss className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Post Not Available</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => router.push('/public/dashboard')} className="mt-6">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Public Dashboard
              </Button>
          </div>
      )
  }

  if (!post) {
      return null;
  }

  return (
    <>
      <PublicHeader />
      <main className="flex-grow bg-muted/40 p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="mb-4">
                <Button variant="outline" size="sm" onClick={() => router.push('/public/dashboard')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {post.clubName} - Published on {format((post.publishedAt as Timestamp).toDate(), 'PPP')}
              </p>
              <CardTitle className="text-4xl font-bold tracking-tight">{post.subject}</CardTitle>
              <CardDescription>By {post.authorName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {post.coverImageUrl && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                  <NextImage
                    src={post.coverImageUrl}
                    alt={`Cover image for ${post.subject}`}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="prose dark:prose-invert max-w-none">
                <p>{post.snippet}</p>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-center gap-4 bg-primary/5 p-8">
              <h3 className="text-xl font-semibold text-center">Want to read more?</h3>
              <p className="text-center text-muted-foreground">
                This is just a preview. Log in or sign up to read the full post, join discussions, and register for matches.
              </p>
              <Button asChild size="lg">
                <a href="/auth/login">
                  <LogIn className="mr-2 h-5 w-5" />
                  Log In or Sign Up
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
