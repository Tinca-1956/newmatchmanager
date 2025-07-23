
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/lib/types';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FlaskConical } from 'lucide-react';

export default function EmulatorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isEmulator, setIsEmulator] = useState(false);
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsEmulator(window.location.hostname === 'localhost');
    }

    if (authLoading) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (!firestore) {
      setIsLoading(false);
      return;
    }
    
    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists() && doc.data().role === 'Site Admin') {
        setIsSiteAdmin(true);
      } else {
        setIsSiteAdmin(false);
      }
      setIsLoading(false);
    }, () => {
      setIsLoading(false);
      setIsSiteAdmin(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, router]);
  
  if (isLoading) {
    return (
        <div className="flex flex-col gap-8">
            <div>
                <Skeleton className="h-9 w-1/3 mb-2" />
                <Skeleton className="h-5 w-1/2" />
            </div>
             <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-6 w-1/4" /></CardTitle>
                    <CardDescription><Skeleton className="h-4 w-2/3" /></CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-20 w-full" />
                </CardContent>
             </Card>
        </div>
    );
  }

  if (!isEmulator || !isSiteAdmin) {
    return (
        <Alert variant="destructive">
            <FlaskConical className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
                You do not have permission to view this page. It is for Site Admins in an emulator environment only.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Emulator Tools</h1>
        <p className="text-muted-foreground">
          Tools for testing and development in the emulator environment.
        </p>
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Test Data Management</CardTitle>
                <CardDescription>
                    Use this section to seed the local emulator database with test data.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Placeholder for emulator actions like seeding users, clubs, matches, etc.</p>
            </CardContent>
        </Card>
    </div>
  );
}
