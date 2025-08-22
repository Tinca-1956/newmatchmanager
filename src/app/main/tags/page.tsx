
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import type { Tag } from '@/lib/types';
import { PlusCircle, Edit, Trash2, Terminal, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';

export default function TagsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { isSiteAdmin, isClubAdmin, loading: adminLoading } = useAdminAuth();
  const { toast } = useToast();

  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTag, setCurrentTag] = useState<Partial<Tag> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authLoading || adminLoading || !userProfile?.primaryClubId || !firestore) {
      if (!authLoading && !adminLoading) setIsLoading(false);
      return;
    }

    const tagsQuery = query(
      collection(firestore, 'tags'),
      where('clubId', '==', userProfile.primaryClubId)
    );

    const unsubscribe = onSnapshot(tagsQuery, (snapshot) => {
      const tagsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
      tagsData.sort((a, b) => a.name.localeCompare(b.name));
      setTags(tagsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching tags:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch tags.' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, authLoading, adminLoading, toast]);

  const filteredTags = useMemo(() => {
    if (!searchTerm) return tags;
    const lowercasedTerm = searchTerm.toLowerCase();
    return tags.filter(tag => 
      tag.name.toLowerCase().includes(lowercasedTerm)
    );
  }, [tags, searchTerm]);
  
  const openDialog = (tag: Partial<Tag> | null = null) => {
    setCurrentTag(tag ? { ...tag } : { name: '', clubId: userProfile?.primaryClubId || '' });
    setIsDialogOpen(true);
  };
  
  const handleSave = async () => {
    if (!currentTag || !currentTag.name || !currentTag.clubId || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Tag name cannot be empty.' });
      return;
    }
    
    setIsSaving(true);
    try {
      const dataToSave = {
        clubId: currentTag.clubId,
        name: currentTag.name,
      };

      if (currentTag.id) {
        // Update existing
        const docRef = doc(firestore, 'tags', currentTag.id);
        await updateDoc(docRef, dataToSave);
        toast({ title: 'Success', description: 'Tag updated.' });
      } else {
        // Create new
        await addDoc(collection(firestore, 'tags'), dataToSave);
        toast({ title: 'Success', description: 'Tag created.' });
      }
      setIsDialogOpen(false);
      setCurrentTag(null);
    } catch (error) {
      console.error("Error saving tag:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the tag.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = async (tagId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'tags', tagId));
      toast({ title: 'Success', description: 'Tag deleted.' });
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the tag.' });
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
            <h1 className="text-3xl font-bold tracking-tight">Manage Tags</h1>
            <p className="text-muted-foreground">Create, edit, and delete tags for blog posts.</p>
          </div>
          <Button onClick={() => openDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Tag
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tag List</CardTitle>
            <CardDescription>
              A list of all tags for your club. These can be assigned to blog posts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search tags..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag Name</TableHead>
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
                ) : filteredTags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      {searchTerm ? "No tags found matching your search." : "No tags found. Click 'Add New Tag' to start."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(tag)}><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone. This will permanently delete this tag.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(tag.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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
            <DialogTitle>{currentTag?.id ? 'Edit' : 'Create'} Tag</DialogTitle>
            <DialogDescription>Enter a name for the tag.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="space-y-2">
              <Label htmlFor="name">Tag Name</Label>
              <Input
                id="name"
                value={currentTag?.name || ''}
                onChange={(e) => setCurrentTag(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="e.g., AGM, Rules, Social Event"
                required
              />
            </div>
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
