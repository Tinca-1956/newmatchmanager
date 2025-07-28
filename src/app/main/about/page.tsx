
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Fish, Edit, Save } from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const DEFAULT_CONTENT = `
<p>This application is designed to help fishing clubs manage their matches, members, and results with ease.</p>
<p>Built with modern technology to provide a seamless and responsive experience for club administrators, marshals, and anglers alike.</p>
`;

export default function AboutPage() {
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();
  const { toast } = useToast();
  
  const [content, setContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!firestore) return;

    const settingsDocRef = doc(firestore, 'settings', 'aboutPage');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setContent(data.content || DEFAULT_CONTENT);
        setEditedContent(data.content || DEFAULT_CONTENT);
      } else {
        setContent(DEFAULT_CONTENT);
        setEditedContent(DEFAULT_CONTENT);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching about page content:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load page content.' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      const settingsDocRef = doc(firestore, 'settings', 'aboutPage');
      await setDoc(settingsDocRef, { content: editedContent });
      toast({ title: 'Success', description: 'About page content has been updated.' });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving content:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the content.' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    if (isLoading || adminLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      );
    }

    if (isEditing) {
      return (
        <Textarea
          value={editedContent.replace(/<p>/g, '').replace(/<\/p>/g, '\n\n').trim()}
          onChange={(e) => {
             const newContent = e.target.value
              .split('\n')
              .filter(p => p.trim() !== '')
              .map(p => `<p>${p.trim()}</p>`)
              .join('');
            setEditedContent(newContent);
          }}
          className="min-h-[200px] text-base"
        />
      );
    }

    return (
        <div
            className="text-center text-muted-foreground space-y-4"
            dangerouslySetInnerHTML={{ __html: content }}
        />
    )
  };


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">About Match Manager</h1>
            <p className="text-muted-foreground">Information about the application.</p>
        </div>
        {isSiteAdmin && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Page
            </Button>
        )}
      </div>

      <Card>
        <CardHeader className="items-center">
            <div className="flex justify-center pb-4">
              <Fish className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-center">Match Manager Pro</CardTitle>
            <CardDescription className="text-center">Version 1.0.0</CardDescription>
        </CardHeader>
        <CardContent>
            {renderContent()}
        </CardContent>
         <CardFooter className="flex-col items-center gap-4 text-center">
             {isEditing && (
                <div className="flex justify-end w-full gap-2">
                    <Button variant="ghost" onClick={() => { setIsEditing(false); setEditedContent(content); }}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            )}
             <p className="pt-4 text-xs text-muted-foreground">
                Copyright EMANCIUM 2025 - All rights reserved
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
