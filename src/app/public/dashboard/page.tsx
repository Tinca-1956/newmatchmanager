
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
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
import { collection, onSnapshot, doc, query, where, getDocs, orderBy, Timestamp, limit, getDoc, writeBatch } from 'firebase/firestore';
import type { Match, User, Club, Result, MatchStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, compareDesc } from 'date-fns';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy as TrophyIcon } from 'lucide-react';
import NextImage from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Link from 'next/link';

// Helper to get calculated status. Copied from the main dashboard.
const getCalculatedStatus = (match: Match): MatchStatus => {
  const now = new Date();
  
  let matchDate: Date;
    if (match.date instanceof Timestamp) {
        matchDate = match.date.toDate();
    } else if (match.date instanceof Date) {
        matchDate = match.date;
    } else {
        return match.status; // Invalid date format
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

function PublicDashboardPage() {
    const { toast } = useToast();

    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    
    const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
    const [recentResults, setRecentResults] = useState<Result[]>([]);
    const [recentMatchDetails, setRecentMatchDetails] = useState<Match | null>(null);
    
    const [isLoadingClubs, setIsLoadingClubs] = useState(true);
    const [isLoadingMatches, setIsLoadingMatches] = useState(false);
    const [isLoadingResults, setIsLoadingResults] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReadyForDataFetch, setIsReadyForDataFetch] = useState(false);
    

    // Step 1: Fetch all clubs to populate the dropdown.
    useEffect(() => {
        if (!firestore) return;
        setIsLoadingClubs(true);
        const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
        const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setAllClubs(clubsData);
            if (clubsData.length > 0 && !selectedClubId) {
                // Set the first club as default and signal that we're ready to fetch its data
                setSelectedClubId(clubsData[0].id);
                setIsReadyForDataFetch(true);
            }
            setIsLoadingClubs(false);
        }, (error) => {
            console.error("Error fetching clubs:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
            setIsLoadingClubs(false);
        });
        return () => unsubscribe();
    }, [toast, selectedClubId]);

    // Step 2: Fetch matches and results for the selected club, only when ready.
    useEffect(() => {
        if (!isReadyForDataFetch || !selectedClubId || !firestore) {
            return;
        }

        const fetchAllDataForClub = async () => {
            setIsLoadingMatches(true);
            setIsLoadingResults(true);

            try {
                // Fetch ALL matches for the club without ordering on the server.
                const matchesQuery = query(collection(firestore, 'matches'), where('clubId', '==', selectedClubId));
                const matchesSnapshot = await getDocs(matchesQuery);
                
                const matchesData = matchesSnapshot.docs.map(doc => {
                    const data = doc.data();
                    let date = data.date;
                    if (date instanceof Timestamp) {
                        date = date.toDate();
                    }
                    return { id: doc.id, ...data, date } as Match;
                });

                // --- Client-side processing ---

                // Batch update statuses
                const batch = writeBatch(firestore);
                let updatesMade = 0;
                matchesData.forEach(match => {
                    const calculatedStatus = getCalculatedStatus(match);
                    if(match.status !== calculatedStatus) {
                        const matchRef = doc(firestore, 'matches', match.id);
                        batch.update(matchRef, { status: calculatedStatus });
                        updatesMade++;
                        match.status = calculatedStatus;
                    }
                });
                if (updatesMade > 0) {
                    await batch.commit().catch(e => console.error("Status update failed:", e));
                }

                // Client-side sort and filter for UPCOMING matches
                const upcoming = matchesData
                    .filter(m => ['Upcoming', 'In Progress'].includes(m.status))
                    .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
                setUpcomingMatches(upcoming);
                setIsLoadingMatches(false);

                // Client-side sort and filter for RECENT results
                const completed = matchesData
                    .filter(m => m.status === 'Completed')
                    .sort((a, b) => compareDesc(a.date as Date, b.date as Date));

                if (completed.length > 0) {
                    const latestMatch = completed[0];
                    setRecentMatchDetails(latestMatch);
                    
                    const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', latestMatch.id));
                    const resultsSnapshot = await getDocs(resultsQuery);
                    const resultsData = resultsSnapshot.docs.map(d => d.data() as Result);
                    const sortedResults = resultsData.sort((a, b) => (a.position || 999) - (b.position || 999));
                    setRecentResults(sortedResults);
                } else {
                    setRecentMatchDetails(null);
                    setRecentResults([]);
                }
            } catch (error) {
                console.error("Error fetching match/result data: ", error);
                if ((error as any).code === 'failed-precondition') {
                    toast({ variant: 'destructive', title: 'Firestore Error', description: 'A required index is missing. Please contact support.' });
                } else {
                    toast({ variant: 'destructive', title: 'Data Error', description: 'Could not load match data.' });
                }
            } finally {
                setIsLoadingMatches(false);
                setIsLoadingResults(false);
            }
        };

        fetchAllDataForClub();

    }, [selectedClubId, isReadyForDataFetch, toast]);
    
    const handleClubChange = (clubId: string) => {
        setSelectedClubId(clubId);
        setIsReadyForDataFetch(true); // Signal to refetch data for the new club
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
        <TableCell className="font-medium">{match.name}</TableCell>
        <TableCell>
             <div className="flex items-center gap-2">
                <div>
                    <span>{match.location}</span>
                </div>
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
                    <p>No recent results found.</p>
                </div>
            </TableCell>
        </TableRow>
      );
    }
    
    return recentResults.map(result => (
      <TableRow key={result.userId}>
          <TableCell>
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
              {result.position || '-'}
              </div>
          </TableCell>
          <TableCell className="font-medium">{result.userName}</TableCell>
          <TableCell className="text-muted-foreground">{result.weight.toFixed(3)}kg</TableCell>
          <TableCell>
              <Badge variant={result.status === 'OK' ? 'outline' : 'secondary'}>{result.status}</Badge>
          </TableCell>
      </TableRow>
    ));
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

    const recentResultsTitle = recentMatchDetails ? `${recentMatchDetails.seriesName} - ${recentMatchDetails.name}` : 'Last completed match'

    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            {/* Header */}
            <header className="bg-background border-b shadow-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight">Public Dashboard</h1>
                    <div className="flex items-center gap-2">
                         <Label htmlFor="club-select">Club:</Label>
                         {isLoadingClubs ? <Skeleton className="h-10 w-48" /> : (
                            <Select value={selectedClubId} onValueChange={handleClubChange}>
                                <SelectTrigger id="club-select" className="w-48">
                                    <SelectValue placeholder="Select a club..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {allClubs.map(club => (
                                        <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                         )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow container mx-auto p-4 lg:p-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="lg:col-span-2">
                        <CardHeader><CardTitle>Upcoming Matches</CardTitle></CardHeader>
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
                                <TableBody>{renderUpcomingMatches()}</TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Recent Results</CardTitle>
                            <CardDescription>{isLoadingResults ? <Skeleton className="h-5 w-48" /> : (recentResults.length > 0 ? recentResultsTitle : "No completed matches")}</CardDescription>
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
                                <TableBody>{renderRecentResults()}</TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Recent Photos</CardTitle>
                            <CardDescription>{isLoadingResults ? <Skeleton className="h-5 w-32" /> : (recentMatchDetails?.mediaUrls?.length > 0 ? "From the last match" : "No recent photos")}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex items-center justify-center">
                            {renderImageGallery()}
                        </CardContent>
                    </Card>
                </div>
            </main>
             <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Registration Required</DialogTitle>
                    <DialogDescription>
                        Please sign in or create an account to register for matches and access more features.
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

export default function SuspendedPublicDashboard() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PublicDashboardPage />
        </Suspense>
    )
}

    