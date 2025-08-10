
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, collection, query, where, onSnapshot, Timestamp, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import type { Club, Match } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, LogIn } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function RegisterPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [clubName, setClubName] = useState<string>('');
  const [isClubLoading, setIsClubLoading] = useState(true);

  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [isMatchesLoading, setIsMatchesLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState<string | null>(null); // Store match ID being registered for

  // Fetch Club Name
  useEffect(() => {
    const fetchClubName = async () => {
      if (userProfile?.primaryClubId && firestore) {
        try {
          const clubDocRef = doc(firestore, 'clubs', userProfile.primaryClubId);
          const clubDoc = await getDoc(clubDocRef);
          if (clubDoc.exists()) {
            setClubName((clubDoc.data() as Club).name);
          } else {
            setClubName('Club not found');
          }
        } catch (error) {
          console.error("Error fetching club name:", error);
          setClubName('Error fetching club');
        } finally {
          setIsClubLoading(false);
        }
      } else if (userProfile) {
        setIsClubLoading(false);
      }
    };
    
    if (!authLoading) {
      fetchClubName();
    }
  }, [userProfile, authLoading]);

  // Fetch Upcoming Matches
  useEffect(() => {
    if (!userProfile?.primaryClubId || !firestore) {
      setIsMatchesLoading(false);
      return;
    }

    setIsMatchesLoading(true);
    const matchesQuery = query(
      collection(firestore, 'matches'),
      where('clubId', '==', userProfile.primaryClubId),
      where('status', '==', 'Upcoming')
    );

    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Match));
      
      matchesData.sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());

      setUpcomingMatches(matchesData);
      setIsMatchesLoading(false);
    }, (error) => {
      console.error("Error fetching upcoming matches:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch upcoming matches.' });
      setIsMatchesLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.primaryClubId, toast]);
  
  const handleRegister = async (match: Match) => {
    if (!user || !userProfile || !firestore) {
       toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to register.' });
       return;
    }
    
     if (userProfile.memberStatus !== 'Member') {
        toast({ variant: 'destructive', title: 'Cannot Register', description: `Your membership status is '${userProfile.memberStatus}'. You must be an active 'Member' to register.` });
        return;
    }

     if (match.registeredCount >= match.capacity) {
        toast({ variant: 'destructive', title: 'Match Full', description: 'This match has reached its capacity.' });
        return;
     }

    setIsRegistering(match.id);
    try {
        const matchDocRef = doc(firestore, 'matches', match.id);
        await updateDoc(matchDocRef, {
            registeredAnglers: arrayUnion(user.uid),
            registeredCount: increment(1)
        });
        
        // Immediately remove the match from the local state to hide it
        setUpcomingMatches(prevMatches => prevMatches.filter(m => m.id !== match.id));

        toast({ title: 'Success!', description: `You have been registered for ${match.name}.` });
    } catch (error) {
        console.error("Error registering for match: ", error);
        toast({ variant: 'destructive', title: 'Registration Failed', description: 'Could not register you for the match.' });
    } finally {
        setIsRegistering(null);
    }
  };


  const isLoading = authLoading || isClubLoading;
  const canRegister = userProfile?.memberStatus === 'Member';

  const renderUserDetails = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
           <div className="space-y-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      );
    }
    
    if (!userProfile) {
        return <p>User profile not found.</p>;
    }

    return (
       <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input value={userProfile.firstName} disabled />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input value={userProfile.lastName} disabled />
          </div>
          <div className="space-y-2">
            <Label>Primary Club</Label>
            <Input value={clubName || 'N/A'} disabled />
          </div>
          <div className="space-y-2">
            <Label>Membership Status</Label>
            <Input value={userProfile.memberStatus} disabled />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={userProfile.role} disabled />
          </div>
        </div>
    );
  };
  
  const renderEligibilityAlert = () => {
    if (isLoading) {
      return <Skeleton className="h-24 w-full" />;
    }
    
    if (canRegister) {
        return (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-300">You are eligible to register!</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                    Your membership status is 'Member', so you can register for any upcoming matches in your primary club that are not full.
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Registration Not Available</AlertTitle>
            <AlertDescription>
                You cannot register for matches because your membership status is currently '{userProfile?.memberStatus}'. It must be 'Member'. Please contact your club administrator if you believe this is an error.
            </AlertDescription>
        </Alert>
    );
  };

   const renderUpcomingMatches = () => {
    if (isMatchesLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-10 w-24" /></TableCell>
        </TableRow>
      ));
    }
    
    const availableMatches = upcomingMatches.filter(match => 
        !user || !match.registeredAnglers.includes(user.uid)
    );

    if (availableMatches.length === 0) {
        return (
             <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                    No upcoming matches available to register for in your primary club.
                </TableCell>
            </TableRow>
        )
    }

    return availableMatches.map(match => {
        const isRegistered = user ? match.registeredAnglers.includes(user.id) : false;
        const isFull = match.registeredCount >= match.capacity;
        
        return (
            <TableRow key={match.id}>
                <TableCell className="font-medium">{format(match.date, 'PPP')}</TableCell>
                <TableCell>{match.seriesName}</TableCell>
                <TableCell>{match.name}</TableCell>
                <TableCell>{match.location}</TableCell>
                <TableCell className="text-right">
                    <Button 
                        size="sm" 
                        onClick={() => handleRegister(match)}
                        disabled={!canRegister || isRegistered || isFull || isRegistering === match.id}
                    >
                       <LogIn className="mr-2 h-4 w-4" />
                       {isRegistering === match.id ? 'Registering...' : (isRegistered ? 'Registered' : (isFull ? 'Full' : 'Register'))}
                    </Button>
                </TableCell>
            </TableRow>
        )
    })
  }


  return (
    <div className="flex flex-col gap-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Register for a Match</h1>
            <p className="text-muted-foreground">Check your status and view available matches.</p>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Your Details</CardTitle>
                <CardDescription>This information determines your eligibility to register for matches in your primary club.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
               {renderUserDetails()}
               {renderEligibilityAlert()}
            </CardContent>
        </Card>

        {canRegister && (
             <Card>
                <CardHeader>
                    <CardTitle>Upcoming Matches</CardTitle>
                    <CardDescription>
                        Below is a list of upcoming matches for {clubName}.
                        <span className="block pt-2 text-xs">
                            See your PROFILE page to see a list of all matches you have registered for, and to UNREGISTER if you decide you cannot attend.
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Series</TableHead>
                                <TableHead>Match</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderUpcomingMatches()}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
