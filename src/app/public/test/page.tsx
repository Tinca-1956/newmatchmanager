
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader } from 'lucide-react';
import NextImage from 'next/image';

interface PublicPostData {
  subject: string;
  snippet: string;
  coverImageUrl?: string;
  authorName?: string;
  publishedAt?: any;
}

function PublicTestContent() {
  const searchParams = useSearchParams();
  const postId = searchParams.get('postId');
  
  const [testResult, setTestResult] = useState<'success' | 'failure' | 'pending'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<PublicPostData | null>(null);

  useEffect(() => {
    if (!postId || !firestore) {
      setTestResult('failure');
      setErrorMessage('Post ID is missing or Firestore is not initialized.');
      return;
    }

    const testRead = async () => {
      try {
        const publicDocRef = doc(firestore, 'publicBlogPosts', postId);
        const docSnap = await getDoc(publicDocRef);
        
        if (docSnap.exists()) {
          setTestResult('success');
          setData(docSnap.data() as PublicPostData);
          setErrorMessage(null);
        } else {
          setTestResult('failure');
          setErrorMessage(`The document with ID "${postId}" does not exist in the publicBlogPosts collection.`);
          setData(null);
        }
      } catch (error: any) {
        console.error("Public access test failed:", error);
        setTestResult('failure');
        setErrorMessage(error.message || 'An unknown error occurred.');
        setData(null);
      }
    };
    
    testRead();
  }, [postId]);

  const renderResult = () => {
    switch (testResult) {
      case 'pending':
        return (
          <div className="flex items-center justify-center p-8">
            <Loader className="h-8 w-8 animate-spin" />
            <p className="ml-4">Running test...</p>
          </div>
        );
      case 'success':
        return (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-300">Success!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              Successfully read the document from the `publicBlogPosts` collection. Your security rules appear to be configured correctly for public access.
            </AlertDescription>
          </Alert>
        );
      case 'failure':
        return (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Test Failed</AlertTitle>
            <AlertDescription>
              Could not read the document from `publicBlogPosts`. This is likely due to a permissions error in your Firestore security rules.
              <p className="font-mono bg-muted p-2 rounded-md mt-2 text-xs">Error: {errorMessage}</p>
            </AlertDescription>
          </Alert>
        );
    }
  };

  const renderData = () => {
    if (!data) return null;
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Fetched Data</CardTitle>
          <CardDescription>This is the data retrieved from the public document.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="text-lg font-semibold">{data.subject}</h3>
          <p className="text-sm text-muted-foreground italic">"{data.snippet}"</p>
          <p className="text-xs text-muted-foreground">By: {data.authorName}</p>
          {data.coverImageUrl && (
            <div className="relative aspect-video w-full">
                <NextImage src={data.coverImageUrl} alt="Public cover image" fill className="object-cover rounded-md" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-8 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Public Access Test</CardTitle>
          <CardDescription>
            This page tests if an unauthenticated user can read from the `publicBlogPosts` collection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderResult()}
          {renderData()}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PublicTestPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PublicTestContent />
        </Suspense>
    )
}
