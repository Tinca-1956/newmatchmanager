
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function TestAccessPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [anglers, setAnglers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !firestore) {
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    getDoc(userDocRef).then(docSnap => {
      if (docSnap.exists()) {
        setCurrentUserProfile({ id: docSnap.id, ...docSnap.data() } as User);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find your user profile.' });
      }
    }).catch(e => {
       console.error("Error fetching user profile:", e);
       setError("Failed to fetch your user profile. Check console for details.");
    }).finally(() => {
       setProfileLoading(false);
    });

  }, [user, authLoading, toast]);


  const handleGetAnglers = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not logged in or Firestore not available.' });
      return;
    }

    if (!currentUserProfile?.primaryClubId) {
       toast({ variant: 'destructive', title: 'Error', description: "Could not find your primary club. Please set it in your profile." });
       return;
    }

    setIsLoading(true);
    setAnglers([]);
    setError(null);

    try {
      const primaryClubId = currentUserProfile.primaryClubId;
      const usersQuery = query(collection(firestore, 'users'), where('primaryClubId', '==', primaryClubId));
      const querySnapshot = await getDocs(usersQuery);

      const fetchedAnglers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setAnglers(fetchedAnglers);

      toast({
        title: 'Success!',
        description: `Found ${fetchedAnglers.length} anglers in your primary club.`
      });

    } catch (e: any) {
      console.error("Error fetching anglers:", e);
      setError(e.message);
      toast({
        variant: 'destructive',
        title: 'Query Failed',
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentUserInfo = () => {
      if (profileLoading) {
          return (
              <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-32" />
              </div>
          )
      }
      if (currentUserProfile) {
          return (
              <div>
                  <p><span className="font-semibold">Current User:</span> {currentUserProfile.firstName} {currentUserProfile.lastName}</p>
                  <p><span className="font-semibold">Detected Role:</span> {currentUserProfile.role}</p>
              </div>
          )
      }
      return <p className="text-muted-foreground">Could not load current user information.</p>
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Access</h1>
        <p className="text-muted-foreground">A simple page to test fetching users from your primary club.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Club Angler Query</CardTitle>
          <CardDescription>
            This page first displays your detected user role, then attempts to fetch all users who are members of your primary club.
            The query used is: `query(collection('users'), where('primaryClubId', '==', YOUR_CLUB_ID))`
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 rounded-md border p-4">
             <h3 className="font-semibold mb-2">User Role Check</h3>
             {renderCurrentUserInfo()}
          </div>

          <Button onClick={handleGetAnglers} disabled={isLoading || profileLoading || !currentUserProfile}>
            {isLoading ? 'Fetching...' : 'Get Club Anglers'}
          </Button>

          {error && (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Firestore Error</AlertTitle>
                <AlertDescription>
                    {error}
                </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold">Results:</h3>
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-2/3" />
                </div>
            ) : anglers.length > 0 ? (
                <ul className="list-disc pl-5">
                    {anglers.map(angler => (
                        <li key={angler.id}>{angler.firstName} {angler.lastName} ({angler.email})</li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">No anglers fetched yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
