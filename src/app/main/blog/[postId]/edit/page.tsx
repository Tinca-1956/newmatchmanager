
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';
import { useAuth } from '@/hooks/use-auth';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Blog } from '@/lib/types';
import { ArrowLeft, Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { sendBlogPostNotificationEmail } from '@/lib/send-email';

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;

  const { userProfile } = useAuth();
  const { isSiteAdmin, isClubAdmin } = useAdminAuth();
  const { toast } = useToast();

  const [post, setPost] = useState<Blog | null>(null);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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
    if (!canEdit || !subject.trim() || !content.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Subject and content are required.' });
      return;
    }
    
    if (notify) {
        setIsSavingAndNotifying(true);
    } else {
        setIsSaving(true);
    }

    try {
      const postDocRef = doc(firestore, 'blogs', postId);
      await updateDoc(postDocRef, {
        subject,
        content,
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

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-1/4" /><Skeleton className="h-80 w-full" /></div>;
  }

  if (!canEdit) {
    return <p>You do not have permission to edit this post.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
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
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <RichTextEditor
              id="content"
              value={content}
              onChange={setContent}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.push(`/main/blog/${postId}`)}>Cancel</Button>
        <Button onClick={() => handleSave(false)} disabled={isSaving || isSavingAndNotifying}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button onClick={() => handleSave(true)} disabled={isSaving || isSavingAndNotifying}>
            <Mail className="mr-2 h-4 w-4" />
            {isSavingAndNotifying ? 'Saving & Notifying...' : 'Save & Notify Members'}
        </Button>
      </div>
    </div>
  );
}
