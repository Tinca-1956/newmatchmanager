
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Skeleton } from '@/components/ui/skeleton';
import { Fish, MapPin, Trophy as TrophyIcon, ArrowRight, ImageIcon } from 'lucide-react';
import { usePublicData } from '@/hooks/use-public-data';

export default function PublicDashboardPage() {
    const { 
        clubs,
        selectedClubId, 
        setSelectedClubId,
        isLoading, 
        upcomingMatches, 
        lastCompletedMatch 
    } = usePublicData();
    const [filterSeries, setFilterSeries] = useState<string>('all');

    const seriesForFilter = useMemo(() => {
        if (!lastCompletedMatch) return [];
        const seriesSet = new Set<string>();
        seriesSet.add(lastCompletedMatch.seriesName);
        return Array.from(seriesSet).map(name => ({ id: name, name }));
    }, [lastCompletedMatch]);
    
    const displayedResults = useMemo(() => {
        if (!lastCompletedMatch) return [];
        let results = lastCompletedMatch.results;
        if (filterSeries !== 'all') {
             // Since we only have one match's results, this filter isn't very useful yet,
             // but the structure is here for when we show more matches.
        }
        return results.sort((a, b) => (a.position || 999) - (b.position || 999));

    }, [lastCompletedMatch, filterSeries]);

    const handleClubChange = (clubId: string) => {
        setSelectedClubId(clubId);
        setFilterSeries('all'); // Reset series filter when club changes
    };

    const renderUpcomingMatches = () => {
        if (isLoading) {
            return Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
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
                    <div className="font-medium">{match.name}</div>
                    <div className="text-sm text-muted-foreground">{match.seriesName}</div>
                </TableCell>
                <TableCell>{format(new Date(match.date.seconds * 1000), 'eee, dd MMM yyyy')}</TableCell>
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
                <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/auth/login">
                             <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </TableCell>
            </TableRow>
        ));
    };
    
    const renderRecentResults = () => {
        if (isLoading) {
            return Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                </TableRow>
            ));
        }

        if (!lastCompletedMatch || displayedResults.length === 0) {
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
        
        return displayedResults.map(result => {
            const isPaidPlace = result.position !== null && (lastCompletedMatch?.paidPlaces || 0) > 0 && result.position <= (lastCompletedMatch?.paidPlaces || 0);
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
                    <TableCell className="font-medium">{result.userName}</TableCell>
                    <TableCell className="text-muted-foreground">{result.weight.toFixed(3)}kg</TableCell>
                    <TableCell>
                        <Badge variant={result.status === 'OK' ? 'outline' : 'secondary'}>{result.status}</Badge>
                    </TableCell>
                </TableRow>
            );
        });
    };

    const renderImageGallery = () => {
        if (isLoading) {
            return <Skeleton className="w-full h-full min-h-[400px]" />;
        }
        if (!lastCompletedMatch || !lastCompletedMatch.mediaUrls || lastCompletedMatch.mediaUrls.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
                </div>
            );
        }
        return (
            <Carousel
                opts={{
                    align: "start",
                    loop: true,
                }}
                className="w-full"
            >
                <CarouselContent>
                    {lastCompletedMatch.mediaUrls.map((url, index) => (
                        <CarouselItem key={index}>
                            <div className="relative aspect-video w-full">
                                <NextImage
                                    src={url}
                                    alt={`Recent match image ${index + 1}`}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 50vw"
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

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                    <div className="mr-4 hidden md:flex">
                        <Link href="/" className="mr-6 flex items-center space-x-2">
                           <Fish className="h-6 w-6" />
                           <span className="hidden font-bold sm:inline-block">
                             Match Manager
                           </span>
                        </Link>
                    </div>
                    <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                         <Button variant="ghost" asChild>
                            <Link href="/public/learn-more">Learn More</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/auth/login">Sign In</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto py-8">
                <div className="space-y-8">
                    {/* Filters Section */}
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Public Dashboard</h1>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="club-filter">Filter by Club</Label>
                                <Select onValueChange={handleClubChange} defaultValue="">
                                    <SelectTrigger id="club-filter">
                                        <SelectValue placeholder="All Clubs" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Clubs</SelectItem>
                                        {clubs.map(club => (
                                            <SelectItem key={club.id} value={club.id}>
                                                {club.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="flex-1 space-y-2">
                                <Label htmlFor="series-filter">Filter by Series (Results)</Label>
                                <Select value={filterSeries} onValueChange={setFilterSeries} disabled={seriesForFilter.length === 0}>
                                    <SelectTrigger id="series-filter">
                                        <SelectValue placeholder="All Series" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Series</SelectItem>
                                         {seriesForFilter.map(series => (
                                            <SelectItem key={series.id} value={series.id}>
                                                {series.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    
                    {/* Main Content Grids */}
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Upcoming Matches</CardTitle>
                                <CardDescription>The next few matches on the calendar.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Match</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Venue</TableHead>
                                            <TableHead>Actions</TableHead>
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
                                <CardTitle>Last Completed Match</CardTitle>
                                {isLoading ? <Skeleton className="h-5 w-48" /> : (
                                    <CardDescription>
                                        {lastCompletedMatch ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` : "No completed matches found"}
                                    </CardDescription>
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

                    {/* Full-width Gallery */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Match Gallery</CardTitle>
                            <CardDescription>Photos from the last completed match.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderImageGallery()}
                        </CardContent>
                    </Card>

                </div>
            </main>
        </>
    );
}
