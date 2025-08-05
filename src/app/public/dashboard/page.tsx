
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import type { Club, Match } from '@/lib/types';
import { format } from 'date-fns';
import { MapPin, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PublicDashboard() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);

  const [nextUpcomingMatch, setNextUpcomingMatch] = useState<Match | null>(null);
  const [lastCompletedMatch, setLastCompletedMatch] = useState<Match | null>(null);
  
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all clubs once
  useEffect(() => {
    if (!firestore) {
      setIsLoadingClubs(false);
      return;
    };
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
      if (clubsData.length > 0 && !selectedClubId) {
        setSelectedClubId(clubsData[0].id);
      }
      setIsLoadingClubs(false);
    }, (error) => {
      console.error("Error fetching clubs:", error);
      setError("Could not load club information.");
      setIsLoadingClubs(false);
    });

    return () => unsubscribe();
  }, [selectedClubId]);

  // Fetch matches when a club is selected
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      setNextUpcomingMatch(null);
      setLastCompletedMatch(null);
      return;
    }

    setIsLoadingMatches(true);
    setError(null);
    setNextUpcomingMatch(null);
    setLastCompletedMatch(null);
    
    const matchesQuery = query(
      collection(firestore, 'matches'),
      where('clubId', '==', selectedClubId)
    );

    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
        const allMatches = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: (doc.data().date as Timestamp).toDate(),
        } as Match));
        
        // Filter and sort for the next upcoming match
        const upcoming = allMatches
            .filter(m => m.status === 'Upcoming')
            .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
        setNextUpcomingMatch(upcoming.length > 0 ? upcoming[0] : null);

        // Filter and sort for the last completed match
        const completed = allMatches
            .filter(m => m.status === 'Completed')
            .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());
        setLastCompletedMatch(completed.length > 0 ? completed[0] : null);
        
        setIsLoadingMatches(false);
    }, (err) => {
        console.error("Error fetching match data:", err);
        setError("Could not load match data for this club.");
        setIsLoadingMatches(false);
    });

    return () => unsubscribe();
  }, [selectedClubId]);


  const renderUpcomingMatch = () => {
    if (isLoadingMatches) {
        return <Skeleton className="h-20 w-full" />;
    }
    if (error) {
        return <p className="text-destructive">{error}</p>;
    }
    if (!nextUpcomingMatch) {
      return <p className="text-sm text-center text-muted-foreground pt-4">No upcoming matches scheduled for this club.</p>;
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{nextUpcomingMatch.name}</CardTitle>
          <CardDescription>{nextUpcomingMatch.seriesName}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date:</span>
            <span>{format(nextUpcomingMatch.date as Date, 'PPP')}</span>
          </div>
          <div className="flex justify-between items-center">
             <span className="text-muted-foreground">Venue:</span>
             <div className="flex items-center gap-2">
                <span>{nextUpcomingMatch.location}</span>
                {nextUpcomingMatch.googleMapsLink && (
                  <Link href={nextUpcomingMatch.googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                  </Link>
                )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
            <Button asChild className="w-full">
                <Link href="/auth/login">
                    Login to Register
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </CardFooter>
      </Card>
    );
  };
  
  const renderLastCompletedMatch = () => {
    if (isLoadingMatches) {
        return <Skeleton className="h-20 w-full" />;
    }
    if (error) {
        return <p className="text-destructive">{error}</p>;
    }
    if (!lastCompletedMatch) {
      return <p className="text-sm text-center text-muted-foreground pt-4">No recently completed matches found.</p>;
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{lastCompletedMatch.name}</CardTitle>
          <CardDescription>{lastCompletedMatch.seriesName}</CardDescription>
        </CardHeader>
         <CardContent className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date:</span>
            <span>{format(lastCompletedMatch.date as Date, 'PPP')}</span>
          </div>
           <div className="flex justify-between items-center">
             <span className="text-muted-foreground">Venue:</span>
             <span>{lastCompletedMatch.location}</span>
          </div>
        </CardContent>
        <CardFooter>
            <Button asChild className="w-full">
                <Link href="/auth/login">
                    Login for Full Results
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <main className="flex-1 bg-muted/40 p-4 md:p-10">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Match Dashboard</h1>
          <p className="text-lg text-muted-foreground mt-2">
            View upcoming matches and recent results from local clubs.
          </p>
        </header>

        <section className="mb-12">
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <Label htmlFor="club-select" className="text-lg font-semibold">Select a Club</Label>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
        </section>

        <section className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Next Upcoming Match</h2>
              {renderUpcomingMatch()}
            </div>
            <div>
                <h2 className="text-2xl font-bold tracking-tight mb-4">Last Completed Match</h2>
                {renderLastCompletedMatch()}
            </div>
        </section>
      </div>
    </main>
  );
}
