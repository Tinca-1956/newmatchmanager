
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, query, where, orderBy, Timestamp, limit, getDocs } from 'firebase/firestore';
import type { Club, Match } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Link from 'next/link';

export default function PublicDashboardPage() {
  const { toast } = useToast();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);

  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);

  // Effect to fetch the list of clubs
  useEffect(() => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore not available.' });
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
        console.error("Error fetching clubs: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
        setIsLoadingClubs(false);
    });

    return () => unsubscribe();
  }, [toast]);

  // Effect to fetch the upcoming match for the selected club
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      setUpcomingMatch(null);
      return;
    }

    const fetchMatch = async () => {
      setIsLoadingMatch(true);
      setUpcomingMatch(null);

      try {
        const matchesQuery = query(
          collection(firestore, 'matches'),
          where('clubId', '==', selectedClubId),
          where('status', '==', 'Upcoming')
        );

        const querySnapshot = await getDocs(matchesQuery);
        
        const upcomingMatches = querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: (data.date as Timestamp).toDate(),
                } as Match;
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        if (upcomingMatches.length > 0) {
            setUpcomingMatch(upcomingMatches[0]);
        }

      } catch (error) {
        console.error("Error fetching match data:", error);
        toast({
          variant: 'destructive',
          title: 'Error Loading Match',
          description: 'Could not load match data for this club. You may not have the required permissions.',
        });
      } finally {
        setIsLoadingMatch(false);
      }
    };
    
    fetchMatch();
  }, [selectedClubId, toast]);

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          Match Manager
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          The central hub for your angling club's activities.
        </p>
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
                <Link href="/auth/login" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 md:py-4 md:text-lg md:px-10">
                    Sign In
                </Link>
            </div>
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                 <Link href="/auth/register" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary bg-gray-100 hover:bg-gray-200 md:py-4 md:text-lg md:px-10">
                    Register
                </Link>
            </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Public Dashboard</CardTitle>
          <CardDescription>Select a club to view public match information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="space-y-2">
                <Label htmlFor="club-select">Select a Club</Label>
                {isLoadingClubs ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                        <SelectTrigger id="club-select">
                            <SelectValue placeholder="Select a club..." />
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

            <div>
              <h3 className="text-lg font-medium">Next Upcoming Match</h3>
               <div className="mt-4 border rounded-lg p-4 min-h-[100px]">
                {isLoadingMatch ? (
                   <div className="space-y-3">
                      <Skeleton className="h-5 w-3/5" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                ) : upcomingMatch ? (
                   <div>
                      <p className="font-semibold text-lg">{upcomingMatch.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {upcomingMatch.seriesName} at {upcomingMatch.location}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(upcomingMatch.date, 'eeee, MMMM do, yyyy')}
                      </p>
                   </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center pt-5">
                    {selectedClubId ? 'No upcoming matches for this club.' : 'Please select a club.'}
                  </p>
                )}
               </div>
            </div>

        </CardContent>
      </Card>

    </div>
  );
}
