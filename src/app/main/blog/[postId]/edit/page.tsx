
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import type { Blog, Club, PublicPostData } from '@/lib/types';
import { ArrowLeft, Upload, FileText, Video, Trash2, Share2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface MediaFile {
  url: string;
  name: string;
  type: string;
}

// State to track saved data
interface SavedState {
    subject: string;
    content: string;
    mediaFiles: MediaFile[];
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
  const [clubName, setClubName] = useState('');
  
  // Working state for the form
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  
  // State to compare against for unsaved changes
  const [savedState, setSavedState] = useState<SavedState | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishingAndViewing, setIsPublishingAndViewing] = useState(false);
  
  const [isConfirmExitDialogOpen, setIsConfirmExitDialogOpen] = useState(false);

  // Helper to check for unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!savedState) return false;
    const subjectChanged = subject !== savedState.subject;
    const contentChanged = content !== savedState.content;
    const mediaChanged = JSON.stringify(mediaFiles) !== JSON.stringify(savedState.mediaFiles);
    return subjectChanged || contentChanged || mediaChanged;
  }, [subject, content, mediaFiles, savedState]);


  useEffect(() => {
    if (!postId || !firestore) return;
    const fetchPost = async () => {
        try {
            const postDocRef = doc(firestore, 'blogs', postId);
            const docSnap = await getDoc(postDocRef);
            if (docSnap.exists()) {
                const postData = docSnap.data() as Blog;
                const currentData = {
                  subject: postData.subject,
                  content: postData.content,
                  mediaFiles: postData.mediaUrls || [],
                };
                
                setPost(postData);
                setSubject(currentData.subject);
                setContent(currentData.content);
                setMediaFiles(currentData.mediaFiles);
                setSavedState(currentData); // Initialize saved state
                
                // Fetch club name
                if (postData.clubId) {
                  const clubDocRef = doc(firestore, 'clubs', postData.clubId);
                  const clubDoc = await getDoc(clubDocRef);
                  if (clubDoc.exists()) {
                      setClubName(clubDoc.data().name);
                  }
                }
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
      const updatedData = {
        subject,
        content,
        mediaUrls: mediaFiles,
        lastUpdated: serverTimestamp(),
      };
      await updateDoc(postDocRef, updatedData);
      
      // Update the saved state to reflect the new reality
      setSavedState({ subject, content, mediaFiles });

      toast({ title: 'Success!', description: 'Blog post updated successfully.' });
    } catch (error) {
      console.error('Error updating blog post:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update the blog post.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAttemptExit = () => {
    if (hasUnsavedChanges()) {
      setIsConfirmExitDialogOpen(true);
    } else {
      router.back();
    }
  };

  const handleConfirmExit = () => {
    setIsConfirmExitDialogOpen(false);
    router.back();
  };
  
  const handlePublishAndOpen = async () => {
    if (hasUnsavedChanges()) {
        toast({ variant: 'destructive', title: 'Unsaved Changes', description: 'Please save your changes before publishing.' });
        return;
    }
    if (!canEdit || !post || !firestore || !postId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot publish this post.' });
      return;
    }
    setIsPublishingAndViewing(true);
    
    try {
      const plainText = content.replace(/<[^>]*>?/gm, '');
      const snippet = plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
      const coverImageUrl = mediaFiles.find(file => file.type.startsWith('image/'))?.url || '';

      const publicPostData: PublicPostData = {
        clubName: clubName,
        subject: subject,
        snippet: snippet,
        coverImageUrl: coverImageUrl,
        authorName: post.authorName,
        publishedAt: serverTimestamp(),
      };
      const publicDocRef = doc(firestore, 'publicBlogPosts', postId);
      await setDoc(publicDocRef, publicPostData, { merge: true });
      toast({ title: 'Published!', description: 'Your post is now public.' });
      
      const publicUrl = `${window.location.origin}/public/blog/${postId}`;
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: 'URL Copied!', description: 'Link to public post copied.' });
      
      window.open(publicUrl, '_blank');

    } catch (error) {
       console.error("Error in publish & view process:", error);
       toast({ variant: 'destructive', title: 'Process Failed', description: 'An error occurred during the process.' });
    } finally {
        setIsPublishingAndViewing(false);
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
    
  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-1/4" /><Skeleton className="h-80 w-full" /></div>;
  }

  if (!canEdit) {
    return <p>You do not have permission to edit this post.</p>;
  }

  return (
    <>
      <AlertDialog open={isConfirmExitDialogOpen} onOpenChange={setIsConfirmExitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them and leave the page?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>Discard Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleAttemptExit}><ArrowLeft className="h-4 w-4" /></Button>
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
          <CardFooter className="flex justify-end items-center">
            <div className="flex gap-4">
              <Button variant="outline" onClick={handleAttemptExit}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges()}>
                {isSaving ? 'Saving...' : 'Save Post'}
              </Button>
               <Button onClick={handlePublishAndOpen} disabled={isPublishingAndViewing || hasUnsavedChanges()}>
                    <Share2 className="mr-2 h-4 w-4" />
                    {isPublishingAndViewing ? 'Publishing...' : 'Publish & View'}
                </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
