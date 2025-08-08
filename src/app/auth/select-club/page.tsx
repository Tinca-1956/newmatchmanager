
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
import { collection, onSnapshot, doc, setDoc, addDoc, getDoc } from 'firebase/firestore';
import type { Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendWelcomeEmail } from '@/lib/send-email';

export default function SelectClubPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  const [isCreatingFirstClub, setIsCreatingFirstClub] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  
  // Hardcoded Site Admin email
  const isSiteAdmin = user?.email === 'stuart.thomas.winton@gmail.com';

  // Effect to fetch the list of clubs
  useEffect(() => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not initialized.' });
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
        if(clubsData.length === 0 && isSiteAdmin) {
            setIsCreatingFirstClub(true);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching clubs: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs from the database.' });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast, isSiteAdmin]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClubId(clubId);
  }

  // This function handles the final step: creating the user document in Firestore.
  const handleConfirmSelection = async () => {
     if (!selectedClubId || !user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a club and ensure you are logged in.' });
      return;
    }

    setIsSaving(true);
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      const nameParts = (user.displayName || '').split(' ');
      
      const userProfileData = {
        primaryClubId: selectedClubId,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email,
        role: isSiteAdmin ? 'Site Admin' : 'Angler',
        memberStatus: isSiteAdmin ? 'Member' : 'Pending',
      };

      // Set the document. This will trigger the cloud function to set custom claims.
      await setDoc(userDocRef, userProfileData, { merge: true });

      // Send welcome email after profile creation
      if (user.email && user.displayName) {
        const selectedClub = clubs.find(c => c.id === selectedClubId);
        await sendWelcomeEmail(
          user.email,
          user.displayName,
          selectedClub?.name || 'Your New Club',
          userProfileData.role,
          userProfileData.memberStatus
        );
      }

      toast({
        title: 'Success!',
        description: 'Your primary club has been set. You will be redirected.',
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
  
  // This function handles creating the very first club if none exist.
  const handleCreateFirstClub = async () => {
    if (!newClubName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a name for the club.' });
      return;
    }

    if (!isSiteAdmin || !user || !firestore) {
        toast({ variant: 'destructive', title: 'Permissions Error', description: 'You must be the Site Admin to create the first club.' });
        return;
    }
    
    setIsSaving(true);
    try {
      // Step 1: Create the new club
      const newClubData = {
        name: newClubName,
        description: 'The first club, created by the Site Admin.',
        imageUrl: `https://placehold.co/100x100.png`,
      };
      const newClubDocRef = await addDoc(collection(firestore, 'clubs'), newClubData);
      
      // The onSnapshot listener will automatically update the clubs list,
      // which will cause this creation UI to disappear.
      // We can now select this new club and proceed.
      setSelectedClubId(newClubDocRef.id);
      setIsCreatingFirstClub(false);
      setNewClubName('');
      toast({ title: 'Success', description: `Club "${newClubName}" has been created. Please confirm your selection.` });

    } catch (error) {
      console.error('Error creating first club:', error);
      toast({ variant: 'destructive', title: 'Creation Failed', description: 'Could not create the club. Check Firestore rules and logs.' });
    } finally {
      setIsSaving(false);
    }
  }

  // Renders the main content of the page
  const renderContent = () => {
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
    
    // If no clubs exist AND the user is the site admin, show the creation UI.
    if (isCreatingFirstClub && isSiteAdmin) {
      return (
        <div className="text-center p-6 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-semibold">No Clubs Found</h3>
          <p className="text-muted-foreground mt-2 mb-4">As the Site Admin, you must create the first club to continue.</p>
          <div className="flex flex-col max-w-sm mx-auto gap-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="new-club-name">New Club Name</Label>
              <Input
                id="new-club-name"
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
                placeholder="e.g., Premier Angling Club"
              />
            </div>
            <Button onClick={handleCreateFirstClub} disabled={isSaving}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {isSaving ? 'Creating...' : 'Create First Club'}
            </Button>
          </div>
        </div>
      );
    }
    
    // Otherwise, show the list of clubs for selection.
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
    ));
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
            {renderContent()}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex justify-between">
         <p className="text-xs text-muted-foreground">
          If you don't see your club, contact a club administrator.
        </p>
        <Button onClick={handleConfirmSelection} disabled={!selectedClubId || isSaving || isCreatingFirstClub}>
          {isSaving ? 'Saving...' : 'Confirm Selection'}
        </Button>
      </CardFooter>
    </Card>
  );
}
