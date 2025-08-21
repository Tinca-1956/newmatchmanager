
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import { sendBlogPostNotificationEmail } from '@/lib/send-email';

export default function CreateBlogPostPage() {
    const router = useRouter();
    const { userProfile } = useAuth();
    const { isSiteAdmin, isClubAdmin } = useAdminAuth();
    const { toast } = useToast();

    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingAndNotifying, setIsSavingAndNotifying] = useState(false);

    const canCreate = isSiteAdmin || isClubAdmin;

    const handleSave = async (notify: boolean) => {
        if (!canCreate || !userProfile?.primaryClubId || !userProfile.firstName || !subject.trim() || !content.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Subject and content are required.' });
            return;
        }

        if (notify) {
            setIsSavingAndNotifying(true);
        } else {
            setIsSaving(true);
        }

        try {
            const blogData = {
                clubId: userProfile.primaryClubId,
                authorId: userProfile.id,
                authorName: `${userProfile.firstName} ${userProfile.lastName}`,
                subject,
                content,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                mediaUrls: [], // For future implementation
            };
            
            const docRef = await addDoc(collection(firestore, 'blogs'), blogData);
            
            let toastMessage = 'Blog post created successfully.';
            if (notify) {
                try {
                    await sendBlogPostNotificationEmail(userProfile.primaryClubId, subject, docRef.id);
                    toastMessage += ' Notifications sent.';
                } catch (emailError) {
                    console.error("Email notification failed:", emailError);
                    toastMessage += ' However, email notifications failed to send.';
                }
            }
            
            toast({ title: 'Success!', description: toastMessage });
            router.push('/main/blog');

        } catch (error) {
            console.error('Error creating blog post:', error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not create the blog post.' });
        } finally {
            setIsSaving(false);
            setIsSavingAndNotifying(false);
        }
    };

    if (!canCreate) {
        return <p>You do not have permission to create blog posts.</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create New Blog Post</h1>
                    <p className="text-muted-foreground">Write and publish a new post for your club.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Post Details</CardTitle>
                    <CardDescription>Enter the subject and content for your post.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g., Upcoming Annual General Meeting"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write your blog post here..."
                            className="min-h-[300px]"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => router.push('/main/blog')}>Cancel</Button>
                <Button onClick={() => handleSave(false)} disabled={isSaving || isSavingAndNotifying}>
                    {isSaving ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button onClick={() => handleSave(true)} disabled={isSaving || isSavingAndNotifying}>
                     {isSavingAndNotifying ? 'Saving & Notifying...' : 'Save & Notify Members'}
                </Button>
            </div>
        </div>
    );
}
