
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { PublicBlogPost } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import NextImage from 'next/image';
import { format } from 'date-fns';
import { ArrowRight, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function PublicBlogPostPage() {
  const params = useParams();
  const postId = params.postId as string;
  const router = useRouter();

  const [post, setPost] = useState<PublicBlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !firestore) {
        setIsLoading(false);
        return;
    };

    const fetchPost = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const postDocRef = doc(firestore, 'publicBlogPosts', postId);
        const docSnap = await getDoc(postDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as PublicBlogPost;
           setPost({
                ...data,
                id: docSnap.id,
                publishedAt: (data.publishedAt as Timestamp)
            });
        } else {
          setError('This blog post could not be found.');
        }
      } catch (e: any) {
        console.error(e);
        if (e.message.includes('permission-denied')) {
             setError('You do not have permission to view this content. Please check your Firestore security rules.');
        } else {
            setError('Failed to load the blog post.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (isLoading) {
    return (
        <div className="container mx-auto max-w-3xl py-8 px-4">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-6 w-full mt-4" />
                </CardContent>
            </Card>
        </div>
    );
  }

  if (error) {
    return <div className="container mx-auto p-8 text-center text-red-500">{error}</div>;
  }
  
  if (!post) {
      return <div className="container mx-auto p-8 text-center">Blog post not found.</div>;
  }

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card className="overflow-hidden">
        <CardHeader>
            <p className="text-sm text-muted-foreground">{post.clubName}</p>
            <CardTitle className="text-3xl lg:text-4xl">{post.subject}</CardTitle>
            <CardDescription>
                By {post.authorName} on {format(post.publishedAt.toDate(), 'PPP')}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {post.coverImageUrl && (
                <div className="relative aspect-video w-full">
                    <NextImage 
                        src={post.coverImageUrl} 
                        alt={post.subject}
                        fill
                        className="object-cover rounded-md"
                        priority
                    />
                </div>
            )}
            <p className="text-lg text-muted-foreground italic">
                {post.snippet}
            </p>
        </CardContent>
        <CardFooter className="bg-muted/50 p-6 flex-col items-center text-center gap-4">
            <h3 className="font-semibold text-lg">Want to read the full article?</h3>
            <p className="text-muted-foreground">Join the club to get access to all posts, comments, match registrations, and more.</p>
            <Button asChild size="lg">
                <Link href="/auth/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Log in or Sign Up
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
