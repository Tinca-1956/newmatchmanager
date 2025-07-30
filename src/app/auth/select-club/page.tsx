
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import type { Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function SelectClubPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not initialized.',
      });
      setIsLoading(false);
      return;
    }

    const clubsCollection = collection(firestore, 'clubs');
    const unsubscribe = onSnapshot(
      clubsCollection,
      (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Club));
        setClubs(clubsData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching clubs: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch clubs from the database.',
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast, authLoading]);

  const handleSelectClub = async (clubId: string) => {
    setSelectedClubId(clubId);
  }

  const handleConfirmSelection = async () => {
     if (!selectedClubId || !user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a club and ensure you are logged in.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      const nameParts = (user.displayName || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Check if the user is the site admin and set role accordingly
      const userRole = user.email === 'stuart.thomas.winton@gmail.com' ? 'Site Admin' : 'Angler';
      const memberStatus = user.email === 'stuart.thomas.winton@gmail.com' ? 'Member' : 'Pending';


      await setDoc(userDocRef, {
        primaryClubId: selectedClubId,
        firstName: firstName,
        lastName: lastName,
        email: user.email,
        role: userRole,
        memberStatus: memberStatus,
      }, { merge: true });

      toast({
        title: 'Success!',
        description: 'Your primary club has been set.',
      });
      
      router.push('/main/dashboard');

    } catch (error) {
      console.error("Error setting primary club: ", error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not set your primary club. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  const renderClubList = () => {
    if (isLoading || authLoading) {
      return Array.from({ length: 4 }).map((_, i) => (
         <div key={i} className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[250px]" />
              </div>
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
      ));
    }
    
    return clubs.map((club) => (
      <div
        key={club.id}
        className="flex items-center justify-between rounded-lg border p-4"
      >
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={club.imageUrl} alt={club.name} />
            <AvatarFallback>{club.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{club.name}</p>
            <p className="text-sm text-muted-foreground">
              {club.description}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => handleSelectClub(club.id)}
          variant={selectedClubId === club.id ? 'default' : 'outline'}
        >
          {selectedClubId === club.id ? 'Selected' : 'Select'}
        </Button>
      </div>
    ))
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Select Your Primary Club</CardTitle>
        <CardDescription>
          Choose a club to see its dashboard and manage your activities. You can
          change this later from your profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          <div className="space-y-4 pr-6">
            {renderClubList()}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex justify-between">
         <p className="text-xs text-muted-foreground">
          If you don't see your club, contact a club administrator.
        </p>
        <Button onClick={handleConfirmSelection} disabled={!selectedClubId || isSaving}>
          {isSaving ? 'Saving...' : 'Confirm Selection'}
        </Button>
      </CardFooter>
    </Card>
  );
}
