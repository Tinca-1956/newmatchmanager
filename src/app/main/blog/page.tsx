
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Rss, ListFilter } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import type { Blog, Tag } from '@/lib/types';
import { format } from 'date-fns';

export default function BlogListPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { isSiteAdmin, isClubAdmin } = useAdminAuth();
  const { toast } = useToast();

  const [posts, setPosts] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const canCreate = isSiteAdmin || isClubAdmin;

  useEffect(() => {
    if (authLoading || !userProfile?.primaryClubId || !firestore) {
        if (!authLoading) setIsLoading(false);
        return;
    }

    const postsQuery = query(
        collection(firestore, 'blogs'),
        where('clubId', '==', userProfile.primaryClubId)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: (doc.data().createdAt as Timestamp),
        } as Blog));
        
        postsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        
        setPosts(postsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching blog posts:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch blog posts.' });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, authLoading, toast]);
  
  useEffect(() => {
    if (isFilterModalOpen && userProfile?.primaryClubId && firestore) {
        setIsLoadingTags(true);
        const tagsQuery = query(collection(firestore, 'tags'), where('clubId', '==', userProfile.primaryClubId));
        const unsubscribe = onSnapshot(tagsQuery, (snapshot) => {
            const tagsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
            setAvailableTags(tagsData);
            setIsLoadingTags(false);
        }, (error) => {
            console.error("Error fetching tags:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load tags.' });
            setIsLoadingTags(false);
        });
        return () => unsubscribe();
    }
  }, [isFilterModalOpen, userProfile, toast]);

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => 
        prev.includes(tagName) 
        ? prev.filter(t => t !== tagName) 
        : [...prev, tagName]
    );
  };
  
  const filteredPosts = useMemo(() => {
    if (selectedTags.length === 0) {
        return posts;
    }
    return posts.filter(post => 
        post.tags?.some(tag => selectedTags.includes(tag))
    );
  }, [posts, selectedTags]);
  
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

    if (filteredPosts.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Rss className="mx-auto h-12 w-12" />
                <p className="mt-4">{selectedTags.length > 0 ? "No posts found with the selected tags." : "No blog posts have been published yet."}</p>
                {canCreate && <p>Click "Create Post" to get started.</p>}
            </div>
        )
    }

    return filteredPosts.map(post => {
        const snippet = post.content.replace(/<[^>]*>?/gm, '').substring(0, 150);
        return (
            <Card key={post.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => router.push(`/main/blog/${post.id}`)}>
                <CardHeader>
                    <CardTitle>{post.subject}</CardTitle>
                    <CardDescription>
                        By {post.authorName} on {format(post.createdAt.toDate(), 'PPP')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{snippet}...</p>
                </CardContent>
            </Card>
        );
    });
  }

  return (
    <>
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Filter by Tag</DialogTitle>
                <DialogDescription>Select tags to filter the blog posts.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2 max-h-64 overflow-y-auto">
                {isLoadingTags ? (
                    <Skeleton className="h-24 w-full" />
                ) : availableTags.length > 0 ? (
                    availableTags.map(tag => (
                        <div key={tag.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={`tag-${tag.id}`}
                                checked={selectedTags.includes(tag.name)}
                                onCheckedChange={() => handleTagToggle(tag.name)}
                            />
                            <Label htmlFor={`tag-${tag.id}`} className="font-normal">{tag.name}</Label>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground">No tags available to filter by.</p>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTags([])}>Clear Filters</Button>
                <Button onClick={() => setIsFilterModalOpen(false)}>Done</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
            <p className="text-muted-foreground">News, articles, and updates from your club.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsFilterModalOpen(true)}>
                <ListFilter className="mr-2 h-4 w-4" />
                Filter by Tag {selectedTags.length > 0 && `(${selectedTags.length})`}
            </Button>
            {canCreate && (
              <Button onClick={() => router.push('/main/blog/create')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Post
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {renderPostList()}
        </div>
      </div>
    </>
  );
}
