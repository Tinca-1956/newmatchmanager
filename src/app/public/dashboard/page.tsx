
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, LogIn, Trophy, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { usePublicData } from '@/hooks/use-public-data';
import type { PublicMatch } from '@/lib/types';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const formatAnglerName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return fullName;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    return `${firstName.charAt(0)}. ${lastName}`;
};


export default function PublicDashboardPage() {
    const { 
        clubs, 
        selectedClubId, 
        setSelectedClubId, 
        isLoading, 
        upcomingMatches, 
        completedMatches,
        uniqueSeries,
        selectedSeriesId,
        setSelectedSeriesId,
    } = usePublicData();
    
    const [latestMatch, setLatestMatch] = useState<PublicMatch | null>(null);

    useEffect(() => {
        if (completedMatches.length > 0) {
            const filteredBySeries = selectedSeriesId === 'all'
                ? completedMatches
                : completedMatches.filter(m => m.seriesId === selectedSeriesId);

            if (filteredBySeries.length > 0) {
                 // Already sorted by date descending in the hook
                setLatestMatch(filteredBySeries[0]);
            } else {
                // If filter clears all matches, show the absolute latest
                setLatestMatch(completedMatches[0]);
            }
        } else {
            setLatestMatch(null);
        }
    }, [completedMatches, selectedSeriesId]);

    const renderUpcomingMatches = () => {
        if (isLoading) {
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
                        <span>{format(match.date.toDate(), 'dd/MM/yyyy')}</span>
                        <span className="text-xs text-muted-foreground">{match.seriesName}</span>
                    </div>
                </TableCell>
                <TableCell className="font-medium">{match.name}</TableCell>
                <TableCell>{match.location}</TableCell>
                <TableCell className="text-right">
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
                </TableRow>
            ));
        }

        if (!latestMatch?.results || latestMatch.results.length === 0) {
             return (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Trophy className="h-8 w-8" />
                            <p>No recent results found.</p>
                        </div>
                    </TableCell>
                </TableRow>
            );
        }

        const sortedResults = [...latestMatch.results].sort((a, b) => (a.position || 999) - (b.position || 999));

        return sortedResults.slice(0, 10).map((result, index) => (
            <TableRow key={`${result.userId}-${index}`}>
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
        if (isLoading) {
            return <Skeleton className="w-full h-full min-h-[400px]" />
        }

        if (!latestMatch?.mediaUrls || latestMatch.mediaUrls.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">No photos from the last completed match.</p>
                    <p className="text-xs text-muted-foreground">An admin can upload photos from the match page.</p>
                </div>
            )
        }
        return (
          <Carousel
            opts={{
                align: "start",
                loop: true,
            }}
             className="w-full max-w-3xl mx-auto"
          >
            <CarouselContent className="-ml-1">
              {latestMatch.mediaUrls.map((url, index) => (
                <CarouselItem key={index} className="pl-1">
                  <div className="relative aspect-video w-full">
                    <NextImage
                      src={url}
                      alt={`Match image ${index + 1}`}
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

    const latestMatchTitle = latestMatch ? `${latestMatch.seriesName} - ${latestMatch.name}` : "Last Completed Match";

    return (
        <div className="min-h-screen bg-muted/40">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b bg-background">
                <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
                    <div className="flex gap-6 md:gap-10">
                        <Link href="/public/dashboard" className="flex items-center space-x-2">
                            <Trophy className="h-6 w-6" />
                            <span className="inline-block font-bold">Match Manager</span>
                        </Link>
                    </div>

                    <div className="flex flex-1 items-center justify-end space-x-4">
                        <nav className="flex items-center space-x-2">
                             <Link href="/public/learn-more" passHref>
                                <Button variant="ghost">Learn More</Button>
                             </Link>
                             <Link href="/auth/login" passHref>
                                <Button>
                                    <LogIn className="mr-2 h-4 w-4"/>
                                    Sign In
                                </Button>
                             </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Public Dashboard</h2>
                     <div className="flex items-center space-x-2">
                        <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={isLoading || clubs.length === 0}>
                            <SelectTrigger className="w-[200px] md:w-[250px]">
                                <SelectValue placeholder="Select a club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoading ? (
                                    <SelectItem value="loading" disabled>Loading clubs...</SelectItem>
                                ) : (
                                    clubs.map(club => (
                                        <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Upcoming Matches */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Upcoming Matches</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date & Series</TableHead>
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

                    {/* Last Completed Match */}
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Last Completed Match</CardTitle>
                            {isLoading ? (
                                <Skeleton className="h-5 w-48" />
                            ) : (
                                <CardDescription>{latestMatch ? latestMatchTitle : "No completed matches for this club"}</CardDescription>
                            )}
                            <div className="pt-2">
                                 <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId} disabled={isLoading || uniqueSeries.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter by Series..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Series</SelectItem>
                                        {uniqueSeries.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
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
                                <TableBody>
                                    {renderRecentResults()}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                     {/* Image Gallery */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Match Gallery</CardTitle>
                            <CardDescription>
                                {latestMatch ? `Photos from ${latestMatch.name}` : 'Photos from the last completed match.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center">
                           {renderImageGallery()}
                        </CardContent>
                    </Card>
                </div>

            </main>
        </div>
    )
}

    