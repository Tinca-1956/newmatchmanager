
'use client';

import { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy, Calendar, Users, BarChart2 } from 'lucide-react';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePublicData } from '@/hooks/use-public-data';
import { format, parseISO } from 'date-fns';
import type { PublicMatch, PublicUpcomingMatch } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';


function PublicDashboardContent() {
  const { 
    clubs, 
    selectedClubId, 
    setSelectedClubId, 
    isLoading, 
    upcomingMatches, 
    lastCompletedMatch 
  } = usePublicData();
  const [isClient, setIsClient] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    // Timestamps from Firestore can be objects with seconds and nanoseconds
    if (timestamp.seconds) {
      return format(new Date(timestamp.seconds * 1000), 'dd/MM/yyyy');
    }
    // Fallback for string or number dates
    try {
        const date = new Date(timestamp);
        if(!isNaN(date.getTime())) {
            return format(date, 'dd/MM/yyyy');
        }
    } catch (e) {
        // ignore
    }
    return 'Invalid Date';
  };

  const formatAnglerName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return fullName;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    return `${firstName.charAt(0)}. ${lastName}`;
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
        <TableCell>{formatTimestamp(match.date)}</TableCell>
        <TableCell>{match.seriesName}</TableCell>
        <TableCell className="font-medium">{match.name}</TableCell>
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

    if (!lastCompletedMatch || !lastCompletedMatch.results || lastCompletedMatch.results.length === 0) {
      return (
        <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Trophy className="h-8 w-8" />
                    <p>No recent results found.</p>
                </div>
            </TableCell>
        </TableRow>
      );
    }

    return lastCompletedMatch.results.map(result => {
        const isPaidPlace = result.position !== null && lastCompletedMatch.paidPlaces > 0 && result.position <= lastCompletedMatch.paidPlaces;
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
  
  const recentResultsTitle = lastCompletedMatch ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` : 'Last completed match'

  const renderImageGallery = () => {
    if (isLoading) {
        return <Skeleton className="w-full h-full min-h-[200px]" />
    }
    if (!lastCompletedMatch || !lastCompletedMatch.mediaUrls || lastCompletedMatch.mediaUrls.length === 0) {
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

  const gridContent = (
    <>
      <Card className="lg:col-span-2">
          <CardHeader>
              <CardTitle>Upcoming Matches</CardTitle>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Series</TableHead>
                          <TableHead>Match</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {renderUpcomingMatches()}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
      <Card className="lg:col-span-1">
        <CardHeader>
            <CardTitle>Recent Results</CardTitle>
              {isLoading ? (
                <Skeleton className="h-5 w-48" />
            ) : (
                <CardDescription>{!lastCompletedMatch ? "No completed matches" : recentResultsTitle}</CardDescription>
            )}
        </CardHeader>
        <CardContent>
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
      <Card className="lg:col-span-3">
          <CardHeader>
              <CardTitle>Recent Photos</CardTitle>
              <CardDescription>Photos from the last completed match.</CardDescription>
          </CardHeader>
          <CardContent>
              {renderImageGallery()}
          </CardContent>
      </Card>
    </>
  );

  return (
    <div className="flex flex-col gap-8 p-4 lg:p-8 bg-muted/40">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome! View upcoming matches and recent results from all clubs.
        </p>
      </div>

       <div className="flex items-center gap-4">
        <Label htmlFor="club-filter" className="text-nowrap">Filter by Club</Label>
        {isLoading ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger id="club-filter" className="w-48">
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
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {gridContent}
      </div>
    </div>
  );
}


export default function PublicDashboardPage() {
    return (
        <Suspense fallback={<div className="w-full h-96 flex justify-center items-center"><Skeleton className="h-24 w-1/2" /></div>}>
            <PublicDashboardContent />
        </Suspense>
    )
}
