
'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { Club, Match, Result, MatchStatus } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy as TrophyIcon } from 'lucide-react';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

// Helper function to format angler names
const formatAnglerName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return fullName;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    return `${firstName.charAt(0)}. ${lastName}`;
}

function PublicDashboardPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);

  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentMatch, setRecentMatch] = useState<Match | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New state to ensure dependent queries don't run prematurely
  const [isReadyForDataFetch, setIsReadyForDataFetch] = useState(false);


  // Step 1: Fetch all clubs for the dropdown
  useEffect(() => {
    if (!firestore) return;
    
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
      
      // Set the first club as default only if one hasn't been selected
      if (clubsData.length > 0 && !selectedClubId) {
        setSelectedClubId(clubsData[0].id);
      }
      setIsLoadingClubs(false);
      setIsReadyForDataFetch(true); // Ready to fetch other data now
    }, (error) => {
        console.error("Error fetching clubs:", error);
        setIsLoadingClubs(false);
    });

    return () => unsubscribe();
  }, [selectedClubId]); // Depend on selectedClubId to prevent re-setting it on every render


  // Step 2: Fetch upcoming matches for the selected club
  useEffect(() => {
    if (!isReadyForDataFetch || !selectedClubId || !firestore) {
      setUpcomingMatches([]);
      return;
    };
    
    setIsLoadingUpcoming(true);
    
    const upcomingMatchesQuery = query(
      collection(firestore, 'matches'),
      where('clubId', '==', selectedClubId),
      where('status', '==', 'Upcoming'),
      limit(5)
    );
    
    const unsubscribe = onSnapshot(upcomingMatchesQuery, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Match));
      // Sort client-side
      matchesData.sort((a, b) => a.date.getTime() - b.date.getTime());
      setUpcomingMatches(matchesData);
      setIsLoadingUpcoming(false);
    }, (error) => {
      console.error("Error fetching upcoming matches:", error);
      setIsLoadingUpcoming(false);
    });

    return () => unsubscribe();
  }, [selectedClubId, isReadyForDataFetch]);

  // Step 3: Fetch recent results for the selected club
  useEffect(() => {
    if (!isReadyForDataFetch || !selectedClubId || !firestore) {
      setRecentResults([]);
      setRecentMatch(null);
      return;
    }
    
    setIsLoadingResults(true);

    const fetchResults = async () => {
        try {
            // Find the last completed match
            const completedMatchesQuery = query(
                collection(firestore, 'matches'),
                where('clubId', '==', selectedClubId),
                where('status', '==', 'Completed'),
                limit(1)
            );
            const matchesSnapshot = await getDocs(completedMatchesQuery);
            
            if (matchesSnapshot.empty) {
                setRecentResults([]);
                setRecentMatch(null);
                setIsLoadingResults(false);
                return;
            }
            
            const lastMatchDoc = matchesSnapshot.docs[0];
            const lastMatch = { 
                id: lastMatchDoc.id, 
                ...lastMatchDoc.data(),
                date: (lastMatchDoc.data().date as Timestamp).toDate()
            } as Match;
            setRecentMatch(lastMatch);
            
            // Fetch results for that match
            const resultsQuery = query(
                collection(firestore, 'results'),
                where('matchId', '==', lastMatch.id),
                orderBy('position', 'asc')
            );
            const resultsSnapshot = await getDocs(resultsQuery);
            const resultsData = resultsSnapshot.docs.map(doc => doc.data() as Result);
            
            setRecentResults(resultsData);
        } catch (error) {
            console.error("Error fetching recent results:", error);
        } finally {
            setIsLoadingResults(false);
        }
    };
    
    fetchResults();

  }, [selectedClubId, isReadyForDataFetch]);
  

  const renderUpcomingMatches = () => {
    if (isLoadingUpcoming) {
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
            No upcoming matches found for this club.
          </TableCell>
        </TableRow>
      );
    }
    return upcomingMatches.map(match => (
      <TableRow key={match.id}>
        <TableCell>
            <div className="flex flex-col">
                <span>{format(match.date, 'dd/MM/yyyy')}</span>
                <span className="text-xs text-muted-foreground">{match.seriesName}</span>
            </div>
        </TableCell>
        <TableCell className="font-medium">{match.name}</TableCell>
        <TableCell>
             <div className="flex items-center gap-2">
                <span>{match.location}</span>
                {match.googleMapsLink && (
                  <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                  </Link>
                )}
            </div>
        </TableCell>
        <TableCell className="text-right">
            <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(true)}>
                <ArrowRight className="h-4 w-4" />
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
                    <p>No recent results found for this club.</p>
                </div>
            </TableCell>
        </TableRow>
      );
    }
    return recentResults.map(result => {
        const isPaidPlace = result.position !== null && (recentMatch?.paidPlaces ?? 0) > 0 && result.position <= (recentMatch?.paidPlaces ?? 0);
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
  
  const renderImageGallery = () => {
    if (isLoadingResults) {
        return <Skeleton className="w-full h-full min-h-[200px]" />
    }
    if (!recentMatch?.mediaUrls || recentMatch.mediaUrls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
            </div>
        )
    }
    return (
      <Carousel
        opts={{ align: "start", loop: true }}
         className="w-full"
      >
        <CarouselContent className="-ml-1">
          {recentMatch.mediaUrls.map((url, index) => (
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
  };
  
  const recentResultsTitle = recentMatch ? `${recentMatch.seriesName} - ${recentMatch.name}` : 'Last completed match';

  return (
    <div className="bg-muted/40 min-h-screen">
      <header className="bg-background shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Match Manager</h1>
            <div className="flex items-center gap-4">
               {isLoadingClubs ? (
                 <Skeleton className="h-10 w-48" />
               ) : (
                <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select a club..." />
                    </SelectTrigger>
                    <SelectContent>
                        {clubs.map(club => (
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
      </header>

      <main className="container mx-auto p-4 lg:p-6">
        <div className="flex flex-col gap-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Public Dashboard</h2>
                <p className="text-muted-foreground">
                    An overview of the selected club&apos;s activities.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
                <div className="lg:col-span-1 xl:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Upcoming Matches</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date &amp; Series</TableHead>
                                        <TableHead>Match</TableHead>
                                        <TableHead>Venue</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {renderUpcomingMatches()}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 xl:col-span-1">
                    <Card className="flex flex-col h-full">
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
                         {recentMatch && (
                            <CardFooter>
                                <Button onClick={() => setIsModalOpen(true)} variant="outline" className="w-full">
                                    Go to Match
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>

                <div className="lg:col-span-1 xl:col-span-1">
                    <Card className="flex flex-col h-full">
                        <CardHeader>
                            <CardTitle>Recent Photos</CardTitle>
                            {isLoadingResults ? (
                                <Skeleton className="h-5 w-32" />
                            ) : (
                                <CardDescription>{recentMatch?.mediaUrls?.length ? "From the last match" : "No recent photos"}</CardDescription>
                            )}
                        </CardHeader>
                        <CardContent className="flex-grow flex items-center justify-center">
                            {renderImageGallery()}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Sign in Required</DialogTitle>
                <DialogDescription>
                    Please sign in to view match details and register for matches.
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
    </div>
  );
}

// Suspense Boundary for search params
export default function PublicDashboardPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PublicDashboardPage />
    </Suspense>
  )
}
