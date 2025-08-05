

'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePublicData } from '@/hooks/use-public-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy, LogIn, BookOpen } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

const formatAnglerName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return fullName;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    return `${firstName.charAt(0)}. ${lastName}`;
}

export default function PublicDashboardPage() {
  const { 
    clubs, 
    selectedClubId, 
    setSelectedClubId, 
    isLoading, 
    upcomingMatches,
    lastCompletedMatch 
  } = usePublicData();

  const handleClubChange = (clubId: string) => {
    if (clubId === 'all-clubs') {
        setSelectedClubId('');
    } else {
        setSelectedClubId(clubId);
    }
  };

  const renderUpcomingMatches = () => {
    if (isLoading) {
      return (
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-full" /></TableCell>
              <TableCell><Skeleton className="h-8 w-8" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (upcomingMatches.length === 0) {
      return (
        <TableBody>
            <TableRow>
            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No upcoming matches scheduled for this club.
            </TableCell>
            </TableRow>
        </TableBody>
      );
    }

    return (
        <TableBody>
            {upcomingMatches.map(match => (
            <TableRow key={match.id}>
                <TableCell>
                    <div className="flex flex-col">
                        <span className="font-medium">{format(match.date.toDate(), 'dd/MM/yyyy')}</span>
                        <span className="text-xs text-muted-foreground">{match.seriesName}</span>
                    </div>
                </TableCell>
                <TableCell>{match.name}</TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <span>{match.location}</span>
                    </div>
                </TableCell>
                <TableCell className="text-right">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" asChild>
                                    <Link href="/auth/login">
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Login to register</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
    );
  };

  const renderRecentResults = () => {
    if (isLoading) {
      return (
         <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                </TableRow>
            ))}
        </TableBody>
      );
    }

    if (!lastCompletedMatch || lastCompletedMatch.results.length === 0) {
      return (
        <TableBody>
            <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Trophy className="h-8 w-8" />
                        <p>No recent results found.</p>
                    </div>
                </TableCell>
            </TableRow>
        </TableBody>
      );
    }

    return (
        <TableBody>
            {lastCompletedMatch.results.slice(0, 10).map((result, index) => (
                <TableRow key={index}>
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
            ))}
        </TableBody>
    );
  };
  
  const recentResultsTitle = useMemo(() => {
    if (!lastCompletedMatch) return "No completed matches";
    const { seriesName, name } = lastCompletedMatch;
    return seriesName && name ? `${seriesName} - ${name}` : 'Last completed match';
  }, [lastCompletedMatch]);

  const renderImageGallery = () => {
    if (isLoading) {
        return <Skeleton className="w-full h-64" />;
    }
    if (!lastCompletedMatch || !lastCompletedMatch.mediaUrls || lastCompletedMatch.mediaUrls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
                <p className="text-xs text-muted-foreground">The club administrator can upload photos from the matches page.</p>
            </div>
        )
    }

    return (
      <Carousel
        opts={{
            align: "start",
            loop: true,
        }}
         className="w-full max-w-lg mx-auto"
      >
        <CarouselContent className="-ml-1">
          {lastCompletedMatch.mediaUrls.map((url, index) => (
            <CarouselItem key={index} className="pl-1">
              <div className="relative aspect-video w-full">
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
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container h-14 flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">Public Dashboard</h1>
            <div className="flex items-center gap-2">
                 <Button variant="ghost" asChild>
                    <Link href="/public/learn-more">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Learn More
                    </Link>
                </Button>
                <Button asChild>
                    <Link href="/auth/login">
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In
                    </Link>
                </Button>
            </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <p className="text-muted-foreground">
                    View upcoming matches and recent results from any club.
                </p>
                <div className="flex items-center gap-2">
                    <label htmlFor="club-filter" className="text-sm font-medium">Club:</label>
                    <Select value={selectedClubId || 'all-clubs'} onValueChange={handleClubChange} disabled={isLoading}>
                        <SelectTrigger id="club-filter" className="w-[200px]">
                            <SelectValue placeholder="Select a club..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all-clubs">All Clubs</SelectItem>
                            {clubs.map((club) => (
                                <SelectItem key={club.id} value={club.id}>
                                    {club.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Upcoming Matches</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date &amp; Series</TableHead>
                                    <TableHead>Match</TableHead>
                                    <TableHead>Venue</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            {renderUpcomingMatches()}
                        </Table>
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Last Completed Match</CardTitle>
                        {isLoading ? (
                            <Skeleton className="h-5 w-48" />
                        ) : (
                            <CardDescription>{recentResultsTitle}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="p-0 flex-grow">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Pos</TableHead>
                                    <TableHead>Angler</TableHead>
                                    <TableHead>Weight</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                           {renderRecentResults()}
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-full">
                 <CardHeader>
                    <CardTitle>Match Gallery</CardTitle>
                     {isLoading ? (
                        <Skeleton className="h-5 w-32" />
                    ) : (
                        <CardDescription>
                            {lastCompletedMatch?.mediaUrls && lastCompletedMatch.mediaUrls.length > 0
                                ? `Photos from ${recentResultsTitle}`
                                : 'No recent photos'
                            }
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="flex items-center justify-center min-h-[300px]">
                    {renderImageGallery()}
                </CardContent>
            </Card>

        </div>
      </main>
    </>
  );
}
