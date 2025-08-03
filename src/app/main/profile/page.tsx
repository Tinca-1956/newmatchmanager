
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore, auth } from '@/lib/firebase-client';
import { doc, onSnapshot, updateDoc, getDoc, collection, query, where, getDocs, arrayRemove, increment, Timestamp } from 'firebase/firestore';
import type { User, Club, Match } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
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
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<User | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [primaryClubName, setPrimaryClubName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [isMatchesLoading, setIsMatchesLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const userData = { id: doc.id, ...doc.data() } as User;
        setProfile(userData);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching profile:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your profile.' });
      setIsLoading(false);
    });

    const clubsCollection = collection(firestore, 'clubs');
    const unsubscribeClubs = onSnapshot(clubsCollection, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setClubs(clubsData);
    });

    return () => {
        unsubscribeUser();
        unsubscribeClubs();
    };
  }, [user, toast]);
  
  useEffect(() => {
    if (!user || !firestore) {
      setIsMatchesLoading(false);
      return;
    }

    setIsMatchesLoading(true);
    const matchesQuery = query(
      collection(firestore, 'matches'),
      where('registeredAnglers', 'array-contains', user.uid),
      where('status', '==', 'Upcoming')
    );
    
    const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Match));
      setUpcomingMatches(matchesData);
      setIsMatchesLoading(false);
    }, (error) => {
       console.error("Error fetching upcoming matches:", error);
       toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your registered matches.' });
       setIsMatchesLoading(false);
    });

    return () => unsubscribeMatches();

  }, [user, toast]);

  useEffect(() => {
    if (profile?.primaryClubId && clubs.length > 0) {
      const primaryClub = clubs.find(c => c.id === profile.primaryClubId);
      setPrimaryClubName(primaryClub?.name || 'N/A');
    }
  }, [profile, clubs]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !firestore) return;

    setIsSaving(true);
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        primaryClubId: profile.primaryClubId,
        secondaryClubId: profile.secondaryClubId || null,
      });
      toast({ title: 'Success!', description: 'Your profile has been updated.' });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update your profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !auth || !currentPassword || !newPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all password fields.' });
      return;
    }

    setIsSaving(true);
    try {
      if(user.email) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        
        toast({ title: 'Success!', description: 'Your password has been changed.' });
        setIsPasswordDialogOpen(false);
        setCurrentPassword('');
        setNewPassword('');
      } else {
         throw new Error("User email is not available.");
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({ variant: 'destructive', title: 'Password Change Failed', description: 'Please check your current password and try again.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUnregister = async (matchId: string) => {
    if (!user || !firestore) return;
    
    setIsSaving(true);
    try {
      const matchDocRef = doc(firestore, 'matches', matchId);
      await updateDoc(matchDocRef, {
        registeredAnglers: arrayRemove(user.uid),
        registeredCount: increment(-1),
      });
      toast({ title: 'Success', description: "You have been unregistered from the match." });
    } catch (error) {
      console.error("Error unregistering from match: ", error);
      toast({ variant: 'destructive', title: 'Error', description: "Could not unregister you from the match." });
    } finally {
      setIsSaving(false);
    }
  };

  const renderProfileForm = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
           <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
           <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      );
    }
    
    if (!profile) {
        return <p>Could not load user profile.</p>
    }

    return (
      <form onSubmit={handleProfileUpdate}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                required
              />
            </div>
          </div>
           <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled />
            <p className="text-sm text-muted-foreground">
              Your email address is used for login and cannot be changed.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryClub">Primary Club</Label>
            <Select
              value={profile.primaryClubId}
              onValueChange={(value) => setProfile({ ...profile, primaryClubId: value })}
            >
              <SelectTrigger id="primaryClub">
                <SelectValue placeholder="Select your primary club" />
              </SelectTrigger>
              <SelectContent>
                {clubs.map((club) => (
                  <SelectItem key={club.id} value={club.id}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
             <p className="text-sm text-muted-foreground">
              This is your main club for dashboard and default views.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryClub">Secondary Club</Label>
            <Select
              value={profile.secondaryClubId || ''}
              onValueChange={(value) => setProfile({ ...profile, secondaryClubId: value === 'none' ? undefined : value })}
            >
              <SelectTrigger id="secondaryClub">
                <SelectValue placeholder="Select a secondary club (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {clubs.filter(c => c.id !== profile.primaryClubId).map((club) => (
                  <SelectItem key={club.id} value={club.id}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="flex w-full justify-between items-center">
            <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
              Change Password
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </div>
        </CardFooter>
      </form>
    );
  };
  
  const renderUpcomingMatches = () => {
    if (isMatchesLoading) {
      return Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 border-b">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
      ));
    }

    if (upcomingMatches.length === 0) {
      return <p className="text-sm text-muted-foreground p-4">You are not registered for any upcoming matches.</p>;
    }

    return upcomingMatches.map((match) => (
      <div key={match.id} className="flex items-center justify-between p-4 border-b last:border-b-0">
        <div>
          <p className="font-semibold">{match.name}</p>
          <p className="text-sm text-muted-foreground">
            {match.seriesName} at {match.location} on {format(match.date, 'PPP')}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleUnregister(match.id)}
          disabled={isSaving}
        >
          Unregister
        </Button>
      </div>
    ));
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and club memberships.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal details here.
            </CardDescription>
          </CardHeader>
          {renderProfileForm()}
        </Card>
        
        <Card>
           <CardHeader>
            <CardTitle>My Upcoming Matches</CardTitle>
            <CardDescription>
              A list of upcoming matches you are registered for.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {renderUpcomingMatches()}
          </CardContent>
        </Card>
      </div>

       <AlertDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Your Password</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your current password and a new password below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input 
                    id="current-password" 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                    id="new-password" 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                />
              </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleChangePassword} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
