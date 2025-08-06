
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, ArrowRight, ImageIcon, Fish } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import NextImage from 'next/image';
import Link from 'next/link';
import { usePublicData } from '@/hooks/use-public-data';

function DashboardClient() {
  const {
    clubs,
    selectedClubId,
    setSelectedClubId,
    isLoading,
    upcomingMatches,
    lastCompletedMatch,
  } = usePublicData();

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
          <TableCell>
            <Skeleton className="h-4 w-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-full" />
          </TableCell>
        </TableRow>
      ));
    }

    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
            No upcoming matches scheduled for this selection.
          </TableCell>
        </TableRow>
      );
    }

    return upcomingMatches.map((match) => (
      <TableRow key={match.id}>
        <TableCell>
          <div className="flex flex-col">
            <span>{format(match.date.toDate(), 'dd/MM/yyyy')}</span>
            <span className="text-xs text-muted-foreground">{match.seriesName}</span>
          </div>
        </TableCell>
        <TableCell className="font-medium">{match.name}</TableCell>
        <TableCell>{match.location}</TableCell>
      </TableRow>
    ));
  };

  const renderRecentResults = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-8" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-12" />
          </TableCell>
        </TableRow>
      ));
    }

    if (!lastCompletedMatch) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Trophy className="h-8 w-8" />
              <p>No recent results found for this selection.</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }
    
    const paidPlaces = 0; // Public results do not have this info

    return lastCompletedMatch.results.map((result) => {
      const isPaidPlace =
        result.position !== null &&
        paidPlaces > 0 &&
        result.position <= paidPlaces;
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
          <TableCell className="text-muted-foreground">
            {result.weight.toFixed(3)}kg
          </TableCell>
          <TableCell>
            <Badge variant={result.status === 'OK' ? 'outline' : 'secondary'}>
              {result.status}
            </Badge>
          </TableCell>
        </TableRow>
      );
    });
  };

  const renderImageGallery = () => {
    if (isLoading) {
      return <Skeleton className="w-full h-full min-h-[200px]" />;
    }
    if (!lastCompletedMatch || lastCompletedMatch.mediaUrls?.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
          <ImageIcon className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            No photos from the last match.
          </p>
        </div>
      );
    }
    return (
      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-1">
          {lastCompletedMatch.mediaUrls?.map((url, index) => (
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
  };
  
  const recentResultsTitle = lastCompletedMatch
    ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}`
    : 'No completed matches';

  return (
    <div className="flex flex-col min-h-screen">
       <header className="flex h-14 items-center gap-4 border-b bg-sidebar text-sidebar-foreground px-4 lg:h-[60px] lg:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <Fish className="h-6 w-6" />
          <span className="">Match Manager</span>
        </div>
        <div className="ml-auto">
          <Button asChild>
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </header>
       <main className="flex-1 p-4 lg:p-6 bg-muted/40">
            <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">MATCH MANAGER - PUBLIC DASHBOARD</h1>
                    <p className="text-muted-foreground">Welcome to the public dashboard. Select a club to view details.</p>
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="club-filter">Filter by Club</Label>
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={isLoading}>
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
            
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-4">
                <Card className="lg:col-span-2">
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

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Recent Results</CardTitle>
                         {isLoading ? (
                            <Skeleton className="h-5 w-48" />
                        ) : (
                            <CardDescription>{recentResultsTitle}</CardDescription>
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
                    {lastCompletedMatch && (
                        <CardFooter>
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/auth/login">
                                    Login for More Details
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    )}
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Recent Photos</CardTitle>
                        {isLoading ? (
                            <Skeleton className="h-5 w-32" />
                        ) : (
                            <CardDescription>{lastCompletedMatch?.mediaUrls?.length > 0 ? "From the last match" : "No recent photos"}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center">
                        {renderImageGallery()}
                    </CardContent>
                </Card>
            </div>
            </div>
       </main>
        <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
          Copyright EMANCIUM 2025 - All rights reserved
        </footer>
    </div>
  );
}

export default DashboardClient;
