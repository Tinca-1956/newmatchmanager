
'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase-client';
import {
  collection,
  query,
  where,
  Timestamp,
  getDocs,
  onSnapshot,
  doc,
  orderBy,
} from 'firebase/firestore';
import type { Club, Match, Result, MatchStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy as TrophyIcon, Fish, LogIn, Swords, Shield, Users } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';


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
  const { toast } = useToast();
  
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);

  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentMatchName, setRecentMatchName] = useState<string>('');
  const [recentSeriesName, setRecentSeriesName] = useState<string>('');
  const [recentMatchLocation, setRecentMatchLocation] = useState<string>('');
  const [recentMatchPaidPlaces, setRecentMatchPaidPlaces] = useState<number>(0);
  const [recentMatchImages, setRecentMatchImages] = useState<string[]>([]);
  const [recentMatchId, setRecentMatchId] = useState<string | null>(null);

  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Effect to fetch the list of clubs
  useEffect(() => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not initialized.' });
      setIsLoadingClubs(false);
      return;
    }

    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
      setIsLoadingClubs(false);
      if (clubsData.length > 0 && !selectedClubId) {
          setSelectedClubId(clubsData[0].id);
      }
    }, (error) => {
      console.error("Error fetching clubs: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs from the database.' });
      setIsLoadingClubs(false);
    });

    return () => unsubscribe();
  }, [toast, selectedClubId]);


  useEffect(() => {
    if (!selectedClubId || !firestore) {
        setIsLoadingMatches(false);
        setIsLoadingResults(false);
        setUpcomingMatches([]);
        setRecentResults([]);
        return;
    }

    const processMatches = async () => {
        setIsLoadingMatches(true);
        setIsLoadingResults(true);

        const allMatchesQuery = query(
            collection(firestore, 'matches'),
            where('clubId', '==', selectedClubId)
        );

        const allMatchesSnapshot = await getDocs(allMatchesQuery);
        const matchesData = allMatchesSnapshot.docs.map(doc => {
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
        
        // --- Filter for Upcoming Matches display ---
        const trulyUpcoming = matchesData
            .filter(match => ['Upcoming', 'In Progress'].includes(getCalculatedStatus(match)))
            .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
        
        setUpcomingMatches(trulyUpcoming);
        setIsLoadingMatches(false);

        // --- Filter for Recent Results display ---
        const completedMatches = matchesData
            .filter(match => match.status === 'Completed')
            .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());
        
        if (completedMatches.length > 0) {
            const recentMatch = completedMatches[0];
            setRecentMatchId(recentMatch.id);
            setRecentMatchName(recentMatch.name);
            setRecentSeriesName(recentMatch.seriesName);
            setRecentMatchLocation(recentMatch.location);
            setRecentMatchPaidPlaces(recentMatch.paidPlaces || 0);
            setRecentMatchImages(recentMatch.mediaUrls || []);
            
            const resultsQuery = query(
                collection(firestore, 'results'),
                where('matchId', '==', recentMatch.id)
            );
            const resultsSnapshot = await getDocs(resultsQuery);
            const resultsData = resultsSnapshot.docs.map(d => d.data() as Result);
            
            const anglersWithWeight = resultsData
                .filter(r => r.status === 'OK' && r.weight > 0)
                .sort((a, b) => b.weight - a.weight);

            const lastRankedPosition = anglersWithWeight.length;
            const didNotWeighRank = lastRankedPosition + 1;

            const finalResults = resultsData.map(result => {
                if (['DNW', 'DNF', 'DSQ'].includes(result.status || '')) {
                    return { ...result, position: didNotWeighRank };
                }
                const rankedIndex = anglersWithWeight.findIndex(r => r.userId === result.userId);
                if (rankedIndex !== -1) {
                    return { ...result, position: rankedIndex + 1 };
                }
                if(result.status === 'OK' && result.weight === 0) {
                    return { ...result, position: didNotWeighRank };
                }
                return result;
            });
            
            const sortedResults = finalResults.sort((a, b) => (a.position || 999) - (b.position || 999));
            setRecentResults(sortedResults);

        } else {
            setRecentResults([]);
            setRecentMatchId(null);
            setRecentMatchName('');
            setRecentSeriesName('');
            setRecentMatchLocation('');
            setRecentMatchImages([]);
        }
        setIsLoadingResults(false);
    };

    processMatches();

  }, [selectedClubId, toast]);

  const handleGoToMatch = (matchId: string | null) => {
    if (matchId) {
      setIsModalOpen(true);
    }
  };

  const renderUpcomingMatches = () => {
    if (isLoadingMatches) {
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
            No upcoming matches scheduled for this club.
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
                    <span className="text-xs text-muted-foreground block">{getCalculatedStatus(match)}</span>
                </div>
                {match.googleMapsLink && (
                  <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                  </Link>
                )}
            </div>
        </TableCell>
        <TableCell className="text-right">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => handleGoToMatch(match.id)}>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Sign in to view match details</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
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
                    <p>No recent results found for this club.</p>
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
  
    const renderCardView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 md:col-span-2">
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
                    <Button onClick={() => handleGoToMatch(recentMatchId)} variant="outline" className="w-full">
                        Sign in to view match details
                        <ArrowRight className="ml-2 h-4 w-4" />
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
    );
  };
  
    const renderDesktopView = () => (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                        <Button onClick={() => handleGoToMatch(recentMatchId)} variant="outline" className="w-full">
                            Sign in to view match details
                            <ArrowRight className="ml-2 h-4 w-4" />
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
    );

    if (!hasMounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-8 w-3/4" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="lg:col-span-2 h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }


  return (
    <>
    <main className="flex-1 flex flex-col bg-muted/40 p-4 md:p-10">
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Fish className="h-10 w-10 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Match Manager</h1>
                        <p className="text-muted-foreground">The best way to manage your fishing matches</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Link href="/auth/register">
                        <Button variant="outline">Create Account</Button>
                    </Link>
                    <Link href="/auth/login">
                        <Button>
                            <LogIn className="mr-2 h-4 w-4" />
                            Sign In
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="club-filter">View Club</Label>
                    <Select 
                        value={selectedClubId} 
                        onValueChange={(value) => setSelectedClubId(value)}
                        disabled={isLoadingClubs || clubs.length === 0}
                    >
                        <SelectTrigger id="club-filter" className="w-[200px]">
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
                </div>
            </div>
        </div>
        
        <div className="mt-8">
           {isMobile ? renderCardView() : renderDesktopView()}
        </div>
         <footer className="text-center mt-12 py-4 text-sm text-muted-foreground border-t">
          Copyright EMANCIUM 2025 - All rights reserved
        </footer>
    </main>
     <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Registration Required</DialogTitle>
            <DialogDescription>
                Please sign in or create an account to view match details and register for matches.
            </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
                <Button asChild>
                   <Link href="/auth/login">Sign In</Link>
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
