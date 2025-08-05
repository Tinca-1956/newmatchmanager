
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, query, where, getDocs, orderBy, Timestamp, limit, writeBatch } from 'firebase/firestore';
import type { Match, User, Club, MatchStatus, Result } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import NextImage from 'next/image';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy as TrophyIcon } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const getCalculatedStatus = (match: Match): MatchStatus => {
  const now = new Date();
  
  let matchDate: Date;
    if (match.date instanceof Timestamp) {
        matchDate = match.date.toDate();
    } else if (match.date instanceof Date) {
        matchDate = match.date;
    } else {
        // Fallback for invalid date format
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

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch all clubs for the dropdown
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
            console.error("Error fetching clubs:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
            setIsLoadingClubs(false);
        });

        return () => unsubscribe();
    }, [toast, selectedClubId]);

    // Fetch data when a club is selected
    useEffect(() => {
        if (!selectedClubId || !firestore) {
            // Clear data if no club is selected
            setUpcomingMatches([]);
            setRecentResults([]);
            setRecentMatchId(null);
            setRecentMatchName('');
            setRecentSeriesName('');
            setRecentMatchLocation('');
            setRecentMatchImages([]);
            return;
        }

        const processMatches = async () => {
            setIsLoadingData(true);

            const allMatchesQuery = query(
                collection(firestore, 'matches'),
                where('clubId', '==', selectedClubId)
            );

            try {
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

                if (updatesMade > 0) {
                    try {
                        await batch.commit();
                        console.log(`Updated status for ${updatesMade} matches.`);
                    } catch (error) {
                        console.error("Failed to batch update match statuses:", error);
                    }
                }
                // --- End Status Update Logic ---
                
                // --- Filter for Upcoming Matches display ---
                const trulyUpcoming = matchesData
                    .filter(match => ['Upcoming', 'In Progress'].includes(getCalculatedStatus(match)))
                    .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
                
                setUpcomingMatches(trulyUpcoming);

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
            } catch(e) {
                console.error("Error fetching match data:", e);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: (e as Error).message
                });
            } finally {
                setIsLoadingData(false);
            }
        };

        processMatches();

    }, [selectedClubId, toast]);

    const renderUpcomingMatches = () => {
        if (isLoadingData) {
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
                                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(true)}>
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Sign in to register</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </TableCell>
            </TableRow>
        ));
    };
  
    const renderRecentResults = () => {
        if (isLoadingData) {
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
        if (isLoadingData) {
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
        <>
        <div className="flex-grow flex flex-col">
            <header className="sticky top-0 z-10 flex h-[57px] items-center gap-1 border-b bg-background px-4">
                <h1 className="text-xl font-semibold">Public Dashboard</h1>
                <div className="ml-auto flex items-center gap-2">
                    {isLoadingClubs ? <Skeleton className="h-9 w-48" /> : (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="club-select" className="hidden sm:block">Club:</Label>
                            <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                                <SelectTrigger id="club-select" className="w-48">
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
                    )}
                    <Button asChild>
                        <Link href="/auth/login">Sign In</Link>
                    </Button>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 overflow-auto">
                 <div className="grid gap-6 auto-rows-max lg:grid-cols-2 xl:grid-cols-4">
                    <div className="lg:col-span-2 xl:col-span-2">
                         <Card>
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
                    </div>

                    <div className="xl:col-span-1">
                        <Card className="flex flex-col h-full">
                            <CardHeader>
                                <CardTitle>Recent Results</CardTitle>
                                {isLoadingData ? (
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
                        </Card>
                    </div>
                    
                    <div className="xl:col-span-1">
                        <Card className="flex flex-col h-full">
                            <CardHeader>
                                <CardTitle>Recent Photos</CardTitle>
                                {isLoadingData ? (
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
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Registration Required</DialogTitle>
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
        </>
    );
}
