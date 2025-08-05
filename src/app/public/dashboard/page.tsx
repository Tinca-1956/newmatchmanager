
'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot, collection, query, where, Timestamp, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';
import type { Club, Match, MatchStatus, Result } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
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
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Swords } from 'lucide-react';

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
  const router = useRouter();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentMatchName, setRecentMatchName] = useState<string>('');
  const [recentSeriesName, setRecentSeriesName] = useState<string>('');
  const [recentMatchLocation, setRecentMatchLocation] = useState<string>('');
  const [recentMatchPaidPlaces, setRecentMatchPaidPlaces] = useState<number>(0);
  const [recentMatchImages, setRecentMatchImages] = useState<string[]>([]);
  const [recentMatchId, setRecentMatchId] = useState<string | null>(null);

  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect 1: Fetch the list of all clubs on initial load
  useEffect(() => {
    if (!firestore) return;

    setIsLoadingClubs(true);
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setClubs(clubsData);
        setIsLoadingClubs(false);
    }, (err) => {
        console.error("Error fetching clubs:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load the list of clubs.' });
        setError("Could not load the list of clubs.");
        setIsLoadingClubs(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  // Effect 2: Fetch data for the selected club.
  // This runs ONLY when `selectedClubId` changes.
  useEffect(() => {
    // Do not run if no club is selected. This is the crucial guard.
    if (!selectedClubId || !firestore) {
        // Clear previous data if a club is deselected
        setUpcomingMatches([]);
        setRecentResults([]);
        setRecentMatchId(null);
        setError(null);
        return;
    }
    
    const fetchClubData = async () => {
        setIsLoadingMatches(true);
        setIsLoadingResults(true);
        setError(null);

        try {
            // --- Query for all matches in the club ---
            const allMatchesQuery = query(
                collection(firestore, 'matches'),
                where('clubId', '==', selectedClubId)
            );
            const allMatchesSnapshot = await getDocs(allMatchesQuery);

            if (allMatchesSnapshot.empty && clubs.length > 0) {
                 toast({ variant: 'default', title: 'No Data', description: 'This club does not have any match data yet.' });
            }

            const matchesData = allMatchesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: (data.date as Timestamp).toDate(),
                } as Match;
            });
            
            // --- Auto-update statuses (client-side operation) ---
            const batch = writeBatch(firestore);
            let updatesMade = 0;
            matchesData.forEach(match => {
                const calculatedStatus = getCalculatedStatus(match);
                if (match.status !== calculatedStatus) {
                    const matchRef = doc(firestore, 'matches', match.id);
                    batch.update(matchRef, { status: calculatedStatus });
                    updatesMade++;
                    match.status = calculatedStatus;
                }
            });
            if (updatesMade > 0) {
                await batch.commit().catch(e => console.error("Batch update failed:", e));
            }
            
            // --- Upcoming Matches ---
            const trulyUpcoming = matchesData
                .filter(match => ['Upcoming', 'In Progress'].includes(match.status))
                .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
            setUpcomingMatches(trulyUpcoming);
            setIsLoadingMatches(false);

            // --- Recent Results ---
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

                const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', recentMatch.id));
                const resultsSnapshot = await getDocs(resultsQuery);
                const resultsData = resultsSnapshot.docs.map(d => d.data() as Result);
                
                const sortedResults = resultsData.sort((a, b) => (a.position || 999) - (b.position || 999));
                setRecentResults(sortedResults);
            } else {
                setRecentResults([]);
                setRecentMatchId(null);
            }
            setIsLoadingResults(false);

        } catch (err: any) {
            console.error("Error fetching club data:", err);
            setError("Could not load match data for this club. You may not have the required permissions.");
            setIsLoadingMatches(false);
            setIsLoadingResults(false);
        }
    };

    fetchClubData();

  }, [selectedClubId, toast, clubs]);


  const renderUpcomingMatches = () => {
    if (isLoadingMatches) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
        </TableRow>
      ));
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
            <div className="flex flex-col">
                <span className="font-medium">{format(match.date as Date, 'dd/MM/yyyy')}</span>
                <span className="text-xs text-muted-foreground">{match.seriesName}</span>
            </div>
        </TableCell>
        <TableCell>{match.name.includes("Round") ? `${match.name} at ${match.location}` : match.name}</TableCell>
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

  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-10">
        <div className="container mx-auto text-center">
          <div className="flex justify-center items-center gap-4">
             <Swords className="h-10 w-10 text-primary" />
             <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Match Manager</h1>
          </div>
          <p className="text-lg text-muted-foreground mt-2">Public Dashboard</p>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="text-center">
              <CardHeader><CardTitle>Manage Clubs</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">Organize series, matches, and member lists with powerful admin tools.</p></CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader><CardTitle>Engage Members</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">Anglers can register for matches, track their results, and view standings.</p></CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader><CardTitle>View Results</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">Keep up with the latest match outcomes and photo galleries.</p></CardContent>
            </Card>
          </div>

          <div className="text-center mb-8">
              <Button asChild>
                <Link href="/auth/login">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Login to Your Club
                </Link>
              </Button>
          </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Club Data</CardTitle>
            <CardDescription>Select a club to view their public match information.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="max-w-xs">
                <Label htmlFor="club-select">Select a Club</Label>
                <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                    <SelectTrigger id="club-select">
                        <SelectValue placeholder="Select a club..." />
                    </SelectTrigger>
                    <SelectContent>
                        {isLoadingClubs ? <SelectItem value="loading" disabled>Loading clubs...</SelectItem> : (
                            clubs.map(club => (
                                <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
             </div>
          </CardContent>
        </Card>
        
        {error && (
            <Alert variant="destructive" className="mb-6">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-4">
          <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Upcoming Matches</CardTitle></CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Date &amp; Series</TableHead>
                              <TableHead>Match</TableHead>
                              <TableHead>Venue &amp; Status</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {selectedClubId ? renderUpcomingMatches() : <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Please select a club to see upcoming matches.</TableCell></TableRow>}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>

          <Card className="flex flex-col">
              <CardHeader>
                  <CardTitle>Recent Results</CardTitle>
                  {isLoadingResults ? <Skeleton className="h-5 w-48" /> : <CardDescription>{recentResults.length > 0 ? recentResultsTitle : "No completed matches to show"}</CardDescription>}
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
                         {selectedClubId ? renderRecentResults() : <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Please select a club to see recent results.</TableCell></TableRow>}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>

          <Card className="flex flex-col">
              <CardHeader>
                  <CardTitle>Recent Photos</CardTitle>
                  {isLoadingResults ? <Skeleton className="h-5 w-32" /> : <CardDescription>{recentMatchImages.length > 0 ? "From the last match" : "No recent photos"}</CardDescription>}
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center">
                  {selectedClubId ? renderImageGallery() : <div className="text-center text-muted-foreground">Please select a club to see photos.</div>}
              </CardContent>
          </Card>
        </div>
      </main>

      <footer className="mt-12 py-6 bg-gray-100 dark:bg-gray-900">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Match Manager. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}

    