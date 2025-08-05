
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Trophy, Calendar, MapPin, Users, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs, orderBy, limit, Timestamp, onSnapshot } from 'firebase/firestore';
import type { Club, Match } from '@/lib/types';
import { format } from 'date-fns';

export default function PublicDashboardPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not initialized.' });
      setIsLoadingClubs(false);
      return;
    }

    setIsLoadingClubs(true);
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setClubs(clubsData);
        setIsLoadingClubs(false);
    }, (error) => {
        console.error("Error fetching clubs:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs list.' });
        setIsLoadingClubs(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      setUpcomingMatch(null);
      return;
    }

    const fetchNextMatch = async () => {
      setIsLoadingMatch(true);
      setUpcomingMatch(null);
      try {
        const matchesQuery = query(
          collection(firestore, 'matches'),
          where('clubId', '==', selectedClubId),
          where('status', '==', 'Upcoming'),
          orderBy('date', 'asc'),
          limit(1)
        );

        const matchSnapshot = await getDocs(matchesQuery);

        if (!matchSnapshot.empty) {
          const matchDoc = matchSnapshot.docs[0];
          const matchData = matchDoc.data();
          setUpcomingMatch({
            id: matchDoc.id,
            ...matchData,
            date: (matchData.date as Timestamp).toDate(),
          } as Match);
        } else {
          setUpcomingMatch(null); // Explicitly set to null if no match is found
        }
      } catch (error) {
        console.error("Error fetching next match:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load match data for this club. You may not have the required permissions.' });
      } finally {
        setIsLoadingMatch(false);
      }
    };
    
    fetchNextMatch();

  }, [selectedClubId, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Public Dashboard</CardTitle>
          <CardDescription>View upcoming events and results.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="club-select">Select a Club</Label>
                {isLoadingClubs ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                        <SelectTrigger id="club-select">
                            <SelectValue placeholder="Select a club to view details..." />
                        </SelectTrigger>
                        <SelectContent>
                            {clubs.map((club) => (
                                <SelectItem key={club.id} value={club.id}>
                                    {club.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
            
            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Next Upcoming Match</h3>
                {isLoadingMatch ? (
                    <Card>
                        <CardContent className="p-6 space-y-4">
                           <Skeleton className="h-6 w-3/4" />
                           <Skeleton className="h-4 w-1/2" />
                           <Skeleton className="h-4 w-1/2" />
                        </CardContent>
                    </Card>
                ) : upcomingMatch ? (
                    <Card className="border-primary">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />{upcomingMatch.name}</CardTitle>
                            <CardDescription>{upcomingMatch.seriesName}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-2 text-sm">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{format(upcomingMatch.date, 'eeee, dd MMMM yyyy')}</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{upcomingMatch.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{upcomingMatch.registeredCount} / {upcomingMatch.capacity} registered</span>
                            </div>
                        </CardContent>
                    </Card>
                ) : selectedClubId ? (
                     <p className="text-center text-muted-foreground py-6">No upcoming matches for this club.</p>
                ) : (
                    <p className="text-center text-muted-foreground py-6">Please select a club to see the next match.</p>
                )}
            </div>

        </CardContent>
        <CardFooter className="flex justify-end">
          <Button asChild>
            <Link href="/auth/login">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
