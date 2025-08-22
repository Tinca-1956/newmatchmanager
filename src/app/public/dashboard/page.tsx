'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { firestore } from '@/lib/firebase-client';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { PublicBlogPost } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ArrowRight, Rss } from 'lucide-react';

export default function PublicDashboardPage() {
  const [posts, setPosts] = useState<PublicBlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      return;
    }
    const postsQuery = query(collection(firestore, 'publicBlogPosts'), orderBy('publishedAt', 'desc'));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ ...doc.data() } as PublicBlogPost));
      setPosts(postsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching public blog posts:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderPostList = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      ));
    }

    if (posts.length === 0) {
      return (
        <div className="col-span-full text-center py-16 text-muted-foreground">
          <Rss className="mx-auto h-12 w-12" />
          <p className="mt-4 text-lg">No announcements yet.</p>
          <p>Check back later for news and updates.</p>
        </div>
      );
    }

    return posts.map(post => (
      <Card key={post.id} className="flex flex-col overflow-hidden">
        {post.coverImageUrl && (
          <div className="relative aspect-video w-full">
            <NextImage src={post.coverImageUrl} alt={post.subject} fill className="object-cover" />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-xl">{post.subject}</CardTitle>
          <CardDescription>
            By {post.authorName} for {post.clubName} on {format(post.publishedAt.toDate(), 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="line-clamp-3 text-sm text-muted-foreground">{post.snippet}</p>
        </CardContent>
        <CardFooter>
          <Link href={`/public/blog/${post.id}`} className="text-primary font-semibold hover:underline flex items-center">
            Read More <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </CardFooter>
      </Card>
    ));
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Club News</h1>
        <p className="text-muted-foreground mt-2">The latest news and announcements from our clubs.</p>
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {renderPostList()}
      </div>
    </div>
  );
}
