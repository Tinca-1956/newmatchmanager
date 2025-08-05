
'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase-client';
import { collection, query, orderBy, getDocs, onSnapshot, where, Timestamp } from 'firebase/firestore';
import type { Club, Match, Result } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy as TrophyIcon, LogIn } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);

  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentMatchName, setRecentMatchName] = useState<string>('');
  const [recentSeriesName, setRecentSeriesName] = useState<string>('');
  const [recentMatchLocation, setRecentMatchLocation] = useState<string>('');
  const [recentMatchPaidPlaces, setRecentMatchPaidPlaces] = useState<number>(0);
  const [recentMatchImages, setRecentMatchImages] = useState<string[]>([]);
  const [recentMatchId, setRecentMatchId] = useState<string | null>(null);


  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(true);

   // Effect to fetch the list of clubs
  useEffect(() => {
    if (!firestore) {
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
      setIsLoadingClubs(false);
    });

    return () => unsubscribe();
  }, []);

  const renderUpcomingMatches = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
      ));
    }

    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
            No upcoming matches scheduled.
          </TableCell>
        </TableRow>
      );
    }

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
                <div>
                    <span>{match.location}</span>
                    <span className="text-xs text-muted-foreground block">{match.status}</span>
                </div>
                {match.googleMapsLink && (
                  <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                  </Link>
                )}
            </div>
        </TableCell>
        <TableCell className="text-right">
             <Button variant="ghost" size="icon" asChild>
                <Link href="/auth/login">
                    <LogIn className="h-4 w-4" />
                </Link>
            </Button>
        </TableCell>
      </TableRow>
    ));
  };
  
  const renderRecentResults = () => {
    if (isLoadingResults) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        </TableRow>
      ));
    }

    if (recentResults.length === 0) {
      return (
        <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <TrophyIcon className="h-8 w-8" />
                    <p>No recent results found.</p>
                </div>
            </TableCell>
        </TableRow>
      );
    }

    return recentResults.map(result => {
        const isPaidPlace = result.position !== null && recentMatchPaidPlaces > 0 && result.position <= recentMatchPaidPlaces;
        return (
            <TableRow 
                key={result.userId}
                className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}
            >
                <TableCell>
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                    {result.position || '-'}
                    </div>
                </TableCell>
                <TableCell className="font-medium">{formatAnglerName(result.userName)}</TableCell>
                <TableCell className="text-muted-foreground">{result.weight.toFixed(3)}kg</TableCell>
                <TableCell>
                    <Badge variant={result.status === 'OK' ? 'outline' : 'secondary'}>{result.status}</Badge>
                </TableCell>
            </TableRow>
        );
    });
  };
  
  const recentResultsTitle = recentSeriesName && recentMatchName ? `${recentSeriesName} - ${recentMatchName}` : 'Last completed match'

  const renderImageGallery = () => {
    if (isLoadingResults) {
        return <Skeleton className="w-full h-full min-h-[200px]" />
    }
    if (recentMatchImages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
            </div>
        )
    }
    return (
      <Carousel
        opts={{
            align: "start",
            loop: true,
        }}
         className="w-full"
      >
        <CarouselContent className="-ml-1">
          {recentMatchImages.map((url, index) => (
            <CarouselItem key={index} className="pl-1">
              <div className="relative aspect-square w-full">
                <NextImage
                  src={url}
                  alt={`Recent match image ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  style={{ objectFit: 'contain' }}
                  className="rounded-md"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-6 md:gap-10">
            <Link href="#" className="flex items-center space-x-2">
              <TrophyIcon className="h-6 w-6" />
              <span className="inline-block font-bold">Match Manager</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
             <Button asChild>
                <Link href="/auth/login">
                    Sign In
                    <LogIn className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </div>
        </div>
      </header>
       <main className="flex-1 p-4 lg:p-6">
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
                    <p className="text-muted-foreground">
                    Welcome! Select a club to see their matches and results.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="club-select" className="text-nowrap">Viewing Club</Label>
                    {isLoadingClubs ? <Skeleton className="h-10 w-48" /> : (
                        <Select value={selectedClubId || ''} onValueChange={setSelectedClubId}>
                            <SelectTrigger id="club-select" className="w-48">
                                <SelectValue placeholder="Select a club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {clubs.map(club => (
                                    <SelectItem key={club.id} value={club.id}>
                                        {club.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-4">
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
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderUpcomingMatches()}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Recent Results</CardTitle>
                        {isLoadingResults ? (
                            <Skeleton className="h-5 w-48" />
                        ) : (
                            <CardDescription>{recentResults.length > 0 ? recentResultsTitle : "No completed matches"}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Pos</TableHead>
                                    <TableHead>Angler</TableHead>
                                    <TableHead>Weight</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderRecentResults()}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {recentMatchId && (
                        <CardFooter>
                            <Button variant="outline" className="w-full" asChild>
                                <Link href="/auth/login">
                                    Sign in for more details
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    )}
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Recent Photos</CardTitle>
                        {isLoadingResults ? (
                            <Skeleton className="h-5 w-32" />
                        ) : (
                            <CardDescription>{recentMatchImages.length > 0 ? "From the last match" : "No recent photos"}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center">
                        {renderImageGallery()}
                    </CardContent>
                </Card>
            </div>
            </div>
       </main>
       <footer className="text-center p-4 text-sm text-muted-foreground border-t">
          Copyright EMANCIUM 2025 - All rights reserved
        </footer>
    </div>
  );
}
