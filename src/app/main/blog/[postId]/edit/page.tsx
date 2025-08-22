
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';
import { useAuth } from '@/hooks/use-auth';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore, storage } from '@/lib/firebase-client';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Blog } from '@/lib/types';
import { ArrowLeft, Upload, FileText, Video, Trash2, TestTube, Eye, FlaskConical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import NextImage from 'next/image';
import Link from 'next/link';

interface MediaFile {
  url: string;
  name: string;
  type: string;
}

interface TruncatePreviewData {
    subject: string;
    content: string;
    imageUrl?: string;
}

interface PublicPostData {
  subject: string;
  snippet: string;
  coverImageUrl?: string;
  authorName?: string;
  publishedAt?: any;
}


export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { userProfile } = useAuth();
  const { isSiteAdmin, isClubAdmin } = useAdminAuth();
  const { toast } = useToast();

  const [post, setPost] = useState<Blog | null>(null);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [isTruncateModalOpen, setIsTruncateModalOpen] = useState(false);
  const [truncatePreview, setTruncatePreview] = useState<TruncatePreviewData | null>(null);
  
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [publicPost, setPublicPost] = useState<PublicPostData | null>(null);
  const [isFetchingPublicPost, setIsFetchingPublicPost] = useState(false);
  
  useEffect(() => {
    if (!postId || !firestore) return;
    const fetchPost = async () => {
        try {
            const postDocRef = doc(firestore, 'blogs', postId);
            const docSnap = await getDoc(postDocRef);
            if (docSnap.exists()) {
                const postData = docSnap.data() as Blog;
                setPost(postData);
                setSubject(postData.subject);
                setContent(postData.content);
                setMediaFiles(postData.mediaUrls || []);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Blog post not found.' });
                router.push('/main/blog');
            }
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load post.' });
        } finally {
            setIsLoading(false);
        }
    };
    fetchPost();
  }, [postId, router, toast]);

  const canEdit = post && userProfile && (userProfile.id === post.authorId || isSiteAdmin || (isClubAdmin && userProfile.primaryClubId === post.clubId));

  const handleSave = async () => {
    if (!canEdit || !subject.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Subject is required.' });
      return;
    }
    
    setIsSaving(true);

    try {
      const postDocRef = doc(firestore, 'blogs', postId);
      await updateDoc(postDocRef, {
        subject,
        content,
        mediaUrls: mediaFiles,
        lastUpdated: serverTimestamp(),
      });
      
      toast({ title: 'Success!', description: 'Blog post updated successfully.' });
      router.push(`/main/blog/${postId}`);
    } catch (error) {
      console.error('Error updating blog post:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update the blog post.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleMakePublic = async () => {
    if (!canEdit || !post || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot publish this post.' });
        return;
    }
    setIsPublishing(true);

    try {
        const plainText = content.replace(/<[^>]*>?/gm, '');
        const snippet = plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '');
        const coverImageUrl = mediaFiles.find(file => file.type.startsWith('image/'))?.url || '';

        const publicPostData = {
            originalPostId: postId,
            clubId: post.clubId,
            authorName: post.authorName,
            subject: subject,
            snippet: snippet,
            coverImageUrl: coverImageUrl,
            publishedAt: serverTimestamp(),
        };

        const publicDocRef = doc(firestore, 'publicBlogPosts', postId);
        await setDoc(publicDocRef, publicPostData, { merge: true });
        
        toast({ title: 'Success!', description: 'The blog post teaser has been published.' });

    } catch (error) {
        console.error("Error publishing post:", error);
        toast({ variant: 'destructive', title: 'Publish Failed', description: 'Could not publish the post teaser.' });
    } finally {
        setIsPublishing(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;

    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `blog_media/${post?.clubId}/${postId}/${Date.now()}-${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        try {
            const downloadURL = await new Promise<string>((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                         const progress = ((i + (snapshot.bytesTransferred / snapshot.totalBytes)) / files.length) * 100;
                        setUploadProgress(progress);
                    },
                    (error) => reject(error),
                    async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
                );
            });
            
            setMediaFiles(prev => [...prev, { url: downloadURL, name: file.name, type: file.type }]);

        } catch (error) {
            console.error(`Error uploading ${file.name}:`, error)
            toast({ variant: 'destructive', title: 'Upload Failed', description: `Could not upload ${file.name}.`});
            break;
        }
    }
    
    setIsUploading(false);
    toast({ title: 'Upload Complete', description: 'File(s) added. Remember to save the post.'});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
    
  const handleRemoveMedia = async (fileToRemove: MediaFile) => {
    setMediaFiles(prev => prev.filter(file => file.url !== fileToRemove.url));

    try {
      const fileRef = ref(storage, fileToRemove.url);
      await deleteObject(fileRef);
      toast({ title: 'Ready to Remove', description: `${fileToRemove.name} will be removed from storage when you save.` });
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
          console.log("File not in storage, removing from list only.");
      } else {
          console.error("Error deleting file from storage:", error);
          toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete file from storage. It will be removed from the post on save.' });
      }
    }
  };
    
  const handleTruncateClick = () => {
    const plainText = content.replace(/<[^>]*>?/gm, '');
    const truncatedContent = plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '');
    const firstImage = mediaFiles.find(file => file.type.startsWith('image/'))?.url;

    setTruncatePreview({
        subject: subject,
        content: truncatedContent,
        imageUrl: firstImage,
    });
    setIsTruncateModalOpen(true);
  };
  
  const handleViewSummary = async () => {
    if (!postId || !firestore) return;
    setIsFetchingPublicPost(true);
    setIsSummaryModalOpen(true);
    try {
        const publicDocRef = doc(firestore, 'publicBlogPosts', postId);
        const docSnap = await getDoc(publicDocRef);
        if (docSnap.exists()) {
            setPublicPost(docSnap.data() as PublicPostData);
        } else {
            setPublicPost(null);
            toast({ variant: 'destructive', title: 'Not Found', description: 'This post has not been made public yet.' });
            setIsSummaryModalOpen(false);
        }
    } catch (e) {
        console.error("Error fetching public post:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the public summary.' });
        setIsSummaryModalOpen(false);
    } finally {
        setIsFetchingPublicPost(false);
    }
  };
    
  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-1/4" /><Skeleton className="h-80 w-full" /></div>;
  }

  if (!canEdit) {
    return <p>You do not have permission to edit this post.</p>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Blog Post</h1>
            <p className="text-muted-foreground">Make changes to your post.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <RichTextEditor id="content" value={content} onChange={setContent} />
            </div>
            <div className="space-y-4">
                <Label>Media</Label>
                <div className="grid gap-2">
                    {mediaFiles.map((file) => (
                        <div key={file.url} className="flex items-center justify-between p-2 border rounded-md">
                            <div className="flex items-center gap-2 text-sm">
                                {file.type.startsWith('image/') ? <img src={file.url} className="h-8 w-8 object-cover rounded-sm" alt={file.name} /> : 
                                file.type.startsWith('video/') ? <Video className="h-6 w-6" /> : 
                                <FileText className="h-6 w-6" />}
                                <span className="truncate">{file.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveMedia(file)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                    ))}
                </div>
                <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" disabled={isUploading} accept="image/*,video/*,.pdf" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    <Upload className="mr-2 h-4 w-4" />{isUploading ? 'Uploading...' : 'Upload Media'}
                </Button>
                {isUploading && <Progress value={uploadProgress} className="w-full" />}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={handleTruncateClick}>
                    <TestTube className="mr-2 h-4 w-4" />
                    Truncate
                </Button>
                 <Button onClick={handleMakePublic} disabled={isPublishing}>
                    {isPublishing ? 'Publishing...' : 'Make Public'}
                </Button>
                 <Button variant="secondary" onClick={handleViewSummary} disabled={isFetchingPublicPost}>
                    <Eye className="mr-2 h-4 w-4" />
                    {isFetchingPublicPost ? 'Loading...' : 'View Summary'}
                </Button>
                <Button asChild variant="destructive" size="sm">
                  <Link href={`/public/test?postId=${postId}`} target="_blank">
                    <FlaskConical className="mr-2 h-4 w-4" />
                    Test Public Access
                  </Link>
                </Button>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => router.push(`/main/blog/${postId}`)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Post'}</Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={isTruncateModalOpen} onOpenChange={setIsTruncateModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Truncate Preview</DialogTitle>
                <DialogDescription>This is a preview of how your truncated teaser will appear.</DialogDescription>
            </DialogHeader>
            {truncatePreview && (
                <div className="py-4 space-y-4">
                    <h3 className="text-lg font-semibold">{truncatePreview.subject}</h3>
                    <p className="text-sm text-muted-foreground italic">"{truncatePreview.content}"</p>
                    {truncatePreview.imageUrl ? (
                        <div className="relative aspect-video w-full">
                            <NextImage src={truncatePreview.imageUrl} alt="Cover image preview" fill className="object-cover rounded-md" />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-32 border border-dashed rounded-md bg-muted text-sm text-muted-foreground">
                            No image available
                        </div>
                    )}
                </div>
            )}
            <DialogFooter>
                <Button onClick={() => setIsTruncateModalOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Public Summary Preview</DialogTitle>
                <DialogDescription>This is the content currently stored in the public blog post document.</DialogDescription>
            </DialogHeader>
            {isFetchingPublicPost ? <Skeleton className="h-48 w-full" /> : (
                publicPost && (
                    <div className="py-4 space-y-4">
                        <h3 className="text-lg font-semibold">{publicPost.subject}</h3>
                        <p className="text-sm text-muted-foreground italic">"{publicPost.snippet}"</p>
                        <p className="text-xs text-muted-foreground">By: {publicPost.authorName}</p>
                        {publicPost.coverImageUrl ? (
                            <div className="relative aspect-video w-full">
                                <NextImage src={publicPost.coverImageUrl} alt="Public cover image" fill className="object-cover rounded-md" />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-32 border border-dashed rounded-md bg-muted text-sm text-muted-foreground">
                                No cover image was published.
                            </div>
                        )}
                    </div>
                )
            )}
            <DialogFooter>
                <Button onClick={() => setIsSummaryModalOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
