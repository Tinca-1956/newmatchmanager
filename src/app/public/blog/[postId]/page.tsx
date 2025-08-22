
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { Blog } from '@/lib/types';
import { format } from 'date-fns';
import NextImage from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Video, ArrowLeft } from 'lucide-react';
import PublicHeader from '@/components/public-header';
import PublicFooter from '@/components/public-footer';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PublicBlogPostPage() {
  const params = useParams();
  const postId = params.postId as string;
  const [post, setPost] = useState<Blog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !firestore) {
        setIsLoading(false);
        setError('The post ID is missing or the database is unavailable.');
        return;
    };
    
    const fetchPost = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const postDocRef = doc(firestore, 'blogs', postId);
        const docSnap = await getDoc(postDocRef);

        if (docSnap.exists()) {
          const postData = { id: docSnap.id, ...docSnap.data() } as Blog;
          setPost(postData);
        } else {
          setError('This blog post could not be found. It may have been deleted.');
        }
      } catch (e: any) {
        console.error("Error fetching public blog post:", e);
        if (e.code === 'permission-denied') {
            setError('You do not have permission to view this content. Please check your Firestore security rules to allow public access to the "blogs" collection.');
        } else {
            setError('A server error occurred while trying to load this post.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const renderMedia = () => {
    if (!post?.mediaUrls || post.mediaUrls.length === 0) return null;

    const images = post.mediaUrls.filter(m => m.type.startsWith('image/'));
    const files = post.mediaUrls.filter(m => !m.type.startsWith('image/'));

    return (
      <div className="space-y-4 mt-6">
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map(image => (
              <a key={image.url} href={image.url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square">
                <NextImage src={image.url} alt={image.name} fill className="object-cover rounded-md" />
              </a>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Attached Files</h4>
            <div className="space-y-2">
              {files.map(file => (
                <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 border rounded-md hover:bg-accent transition-colors">
                  {file.type.startsWith('video/') ? <Video className="h-6 w-6 text-blue-500" /> : <FileText className="h-6 w-6 text-gray-500" />}
                  <span className="text-sm font-medium">{file.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
   const renderContent = () => {
    if (isLoading) {
      return (
        <Card className="w-full max-w-4xl mx-auto mt-8">
            <CardHeader>
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-5 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-5/6" />
                </div>
            </CardContent>
        </Card>
      );
    }
    
    if (error) {
        return (
            <div className="text-center py-16">
                <p className="text-destructive font-semibold">Error</p>
                <p className="text-muted-foreground mt-2">{error}</p>
                 <Button asChild variant="link" className="mt-4">
                    <Link href="/public/dashboard">Return to Dashboard</Link>
                </Button>
            </div>
        )
    }

    if (!post) {
      return null;
    }
    
    return (
      <Card className="w-full max-w-4xl mx-auto mt-8">
          <CardHeader>
              <CardTitle className="text-3xl md:text-4xl">{post.subject}</CardTitle>
              <CardDescription>
                  By {post.authorName} on {format((post.createdAt as Timestamp).toDate(), 'PPP')}
              </CardDescription>
          </CardHeader>
          <CardContent>
              <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
              {renderMedia()}
          </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
        <PublicHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
             {renderContent()}
        </main>
        <PublicFooter />
    </div>
  );
}
