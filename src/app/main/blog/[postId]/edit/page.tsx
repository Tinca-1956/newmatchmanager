
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
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Blog } from '@/lib/types';
import { ArrowLeft, Mail, Upload, FileText, Video, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { sendBlogPostNotificationEmail } from '@/lib/send-email';
import { Progress } from '@/components/ui/progress';

interface MediaFile {
  url: string;
  name: string;
  type: string;
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
  const [isSavingAndNotifying, setIsSavingAndNotifying] = useState(false);
  
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

  const handleSave = async (notify: boolean) => {
    if (!canEdit || !subject.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Subject is required.' });
      return;
    }
    
    if (notify) setIsSavingAndNotifying(true);
    else setIsSaving(true);

    try {
      const postDocRef = doc(firestore, 'blogs', postId);
      await updateDoc(postDocRef, {
        subject,
        content,
        mediaUrls: mediaFiles,
        lastUpdated: serverTimestamp(),
      });

      let toastMessage = 'Blog post updated successfully.';
      if (notify) {
        if(post){
            try {
                await sendBlogPostNotificationEmail(post.clubId, subject, postId);
                toastMessage += ' Notifications sent.';
            } catch (emailError) {
                console.error("Email notification failed:", emailError);
                toastMessage += ' However, email notifications failed to send.';
            }
        }
      }
      
      toast({ title: 'Success!', description: toastMessage });
      router.push(`/main/blog/${postId}`);
    } catch (error) {
      console.error('Error updating blog post:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update the blog post.' });
    } finally {
      setIsSaving(false);
      setIsSavingAndNotifying(false);
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
      // Optimistically update the UI
      setMediaFiles(prev => prev.filter(file => file.url !== fileToRemove.url));

      try {
        // Delete from Firebase Storage
        const fileRef = ref(storage, fileToRemove.url);
        await deleteObject(fileRef);

        // Remove from Firestore document on save, but for immediate UI consistency we can do this.
        // The final source of truth will be the `mediaFiles` state when save is clicked.
        toast({ title: 'Ready to Remove', description: `${fileToRemove.name} will be removed when you save.` });
      } catch (error) {
        console.error("Error deleting file from storage:", error);
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete file from storage. It will be removed from the post on save.' });
      }
    };


  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-1/4" /><Skeleton className="h-80 w-full" /></div>;
  }

  if (!canEdit) {
    return <p>You do not have permission to edit this post.</p>;
  }

  return (
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
        <CardFooter className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.push(`/main/blog/${postId}`)}>Cancel</Button>
          <Button onClick={() => handleSave(false)} disabled={isSaving || isSavingAndNotifying}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
          <Button onClick={() => handleSave(true)} disabled={isSaving || isSavingAndNotifying}><Mail className="mr-2 h-4 w-4" />{isSavingAndNotifying ? 'Saving & Notifying...' : 'Save & Notify Members'}</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
