
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { FileText, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface HelpDocument {
  id: string;
  fileName: string;
  description: string;
  url: string;
  type: 'video' | 'pdf';
  createdAt: any;
}

export default function HelpUserPage() {
  const { toast } = useToast();
  const [files, setFiles] = useState<HelpDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
            </div>
        ));
    }
    
    if (files.length === 0) {
        return <p className="text-sm text-center text-muted-foreground p-4">No help documents or videos have been uploaded yet.</p>
    }

    return files.map(file => (
      <a 
        key={file.id} 
        href={file.url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex items-center justify-between p-4 border rounded-md hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-4">
          {file.type === 'pdf' ? <FileText className="h-8 w-8 text-destructive" /> : <Video className="h-8 w-8 text-blue-500" />}
          <div>
            <p className="font-semibold">{file.fileName}</p>
            <p className="text-sm text-muted-foreground">{file.description}</p>
          </div>
        </div>
      </a>
    ));
  };


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help</h1>
        <p className="text-muted-foreground">Instructional videos and documents for MATCH MANAGER</p>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Watch these short videos to guide you through MATCH MANAGER</CardTitle>
            <CardDescription>Click on any item to open it in a new tab.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {renderFileList()}
        </CardContent>
      </Card>
    </div>
  );
}
