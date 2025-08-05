
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import { collection, onSnapshot, query, where, getDocs, orderBy, Timestamp, limit } from 'firebase/firestore';
import type { Match, Club, Result } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';

const getCalculatedStatus = (match: Match) => {
  const now = new Date();
  
  let matchDate: Date;
    if (match.date instanceof Timestamp) {
        matchDate = match.date.toDate();
    } else if (match.date instanceof Date) {
        matchDate = match.date;
    } else {
        return match.status;
    }
  
  if (!match.drawTime || !match.endTime || !match.drawTime.includes(':') || !match.endTime.includes(':')) {
    return match.status;
  }

  const [drawHours, drawMinutes] = match.drawTime.split(':').map(Number);
  const drawDateTime = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate(), drawHours, drawMinutes);

  const [endHours, endMinutes] = match.endTime.split(':').map(Number);
  const endDateTime = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate(), endHours, endMinutes);
  
  const weighInProgressUntil = new Date(endDateTime.getTime() + 90 * 60 * 1000);

  if (match.status === 'Cancelled') return 'Cancelled';
  if (now > weighInProgressUntil) return 'Completed';
  if (now > endDateTime) return 'Weigh-in';
  if (now > drawDateTime) return 'In Progress';
  
  return 'Upcoming';
};

function PublicDashboard() {
  const { toast } = useToast();
  
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null);
  const [lastCompletedMatch, setLastCompletedMatch] = useState<Match | null>(null);
  
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);

  // Effect to fetch the list of clubs for the dropdown
  useEffect(() => {
    if (!firestore) return;
    
    setIsLoadingClubs(true);
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
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch the list of clubs.' });
        setIsLoadingClubs(false);
    });
    return () => unsubscribe();
  }, [toast, selectedClubId]);

  // Effect to fetch match data when a club is selected
  useEffect(() => {
    if (!selectedClubId || !firestore) {
        setIsLoadingMatches(false);
        return;
    };
    
    setIsLoadingMatches(true);
    setUpcomingMatch(null);
    setLastCompletedMatch(null);

    const matchesQuery = query(
        collection(firestore, 'matches'),
        where('clubId', '==', selectedClubId)
    );

    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
        const matchesData = snapshot.docs.map(doc => {
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
        
        // Process matches in code to avoid complex queries
        const upcoming = matchesData
            .filter(match => ['Upcoming', 'In Progress'].includes(getCalculatedStatus(match)))
            .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
            
        const completed = matchesData
            .filter(match => match.status === 'Completed')
            .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());

        setUpcomingMatch(upcoming.length > 0 ? upcoming[0] : null);
        setLastCompletedMatch(completed.length > 0 ? completed[0] : null);
        
        setIsLoadingMatches(false);
    }, (error) => {
        console.error("Error fetching match data:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load match data for this club. Please check permissions.'
        });
        setIsLoadingMatches(false);
    });

    return () => unsubscribe();
  }, [selectedClubId, toast]);

  const renderUpcomingMatch = () => {
    if (isLoadingMatches) {
      return <Skeleton className="h-48 w-full" />;
    }
    if (!upcomingMatch) {
      return (
        <Card className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">No upcoming matches for this club.</p>
        </Card>
      );
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>{upcomingMatch.name}</CardTitle>
          <CardDescription>
            {upcomingMatch.seriesName} - {format(upcomingMatch.date as Date, 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Location</span>
            <div className="flex items-center gap-2 font-medium">
              <span>{upcomingMatch.location}</span>
               {upcomingMatch.googleMapsLink && (
                  <Link href={upcomingMatch.googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                  </Link>
                )}
            </div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Registration</span>
            <span className="font-medium">{upcomingMatch.registeredCount} / {upcomingMatch.capacity}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline">{getCalculatedStatus(upcomingMatch)}</Badge>
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
      return <Skeleton className="h-24 w-full" />;
    }
    if (!lastCompletedMatch) {
      return (
         <Card className="flex items-center justify-center h-24">
            <p className="text-muted-foreground">No completed matches found for this club.</p>
        </Card>
      );
    }
    return (
       <Card>
        <CardHeader>
          <CardTitle>{lastCompletedMatch.name}</CardTitle>
           <CardDescription>
            {lastCompletedMatch.seriesName} - {format(lastCompletedMatch.date as Date, 'PPP')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-muted/40 p-4 sm:p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Match Manager</h1>
          <p className="text-muted-foreground mt-2">Public Club Dashboard</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
                <Label htmlFor="club-filter">Select a Club</Label>
                <Select
                    value={selectedClubId}
                    onValueChange={setSelectedClubId}
                    disabled={isLoadingClubs || clubs.length === 0}
                >
                    <SelectTrigger id="club-filter">
                        <SelectValue placeholder="Loading clubs..." />
                    </SelectTrigger>
                    <SelectContent>
                        {clubs.map(club => (
                            <SelectItem key={club.id} value={club.id}>
                                {club.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Next Upcoming Match</h2>
            {renderUpcomingMatch()}
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Last Completed Match</h2>
             {renderLastCompletedMatch()}
          </div>
        </div>
      </div>
    </main>
  );
}

export default PublicDashboard;
