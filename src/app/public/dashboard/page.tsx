
'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePublicData } from '@/hooks/use-public-data';
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
} from "@/components/ui/carousel"
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PublicHeader from '@/components/public-header';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
        lastCompletedMatch,
    } = usePublicData();

  const router = useRouter();

  const handleGoToMatch = (matchId: string | null) => {
    if (matchId) {
      router.push(`/main/matches?matchId=${matchId}`);
    }
  };

  const renderUpcomingMatches = () => {
    if (isLoading) {
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
            No upcoming matches scheduled.
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
        <TableCell>
             <div className="flex items-center gap-2">
                <div>
                    <span>{match.location}</span>
                </div>
            </div>
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

    if (!lastCompletedMatch || lastCompletedMatch.results.length === 0) {
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

    return lastCompletedMatch.results
        .sort((a,b) => (a.position || 999) - (b.position || 999))
        .map(result => {
            const isPaidPlace = result.position !== null && lastCompletedMatch.paidPlaces > 0 && result.position <= 2;
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
  
  const recentResultsTitle = lastCompletedMatch?.seriesName && lastCompletedMatch?.name 
    ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` 
    : 'Last completed match'

  const renderImageGallery = () => {
    if (isLoading) {
        return <Skeleton className="w-full h-full min-h-[200px]" />
    }
    if (!lastCompletedMatch || !lastCompletedMatch.mediaUrls || lastCompletedMatch.mediaUrls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
                 <p className="text-xs text-muted-foreground">A club admin can upload photos from the matches page.</p>
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
          {lastCompletedMatch.mediaUrls.map((url, index) => (
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
      <PublicHeader />
      <main className="flex-1 bg-muted/40">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-muted-foreground">
                        Welcome to the public match dashboard.
                    </p>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="club-filter">Filter by Club:</Label>
                        <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={isLoading || clubs.length === 0}>
                            <SelectTrigger id="club-filter" className="w-[220px]">
                                <SelectValue placeholder="Select a club..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all-clubs">All Clubs</SelectItem>
                                {clubs.map(club => (
                                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>


          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2 grid auto-rows-min gap-6">
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
                                    <TableHead>Venue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderUpcomingMatches()}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-1 hidden lg:block">
                  <CardHeader>
                      <CardTitle>Recent Photos</CardTitle>
                      <CardDescription>Photos from the last completed match.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {renderImageGallery()}
                  </CardContent>
                </Card>

            </div>

             <Card className="flex flex-col lg:col-span-1">
                <CardHeader>
                    <CardTitle>Recent Results</CardTitle>
                     {isLoading ? (
                        <Skeleton className="h-5 w-48" />
                    ) : (
                        <CardDescription>{!lastCompletedMatch ? "No completed matches" : recentResultsTitle}</CardDescription>
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
                {lastCompletedMatch?.id && (
                    <CardFooter>
                        <Button asChild variant="outline" className="w-full" disabled>
                            <Link href="#">
                                View Full Details (Coming Soon)
                            </Link>
                        </Button>
                    </CardFooter>
                )}
            </Card>
          </div>

           <Card className="block lg:hidden">
              <CardHeader>
                  <CardTitle>Recent Photos</CardTitle>
                  <CardDescription>Photos from the last completed match.</CardDescription>
              </CardHeader>
              <CardContent>
                  {renderImageGallery()}
              </CardContent>
            </Card>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
          Copyright EMANCIUM 2025 - All rights reserved
        </footer>
    </div>
  );
}

    