'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import type { Blog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Calendar, User } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import Link from 'next/link';

// Define the structure for the public-facing blog post
interface PublicBlogPost {
    id: string;
    subject: string;
    snippet: string;
    coverImageUrl?: string;
    authorName?: string;
    publishedAt?: Timestamp;
    // We can add other fields if they are available in the public document
}

export default function PublicPostPage() {
    const params = useParams();
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

        const fetchPost = async () => {
            setIsLoading(true);
            try {
                const postDocRef = doc(firestore, 'publicBlogPosts', postId);
                const docSnap = await getDoc(postDocRef);

                if (docSnap.exists()) {
                    setPost({ id: docSnap.id, ...docSnap.data() } as PublicBlogPost);
                } else {
                    setError('Blog post not found.');
                }
            } catch (err) {
                console.error('Error fetching blog post:', err);
                setError('Failed to load the blog post.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPost();
    }, [postId]);

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="w-full h-64 mb-6" />
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
             <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        )
    }

    if (!post) {
        return null; // or a more specific "Not Found" component
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
            <Card className="overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight">{post.subject}</CardTitle>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-2">
                        {post.authorName && (
                             <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{post.authorName}</span>
                            </div>
                        )}
                       {post.publishedAt && (
                             <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(post.publishedAt.toDate(), 'PPP')}</span>
                            </div>
                       )}
                    </div>
                </CardHeader>
                <CardContent>
                    {post.coverImageUrl && (
                        <div className="relative w-full aspect-video mb-6 rounded-lg overflow-hidden">
                            <Image
                                src={post.coverImageUrl}
                                alt={post.subject}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        </div>
                    )}
                    <p className="text-lg text-foreground/90 whitespace-pre-wrap">
                        {post.snippet}
                    </p>
                </CardContent>
                <CardFooter>
                    <Link href="/auth/login" className="text-sm text-primary hover:underline">
                        Log in to view full post and comments.
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}