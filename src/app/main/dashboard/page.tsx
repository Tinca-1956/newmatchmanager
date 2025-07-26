
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot, collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { User, Match } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        return;
    }

    setIsLoading(true);
    const matchesQuery = query(
        collection(firestore, 'matches'),
        where('clubId', '==', userProfile.primaryClubId),
        where('status', '==', 'Upcoming'),
        orderBy('date', 'desc')
    );

    const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
        const matchesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: (doc.data().date as Timestamp).toDate(),
        } as Match));
        setUpcomingMatches(matchesData);
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

    return () => unsubscribeMatches();

  }, [userProfile, toast]);

  const renderUpcomingMatches = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
      ));
    }

    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="text-center h-24">
            No upcoming matches
          </TableCell>
        </TableRow>
      );
    }

    return upcomingMatches.map(match => (
      <TableRow key={match.id}>
        <TableCell>{format(match.date, 'E, dd MMM yyyy')}</TableCell>
        <TableCell className="font-medium">{match.name}</TableCell>
        <TableCell>{match.location}</TableCell>
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
        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle>Upcoming Matches</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Match</TableHead>
                            <TableHead>Venue</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderUpcomingMatches()}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

         {/* Pane 2 will go here */}
         {/* Pane 3 will go here */}

      </div>
    </div>
  );
}
