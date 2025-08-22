
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import type { PublicBlogPost } from '@/lib/types';
import { format } from 'date-fns';
import NextImage from 'next/image';
import Link from 'next/link';

export default function PublicBlogPostPage() {
  const router = useRouter();
  const params = useParams();
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
        if (e.code === 'permission-denied') {
            setError('You do not have permission to view this content. Please check your Firestore security rules to allow public access to the "publicBlogPosts" collection.');
        } else {
            setError('An error occurred while fetching the blog post.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);
  
  if (isLoading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-24" />
            <div className="space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
            </div>
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
    )
  }
  
  if (error) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-10">
            <p className="text-xl font-semibold text-destructive mb-4">Error</p>
            <p className="text-muted-foreground mb-8">{error}</p>
            <Button asChild variant="outline">
                 <Link href="/public/dashboard">Return to Dashboard</Link>
            </Button>
        </div>
    )
  }

  if (!post) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="outline" size="sm" className="w-fit" onClick={() => router.push('/public/dashboard')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">
            {post.clubName} - {format(post.publishedAt.toDate(), 'PPP')}
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
         <CardFooter className="flex-col items-center gap-4 text-center bg-muted/50 p-6">
            <p className="font-semibold">Want to read the full post and join the discussion?</p>
            <Button asChild>
                <Link href="/auth/login">
                    Sign In or Create an Account
                </Link>
            </Button>
            <p className="text-xs text-muted-foreground">Full content is available to registered club members.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
