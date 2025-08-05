
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { firestore } from '@/lib/firebase-client';
import { collection, query, onSnapshot, getDocs, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Club, Match } from '@/lib/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';


export default function PublicDashboard() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);

  const [upcomingMatch, setUpcomingMatch] = useState<Match | null | undefined>(undefined); // undefined means loading
  const [lastCompletedMatch, setLastCompletedMatch] = useState<Match | null | undefined>(undefined); // undefined means loading
  
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore) {
        setIsLoadingClubs(false);
        return;
    }
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setClubs(clubsData);
        if (clubsData.length > 0 && !selectedClubId) {
            setSelectedClubId(clubsData[0].id);
        }
        setIsLoadingClubs(false);
    }, (error) => {
        console.error("Error fetching clubs: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
        setIsLoadingClubs(false);
    });
    return () => unsubscribe();
  }, [toast, selectedClubId]);

  useEffect(() => {
    if (!selectedClubId || !firestore) {
      setUpcomingMatch(null);
      setLastCompletedMatch(null);
      return;
    }

    setUpcomingMatch(undefined); // Set to loading state
    setLastCompletedMatch(undefined); // Set to loading state

    const matchesQuery = query(
      collection(firestore, 'matches'),
      where('clubId', '==', selectedClubId)
    );

    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
        const allMatches = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: (data.date as Timestamp).toDate(),
            } as Match;
        });

        // Filter for upcoming matches
        const upcoming = allMatches
            .filter(m => m.status === 'Upcoming')
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        setUpcomingMatch(upcoming.length > 0 ? upcoming[0] : null);

        // Filter for completed matches
        const completed = allMatches
            .filter(m => m.status === 'Completed')
            .sort((a, b) => b.date.getTime() - a.date.getTime());
        setLastCompletedMatch(completed.length > 0 ? completed[0] : null);

    }, (error) => {
        console.error("Error fetching matches:", error);
        toast({
            variant: 'destructive',
            title: 'Error Fetching Matches',
            description: 'Could not load match data for this club. You may not have the required permissions.',
        });
        setUpcomingMatch(null); // Error state
        setLastCompletedMatch(null); // Error state
    });

    return () => unsubscribe();
  }, [selectedClubId, toast]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Public Dashboard</CardTitle>
          <CardDescription>View upcoming matches and recent results from clubs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="club-select">Select a Club</Label>
            {isLoadingClubs ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                <SelectTrigger id="club-select" className="w-full">
                  <SelectValue placeholder="Select a club..." />
                </SelectTrigger>
                <SelectContent>
                  {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Next Upcoming Match</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingMatch === undefined ? (
            <Skeleton className="h-6 w-full" />
          ) : upcomingMatch ? (
             <div>
              <p className="font-semibold">{upcomingMatch.name} at {upcomingMatch.location}</p>
              <p className="text-sm text-muted-foreground">{format(upcomingMatch.date, 'PPPP')}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No upcoming matches for this club.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last Completed Match</CardTitle>
        </CardHeader>
        <CardContent>
           {lastCompletedMatch === undefined ? (
            <Skeleton className="h-6 w-full" />
          ) : lastCompletedMatch ? (
             <div>
              <p className="font-semibold">{lastCompletedMatch.name} at {lastCompletedMatch.location}</p>
              <p className="text-sm text-muted-foreground">{format(lastCompletedMatch.date, 'PPPP')}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No completed matches found for this club.</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
