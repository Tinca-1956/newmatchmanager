
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { PublicBlogPost } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import NextImage from 'next/image';
import { ArrowLeft, LogIn } from 'lucide-react';
import PublicHeader from '@/components/public-header';
import PublicFooter from '@/components/public-footer';

function PublicBlogPostContent() {
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

    const fetchPublicPost = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const postDocRef = doc(firestore, 'publicBlogPosts', postId);
        const docSnap = await getDoc(postDocRef);

        if (docSnap.exists()) {
          setPost(docSnap.data() as PublicBlogPost);
        } else {
          setError('This blog post could not be found or is not public.');
        }
      } catch (e: any) {
        console.error("Error fetching public blog post:", e);
        if (e.message.includes('permission-denied') || e.message.includes('Missing or insufficient permissions')) {
             setError('You do not have permission to view this content. Please log in.');
        } else {
            setError('An error occurred while fetching this post.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicPost();
  }, [postId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-10 w-24" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
            <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </div>
          </CardContent>
          <CardFooter>
             <Skeleton className="h-10 w-40" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <Card className="text-center">
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{error}</p>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button onClick={() => router.push('/public/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  if (!post) {
    return (
         <div className="max-w-4xl mx-auto py-8 px-4">
            <Card className="text-center">
                <CardHeader>
                    <CardTitle>Post Not Found</CardTitle>
                </CardHeader>
                 <CardContent>
                    <p>The blog post you are looking for does not exist or may have been removed.</p>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button onClick={() => router.push('/public/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }
  
  const publishedDate = post.publishedAt instanceof Timestamp 
    ? post.publishedAt.toDate() 
    : new Date();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <Button variant="outline" onClick={() => router.push('/public/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
        </Button>
        <Card>
            <CardHeader>
                <CardTitle className="text-3xl font-bold">{post.subject}</CardTitle>
                <CardDescription>
                    By {post.authorName} for {post.clubName} on {format(publishedDate, 'PPP')}
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
                        />
                    </div>
                )}
                <p className="text-lg text-muted-foreground italic">
                    {post.snippet}
                </p>
                
                <div className="text-center pt-6 border-t">
                    <h3 className="text-lg font-semibold">Want to read more?</h3>
                    <p className="text-muted-foreground mt-2">The full article is available to club members.</p>
                    <Button className="mt-4" onClick={() => router.push('/auth/login')}>
                       <LogIn className="mr-2 h-4 w-4" />
                       Login or Sign Up to Read More
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}


export default function PublicBlogPostPage() {
    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <PublicHeader />
            <main className="flex-1">
                <PublicBlogPostContent />
            </main>
            <PublicFooter />
        </div>
    )
}
