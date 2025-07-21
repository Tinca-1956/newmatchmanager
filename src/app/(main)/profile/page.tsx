'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from 'firebase/auth';
import { auth, firestore } from '@/lib/firebase-client';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import type { Club, UserRole } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [primaryClubId, setPrimaryClubId] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchProfileAndClubs() {
      if (!user || !firestore) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch clubs
        const clubsCollection = collection(firestore, 'clubs');
        const clubSnapshot = await getDocs(clubsCollection);
        const clubsData = clubSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Club));
        setClubs(clubsData);

        // Fetch user profile from Firestore
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setDisplayName(userData.displayName || user.displayName || '');
          setPrimaryClubId(userData.primaryClubId || '');
          setRole(userData.role || 'Angler');
        } else {
          // If no firestore doc, try to get from auth and set defaults
          setDisplayName(user.displayName || '');
          setRole('Angler');
        }
        
      } catch (error) {
        console.error("Error fetching data: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch your profile data.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfileAndClubs();
  }, [user, toast]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auth?.currentUser || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to save changes.',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update display name in Firebase Auth
      if (displayName.trim() !== user.displayName) {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      }

      // Save/update user profile data to Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, { 
        displayName: displayName.trim(),
        primaryClubId,
        email: user.email,
        role: role,
      }, { merge: true });

      toast({
        title: 'Success!',
        description: 'Your profile has been updated.',
      });
    } catch (error) {
      console.error("Error saving profile: ", error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not save your changes. Please check your permissions and try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
       <div className="flex flex-col gap-8">
         <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and club association.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>
              Update your personal details here. Click save when you're done.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="displayName">Full Name</Label>
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryClub">Primary Club</Label>
              <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-28" />
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and club association.
        </p>
      </div>
      <form onSubmit={handleSaveChanges}>
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>
              Update your personal details here. Click save when you're done.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="displayName">Full Name</Label>
                <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryClub">Primary Club</Label>
              <Select value={primaryClubId} onValueChange={setPrimaryClubId}>
                <SelectTrigger id="primaryClub">
                  <SelectValue placeholder="Select a club" />
                </SelectTrigger>
                <SelectContent>
                  {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Site Admin">Site Admin</SelectItem>
                  <SelectItem value="Club Admin">Club Admin</SelectItem>
                  <SelectItem value="Marshal">Marshal</SelectItem>
                  <SelectItem value="Angler">Angler</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
