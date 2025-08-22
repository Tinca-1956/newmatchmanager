
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import type { PublicBlogPost } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogIn } from 'lucide-react';
import PublicHeader from '@/components/public-header';
import PublicFooter from '@/components/public-footer';

export default function PublicBlogPostPage() {
  const params = useParams();
  const postId = params.postId as string;
  const router = useRouter();

  const [post, setPost] = useState<PublicBlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !firestore) return;

    const fetchPost = async () => {
      setIsLoading(true);
      try {
        const postDocRef = doc(firestore, 'publicBlogPosts', postId);
        const docSnap = await getDoc(postDocRef);
        if (docSnap.exists()) {
          const postData = docSnap.data() as PublicBlogPost;
          setPost(postData);
        } else {
          setError('This blog post could not be found.');
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load the blog post.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  if (isLoading) {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-3xl space-y-6">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="aspect-video w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </main>
            <PublicFooter />
        </div>
    );
  }
  
  if (error) {
     return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-grow flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive">{error}</p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => router.push('/public/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Return to Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </main>
            <PublicFooter />
        </div>
     )
  }

  if (!post) {
    return null; // Should be handled by error state
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
        <PublicHeader />
        <main className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <Card className="w-full max-w-3xl overflow-hidden">
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
                    <CardTitle className="text-3xl font-bold">{post.subject}</CardTitle>
                    <CardDescription>
                        By {post.authorName} for {post.clubName} on {format((post.publishedAt as Timestamp).toDate(), 'PPP')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{post.snippet}</p>
                </CardContent>
                <CardFooter className="flex-col items-stretch gap-4 bg-muted/50 p-6">
                     <h3 className="text-center font-semibold">Want to read more?</h3>
                     <p className="text-center text-sm text-muted-foreground">Log in or sign up to view the full post and join the discussion.</p>
                     <Button asChild>
                        <a href="/auth/login">
                           <LogIn className="mr-2 h-4 w-4" />
                           Continue to Full Post
                        </a>
                    </Button>
                </CardFooter>
            </Card>
        </main>
        <PublicFooter />
    </div>
  );
}
