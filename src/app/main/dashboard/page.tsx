
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot, collection, query, where, Timestamp, orderBy, limit, getDocs } from 'firebase/firestore';
import type { User, Match, MatchStatus, Result } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const getCalculatedStatus = (match: Match): MatchStatus => {
  const now = new Date();
  
  if (!(match.date instanceof Date)) {
    // If it's still a Timestamp, convert it. If it's invalid, return original status.
    if (match.date && typeof (match.date as any).toDate === 'function') {
      match.date = (match.date as Timestamp).toDate();
    } else {
      return match.status;
    }
  }

  const matchDate = new Date(match.date);

  const [drawHours, drawMinutes] = match.drawTime.split(':').map(Number);
  const drawDateTime = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate(), drawHours, drawMinutes);

  const [endHours, endMinutes] = match.endTime.split(':').map(Number);
  const endDateTime = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate(), endHours, endMinutes);
  
  const weighInProgressUntil = new Date(endDateTime.getTime() + 90 * 60 * 1000);

  if (now > weighInProgressUntil) return 'Completed';
  if (now > endDateTime) return 'Weigh-in';
  if (now > drawDateTime) return 'In Progress';
  
  return 'Upcoming';
};

const formatAnglerName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    if (parts.length < 2) return fullName;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return `${firstName.charAt(0)}. ${lastName}`;
}


export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentMatchName, setRecentMatchName] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(true);

  useEffect(() => {
    if (!user || !firestore) {
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as User);
      }
    });

    return () => unsubscribeUser();
  }, [user]);

  useEffect(() => {
    if (!userProfile?.primaryClubId || !firestore) {
        setIsLoading(false);
        setIsLoadingResults(false);
        return;
    }

    setIsLoading(true);
    // Query all matches for the club that are not cancelled or completed
    // We will calculate the exact status on the client.
    const matchesQuery = query(
        collection(firestore, 'matches'),
        where('clubId', '==', userProfile.primaryClubId),
        where('status', 'in', ['Upcoming', 'In Progress', 'Weigh-in'])
    );

    const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
        const matchesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: (doc.data().date as Timestamp).toDate(),
        } as Match));
        
        // Filter for truly upcoming matches and calculate status on client
        const trulyUpcoming = matchesData.map(match => ({
          ...match,
          calculatedStatus: getCalculatedStatus(match),
        })).filter(match => match.calculatedStatus === 'Upcoming');

        // Sort matches on the client-side by date
        trulyUpcoming.sort((a, b) => a.date.getTime() - b.date.getTime());
        setUpcomingMatches(trulyUpcoming);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching upcoming matches: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch upcoming matches.'
        });
        setIsLoading(false);
    });

    // Fetch Recent Results
    const fetchRecentResults = async () => {
        if (!userProfile.primaryClubId || !firestore) return;
        setIsLoadingResults(true);

        // 1. Find the most recent completed match
        const recentMatchQuery = query(
            collection(firestore, 'matches'),
            where('clubId', '==', userProfile.primaryClubId),
            where('status', '==', 'Completed'),
            orderBy('date', 'desc'),
            limit(1)
        );

        try {
            const recentMatchSnapshot = await getDocs(recentMatchQuery);
            if (recentMatchSnapshot.empty) {
                setRecentResults([]);
                setIsLoadingResults(false);
                return;
            }

            const recentMatch = recentMatchSnapshot.docs[0].data() as Match;
            setRecentMatchName(recentMatch.name);
            const matchId = recentMatchSnapshot.docs[0].id;

            // 2. Fetch results for that match
            const resultsQuery = query(
                collection(firestore, 'results'),
                where('matchId', '==', matchId),
                orderBy('position', 'asc')
            );
            
            const resultsSnapshot = await getDocs(resultsQuery);
            const resultsData = resultsSnapshot.docs.map(doc => doc.data() as Result);
            setRecentResults(resultsData);
        } catch (error) {
            console.error("Error fetching recent results:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch recent results.'});
        } finally {
            setIsLoadingResults(false);
        }
    };

    fetchRecentResults();


    return () => unsubscribeMatches();

  }, [userProfile, toast]);

  const renderUpcomingMatches = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
        </TableRow>
      ));
    }

    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="text-center h-24">
            No upcoming matches
          </TableCell>
        </TableRow>
      );
    }

    return upcomingMatches.map(match => (
      <TableRow key={match.id}>
        <TableCell>
            <div className="flex flex-col">
                <span>{format(match.date, 'dd/MM/yyyy')}</span>
                <span className="text-xs text-muted-foreground">{match.seriesName}</span>
            </div>
        </TableCell>
        <TableCell className="font-medium">{match.name}</TableCell>
        <TableCell>
             <div className="flex flex-col">
                <span>{match.location}</span>
                <span className="text-xs text-muted-foreground">{match.status}</span>
            </div>
        </TableCell>
      </TableRow>
    ));
  };
  
  const renderRecentResults = () => {
    if (isLoadingResults) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
        </TableRow>
      ));
    }

    if (recentResults.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={2} className="text-center h-24">
            No recent results found.
          </TableCell>
        </TableRow>
      );
    }

    return recentResults.map(result => (
      <TableRow key={result.userId}>
        <TableCell><Badge variant="secondary">{result.position}</Badge></TableCell>
        <TableCell className="font-medium">{formatAnglerName(result.userName)}</TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {userProfile?.firstName || 'Angler'}. Here&apos;s what&apos;s happening in
          your club.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Upcoming Matches</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date &amp; Series</TableHead>
                            <TableHead>Match</TableHead>
                            <TableHead>Venue &amp; Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderUpcomingMatches()}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle>Recent Results</CardTitle>
                 {isLoadingResults ? (
                    <Skeleton className="h-5 w-32" />
                ) : (
                    <CardDescription>{recentMatchName || 'Last completed match'}</CardDescription>
                )}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">Pos</TableHead>
                            <TableHead>Angler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderRecentResults()}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}

    