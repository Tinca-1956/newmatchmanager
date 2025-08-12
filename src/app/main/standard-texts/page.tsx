
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { StandardText } from '@/lib/types';
import { PlusCircle, Edit, Trash2, Terminal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

export default function StandardTextsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { isSiteAdmin, isClubAdmin, loading: adminLoading } = useAdminAuth();
  const { toast } = useToast();

  const [texts, setTexts] = useState<StandardText[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentText, setCurrentText] = useState<Partial<StandardText> | null>(null);

  useEffect(() => {
    if (authLoading || adminLoading || !userProfile?.primaryClubId || !firestore) {
      if (!authLoading && !adminLoading) setIsLoading(false);
      return;
    }

    const textsQuery = query(
      collection(firestore, 'Standard_Texts'),
      where('clubId', '==', userProfile.primaryClubId)
    );

    const unsubscribe = onSnapshot(textsQuery, (snapshot) => {
      const textsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StandardText));
      setTexts(textsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching standard texts:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch standard texts.' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, authLoading, adminLoading, toast]);
  
  const openDialog = (text: Partial<StandardText> | null = null) => {
    setCurrentText(text ? { ...text } : { content: '', clubId: userProfile?.primaryClubId || '' });
    setIsDialogOpen(true);
  };
  
  const handleSave = async () => {
    if (!currentText || !currentText.content || !currentText.clubId || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Text content cannot be empty.' });
      return;
    }
    
    setIsSaving(true);
    try {
      if (currentText.id) {
        // Update existing
        const docRef = doc(firestore, 'Standard_Texts', currentText.id);
        await updateDoc(docRef, { content: currentText.content });
        toast({ title: 'Success', description: 'Standard text updated.' });
      } else {
        // Create new
        await addDoc(collection(firestore, 'Standard_Texts'), {
          clubId: currentText.clubId,
          content: currentText.content,
        });
        toast({ title: 'Success', description: 'Standard text created.' });
      }
      setIsDialogOpen(false);
      setCurrentText(null);
    } catch (error) {
      console.error("Error saving text:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the text.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = async (textId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'Standard_Texts', textId));
      toast({ title: 'Success', description: 'Standard text deleted.' });
    } catch (error) {
      console.error("Error deleting text:", error);
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the text.' });
    }
  };

  if (authLoading || adminLoading) {
    return <Skeleton className="w-full h-96" />;
  }

  if (!isSiteAdmin && !isClubAdmin) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>You do not have permission to view this page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Standard Texts</h1>
            <p className="text-muted-foreground">Manage reusable text snippets for your club.</p>
          </div>
          <Button onClick={() => openDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Text
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Text List</CardTitle>
            <CardDescription>A list of all standard texts for your club.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-10 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : texts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">No standard texts found.</TableCell>
                  </TableRow>
                ) : (
                  texts.map((text) => (
                    <TableRow key={text.id}>
                      <TableCell className="max-w-xl truncate">{text.content}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(text)}><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone. This will permanently delete this standard text.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(text.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentText?.id ? 'Edit' : 'Create'} Standard Text</DialogTitle>
            <DialogDescription>Enter the content for the reusable text snippet.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="content">Text Content</Label>
            <Textarea
              id="content"
              value={currentText?.content || ''}
              onChange={(e) => setCurrentText(prev => prev ? { ...prev, content: e.target.value } : null)}
              className="mt-2 min-h-[120px]"
              placeholder="Enter your standard text here..."
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
