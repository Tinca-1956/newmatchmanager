
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy as TrophyIcon, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, doc, query, where, getDocs, getDoc, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import type { Club, Match, Result, MatchStatus } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [isLoadingClubs, setIsLoadingClubs] = useState(true);
    const [isClubReady, setIsClubReady] = useState(false);

    const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
    const [recentMatchDetails, setRecentMatchDetails] = useState<Match | null>(null);
    const [recentResults, setRecentResults] = useState<Result[]>([]);

    const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(false);
    const [isLoadingRecent, setIsLoadingRecent] = useState(false);

    // Step 1: Fetch all clubs to populate the selector
    useEffect(() => {
        if (!firestore) return;
        setIsLoadingClubs(true);
        const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
        const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setAllClubs(clubsData);
            if (clubsData.length > 0 && !selectedClubId) {
                setSelectedClubId(clubsData[0].id); // Set default club
            }
            setIsLoadingClubs(false);
        }, (error) => {
            console.error("Error fetching clubs:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
            setIsLoadingClubs(false);
        });

        return () => unsubscribe();
    }, [toast, selectedClubId]);

    // Step 2: Once a club is selected, mark it as "ready" for other queries
    useEffect(() => {
        if (selectedClubId) {
            setIsClubReady(true);
        }
    }, [selectedClubId]);

    // Step 3: Fetch all data for the selected club *only after* it's ready
    useEffect(() => {
        if (!isClubReady || !firestore) return;

        const processMatches = async () => {
            setIsLoadingUpcoming(true);
            setIsLoadingRecent(true);

            // This is the query that requires the index. We will sort on the client.
            const allMatchesQuery = query(
                collection(firestore, 'matches'),
                where('clubId', '==', selectedClubId)
            );

            try {
                const allMatchesSnapshot = await getDocs(allMatchesQuery);
                const matchesData = allMatchesSnapshot.docs.map(doc => {
                    const data = doc.data();
                    let date = data.date;
                    if (date instanceof Timestamp) { date = date.toDate(); }
                    return { id: doc.id, ...data, date } as Match;
                });
                
                // --- Status Update Logic ---
                const batch = writeBatch(firestore);
                let updatesMade = 0;
                matchesData.forEach(match => {
                    const calculatedStatus = getCalculatedStatus(match);
                    if(match.status !== calculatedStatus) {
                        const matchRef = doc(firestore, 'matches', match.id);
                        batch.update(matchRef, { status: calculatedStatus });
                        updatesMade++;
                        match.status = calculatedStatus; // Update local copy
                    }
                });
                if (updatesMade > 0) { await batch.commit(); }
                
                // --- Filter for Upcoming Matches display (Client-side) ---
                const trulyUpcoming = matchesData
                    .filter(match => ['Upcoming', 'In Progress'].includes(match.status))
                    .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
                setUpcomingMatches(trulyUpcoming);
                setIsLoadingUpcoming(false);

                // --- Filter for Recent Results display (Client-side) ---
                const completedMatches = matchesData
                    .filter(match => match.status === 'Completed')
                    .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());
                
                if (completedMatches.length > 0) {
                    const recentMatch = completedMatches[0];
                    setRecentMatchDetails(recentMatch);
                    
                    const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', recentMatch.id));
                    const resultsSnapshot = await getDocs(resultsQuery);
                    const resultsData = resultsSnapshot.docs.map(d => d.data() as Result);
                    
                    const sortedResults = resultsData.sort((a, b) => (a.position || 999) - (b.position || 999));
                    setRecentResults(sortedResults);
                } else {
                    setRecentMatchDetails(null);
                    setRecentResults([]);
                }
            } catch (error) {
                 console.error("Error fetching match data:", error);
                 toast({
                    variant: 'destructive',
                    title: 'Error Fetching Matches',
                    description: 'Could not fetch match data. This might be a permissions issue.'
                 });
            } finally {
                setIsLoadingRecent(false);
                setIsLoadingUpcoming(false);
            }
        };

        processMatches();

    }, [isClubReady, selectedClubId, toast]);

    const handleViewFullResults = () => {
        if (recentMatchDetails) {
            router.push(`/main/results?matchId=${recentMatchDetails.id}`);
        }
    };
    
    const selectedClubName = allClubs.find(c => c.id === selectedClubId)?.name || 'Select a Club';

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
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No upcoming matches scheduled.</TableCell></TableRow>
            );
        }
        return upcomingMatches.map(match => (
            <TableRow key={match.id}>
                <TableCell><div className="flex flex-col"><span>{format(match.date as Date, 'dd/MM/yyyy')}</span><span className="text-xs text-muted-foreground">{match.seriesName}</span></div></TableCell>
                <TableCell className="font-medium">{match.name}</TableCell>
                <TableCell><div className="flex items-center gap-2"><div><span>{match.location}</span><span className="text-xs text-muted-foreground block">{match.status}</span></div>{match.googleMapsLink && (<Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4 text-primary hover:text-primary/80" /></Link>)}</div></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" asChild><Link href={`/auth/login`}><ArrowRight className="h-4 w-4" /></Link></Button></TableCell>
            </TableRow>
        ));
    };

    const renderRecentResults = () => {
        if (isLoadingRecent) {
            return Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell><Skeleton className="h-4 w-8" /></TableCell><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-16" /></TableCell><TableCell><Skeleton className="h-4 w-12" /></TableCell></TableRow>
            ));
        }
        if (recentResults.length === 0) {
            return (
                <TableRow><TableCell colSpan={4} className="h-24 text-center"><div className="flex flex-col items-center gap-2 text-muted-foreground"><TrophyIcon className="h-8 w-8" /><p>No recent results found for this club.</p></div></TableCell></TableRow>
            );
        }
        const paidPlaces = recentMatchDetails?.paidPlaces || 0;
        return recentResults.slice(0, 5).map(result => {
            const isPaidPlace = result.position !== null && paidPlaces > 0 && result.position <= paidPlaces;
            return (
                <TableRow key={result.userId} className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}>
                    <TableCell><div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">{result.position || '-'}</div></TableCell>
                    <TableCell className="font-medium">{formatAnglerName(result.userName)}</TableCell>
                    <TableCell className="text-muted-foreground">{result.weight.toFixed(3)}kg</TableCell>
                    <TableCell><Badge variant={result.status === 'OK' ? 'outline' : 'secondary'}>{result.status}</Badge></TableCell>
                </TableRow>
            );
        });
    };

    const renderImageGallery = () => {
        if (isLoadingRecent) {
            return <Skeleton className="w-full h-full min-h-[200px]" />
        }
        const images = recentMatchDetails?.mediaUrls || [];
        if (images.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" /><p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
                </div>
            )
        }
        return (
            <Carousel opts={{ align: "start", loop: true, }} className="w-full">
                <CarouselContent className="-ml-1">
                    {images.map((url, index) => (
                        <CarouselItem key={index} className="pl-1"><div className="relative aspect-square w-full"><NextImage src={url} alt={`Recent match image ${index + 1}`} fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" style={{ objectFit: 'contain' }} className="rounded-md" /></div></CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious /><CarouselNext />
            </Carousel>
        );
    }
    
    return (
        <main className="flex min-h-screen w-full flex-col">
            <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
                <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
                    <Link href="#" className="flex items-center gap-2 text-lg font-semibold md:text-base"><TrophyIcon className="h-6 w-6" /><span>Public Dashboard</span></Link>
                </nav>
                <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
                    <div className="ml-auto flex-1 sm:flex-initial">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="club-filter" className="sr-only">Club</Label>
                            <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={isLoadingClubs || allClubs.length === 0}>
                                <SelectTrigger id="club-filter" className="w-full sm:w-[200px] lg:w-[300px]">
                                    <SelectValue placeholder="Select a club..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {isLoadingClubs ? <SelectItem value="loading" disabled>Loading clubs...</SelectItem> : allClubs.map((club) => (<SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button asChild><Link href="/auth/login">Club Login</Link></Button>
                </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                {!isClubReady && !isLoadingClubs ? (
                     <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Select a Club</AlertTitle>
                        <AlertDescription>Please select a club from the dropdown above to view its dashboard.</AlertDescription>
                    </Alert>
                ) : (
                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-4">
                        <Card className="lg:col-span-2">
                            <CardHeader><CardTitle>Upcoming Matches</CardTitle></CardHeader>
                            <CardContent><Table><TableHeader><TableRow><TableHead>Date &amp; Series</TableHead><TableHead>Match</TableHead><TableHead>Venue &amp; Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{renderUpcomingMatches()}</TableBody></Table></CardContent>
                        </Card>
                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle>Recent Results</CardTitle>
                                <CardDescription>
                                    {recentMatchDetails && recentMatchDetails.date ? `${recentMatchDetails.name} on ${format(recentMatchDetails.date as Date, 'dd/MM/yy')}` : 'Last completed match'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow"><Table><TableHeader><TableRow><TableHead className="w-[50px]">Pos</TableHead><TableHead>Angler</TableHead><TableHead>Weight</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{renderRecentResults()}</TableBody></Table></CardContent>
                            {recentMatchDetails && <CardFooter><Button onClick={handleViewFullResults} variant="outline" className="w-full">View Full Results<ArrowRight className="ml-2 h-4 w-4" /></Button></CardFooter>}
                        </Card>
                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle>Recent Photos</CardTitle>
                                <CardDescription>{recentResults.length > 0 ? "From the last match" : "No recent photos"}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">{renderImageGallery()}</CardContent>
                        </Card>
                    </div>
                )}
            </div>
             <footer className="text-center p-4 text-sm text-muted-foreground border-t">
                Copyright EMANCIUM 2025 - All rights reserved
            </footer>
        </main>
    );
}

