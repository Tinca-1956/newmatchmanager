
'use client';

import { Suspense } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
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
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import NextImage from 'next/image';
import Link from 'next/link';
import { MapPin, Trophy, Calendar, Clock, Image as ImageIcon } from 'lucide-react';
import { usePublicData } from '@/hooks/use-public-data';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

function PublicDashboardContent() {
  const isMobile = useIsMobile();
  const {
    clubs,
    selectedClubId,
    setSelectedClubId,
    isLoading,
    upcomingMatches,
    lastCompletedMatch,
  } = usePublicData();

  const renderClubFilter = () => {
    if (isLoading && clubs.length === 0) {
      return <Skeleton className="h-10 w-48" />;
    }
    return (
      <div className="flex items-center gap-2">
        <Label htmlFor="club-filter" className="text-nowrap">Filter by Club</Label>
        <Select 
            value={selectedClubId} 
            onValueChange={setSelectedClubId}
            disabled={clubs.length === 0}
        >
          <SelectTrigger id="club-filter" className="w-[180px] sm:w-[220px]">
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
    );
  };

  const renderUpcomingMatches = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell>
        </TableRow>
      ));
    }

    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
            No upcoming matches scheduled.
          </TableCell>
        </TableRow>
      );
    }
    
    return upcomingMatches.map(match => (
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
                {match.googleMapsLink && (
                  <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                  </Link>
                )}
            </div>
        </TableCell>
        <TableCell><Badge variant="outline">{match.status}</Badge></TableCell>
      </TableRow>
    ));
  };
  
  const renderUpcomingCards = () => {
    if (isLoading) {
        return <Skeleton className="h-48 w-full" />
    }
    if (upcomingMatches.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg text-center p-4">
            <Calendar className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No upcoming matches scheduled.</p>
        </div>
      );
    }
    return (
      <Carousel
        opts={{
            align: "start",
            loop: upcomingMatches.length > 1,
        }}
        className="w-full"
      >
        <CarouselContent>
          {upcomingMatches.map((match) => (
            <CarouselItem key={match.id}>
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>{match.name}</CardTitle>
                        <CardDescription>{match.seriesName}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium text-foreground">{format(match.date.toDate(), 'eee, dd MMM yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{match.location}</span>
                        </div>
                         <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Draw: {match.drawTime}, Fishing: {match.startTime} - {match.endTime}</span>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Badge variant="outline">{match.status}</Badge>
                    </CardFooter>
                </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
         {upcomingMatches.length > 1 && (
            <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2"/>
            </>
        )}
      </Carousel>
    );
  }

  const renderRecentResults = () => {
     if (isLoading) {
        return <Skeleton className="h-96 w-full lg:col-span-2" />;
     }
     
     if (!lastCompletedMatch) {
        return (
            <Card className="lg:col-span-2 flex flex-col items-center justify-center min-h-[300px] text-center p-4 border-2 border-dashed">
                <Trophy className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">No recent match results have been published yet.</p>
            </Card>
        );
     }
     
     return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Recent Results: {lastCompletedMatch.name}</CardTitle>
                <CardDescription>
                    {lastCompletedMatch.seriesName} on {format(lastCompletedMatch.date.toDate(), 'PPP')} at {lastCompletedMatch.location}
                </CardDescription>
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
                         {lastCompletedMatch.results
                            .sort((a,b) => (a.position || 999) - (b.position || 999))
                            .map((result) => (
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
                         ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
     )
  }
  
  const renderRecentPhotos = () => {
    if (isLoading) {
        return <Skeleton className="h-96 w-full" />
    }
    if (!lastCompletedMatch || !lastCompletedMatch.mediaUrls || lastCompletedMatch.mediaUrls.length === 0) {
      return (
        <Card className="flex flex-col items-center justify-center min-h-[300px] text-center p-4 border-2 border-dashed">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No photos from the last match.</p>
        </Card>
      );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Photos</CardTitle>
                <CardDescription>From {lastCompletedMatch.name}</CardDescription>
            </CardHeader>
            <CardContent>
                <Carousel
                    opts={{ align: "start", loop: lastCompletedMatch.mediaUrls.length > 1 }}
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
                            style={{ objectFit: 'cover' }}
                            className="rounded-md"
                            />
                        </div>
                        </CarouselItem>
                    ))}
                    </CarouselContent>
                    {lastCompletedMatch.mediaUrls.length > 1 && (
                        <>
                            <CarouselPrevious className="left-2" />
                            <CarouselNext className="right-2" />
                        </>
                    )}
                </Carousel>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
          <p className="text-muted-foreground">
            Upcoming matches and recent results from all clubs.
          </p>
        </div>
        {renderClubFilter()}
      </div>

      {isMobile ? (
        <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-4">Upcoming Matches</h2>
              {renderUpcomingCards()}
            </div>
             <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-4">Latest Results</h2>
              {renderRecentResults()}
            </div>
             <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-4">Latest Photos</h2>
              {renderRecentPhotos()}
            </div>
        </div>
      ) : (
        <>
            <Card>
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
                            <TableHead>Status</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderUpcomingMatches()}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                {renderRecentResults()}
                {renderRecentPhotos()}
            </div>
        </>
      )}
    </div>
  );
}

export default function PublicDashboardPage() {
    return (
        <Suspense fallback={<div className="text-center p-12">Loading...</div>}>
            <PublicDashboardContent />
        </Suspense>
    )
}
