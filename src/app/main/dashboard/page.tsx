
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import type { Match, Result, User } from '@/lib/types';
import { format } from 'date-fns';

interface UpcomingMatch extends Match {
  // Keeping this interface separate in case we need to add more dashboard-specific fields
}

interface RecentResult extends Result {
    seriesName: string;
    venue: string;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
    const [recentResults, setRecentResults] = useState<RecentResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || !firestore) {
            setIsLoading(false);
            return;
        }

        const userDocRef = collection(firestore, 'users');
        const userQuery = query(userDocRef, where('id', '==', user.uid), limit(1));
        
        const unsubscribeUser = onSnapshot(query(collection(firestore, 'users'), where('__name__', '==', user.uid)), (snapshot) => {
             if (!snapshot.empty) {
                const profile = snapshot.docs[0].data() as User;
                setUserProfile(profile);
             }
        });

        return () => unsubscribeUser();

    }, [user]);

    useEffect(() => {
        if (!userProfile?.primaryClubId || !firestore) {
            if(userProfile) setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const now = new Date();

        // Query for upcoming matches
        const matchesQuery = query(
            collection(firestore, 'matches'),
            where('clubId', '==', userProfile.primaryClubId),
            where('date', '>=', now),
            orderBy('date', 'asc'),
            limit(5)
        );

        const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
            const matchesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as Timestamp).toDate(),
            } as UpcomingMatch));
            setUpcomingMatches(matchesData);
        }, (err) => {
            console.error("Error fetching matches:", err);
        });

        // Query for recent results
        const resultsQuery = query(
            collection(firestore, 'results'),
            where('clubId', '==', userProfile.primaryClubId),
            orderBy('date', 'desc'),
            limit(10)
        );

        const unsubscribeResults = onSnapshot(resultsQuery, async (snapshot) => {
             const resultsData = snapshot.docs.map(doc => ({
                ...doc.data(),
                date: (doc.data().date as Timestamp).toDate(),
            } as RecentResult));
            
            // Note: This is simplified. In a real app, you might need to fetch match/series details
            // if they are not denormalized into the result document.
            // For now, we assume venue/seriesName might be part of the Result, or we fake it.
            const enhancedResults = resultsData.map(r => ({
                ...r,
                seriesName: r.seriesName || 'Unknown Series',
                venue: 'Unknown Venue' // Placeholder
            }))

            setRecentResults(enhancedResults);
            setIsLoading(false);
        }, (err) => {
             console.error("Error fetching results:", err);
             setIsLoading(false);
        });


        return () => {
            unsubscribeMatches();
            unsubscribeResults();
        };

    }, [userProfile]);

    const renderUpcomingMatches = () => {
        if (isLoading) {
            return Array.from({length: 3}).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
            ))
        }

        if (upcomingMatches.length === 0) {
            return <TableRow><TableCell colSpan={4} className="text-center h-24">No upcoming matches scheduled.</TableCell></TableRow>
        }

        return upcomingMatches.map((match) => (
            <TableRow key={match.id}>
                <TableCell className="font-medium">{match.seriesName}</TableCell>
                <TableCell>{format(match.date, 'PPP')}</TableCell>
                <TableCell>{match.location}</TableCell>
                <TableCell><Badge variant="outline">{match.status}</Badge></TableCell>
            </TableRow>
        ));
    };

    const renderRecentResults = () => {
        if (isLoading) {
            return Array.from({length: 5}).map((_, i) => (
                 <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
            ))
        }

        if (recentResults.length === 0) {
            return <TableRow><TableCell colSpan={4} className="text-center h-24">No recent results found.</TableCell></TableRow>
        }

        return recentResults.slice(0, 5).map((result) => (
            <TableRow key={`${result.matchId}-${result.userId}`}>
                <TableCell>{format(result.date, 'PPP')}</TableCell>
                <TableCell className="font-medium">{result.userName}</TableCell>
                <TableCell>{result.position}</TableCell>
                <TableCell>{result.weight.toFixed(2)} kg</TableCell>
            </TableRow>
        ));
    }


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userProfile?.firstName || 'Angler'}. Here's what's happening in your club.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Matches</CardTitle>
            <CardDescription>
              Your next 5 matches in your primary club.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Series</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Venue</TableHead>
                        <TableHead>Status</TableHead>
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
            <CardDescription>
              Top results from the last few matches.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Angler</TableHead>
                        <TableHead>Pos.</TableHead>
                        <TableHead>Weight</TableHead>
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
