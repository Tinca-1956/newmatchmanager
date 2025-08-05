
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, query, where, getDocs, doc, orderBy, Timestamp } from 'firebase/firestore';
import type { Match, Club, Series, Result, MatchStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import { MapPin, Trophy, ImageIcon, ArrowRight, Fish } from 'lucide-react';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

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
    const router = useRouter();

    const [clubs, setClubs] = useState<Club[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [isClubReady, setIsClubReady] = useState(false);

    const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
    const [recentResults, setRecentResults] = useState<Result[]>([]);
    const [recentMatchDetails, setRecentMatchDetails] = useState<Match | null>(null);

    const [isLoadingClubs, setIsLoadingClubs] = useState(true);
    const [isLoadingMatches, setIsLoadingMatches] = useState(false);
    const [isLoadingResults, setIsLoadingResults] = useState(false);

    // Step 1: Fetch clubs and set a default
    useEffect(() => {
        if (!firestore) return;

        setIsLoadingClubs(true);
        const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
        const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setClubs(clubsData);
            if (clubsData.length > 0 && !selectedClubId) {
                setSelectedClubId(clubsData[0].id);
                setIsClubReady(true); // Signal that we are ready to fetch dependent data
            }
            setIsLoadingClubs(false);
        }, (error) => {
            console.error("Error fetching clubs:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs list.' });
            setIsLoadingClubs(false);
        });

        return () => unsubscribe();
    }, [toast, selectedClubId]);

    // Step 2: Fetch matches and results *only after* a club is selected
    useEffect(() => {
        if (!isClubReady || !selectedClubId || !firestore) {
            return;
        }

        setIsLoadingMatches(true);
        setIsLoadingResults(true);

        // Fetch matches for the selected club - WITHOUT server-side sorting
        const matchesQuery = query(collection(firestore, 'matches'), where('clubId', '==', selectedClubId));
        
        const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
            const matchesData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: (data.date as Timestamp).toDate(),
                } as Match;
            });
            
            // Client-side filtering and sorting
            const upcoming = matchesData
                .filter(m => ['Upcoming', 'In Progress'].includes(getCalculatedStatus(m)))
                .sort((a, b) => a.date.getTime() - b.date.getTime());
                
            const completed = matchesData
                .filter(m => getCalculatedStatus(m) === 'Completed')
                .sort((a, b) => b.date.getTime() - a.date.getTime());

            setUpcomingMatches(upcoming);
            
            if (completed.length > 0) {
                const latestCompletedMatch = completed[0];
                setRecentMatchDetails(latestCompletedMatch);
                // Now fetch results for this specific match
                const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', latestCompletedMatch.id));
                const unsubscribeResults = onSnapshot(resultsQuery, (resultsSnapshot) => {
                    const resultsData = resultsSnapshot.docs.map(doc => doc.data() as Result);
                    const sortedResults = resultsData.sort((a, b) => (a.position || 999) - (b.position || 999));
                    setRecentResults(sortedResults);
                    setIsLoadingResults(false);
                });
                // This is a nested subscription, which is fine for this case.
                // It will be cleaned up when the parent (matches) subscription is cleaned up.
                return () => unsubscribeResults();
            } else {
                setRecentMatchDetails(null);
                setRecentResults([]);
                setIsLoadingResults(false);
            }
            setIsLoadingMatches(false);
        }, (error) => {
            console.error("Error fetching matches:", error);
            toast({ variant: 'destructive', title: 'Error', description: `Cannot fetch matches. ${error.message}` });
            setIsLoadingMatches(false);
        });

        return () => unsubscribeMatches();

    }, [isClubReady, selectedClubId, toast]);

    const handleGoToMatch = (matchId: string) => {
        router.push(`/main/matches?matchId=${matchId}`);
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
                        <span>{format(match.date, 'dd/MM/yy')}</span>
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
                    <Button variant="ghost" size="icon" onClick={() => handleGoToMatch(match.id)}>
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
                            <Trophy className="h-8 w-8" />
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
        if (!recentMatchDetails?.mediaUrls || recentMatchDetails.mediaUrls.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
                    <p className="text-xs text-muted-foreground">An admin can upload photos from the matches page.</p>
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
            {recentMatchDetails.mediaUrls.map((url, index) => (
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
    
    if (isLoadingClubs) {
      return (
         <div className="flex min-h-screen w-full items-center justify-center">
             <div className="flex flex-col items-center gap-4">
                <Fish className="h-12 w-12 animate-pulse text-primary" />
                <p className="text-muted-foreground">Finding clubs...</p>
             </div>
         </div>
      );
    }

    return (
    <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b bg-background">
            <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
                <div className="flex gap-2 items-center">
                    <Fish className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">Public Dashboard</h1>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-4">
                    <div className="w-full flex-1 md:w-auto md:flex-none">
                         <div className="flex items-center gap-2">
                            <Label htmlFor="club-filter" className="text-nowrap font-semibold">Viewing Club:</Label>
                            <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
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
            </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
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
                        <CardDescription>
                            {recentMatchDetails ? `${recentMatchDetails.name} on ${format(recentMatchDetails.date as Date, 'dd/MM/yy')}` : 'Last completed match'}
                        </CardDescription>
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
                    {recentMatchDetails && (
                        <CardFooter>
                            <Button onClick={() => handleGoToMatch(recentMatchDetails.id)} variant="outline" className="w-full">
                                View Full Results
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
                            <CardDescription>{recentMatchDetails?.mediaUrls?.length ? "From the last match" : "No recent photos"}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center">
                        {renderImageGallery()}
                    </CardContent>
                </Card>
            </div>
        </main>
    </div>
    );
}
