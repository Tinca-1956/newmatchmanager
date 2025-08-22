
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';
import type { PublicMatch } from '@/lib/types';
import NextImage from 'next/image';
import { format } from 'date-fns';
import { Rss } from 'lucide-react';
import Link from 'next/link';

export default function PublicBlogDashboard() {
  const [posts, setPosts] = useState<PublicMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      return;
    }

    const postsQuery = query(collection(firestore, 'publicBlogPosts'));
    
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        const postsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                publishedAt: (data.publishedAt as Timestamp),
            } as PublicMatch;
        });
        
        postsData.sort((a, b) => b.publishedAt.toMillis() - a.publishedAt.toMillis());
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
          <Skeleton className="h-48 w-full" />
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
             <Skeleton className="h-4 w-full" />
             <Skeleton className="h-4 w-full mt-2" />
          </CardContent>
        </Card>
      ));
    }

    if (posts.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground col-span-full">
          <Rss className="mx-auto h-12 w-12" />
          <p className="mt-4">No club news has been published yet.</p>
        </div>
      );
    }

    return posts.map(post => (
        <Link href={`/public/blog/${post.id}`} key={post.id} className="block group">
            <Card className="overflow-hidden h-full flex flex-col group-hover:border-primary transition-all">
            <div className="relative w-full h-48 bg-muted">
                {post.coverImageUrl ? (
                    <NextImage
                        src={post.coverImageUrl}
                        alt={post.subject}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <Rss className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                )}
            </div>
            <CardHeader>
                <CardTitle>{post.subject}</CardTitle>
                <CardDescription>
                By {post.authorName} on {format(post.publishedAt.toDate(), 'PPP')}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{post.snippet}</p>
            </CardContent>
            </Card>
      </Link>
    ));
  }

  return (
    <div className="container mx-auto py-8 px-4">
       <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight">Club News</h1>
            <p className="text-lg text-muted-foreground mt-2">The latest updates and articles from our clubs.</p>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {renderPostList()}
      </div>
    </div>
  );
}
