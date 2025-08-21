
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Rss } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import type { Blog } from '@/lib/types';
import { format } from 'date-fns';

export default function BlogListPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { isSiteAdmin, isClubAdmin } = useAdminAuth();
  const { toast } = useToast();

  const [posts, setPosts] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const canCreate = isSiteAdmin || isClubAdmin;

  useEffect(() => {
    if (authLoading || !userProfile?.primaryClubId || !firestore) {
        if (!authLoading) setIsLoading(false);
        return;
    }

    const postsQuery = query(
        collection(firestore, 'blogs'),
        where('clubId', '==', userProfile.primaryClubId),
        orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: (doc.data().createdAt as Timestamp),
        } as Blog));
        setPosts(postsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching blog posts:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch blog posts.' });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, authLoading, toast]);
  
  const renderPostList = () => {
    if (isLoading) {
        return Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="cursor-pointer hover:border-primary transition-colors">
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
            <div className="text-center py-12 text-muted-foreground">
                <Rss className="mx-auto h-12 w-12" />
                <p className="mt-4">No blog posts have been published yet.</p>
                {canCreate && <p>Click "Create Post" to get started.</p>}
            </div>
        )
    }

    return posts.map(post => (
        <Card key={post.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => router.push(`/main/blog/${post.id}`)}>
            <CardHeader>
                <CardTitle>{post.subject}</CardTitle>
                <CardDescription>
                    By {post.authorName} on {format(post.createdAt.toDate(), 'PPP')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">{post.content}</p>
            </CardContent>
        </Card>
    ));
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
          <p className="text-muted-foreground">News, articles, and updates from your club.</p>
        </div>
        {canCreate && (
          <Button onClick={() => router.push('/main/blog/create')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Post
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {renderPostList()}
      </div>
    </div>
  );
}
