
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from 'firebase/auth';
import { auth, firestore } from '@/lib/firebase-client';
import { collection, doc, getDoc, getDocs, setDoc, query, where, onSnapshot, updateDoc, arrayRemove, increment, Timestamp } from 'firebase/firestore';
import type { Club, UserRole, Match } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [primaryClubId, setPrimaryClubId] = useState('');
  const [secondaryClubId, setSecondaryClubId] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [isMatchesLoading, setIsMatchesLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnregistering, setIsUnregistering] = useState(false);

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
          setFirstName(userData.firstName || '');
          setLastName(userData.lastName || '');
          setPrimaryClubId(userData.primaryClubId || '');
          setSecondaryClubId(userData.secondaryClubId || '');
          setRole(userData.role || 'Angler');
        } else {
           // Fallback if firestore doc not created, get from auth displayName
           const nameParts = (user.displayName || '').split(' ');
           setFirstName(nameParts[0] || '');
           setLastName(nameParts.slice(1).join(' ') || '');
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

  useEffect(() => {
    if (!user || !firestore) {
      setIsMatchesLoading(false);
      return;
    }

    setIsMatchesLoading(true);
    const matchesCollection = collection(firestore, 'matches');
    const q = query(
      matchesCollection, 
      where('registeredAnglers', 'array-contains', user.uid),
      where('status', '==', 'Upcoming')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: (data.date as Timestamp).toDate(),
        } as Match;
      });
      setUpcomingMatches(matchesData);
      setIsMatchesLoading(false);
    }, (error) => {
      console.error("Error fetching upcoming matches: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch your upcoming matches.',
      });
      setIsMatchesLoading(false);
    });

    return () => unsubscribe();
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
      const newDisplayName = `${firstName.trim()} ${lastName.trim()}`;
      // Update display name in Firebase Auth
      if (newDisplayName !== user.displayName) {
        await updateProfile(auth.currentUser, { displayName: newDisplayName });
      }

      // Save/update user profile data to Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, { 
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        primaryClubId,
        secondaryClubId,
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

  const handleUnregister = async (matchId: string) => {
    if (!user || !firestore) return;
    setIsUnregistering(true);
    try {
      const matchDocRef = doc(firestore, 'matches', matchId);
      await updateDoc(matchDocRef, {
        registeredAnglers: arrayRemove(user.uid),
        registeredCount: increment(-1),
      });
      toast({
        title: 'Success',
        description: "You have been un-registered from the match.",
      });
    } catch (error) {
      console.error("Error un-registering: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: "Could not un-register you from the match. Please try again.",
      });
    } finally {
      setIsUnregistering(false);
    }
  };


  const renderUpcomingMatches = () => {
    if (isMatchesLoading) {
       return Array.from({ length: 2 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-10 w-28" /></TableCell>
          </TableRow>
      ));
    }
    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            You are not registered for any upcoming matches.
          </TableCell>
        </TableRow>
      );
    }
    return upcomingMatches.map((match) => (
      <TableRow key={match.id}>
        <TableCell className="font-medium">{match.name}</TableCell>
        <TableCell>{match.seriesName}</TableCell>
        <TableCell>{format(match.date, 'PPP')}</TableCell>
        <TableCell className="text-right">
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isUnregistering}>
                    {isUnregistering ? 'Processing...' : 'Un-register'}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will remove you from the match: <strong>{match.name}</strong>.
                        This action cannot be undone, but you may be able to register again if space is available.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => handleUnregister(match.id)}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        Yes, Un-register
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </TableCell>
      </TableRow>
    ));
  };

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
           {isLoading ? (
            <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Skeleton className="h-10 w-full" />
                </div>
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
           ) : (
             <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Your first name"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Your last name"
                        />
                    </div>
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
                  <Label htmlFor="secondaryClub">Secondary Club</Label>
                  <Select value={secondaryClubId} onValueChange={setSecondaryClubId}>
                    <SelectTrigger id="secondaryClub">
                      <SelectValue placeholder="Select a secondary club" />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="">None</SelectItem>
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
                  <Select value={role} onValueChange={(value) => setRole(value as UserRole)} disabled>
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
                   <p className="text-xs text-muted-foreground">Your role is managed by a club administrator.</p>
                </div>
              </CardContent>
           )}
          <CardFooter>
            <Button type="submit" disabled={isSaving || isLoading}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>My Upcoming Matches</CardTitle>
          <CardDescription>
            A list of upcoming matches you are registered for.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderUpcomingMatches()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
