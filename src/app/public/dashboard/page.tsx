
'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot, collection, query, where, Timestamp, orderBy, limit, getDocs } from 'firebase/firestore';
import type { Club, Match, Result } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy as TrophyIcon, LogIn, Swords, Users, Shield } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const getCalculatedStatus = (match: Match): 'Upcoming' | 'In Progress' | 'Weigh-in' | 'Completed' | 'Cancelled' => {
  const now = new Date();
  const matchDate: Date = match.date instanceof Timestamp ? match.date.toDate() : match.date;

  if (!match.drawTime || !match.endTime) return match.status;

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
    const [selectedClub, setSelectedClub] = useState<Club | null>(null);
    
    const [isLoadingClubs, setIsLoadingClubs] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
    const [recentResults, setRecentResults] = useState<Result[]>([]);
    const [recentMatch, setRecentMatch] = useState<Match | null>(null);
    
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Effect to fetch all clubs on initial load
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
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
            setIsLoadingClubs(false);
        });

        return () => unsubscribe();
    }, [toast]);
    
    // This function is now the single point of entry for fetching club-specific data
    const handleClubSelectionChange = async (clubId: string) => {
        if (!clubId || !firestore) {
            // Reset states if club is deselected
            setSelectedClubId('');
            setSelectedClub(null);
            setUpcomingMatches([]);
            setRecentResults([]);
            setRecentMatch(null);
            setErrorMessage(null);
            return;
        }

        setSelectedClubId(clubId);
        setSelectedClub(clubs.find(c => c.id === clubId) || null);
        setIsLoadingData(true);
        setUpcomingMatches([]);
        setRecentResults([]);
        setRecentMatch(null);
        setErrorMessage(null);
        
        try {
            // Fetch all matches for the selected club
            const matchesQuery = query(collection(firestore, 'matches'), where('clubId', '==', clubId));
            const matchesSnapshot = await getDocs(matchesQuery);
            const allMatches = matchesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: (data.date as Timestamp).toDate(),
                } as Match;
            });
            
            // Process upcoming matches
            const upcoming = allMatches
                .filter(m => getCalculatedStatus(m) === 'Upcoming')
                .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
            setUpcomingMatches(upcoming);
                
            // Process recent results
            const completed = allMatches
                .filter(m => getCalculatedStatus(m) === 'Completed')
                .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());
                
            if (completed.length > 0) {
                const latestCompletedMatch = completed[0];
                setRecentMatch(latestCompletedMatch);

                const resultsQuery = query(
                    collection(firestore, 'results'),
                    where('matchId', '==', latestCompletedMatch.id),
                    orderBy('position', 'asc')
                );
                const resultsSnapshot = await getDocs(resultsQuery);
                const resultsData = resultsSnapshot.docs.map(d => d.data() as Result);
                setRecentResults(resultsData);
            }

        } catch (error: any) {
            console.error('Error fetching club data:', error);
            setErrorMessage('Could not load match data for this club. You may not have the required permissions.');
            toast({
                variant: 'destructive',
                title: 'Data Fetch Error',
                description: 'Failed to load match and result data. Please check Firestore security rules.'
            });
        } finally {
            setIsLoadingData(false);
        }
    };


    const renderUpcomingMatches = () => {
        if (isLoadingData) {
            return Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
            ));
        }
        if (upcomingMatches.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                        No upcoming matches scheduled.
                    </TableCell>
                </TableRow>
            );
        }
        return upcomingMatches.map(match => (
            <TableRow key={match.id}>
                <TableCell>
                    <div className="flex flex-col">
                        <span className="font-medium">{match.name}</span>
                        <span className="text-xs text-muted-foreground">{format(match.date, 'PPP')}</span>
                    </div>
                </TableCell>
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
                </TableRow>
            ));
        }
        if (recentResults.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
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
                <TableCell className="font-medium">{formatAnglerName(result.userName)}</TableCell>
                <TableCell className="text-muted-foreground">{result.weight.toFixed(3)}kg</TableCell>
            </TableRow>
        ));
    };
  
    const renderImageGallery = () => {
        if (isLoadingData) {
            return <Skeleton className="w-full h-full min-h-[200px]" />;
        }
        if (!recentMatch || !recentMatch.mediaUrls || recentMatch.mediaUrls.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
                </div>
            );
        }
        return (
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
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
    }
    
    const recentResultsTitle = recentMatch ? `${recentMatch.seriesName} - ${recentMatch.name}` : 'Last completed match'

    return (
        <main className="flex min-h-screen w-full flex-col items-center bg-muted/40 p-4 sm:p-6 md:p-10">
            <div className="w-full max-w-7xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <div className="flex justify-center items-center gap-4">
                        <Swords className="h-10 w-10 text-primary" />
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Match Manager</h1>
                    </div>
                    <p className="text-muted-foreground text-lg sm:text-xl">
                        Public Dashboard
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                    <Card>
                        <CardHeader>
                            <Shield className="mx-auto h-8 w-8 text-primary" />
                            <CardTitle>Manage Clubs</CardTitle>
                        </CardHeader>
                        <CardContent><p className="text-muted-foreground">Organize series, matches, and member lists with powerful admin tools.</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <Users className="mx-auto h-8 w-8 text-primary" />
                            <CardTitle>Engage Members</CardTitle>
                        </CardHeader>
                        <CardContent><p className="text-muted-foreground">Anglers can register for matches, track their results, and view standings.</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <TrophyIcon className="mx-auto h-8 w-8 text-primary" />
                            <CardTitle>View Results</CardTitle>
                        </CardHeader>
                        <CardContent><p className="text-muted-foreground">Keep up with the latest match outcomes and photo galleries.</p></CardContent>
                    </Card>
                </div>

                <div className="w-full flex justify-end">
                    <Button asChild>
                        <Link href="/auth/login">
                            <LogIn className="mr-2" />
                            Login to Your Club
                        </Link>
                    </Button>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Club Data</CardTitle>
                        <CardDescription>Select a club to view their public match information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="w-full md:w-1/3">
                            <Label htmlFor="club-select">Select a Club</Label>
                            {isLoadingClubs ? <Skeleton className="h-10 w-full mt-2" /> : (
                                <Select onValueChange={handleClubSelectionChange} value={selectedClubId}>
                                    <SelectTrigger id="club-select" className="mt-2">
                                        <SelectValue placeholder="Select a club..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clubs.map(club => (
                                            <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {errorMessage && <p className="text-destructive text-center">{errorMessage}</p>}
                        
                        {selectedClubId && (
                             <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Upcoming Matches</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Match</TableHead>
                                                    <TableHead>Venue</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>{renderUpcomingMatches()}</TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                <div className="grid grid-rows-2 gap-6">
                                    <Card className="flex flex-col">
                                        <CardHeader>
                                            <CardTitle>Recent Results</CardTitle>
                                            <CardDescription>{isLoadingData ? <Skeleton className="h-5 w-48" /> : (recentResults.length > 0 ? recentResultsTitle : "No completed matches")}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[50px]">Pos</TableHead>
                                                        <TableHead>Angler</TableHead>
                                                        <TableHead>Weight</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>{renderRecentResults()}</TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>

                                    <Card className="flex flex-col">
                                        <CardHeader>
                                            <CardTitle>Recent Photos</CardTitle>
                                            <CardDescription>{isLoadingData ? <Skeleton className="h-5 w-32" /> : (recentMatch?.mediaUrls?.length ? "From the last match" : "No recent photos")}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow flex items-center justify-center">
                                            {renderImageGallery()}
                                        </CardContent>
                                    </Card>
                                </div>
                             </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

    