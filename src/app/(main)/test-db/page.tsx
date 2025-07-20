'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { firestore, auth } from '@/lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function TestDbPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult(null);

    if (!firestore) {
      setTestResult({
        status: 'error',
        message: 'Firestore is not initialized. Make sure your Firebase API keys are set correctly in .env.local.',
      });
      setIsLoading(false);
      return;
    }

    if (!auth?.currentUser) {
       setTestResult({
        status: 'error',
        message: 'You must be logged in to perform this test.',
      });
      setIsLoading(false);
      return;
    }

    try {
      // We try to get the current user's own document.
      // The security rules should allow this.
      // If we get a 'permission-denied' error, the rules are wrong or not deployed.
      // If the request is allowed (even if the doc doesn't exist), the connection is fine.
      const testDocRef = doc(firestore, 'users', auth.currentUser.uid);
      await getDoc(testDocRef);
      
      setTestResult({
        status: 'success',
        message: 'Successfully connected to Firestore! The security rules are allowing you to read your own user document.',
      });

    } catch (error: any) {
      if (error.code === 'permission-denied') {
         setTestResult({
            status: 'error',
            message: 'Connection failed: Permission Denied. Please make sure you have deployed the correct firestore.rules file to your Firebase project.',
        });
      } else {
         setTestResult({
            status: 'error',
            message: `An unexpected error occurred: ${error.message}`,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Database Connection Test</h1>
        <p className="text-muted-foreground">
          Use this page to verify your app can connect to the Firestore database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Firestore Connection</CardTitle>
          <CardDescription>
            Click the button below to perform a test read from your database.
            This will check if you can read your own user document, which helps diagnose issues with API keys or security rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={handleTestConnection} disabled={isLoading} className="w-fit">
            {isLoading ? 'Testing...' : 'Test Connection'}
          </Button>

          {testResult && (
             <Alert variant={testResult.status === 'error' ? 'destructive' : 'default'}>
                <Terminal className="h-4 w-4" />
                <AlertTitle>{testResult.status === 'success' ? 'Success!' : 'Error'}</AlertTitle>
                <AlertDescription>
                    {testResult.message}
                </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
