
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Trash2, FileText, Video, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { firestore, storage } from '@/lib/firebase-client';
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  updateDoc
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadMetadata,
} from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
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
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HelpDocument {
  id: string;
  fileName: string;
  description: string;
  url: string;
  type: 'video' | 'pdf';
  createdAt: any;
}

export default function HelpPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<HelpDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<HelpDocument | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [sortBy, setSortBy] = useState<'createdAt' | 'fileName'>('createdAt');

  useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      return;
    }
    // We only order by createdAt from Firestore. Filename sorting will be done on the client.
    const helpDocsQuery = query(collection(firestore, 'helpDocuments'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(helpDocsQuery, (snapshot) => {
      const docsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HelpDocument));
      setFiles(docsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching help documents:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch help documents.' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
        if (sortBy === 'fileName') {
            return a.fileName.localeCompare(b.fileName);
        }
        // Default is 'createdAt' which is already handled by the query, but we can keep this for consistency
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
  }, [files, sortBy]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !storage || !firestore) return;

    const file = event.target.files[0];
    if (!description.trim()) {
        toast({ variant: 'destructive', title: 'Description required', description: 'Please enter a description before uploading.' });
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const fileType = file.type.includes('pdf') ? 'pdf' : 'video';
    const storageRef = ref(storage, `help_documents/${Date.now()}-${file.name}`);
    
    const metadata: UploadMetadata = {
      contentType: file.type,
      contentDisposition: 'inline',
    };
    
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
        },
        (error) => {
            console.error('Upload failed:', error);
            toast({ variant: 'destructive', title: 'Upload failed', description: 'Could not upload the file. Check storage rules.' });
            setIsUploading(false);
        },
        async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            await addDoc(collection(firestore, 'helpDocuments'), {
                fileName: file.name,
                description: description,
                url: downloadURL,
                type: fileType,
                createdAt: serverTimestamp()
            });
            setIsUploading(false);
            setDescription('');
            toast({ title: 'Success!', description: 'File uploaded successfully.' });
        }
    );
  };
  
  const handleDeleteFile = async (fileToDelete: HelpDocument) => {
    if (!firestore || !storage) return;

    try {
        try {
            const fileRef = ref(storage, fileToDelete.url);
            await deleteObject(fileRef);
        } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
                throw error;
            }
            console.log("File not found in Storage, proceeding to delete Firestore reference.");
        }
        await deleteDoc(doc(firestore, 'helpDocuments', fileToDelete.id));

        toast({ title: 'Success', description: `${fileToDelete.fileName} has been deleted.` });
    } catch (error) {
        console.error("Error deleting file:", error);
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the file.' });
    }
  };
  
  const handleEditClick = (docToEdit: HelpDocument) => {
    setSelectedDoc(docToEdit);
    setIsEditDialogOpen(true);
  };

  const handleUpdateDescription = async () => {
    if (!selectedDoc || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No document selected or Firestore is unavailable.' });
      return;
    }
    
    setIsSaving(true);
    try {
      const docRef = doc(firestore, 'helpDocuments', selectedDoc.id);
      await updateDoc(docRef, {
        description: selectedDoc.description,
      });
      toast({ title: 'Success!', description: 'The description has been updated.' });
      setIsEditDialogOpen(false);
      setSelectedDoc(null);
    } catch (error) {
      console.error('Error updating description:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update the description.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const renderFileList = () => {
    if (isLoading) {
        return Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                </div>
            </div>
        ));
    }
    
    if (sortedFiles.length === 0) {
        return <p className="text-sm text-center text-muted-foreground p-4">No help documents or videos have been uploaded yet.</p>
    }

    return sortedFiles.map(file => (
      <div key={file.id} className="flex items-center justify-between p-4 border rounded-md">
        <div className="flex items-center gap-4">
          {file.type === 'pdf' ? <FileText className="h-8 w-8 text-destructive" /> : <Video className="h-8 w-8 text-blue-500" />}
          <div>
            <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{file.fileName}</a>
            <p className="text-sm text-muted-foreground">{file.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => handleEditClick(file)}>
                <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the file <span className="font-bold">{file.fileName}</span>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={() => handleDeleteFile(file)}
                >
                    Confirm Delete
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
    ));
  };


  return (
    <>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help - Site Admin</h1>
          <p className="text-muted-foreground">Manage help documents and videos for users.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Watch these short videos to guide you through MATCH MANAGER</CardTitle>
            <CardDescription>
              Instructional videos and documents for MATCH MANAGER
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                      id="description" 
                      placeholder="Enter a description for the file you are about to upload..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isUploading}
                  />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="file-upload" className="block mb-2">File (Video or PDF)</Label>
                  <input
                      type="file"
                      accept="video/*,application/pdf"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                      disabled={isUploading}
                  />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading || !description.trim()}>
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? `Uploading...` : 'Select & Upload File'}
                  </Button>
              </div>
              {isUploading && (
                    <div className="w-full">
                        <Progress value={uploadProgress} className="w-full" />
                        <p className="text-sm text-muted-foreground mt-2">{Math.round(uploadProgress)}% complete</p>
                    </div>
              )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Uploaded Files</CardTitle>
                    <CardDescription>A list of all currently available help documents and videos.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="sort-by">Sort by</Label>
                     <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                        <SelectTrigger id="sort-by" className="w-[180px]">
                            <SelectValue placeholder="Sort..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="createdAt">Date Created</SelectItem>
                            <SelectItem value="fileName">Filename</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
              {renderFileList()}
          </CardContent>
        </Card>
      </div>

      {selectedDoc && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Description</DialogTitle>
                    <DialogDescription>
                        Update the description for the file: {selectedDoc.fileName}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                        id="edit-description"
                        value={selectedDoc.description}
                        onChange={(e) => setSelectedDoc({ ...selectedDoc, description: e.target.value })}
                        className="mt-2 min-h-[100px]"
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateDescription} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
