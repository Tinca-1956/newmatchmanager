
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function TestAccessPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [anglers, setAnglers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetAnglers = async () => {
    if (!firestore || !userProfile?.primaryClubId) {
      toast({ variant: 'destructive', title: 'Error', description: 'User profile or primary club not loaded.' });
      return;
    }

    setIsLoading(true);
    setAnglers([]);
    setError(null);

    try {
      const usersQuery = query(collection(firestore, 'users'), where('primaryClubId', '==', userProfile.primaryClubId));
      const querySnapshot = await getDocs(usersQuery);
      
      if (querySnapshot.empty) {
          toast({ title: 'Query Succeeded', description: 'The query ran successfully but found no user documents.' });
      } else {
        const fetchedAnglers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setAnglers(fetchedAnglers);
        toast({
          title: 'Success!',
          description: `Found ${fetchedAnglers.length} user(s) in your primary club.`
        });
      }
    } catch (e: any) {
      console.error("Error fetching anglers:", e);
      setError(e.message);
      toast({
        variant: 'destructive',
        title: 'Firestore Query Failed',
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentUserInfo = () => {
      if (authLoading) {
          return (
              <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-32" />
              </div>
          )
      }
      if (userProfile) {
          return (
              <div>
                  <p><span className="font-semibold">Current User:</span> {userProfile.firstName} {userProfile.lastName}</p>
                  <p><span className="font-semibold">Detected Role:</span> {userProfile.role}</p>
                  <p><span className="font-semibold">Primary Club ID:</span> {userProfile.primaryClubId || 'Not Set'}</p>
              </div>
          )
      }
      return <p className="text-muted-foreground">Could not load current user information.</p>
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Access</h1>
        <p className="text-muted-foreground">A simple page to test Firestore read permissions.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Core Permission Test</CardTitle>
          <CardDescription>
            This test checks two things: 1. Can the app read your own user document? 2. Can the app query for other users in your primary club?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 rounded-md border p-4">
             <h3 className="font-semibold mb-2">Step 1: Read Your User Profile</h3>
             {renderCurrentUserInfo()}
          </div>

           <div className="space-y-2 rounded-md border p-4">
                <h3 className="font-semibold mb-2">Step 2: Query for Users in Your Club</h3>
                <p className="text-sm text-muted-foreground pb-4">
                    Click the button to run a query for all users with the same Primary Club ID as you. If this succeeds, the core permission issue is resolved.
                </p>
                <Button onClick={handleGetAnglers} disabled={isLoading || authLoading || !userProfile}>
                    {isLoading ? 'Fetching...' : 'Run Test Query'}
                </Button>

                {error && (
                    <Alert variant="destructive" className="mt-4">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Firestore Error</AlertTitle>
                        <AlertDescription>
                            {error}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="pt-4">
                    <h4 className="font-semibold">Results:</h4>
                    {isLoading ? (
                        <div className="space-y-2 pt-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-2/3" />
                        </div>
                    ) : anglers.length > 0 ? (
                        <ul className="list-disc pl-5 pt-2">
                            {anglers.map(angler => (
                                <li key={angler.id}>{angler.firstName} {angler.lastName} ({angler.email})</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground pt-2">No users fetched yet. Run the query.</p>
                    )}
                </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
