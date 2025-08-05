
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs, Timestamp, doc, getDoc, addDoc, writeBatch, setDoc } from 'firebase/firestore';
import type { User, Match, Club, PublicUpcomingMatch, Series } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { format } from 'date-fns';
import { sendTestEmail } from '@/lib/send-email';
import NextImage from 'next/image';
import { useAdminAuth } from '@/hooks/use-admin-auth';

export default function TestAccessPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();
  const { toast } = useToast();
  
  const [anglers, setAnglers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [matches, setMatches] = useState<Match[]>([]);
  const [isMatchLoading, setIsMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const [series, setSeries] = useState<Series[]>([]);
  const [isSeriesLoading, setIsSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  const [singleMatch, setSingleMatch] = useState<Match | null>(null);
  const [isSingleMatchLoading, setIsSingleMatchLoading] = useState(false);
  const [singleMatchError, setSingleMatchError] = useState<string | null>(null);

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isCreatingAngler, setIsCreatingAngler] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);


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
  
  const handleGetMatches = async () => {
    if (!firestore || !userProfile?.primaryClubId) {
      toast({ variant: 'destructive', title: 'Error', description: 'User profile or primary club not loaded.' });
      return;
    }

    setIsMatchLoading(true);
    setMatches([]);
    setMatchError(null);

    try {
      const matchesQuery = query(collection(firestore, 'matches'), where('clubId', '==', userProfile.primaryClubId));
      const querySnapshot = await getDocs(matchesQuery);

      if (querySnapshot.empty) {
          toast({ title: 'Match Query Succeeded', description: 'The query ran successfully but found no match documents.' });
      } else {
        const fetchedMatches = querySnapshot.docs.map(doc => {
            const data = doc.data();
            let date = data.date;
            if (date instanceof Timestamp) {
                date = date.toDate();
            }
            return {
                id: doc.id,
                ...data,
                date,
            } as Match
        });
        setMatches(fetchedMatches);
        toast({
          title: 'Success!',
          description: `Found ${fetchedMatches.length} match(es) in your primary club.`
        });
      }
    } catch (e: any) {
      console.error("Error fetching matches:", e);
      setMatchError(e.message);
      toast({
        variant: 'destructive',
        title: 'Match Query Failed',
        description: e.message,
      });
    } finally {
      setIsMatchLoading(false);
    }
  };
  
  const handleGetSeries = async () => {
    if (!firestore || !userProfile?.primaryClubId) {
      toast({ variant: 'destructive', title: 'Error', description: 'User profile or primary club not loaded.' });
      return;
    }

    setIsSeriesLoading(true);
    setSeries([]);
    setSeriesError(null);

    try {
      const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', userProfile.primaryClubId));
      const querySnapshot = await getDocs(seriesQuery);

      if (querySnapshot.empty) {
          toast({ title: 'Series Query Succeeded', description: 'The query ran successfully but found no series documents.' });
      } else {
        const fetchedSeries = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Series));
        setSeries(fetchedSeries);
        toast({
          title: 'Success!',
          description: `Found ${fetchedSeries.length} series in your primary club.`
        });
      }
    } catch (e: any) {
      console.error("Error fetching series:", e);
      setSeriesError(e.message);
      toast({
        variant: 'destructive',
        title: 'Series Query Failed',
        description: e.message,
      });
    } finally {
      setIsSeriesLoading(false);
    }
  };

  const handleGetSingleMatch = async () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore not available.' });
      return;
    }
    const matchId = "dwoFy4YJJVzLWwQqFow1";

    setIsSingleMatchLoading(true);
    setSingleMatch(null);
    setSingleMatchError(null);

    try {
      const matchDocRef = doc(firestore, 'matches', matchId);
      const docSnap = await getDoc(matchDocRef);

      if (docSnap.exists()) {
        const fetchedMatch = {
            id: docSnap.id,
            ...docSnap.data(),
            date: (docSnap.data().date as Timestamp).toDate(),
        } as Match;
        setSingleMatch(fetchedMatch);
        toast({
          title: 'Success!',
          description: `Successfully fetched single match: ${fetchedMatch.name}`
        });
      } else {
        setSingleMatchError(`A match with ID ${matchId} was not found.`);
        toast({ title: 'Query Succeeded', description: 'The query ran successfully but the match document was not found.' });
      }
    } catch (e: any) {
      console.error("Error fetching single match:", e);
      setSingleMatchError(e.message);
      toast({
        variant: 'destructive',
        title: 'Single Match Query Failed',
        description: e.message,
      });
    } finally {
      setIsSingleMatchLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'User profile not loaded.' });
        return;
    }
    setIsSendingEmail(true);
    try {
        await sendTestEmail(userProfile.email, userProfile.firstName);
        toast({
            title: 'Email Sent!',
            description: `A test email has been sent to ${userProfile.email}.`,
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Email Failed',
            description: 'Could not send the test email. Check your Resend API key and server logs.',
        });
    } finally {
        setIsSendingEmail(false);
    }
  }

  const handleCreateTestAngler = async () => {
      if (!firestore) return;
        setIsCreatingAngler(true);
        try {
            await addDoc(collection(firestore, 'users'), {
                firstName: 'Test',
                lastName: 'Angler',
                email: `test.angler.${Date.now()}@test.com`,
                role: 'Angler',
                memberStatus: 'Unverified',
                primaryClubId: userProfile?.primaryClubId || '',
            });
            toast({ title: 'Success!', description: 'Test angler added.' });
        } catch (error: any) {
            console.error('Error adding angler:', error);
            if (error.message.includes('permission-denied')) {
                 toast({ variant: 'destructive', title: 'Permission Denied', description: 'Your security rules are preventing this operation.' });
            } else {
                toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not add the angler.' });
            }
        } finally {
            setIsCreatingAngler(false);
        }
  }

  const handleSyncUpcomingMatches = async () => {
    if (!firestore) return;
    setIsSyncing(true);
    try {
        const batch = writeBatch(firestore);
        const matchesQuery = query(collection(firestore, 'matches'), where('status', 'in', ['Upcoming', 'In Progress']));
        const matchesSnapshot = await getDocs(matchesQuery);

        let count = 0;
        matchesSnapshot.forEach(matchDoc => {
            const matchData = matchDoc.data() as Match;
            const publicUpcomingRef = doc(firestore, 'publicUpcomingMatches', matchDoc.id);
            const publicData: PublicUpcomingMatch = {
                id: matchDoc.id,
                clubId: matchData.clubId,
                seriesId: matchData.seriesId,
                seriesName: matchData.seriesName,
                name: matchData.name,
                location: matchData.location,
                date: matchData.date,
                drawTime: matchData.drawTime,
                startTime: matchData.startTime,
                endTime: matchData.endTime,
                status: matchData.status,
            };
            batch.set(publicUpcomingRef, publicData);
            count++;
        });

        await batch.commit();
        toast({ title: 'Sync Complete', description: `${count} upcoming matches have been synchronized to the public collection.` });

    } catch (error) {
        console.error("Error syncing upcoming matches:", error);
        toast({ variant: 'destructive', title: 'Sync Failed', description: 'Could not sync upcoming matches.' });
    } finally {
        setIsSyncing(false);
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
        <h1 className="text-3xl font-bold tracking-tight">Test Access & Utilities</h1>
        <p className="text-muted-foreground">A page to test permissions and run admin utilities.</p>
      </div>

      {isSiteAdmin && (
          <Card>
              <CardHeader>
                  <CardTitle>Site Admin Utilities</CardTitle>
                  <CardDescription>One-off actions to manage application data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="space-y-2 rounded-md border p-4">
                      <h3 className="font-semibold mb-2">Sync Public Upcoming Matches</h3>
                      <p className="text-sm text-muted-foreground pb-4">
                          This will read all matches from the private 'matches' collection and create/overwrite entries in the 'publicUpcomingMatches' collection for any match with a status of "Upcoming" or "In Progress". Run this once to populate the public dashboard for the first time.
                      </p>
                      <Button onClick={handleSyncUpcomingMatches} disabled={isSyncing}>
                          {isSyncing ? 'Syncing...' : 'Run Upcoming Match Sync'}
                      </Button>
                  </div>
              </CardContent>
          </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Core Permission Test</CardTitle>
          <CardDescription>
            This page runs specific queries to diagnose permission issues.
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
                    Click to test fetching users in your primary club.
                </p>
                <Button onClick={handleGetAnglers} disabled={isLoading || authLoading || !userProfile}>
                    {isLoading ? 'Fetching Users...' : 'Run User Test Query'}
                </Button>

                {error && (
                    <Alert variant="destructive" className="mt-4">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Firestore Error (Users)</AlertTitle>
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
                        </div>
                    ) : anglers.length > 0 ? (
                        <ul className="list-disc pl-5 pt-2 text-sm">
                            {anglers.map(angler => (
                                <li key={angler.id}>{angler.firstName} {angler.lastName} ({angler.email})</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground pt-2">No users fetched yet. Run the query.</p>
                    )}
                </div>
           </div>

           <div className="space-y-2 rounded-md border p-4">
                <h3 className="font-semibold mb-2">Step 3: Query for Series in Your Club</h3>
                <p className="text-sm text-muted-foreground pb-4">
                    Click to test fetching series in your primary club.
                </p>
                <Button onClick={handleGetSeries} disabled={isSeriesLoading || authLoading || !userProfile}>
                    {isSeriesLoading ? 'Fetching Series...' : 'Run Series Test Query'}
                </Button>

                {seriesError && (
                    <Alert variant="destructive" className="mt-4">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Firestore Error (Series)</AlertTitle>
                        <AlertDescription>
                            {seriesError}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="pt-4">
                    <h4 className="font-semibold">Results:</h4>
                    {isSeriesLoading ? (
                        <div className="space-y-2 pt-2">
                            <Skeleton className="h-6 w-full" />
                        </div>
                    ) : series.length > 0 ? (
                        <ul className="list-disc pl-5 pt-2 text-sm">
                            {series.map(s => (
                                <li key={s.id}>{s.name}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground pt-2">No series fetched yet. Run the query.</p>
                    )}
                </div>
           </div>

            <div className="space-y-2 rounded-md border p-4">
                <h3 className="font-semibold mb-2">Step 4: Query for Matches in Your Club</h3>
                <p className="text-sm text-muted-foreground pb-4">
                    This is the critical test. Click to run the same query the Matches page uses.
                </p>
                <Button onClick={handleGetMatches} disabled={isMatchLoading || authLoading || !userProfile}>
                    {isMatchLoading ? 'Fetching Matches...' : 'Run Match Test Query'}
                </Button>

                {matchError && (
                    <Alert variant="destructive" className="mt-4">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Firestore Error (Matches)</AlertTitle>
                        <AlertDescription>
                            {matchError}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="pt-4">
                    <h4 className="font-semibold">Results:</h4>
                    {isMatchLoading ? (
                        <div className="space-y-2 pt-2">
                            <Skeleton className="h-6 w-full" />
                        </div>
                    ) : matches.length > 0 ? (
                        <ul className="list-disc pl-5 pt-2 text-sm">
                            {matches.map(match => (
                                <li key={match.id}>{match.name} on {format(match.date as Date, 'PPP')}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground pt-2">No matches fetched yet. Run the query.</p>
                    )}
                </div>
           </div>
           
           <div className="space-y-2 rounded-md border p-4">
                <h3 className="font-semibold mb-2">Step 5: Query for a Single Match Document</h3>
                <p className="text-sm text-muted-foreground pb-4">
                    This tests direct document access. Click to fetch a specific match.
                </p>
                <Button onClick={handleGetSingleMatch} disabled={isSingleMatchLoading}>
                    {isSingleMatchLoading ? 'Fetching Match...' : 'Run Single Match Query'}
                </Button>

                {singleMatchError && (
                    <Alert variant="destructive" className="mt-4">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Firestore Error (Single Match)</AlertTitle>
                        <AlertDescription>
                            {singleMatchError}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="pt-4">
                    <h4 className="font-semibold">Results:</h4>
                    {isSingleMatchLoading ? (
                        <div className="space-y-2 pt-2">
                            <Skeleton className="h-6 w-full" />
                        </div>
                    ) : singleMatch ? (
                        <ul className="list-disc pl-5 pt-2 text-sm">
                           <li>{singleMatch.name} at {singleMatch.location}</li>
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground pt-2">No match fetched yet. Run the query.</p>
                    )}
                </div>
           </div>

           <div className="space-y-2 rounded-md border p-4">
                <h3 className="font-semibold mb-2">Step 6: Send a Test Email</h3>
                <p className="text-sm text-muted-foreground pb-4">
                    Click this button to send a test email to yourself to verify the Resend integration.
                </p>
                <Button onClick={handleSendTestEmail} disabled={isSendingEmail || authLoading || !userProfile}>
                    {isSendingEmail ? 'Sending...' : 'Send Test Email'}
                </Button>
            </div>

            <div className="space-y-2 rounded-md border p-4">
                <h3 className="font-semibold mb-2">Step 7: Create an Unverified Angler (Test)</h3>
                 <p className="text-sm text-muted-foreground pb-4">
                    This uses the same logic as the Seed Data page to try and add a new user.
                </p>
                <Button onClick={handleCreateTestAngler} disabled={isCreatingAngler || authLoading || !userProfile}>
                    {isCreatingAngler ? 'Adding Angler...' : 'Add Test Angler'}
                </Button>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
