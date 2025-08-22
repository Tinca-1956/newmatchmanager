
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';
import type { PublicBlogPost } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import NextImage from 'next/image';
import { ArrowLeft, LogIn } from 'lucide-react';

export default function PublicBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState<PublicBlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!postId || !firestore) {
      setIsLoading(false);
      return;
    }
    const fetchPost = async () => {
      setIsLoading(true);
      try {
        const postDocRef = doc(firestore, 'publicBlogPosts', postId);
        const docSnap = await getDoc(postDocRef);
        if (docSnap.exists()) {
          setPost(docSnap.data() as PublicBlogPost);
        } else {
          console.log('No such document!');
          setPost(null);
        }
      } catch (e) {
        console.error('Error fetching public post:', e);
        setPost(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold">Post Not Found</h1>
        <p className="text-muted-foreground mt-2">
          The blog post you are looking for does not exist or may have been removed.
        </p>
        <Button onClick={() => router.push('/public/dashboard')} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }
  
  const formattedDate = post.publishedAt instanceof Timestamp
    ? format(post.publishedAt.toDate(), 'PPP')
    : 'Date not available';


  return (
    <div className="bg-muted/40 py-12">
        <div className="max-w-4xl mx-auto px-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-4xl font-bold tracking-tight">{post.subject}</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground pt-2">
                       By {post.authorName} for {post.clubName} on {formattedDate}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {post.coverImageUrl && (
                        <div className="relative w-full h-96">
                            <NextImage
                                src={post.coverImageUrl}
                                alt={post.subject}
                                fill
                                className="object-cover rounded-md"
                            />
                        </div>
                    )}
                    <div className="prose dark:prose-invert max-w-none text-lg">
                        <p>{post.snippet}</p>
                    </div>
                </CardContent>
                 <CardFooter className="flex-col items-center gap-4 text-center p-8 bg-secondary/50">
                    <h3 className="text-xl font-semibold">Want to read more?</h3>
                    <p className="text-muted-foreground">
                        This is just a preview. Log in or sign up to read the full article, join the discussion, and get access to all club content.
                    </p>
                    <Button onClick={() => router.push('/auth/login')} size="lg">
                        <LogIn className="mr-2 h-5 w-5" />
                        Log In or Sign Up to Read More
                    </Button>
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}
