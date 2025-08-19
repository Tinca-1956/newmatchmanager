'use client';

import { useState, useEffect, Suspense } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy as TrophyIcon, ListFilter } from 'lucide-react';
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
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { usePublicData } from '@/hooks/use-public-data';
import { useIsMobile } from '@/hooks/use-mobile';
import PublicHeader from '@/components/public-header';
import PublicFooter from '@/components/public-footer';

function PublicDashboardContent() {
  const { 
    clubs, 
    selectedClubId, 
    setSelectedClubId, 
    isLoading, 
    upcomingMatches, 
    lastCompletedMatch 
  } = usePublicData();
  
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);


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
          <TableCell colSpan={3}><Skeleton className="h-5 w-full" /></TableCell>
        </TableRow>
      ));
    }
    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
            No upcoming matches published.
          </TableCell>
        </TableRow>
      );
    }
    return upcomingMatches.map(match => (
      <TableRow key={match.id}>
        <TableCell>{format((match.date as any).toDate(), 'dd/MM/yyyy')}</TableCell>
        <TableCell>{match.seriesName}</TableCell>
        <TableCell>{match.name} at {match.location}</TableCell>
      </TableRow>
    ));
  };

  const renderRecentResults = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
        </TableRow>
      ));
    }
    if (!lastCompletedMatch?.results || lastCompletedMatch.results.length === 0) {
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
    return lastCompletedMatch.results.map(result => {
      const isPaidPlace = result.position !== null && lastCompletedMatch.paidPlaces > 0 && result.position <= lastCompletedMatch.paidPlaces;
      return (
        <TableRow key={result.userId} className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}>
          <TableCell><div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">{result.position || '-'}</div></TableCell>
          <TableCell className="font-medium">{formatAnglerName(result.userName)}</TableCell>
          <TableCell className="text-muted-foreground">{result.weight.toFixed(3)}kg</TableCell>
          <TableCell><Badge variant={result.status === 'OK' ? 'outline' : 'secondary'}>{result.status}</Badge></TableCell>
        </TableRow>
      );
    });
  };
  
  const renderImageGallery = () => {
     if (isLoading) {
        return <Skeleton className="w-full h-full min-h-[200px]" />
    }
    if (!lastCompletedMatch?.mediaUrls || lastCompletedMatch.mediaUrls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
            </div>
        )
    }
    return (
      <Carousel opts={{ align: "start", loop: true, }} className="w-full">
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
  };
  
  const recentResultsTitle = lastCompletedMatch ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` : 'Last completed match';

  const desktopView = (
     <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 grid auto-rows-min gap-6">
            <Card>
                <CardHeader><CardTitle>Upcoming Matches</CardTitle></CardHeader>
                <CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Series</TableHead><TableHead>Match</TableHead></TableRow></TableHeader><TableBody>{renderUpcomingMatches()}</TableBody></Table></CardContent>
            </Card>
            <Card className="lg:col-span-1 hidden lg:block">
              <CardHeader><CardTitle>Recent Photos</CardTitle><CardDescription>Photos from the last completed match.</CardDescription></CardHeader>
              <CardContent>{renderImageGallery()}</CardContent>
            </Card>
        </div>
         <Card className="flex flex-col lg:col-span-1">
            <CardHeader><CardTitle>Recent Results</CardTitle><CardDescription>{isLoading ? <Skeleton className="h-5 w-48" /> : (lastCompletedMatch ? recentResultsTitle : "No completed matches")}</CardDescription></CardHeader>
            <CardContent className="flex-grow"><Table><TableHeader><TableRow><TableHead className="w-[50px]">Pos</TableHead><TableHead>Angler</TableHead><TableHead>Weight</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{renderRecentResults()}</TableBody></Table></CardContent>
             {lastCompletedMatch && (<CardFooter><Button asChild variant="outline" className="w-full"><Link href={`/public/match-results/${lastCompletedMatch.id}`}>View Full Details<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardFooter>)}
        </Card>
         <Card className="block lg:hidden">
          <CardHeader><CardTitle>Recent Photos</CardTitle><CardDescription>Photos from the last completed match.</CardDescription></CardHeader>
          <CardContent>{renderImageGallery()}</CardContent>
        </Card>
      </div>
  );

  const mobileView = (
      <div className="grid gap-6">
           <Card>
                <CardHeader><CardTitle>Upcoming Matches</CardTitle></CardHeader>
                <CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Series</TableHead><TableHead>Match</TableHead></TableRow></TableHeader><TableBody>{renderUpcomingMatches()}</TableBody></Table></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Recent Results</CardTitle><CardDescription>{isLoading ? <Skeleton className="h-5 w-48" /> : (lastCompletedMatch ? recentResultsTitle : "No completed matches")}</CardDescription></CardHeader>
                <CardContent><Table><TableHeader><TableRow><TableHead className="w-[50px]">Pos</TableHead><TableHead>Angler</TableHead><TableHead>Weight</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{renderRecentResults()}</TableBody></Table></CardContent>
                 {lastCompletedMatch && (<CardFooter><Button asChild variant="outline" className="w-full"><Link href={`/public/match-results/${lastCompletedMatch.id}`}>View Full Details<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardFooter>)}
            </Card>
            <Card>
                <CardHeader><CardTitle>Recent Photos</CardTitle><CardDescription>Photos from the last completed match.</CardDescription></CardHeader>
                <CardContent>{renderImageGallery()}</CardContent>
            </Card>
      </div>
  );


  return (
    <>
      <PublicHeader />
      <main className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
            <p className="text-muted-foreground">Welcome! View upcoming matches and recent results from all clubs.</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="club-filter" className="text-nowrap">Filter by Club</Label>
            {isLoading ? <Skeleton className="h-10 w-48" /> : (
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger id="club-filter" className="w-48">
                  <SelectValue placeholder="Filter by club..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-clubs">All Clubs</SelectItem>
                  {clubs.map(club => (
                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        {isClient && isMobile ? mobileView : desktopView}

      </main>
      <PublicFooter />
    </>
  );
}

export default function PublicDashboardPage() {
    return (
        <Suspense fallback={<div className="w-full h-screen flex justify-center items-center"><p>Loading...</p></div>}>
            <PublicDashboardContent />
        </Suspense>
    );
}