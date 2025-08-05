
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  Timestamp,
  orderBy,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy, BarChart, Users, Shield, Fish } from 'lucide-react';

import { firestore } from '@/lib/firebase-client';
import type { Club, Match, MatchStatus, Result } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';

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
  const { toast } = useToast();
  
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);

  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentMatchName, setRecentMatchName] = useState<string>('');
  const [recentSeriesName, setRecentSeriesName] = useState<string>('');
  const [recentMatchPaidPlaces, setRecentMatchPaidPlaces] = useState<number>(0);
  const [recentMatchImages, setRecentMatchImages] = useState<string[]>([]);
  const [recentMatchId, setRecentMatchId] = useState<string | null>(null);

  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  // Fetch clubs for the dropdown
  useEffect(() => {
    if (!firestore) return;
    setIsLoadingClubs(true);
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
      setIsLoadingClubs(false);
    }, (error) => {
        console.error("Error fetching clubs:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs list.'});
        setIsLoadingClubs(false);
    });

    return () => unsubscribe();
  }, [toast]);

  // Fetch data when a club is selected
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      setUpcomingMatches([]);
      setRecentResults([]);
      setRecentMatchId(null);
      setRecentMatchName('');
      setRecentSeriesName('');
      setRecentMatchImages([]);
      return;
    }

    const fetchClubData = async () => {
        setIsLoadingMatches(true);
        setIsLoadingResults(true);

        try {
            const allMatchesQuery = query(
                collection(firestore, 'matches'),
                where('clubId', '==', selectedClubId)
            );
            
            const allMatchesSnapshot = await getDocs(allMatchesQuery);
            const matchesData = allMatchesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: (data.date as Timestamp).toDate(),
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
                setRecentMatchPaidPlaces(recentMatch.paidPlaces || 0);
                setRecentMatchImages(recentMatch.mediaUrls || []);
                
                const resultsQuery = query(
                    collection(firestore, 'results'),
                    where('matchId', '==', recentMatch.id)
                );
                const resultsSnapshot = await getDocs(resultsQuery);
                const resultsData = resultsSnapshot.docs.map(d => d.data() as Result);
                
                const sortedResults = resultsData.sort((a, b) => (a.position || 999) - (b.position || 999));
                setRecentResults(sortedResults);
            } else {
                setRecentResults([]);
                setRecentMatchId(null);
                setRecentMatchName('');
                setRecentSeriesName('');
                setRecentMatchImages([]);
            }
        } catch (error) {
             console.error("Error fetching club data: ", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch data for the selected club.' });
        } finally {
            setIsLoadingMatches(false);
            setIsLoadingResults(false);
        }
    };

    fetchClubData();

  }, [selectedClubId, toast]);

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
            {selectedClubId ? 'No upcoming matches scheduled for this club.' : 'Select a club to see upcoming matches.'}
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
        <TableCell className="font-medium">{match.name}</TableCell>
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
            <Button variant="ghost" size="icon" onClick={() => setIsSignInModalOpen(true)}>
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
                    <p>{selectedClubId ? 'No recent results found.' : 'Select a club to see results.'}</p>
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
                <p className="mt-4 text-sm text-muted-foreground">
                    {selectedClubId ? 'No photos from the last match.' : 'Select a club to see photos.'}
                </p>
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
      <main className="flex-1 bg-muted/40 p-4 lg:p-6">
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome to Match Manager</h1>
                    <p className="text-muted-foreground">
                        A public dashboard to view club activities. Select a club to get started.
                    </p>
                </div>
                <div className="flex w-full md:w-auto items-center justify-center gap-4">
                     <div className="flex items-center gap-2">
                        <Label htmlFor="club-filter" className="sr-only">Select a Club</Label>
                         <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={isLoadingClubs}>
                            <SelectTrigger id="club-filter" className="w-[180px] bg-background">
                                <SelectValue placeholder="Select a club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingClubs ? <SelectItem value="loading" disabled>Loading...</SelectItem> : (
                                    clubs.map(club => (
                                        <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                     </div>
                    <Button asChild>
                        <Link href="/auth/login">Sign In</Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-4">
                <div className="lg:col-span-4">
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

                <div className="lg:col-span-2 xl:col-span-2">
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
                         {recentMatchId && (
                            <CardFooter>
                                <Button onClick={() => setIsSignInModalOpen(true)} variant="outline" className="w-full">
                                    View Full Results
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>

                <div className="lg:col-span-2 xl:col-span-2">
                    <Card className="flex flex-col h-full">
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
        </div>
      </main>
      <Dialog open={isSignInModalOpen} onOpenChange={setIsSignInModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Sign in to see more</DialogTitle>
                <DialogDescription>
                    To view full match details and register for events, please sign in or create an account.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-start">
                 <Button asChild>
                    <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button type="button" variant="secondary" onClick={() => setIsSignInModalOpen(false)}>
                    Close
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
