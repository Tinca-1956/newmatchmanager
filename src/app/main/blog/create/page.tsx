
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';
import { useAuth } from '@/hooks/use-auth';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore, storage } from '@/lib/firebase-client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Upload, FileText, Video, Trash2, Mail } from 'lucide-react';
import { sendBlogPostNotificationEmail } from '@/lib/send-email';
import { Progress } from '@/components/ui/progress';

interface MediaFile {
  url: string;
  name: string;
  type: string;
}

export default function CreateBlogPostPage() {
    const router = useRouter();
    const { userProfile } = useAuth();
    const { isSiteAdmin, isClubAdmin } = useAdminAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingAndNotifying, setIsSavingAndNotifying] = useState(false);

    const canCreate = isSiteAdmin || isClubAdmin;

    const handleSave = async (notify: boolean) => {
        if (!canCreate || !userProfile?.primaryClubId || !userProfile.firstName || !subject.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Subject is required.' });
            return;
        }

        if (notify) setIsSavingAndNotifying(true);
        else setIsSaving(true);
        
        try {
            const blogData = {
                clubId: userProfile.primaryClubId,
                authorId: userProfile.id,
                authorName: `${userProfile.firstName} ${userProfile.lastName}`,
                subject,
                content,
                mediaUrls: mediaFiles,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
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
    
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) return;

        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const storageRef = ref(storage, `blog_media/${userProfile?.primaryClubId}/${Date.now()}-${file.name}`);
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
        toast({ title: 'Upload Complete', description: `${files.length} file(s) ready to be attached.`});
        if (fileInputRef.current) fileInputRef.current.value = "";
    };
    
    const handleRemoveMedia = (urlToRemove: string) => {
        setMediaFiles(prev => prev.filter(file => file.url !== urlToRemove));
        // Note: This does not delete from storage yet, as the post isn't saved.
    };

    if (!canCreate) {
        return <p>You do not have permission to create blog posts.</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create New Blog Post</h1>
                    <p className="text-muted-foreground">Write and publish a new post for your club.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Post Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Upcoming Annual General Meeting" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <RichTextEditor id="content" value={content} onChange={setContent} placeholder="Write your blog post here..." />
                    </div>
                    <div className="space-y-4">
                        <Label>Media</Label>
                        <div className="grid gap-2">
                            {mediaFiles.map((file) => (
                                <div key={file.url} className="flex items-center justify-between p-2 border rounded-md">
                                    <div className="flex items-center gap-2 text-sm">
                                        {file.type.startsWith('image/') ? <img src={file.url} className="h-8 w-8 object-cover rounded-sm" /> : 
                                        file.type.startsWith('video/') ? <Video className="h-6 w-6" /> : 
                                        <FileText className="h-6 w-6" />}
                                        <span className="truncate">{file.name}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveMedia(file.url)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            </Card>

            <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => router.push('/main/blog')}>Cancel</Button>
                <Button onClick={() => handleSave(false)} disabled={isSaving || isSavingAndNotifying}>
                    {isSaving ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button onClick={() => handleSave(true)} disabled={isSaving || isSavingAndNotifying}>
                     <Mail className="mr-2 h-4 w-4" />
                     {isSavingAndNotifying ? 'Saving & Notifying...' : 'Save & Notify Members'}
                </Button>
            </div>
        </div>
    );
}
