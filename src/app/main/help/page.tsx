
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Upload, Trash2, FileText, Video } from 'lucide-react';
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
  orderBy
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
import { Progress } from '@/components/ui/progress';

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

  useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      return;
    }
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
    
    // Set metadata to allow inline viewing
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
        // Attempt to delete from Storage first
        try {
            const fileRef = ref(storage, fileToDelete.url);
            await deleteObject(fileRef);
        } catch (error: any) {
            // If the file doesn't exist in storage, that's okay.
            // We still want to delete the Firestore document.
            if (error.code !== 'storage/object-not-found') {
                // If it's a different error (e.g., permissions), throw it
                throw error;
            }
            console.log("File not found in Storage, proceeding to delete Firestore reference.");
        }

        // Always delete from Firestore
        await deleteDoc(doc(firestore, 'helpDocuments', fileToDelete.id));

        toast({ title: 'Success', description: `${fileToDelete.fileName} has been deleted.` });
    } catch (error) {
        console.error("Error deleting file:", error);
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the file.' });
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
                <Skeleton className="h-9 w-9" />
            </div>
        ));
    }
    
    if (files.length === 0) {
        return <p className="text-sm text-center text-muted-foreground p-4">No help documents or videos have been uploaded yet.</p>
    }

    return files.map(file => (
      <div key={file.id} className="flex items-center justify-between p-4 border rounded-md">
        <div className="flex items-center gap-4">
          {file.type === 'pdf' ? <FileText className="h-8 w-8 text-destructive" /> : <Video className="h-8 w-8 text-blue-500" />}
          <div>
            <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{file.fileName}</a>
            <p className="text-sm text-muted-foreground">{file.description}</p>
          </div>
        </div>
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
    ));
  };


  return (
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
                <Label htmlFor="file-upload">File (Video or PDF)</Label>
                <input
                    type="file"
                    accept="video/*,application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    disabled={isUploading}
                />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading || !description.trim()} className="mt-2">
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
            <CardTitle>Uploaded Files</CardTitle>
            <CardDescription>A list of all currently available help documents and videos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {renderFileList()}
        </CardContent>
      </Card>
    </div>
  );
}
