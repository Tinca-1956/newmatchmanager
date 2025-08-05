
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { collection, query, where, getDocs, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import type { Club, Match, Result, MatchStatus } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowRight, ImageIcon, MapPin, TrophyIcon } from 'lucide-react';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { DialogFooter } from '@/components/ui/dialog';


const getCalculatedStatus = (match: Match): MatchStatus => {
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

const formatAnglerName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return fullName;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    return `${firstName.charAt(0)}. ${lastName}`;
}


export default function PublicDashboardPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentMatchDetails, setRecentMatchDetails] = useState<Match | null>(null);
  
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(true);
  
  const [isClubReady, setIsClubReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);

  // Step 1: Fetch clubs and set a default selection
  useEffect(() => {
    if (!firestore) {
      console.error("Firestore not initialized");
      setIsLoadingClubs(false);
      return;
    }
    
    const clubsQuery = query(collection(firestore, 'clubs'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
      
      if (clubsData.length > 0 && !selectedClubId) {
        setSelectedClubId(clubsData[0].id);
        setIsClubReady(true); // Gate is now open
      }
      setIsLoadingClubs(false);
    }, (error) => {
      console.error("Error fetching clubs: ", error);
      setIsLoadingClubs(false);
    });

    return () => unsubscribe();
  }, []); // Runs only once

  // Step 2: Fetch matches ONLY when a club is ready
  useEffect(() => {
    if (!isClubReady || !selectedClubId || !firestore) {
      return;
    }
    
    setIsLoadingMatches(true);
    const matchesQuery = query(
        collection(firestore, 'matches'),
        where('clubId', '==', selectedClubId)
    );
    
    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      const matchesData = snapshot.docs
        .map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data, date: (data.date as Timestamp).toDate() } as Match;
        })
        .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());

      const upcoming = matchesData.filter(m => ['Upcoming', 'In Progress'].includes(getCalculatedStatus(m)));
      setUpcomingMatches(upcoming);
      setIsLoadingMatches(false);
    }, (error) => {
        console.error("Error fetching matches: ", error);
        setIsLoadingMatches(false);
    });

    return () => unsubscribe();
  }, [isClubReady, selectedClubId]);

  // Step 3: Fetch results ONLY when a club is ready
  useEffect(() => {
    if (!isClubReady || !selectedClubId || !firestore) {
      return;
    }

    setIsLoadingResults(true);
    const matchesQuery = query(
        collection(firestore, 'matches'),
        where('clubId', '==', selectedClubId),
        where('status', '==', 'Completed')
    );

    const unsubscribe = onSnapshot(matchesQuery, async (matchesSnapshot) => {
        const completedMatches = matchesSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Match))
            .sort((a, b) => (b.date as Timestamp).toDate().getTime() - (a.date as Timestamp).toDate().getTime());

        if (completedMatches.length > 0) {
            const latestMatch = completedMatches[0];
            setRecentMatchDetails(latestMatch);
            
            const resultsQuery = query(
                collection(firestore, 'results'),
                where('matchId', '==', latestMatch.id)
            );
            const resultsSnapshot = await getDocs(resultsQuery);
            const resultsData = resultsSnapshot.docs
                .map(d => d.data() as Result)
                .sort((a, b) => (a.position || 999) - (b.position || 999));
            setRecentResults(resultsData);
        } else {
            setRecentMatchDetails(null);
            setRecentResults([]);
        }
        setIsLoadingResults(false);
    }, (error) => {
        console.error("Error fetching results: ", error);
        setIsLoadingResults(false);
    });

    return () => unsubscribe();
  }, [isClubReady, selectedClubId]);

  const isLoading = isLoadingClubs || (!isClubReady && (isLoadingMatches || isLoadingResults));
  
   if (isLoading) {
     return (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle className="text-center">Welcome to Match Manager</DialogTitle>
                <DialogDescription className="text-center">
                    Please wait while we load the match data...
                </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center items-center p-8">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
                </div>
                 <DialogFooter>
                    <div className="w-full text-center text-xs text-muted-foreground">
                        <p>Having trouble? Try refreshing the page.</p>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
     );
   }

  const renderUpcomingMatches = () => {
    if (isLoadingMatches) {
      return <TableRow><TableCell colSpan={3}><Skeleton className="h-20 w-full" /></TableCell></TableRow>;
    }
    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
            No upcoming matches found for this club.
          </TableCell>
        </TableRow>
      );
    }
    return upcomingMatches.map(match => (
      <TableRow key={match.id}>
        <TableCell>
            <div className="font-medium">{format(match.date, 'dd/MM/yyyy')}</div>
            <div className="text-sm text-muted-foreground">{match.seriesName}</div>
        </TableCell>
        <TableCell>
            <div className="font-medium">{match.name}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />{match.location}
            </div>
        </TableCell>
        <TableCell className="text-right">
            <Button asChild variant="outline" size="sm">
                <Link href="/auth/login">Sign In to Register</Link>
            </Button>
        </TableCell>
      </TableRow>
    ));
  };

  const renderRecentResults = () => {
     if (isLoadingResults) {
      return <TableRow><TableCell colSpan={3}><Skeleton className="h-20 w-full" /></TableCell></TableRow>;
    }
    if (recentResults.length === 0) {
      return (
         <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <TrophyIcon className="h-8 w-8" />
                  <p>No recent results found for this club.</p>
              </div>
          </TableCell>
        </TableRow>
      );
    }
    const paidPlaces = recentMatchDetails?.paidPlaces || 0;
    return recentResults.map(result => {
       const isPaidPlace = result.position !== null && paidPlaces > 0 && result.position <= paidPlaces;
      return (
         <TableRow key={result.userId} className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}>
          <TableCell className="font-medium">{result.position}</TableCell>
          <TableCell>{formatAnglerName(result.userName)}</TableCell>
          <TableCell className="text-right">{result.weight.toFixed(3)}kg</TableCell>
        </TableRow>
      );
    });
  };

  const renderImageGallery = () => {
    if (isLoadingResults) {
        return <Skeleton className="aspect-video w-full" />
    }
    if (!recentMatchDetails?.mediaUrls || recentMatchDetails.mediaUrls.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
        </div>
      );
    }
    return (
       <Carousel className="w-full">
        <CarouselContent>
          {recentMatchDetails.mediaUrls.map((url, index) => (
            <CarouselItem key={index}>
              <div className="relative aspect-video">
                <NextImage
                  src={url}
                  alt={`Recent match image ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="rounded-lg object-cover"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    );
  };

  return (
    <div className="min-h-screen bg-muted/40">
        <header className="bg-background border-b">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight">Public Dashboard</h1>
                    <div className="flex items-center gap-4">
                        {isLoadingClubs ? <Skeleton className="h-10 w-48" /> : (
                             <Select value={selectedClubId || ''} onValueChange={setSelectedClubId}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Select Club" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clubs.map((club) => (
                                        <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <Button asChild>
                           <Link href="/auth/login">Sign In</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </header>

        <main className="container mx-auto p-4 sm:px-6 lg:px-8 grid gap-8">
             <Card>
                <CardHeader>
                    <CardTitle>Upcoming Matches</CardTitle>
                    <CardDescription>Register for an upcoming match.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Date & Series</TableHead>
                            <TableHead>Match & Venue</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderUpcomingMatches()}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-8">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Recent Results</CardTitle>
                        <CardDescription>
                            {recentMatchDetails ? `${recentMatchDetails.name} on ${format(recentMatchDetails.date as Date, 'dd/MM/yy')}` : 'Last completed match'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Pos</TableHead>
                                    <TableHead>Angler</TableHead>
                                    <TableHead className="text-right">Weight</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderRecentResults()}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Photos</CardTitle>
                        <CardDescription>Photos from the last completed match.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderImageGallery()}
                    </CardContent>
                </Card>
            </div>
        </main>
         <footer className="text-center p-4 text-sm text-muted-foreground border-t mt-8">
            <p>Copyright EMANCIUM 2025 - All rights reserved</p>
            <p>To have your club added, please contact the site administrator.</p>
        </footer>
    </div>
  );
}
