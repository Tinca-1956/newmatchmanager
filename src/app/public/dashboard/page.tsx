'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase-client';
import { collection, query, orderBy, getDocs, where, Timestamp } from 'firebase/firestore';
import type { Club, Match, Result, MatchStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy as TrophyIcon } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
};


export default function PublicDashboardPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentMatchDetails, setRecentMatchDetails] = useState<{
    name: string;
    seriesName: string;
    paidPlaces: number;
    images: string[];
  } | null>(null);

  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Fetch clubs
  useEffect(() => {
    if (!firestore) return;
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
      setIsLoadingClubs(false);
    }, (error) => {
      console.error("Error fetching clubs:", error);
      setIsLoadingClubs(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch data when a club is selected
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      setUpcomingMatches([]);
      setRecentResults([]);
      setRecentMatchDetails(null);
      return;
    }

    const processClubData = async () => {
      setIsLoadingMatches(true);
      setIsLoadingResults(true);

      const matchesQuery = query(
        collection(firestore, 'matches'),
        where('clubId', '==', selectedClubId),
        orderBy('date', 'desc')
      );
      
      const matchesSnapshot = await getDocs(matchesQuery);
      const matchesData = matchesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id, ...data, date: (data.date as Timestamp).toDate()
          } as Match
      });

      // Upcoming matches
      const upcoming = matchesData
          .filter(m => ['Upcoming', 'In Progress'].includes(getCalculatedStatus(m)))
          .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
      setUpcomingMatches(upcoming);
      setIsLoadingMatches(false);

      // Recent results
      const completed = matchesData
          .filter(m => m.status === 'Completed');

      if (completed.length > 0) {
        const recentMatch = completed[0];
        setRecentMatchDetails({
            name: recentMatch.name,
            seriesName: recentMatch.seriesName,
            paidPlaces: recentMatch.paidPlaces || 0,
            images: recentMatch.mediaUrls || [],
        });

        const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', recentMatch.id), orderBy('position', 'asc'));
        const resultsSnapshot = await getDocs(resultsQuery);
        const resultsData = resultsSnapshot.docs.map(doc => doc.data() as Result);
        setRecentResults(resultsData);
      } else {
        setRecentResults([]);
        setRecentMatchDetails(null);
      }
      setIsLoadingResults(false);
    };

    processClubData();
  }, [selectedClubId]);

  const handleClubChange = (clubId: string) => {
    setSelectedClubId(clubId);
    const club = clubs.find(c => c.id === clubId);
    setSelectedClub(club || null);
  };

  const renderUpcomingMatches = () => {
    if (isLoadingMatches) return Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow>);
    if (upcomingMatches.length === 0) return <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No upcoming matches for this club.</TableCell></TableRow>;
    return upcomingMatches.map(match => (
      <TableRow key={match.id}>
        <TableCell>
            <div className="flex flex-col">
                <span>{format(match.date as Date, 'dd/MM/yyyy')}</span>
                <span className="text-xs text-muted-foreground">{match.seriesName}</span>
            </div>
        </TableCell>
        <TableCell className="font-medium">{match.name.includes("Round") ? `${match.name} at ${match.location}` : match.name}</TableCell>
        <TableCell>
             <div className="flex items-center gap-2">
                <span>{match.location}</span>
                {match.googleMapsLink && <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4 text-primary" /></Link>}
            </div>
        </TableCell>
      </TableRow>
    ));
  };
  
  const renderRecentResults = () => {
    if (isLoadingResults) return Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>);
    if (recentResults.length === 0) return <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No recent results found.</TableCell></TableRow>;
    
    return recentResults.slice(0, 5).map(result => {
        const isPaidPlace = result.position !== null && (recentMatchDetails?.paidPlaces || 0) > 0 && result.position <= (recentMatchDetails?.paidPlaces || 0);
        return (
            <TableRow key={result.userId} className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}>
                <TableCell className="font-medium w-12">{result.position || '-'}</TableCell>
                <TableCell>{formatAnglerName(result.userName)}</TableCell>
                <TableCell className="text-right">{result.weight.toFixed(3)}kg</TableCell>
            </TableRow>
        );
    });
  };
  
  const renderImageGallery = () => {
    if (isLoadingResults) return <Skeleton className="w-full h-full min-h-[200px]" />;
    if (!recentMatchDetails?.images || recentMatchDetails.images.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
            </div>
        )
    }
    return (
      <Carousel opts={{ align: "start", loop: true }} className="w-full">
        <CarouselContent className="-ml-1">
          {recentMatchDetails.images.map((url, index) => (
            <CarouselItem key={index} className="pl-1">
              <div className="relative aspect-square w-full">
                <NextImage src={url} alt={`Match image ${index + 1}`} fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit: 'contain' }} className="rounded-md"/>
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
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-10">
            <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
                <Link href="#" className="flex items-center gap-2 text-lg font-semibold md:text-base">
                <TrophyIcon className="h-6 w-6" />
                <span>Match Manager</span>
                </Link>
            </nav>
            <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
                <Button asChild>
                    <Link href="/auth/login">Sign In</Link>
                </Button>
            </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="grid gap-4">
                 <div>
                    <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
                    <p className="text-muted-foreground">
                    Welcome to Match Manager. Select a club to see their public data.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <Label htmlFor="club-select">Select a Club</Label>
                        <Select onValueChange={handleClubChange} disabled={isLoadingClubs}>
                            <SelectTrigger id="club-select">
                                <SelectValue placeholder={isLoadingClubs ? "Loading clubs..." : "Choose a club"} />
                            </SelectTrigger>
                            <SelectContent>
                                {clubs.map(club => (
                                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {!selectedClubId ? (
                    <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm h-96">
                        <div className="flex flex-col items-center gap-1 text-center">
                            <h3 className="text-2xl font-bold tracking-tight">
                            Select a Club
                            </h3>
                            <p className="text-sm text-muted-foreground">
                            Choose a club from the dropdown to view their dashboard.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-4">
                        <Card className="lg:col-span-2">
                            <CardHeader><CardTitle>Upcoming Matches</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date &amp; Series</TableHead>
                                            <TableHead>Match</TableHead>
                                            <TableHead>Venue</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>{renderUpcomingMatches()}</TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle>Recent Results</CardTitle>
                                <CardDescription>{isLoadingResults ? <Skeleton className="h-5 w-48" /> : (recentMatchDetails?.name || "No completed matches")}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Pos</TableHead>
                                            <TableHead>Angler</TableHead>
                                            <TableHead className="text-right">Weight</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>{renderRecentResults()}</TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle>Recent Photos</CardTitle>
                                <CardDescription>{isLoadingResults ? <Skeleton className="h-5 w-32" /> : "From the last match"}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                {renderImageGallery()}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </main>
    </div>
  );
}

    