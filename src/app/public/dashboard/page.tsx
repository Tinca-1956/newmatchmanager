
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { usePublicData } from '@/hooks/use-public-data';
import { Trophy, Calendar, MapPin, Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';
import Link from 'next/link';

export default function PublicDashboard() {
  const {
    clubs,
    selectedClubId,
    setSelectedClubId,
    isLoading,
    upcomingMatches,
    lastCompletedMatch,
  } = usePublicData();
  
  const lastMatchPaidPlaces = lastCompletedMatch?.paidPlaces || 0;

  const renderUpcomingMatches = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="bg-muted/30">
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ));
    }

    if (upcomingMatches.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-center border border-dashed rounded-lg">
          <Calendar className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No upcoming matches found.</p>
        </div>
      );
    }

    return upcomingMatches.map((match) => (
      <Card key={match.id} className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">{match.name}</CardTitle>
          <CardDescription>{match.seriesName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(match.date.toDate(), 'eee, dd MMM yyyy')} at {match.drawTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{match.location}</span>
          </div>
        </CardContent>
      </Card>
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

    if (!lastCompletedMatch || lastCompletedMatch.results.length === 0) {
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

    return lastCompletedMatch.results.map((result) => {
      const isPaidPlace =
        result.position !== null &&
        lastMatchPaidPlaces > 0 &&
        result.position <= lastMatchPaidPlaces;

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
    if (
      !lastCompletedMatch ||
      !lastCompletedMatch.mediaUrls ||
      lastCompletedMatch.mediaUrls.length === 0
    ) {
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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Public Dashboard
          </h1>
          <p className="text-muted-foreground">
            Upcoming matches and recent results from all clubs.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label htmlFor="club-filter" className="text-nowrap">
            Filter by Club
          </Label>
          <Select
            value={selectedClubId}
            onValueChange={setSelectedClubId}
            disabled={isLoading}
          >
            <SelectTrigger id="club-filter" className="w-full sm:w-[200px]">
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 grid auto-rows-min gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Matches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderUpcomingMatches()}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1 hidden lg:block">
            <CardHeader>
              <CardTitle>Recent Photos</CardTitle>
              <CardDescription>
                Photos from the last completed match.
              </CardDescription>
            </CardHeader>
            <CardContent>{renderImageGallery()}</CardContent>
          </Card>
        </div>

        <Card className="flex flex-col lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Results</CardTitle>
            {isLoading ? (
              <Skeleton className="h-5 w-48" />
            ) : (
              <CardDescription>
                {lastCompletedMatch?.name || 'No completed matches'}
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
              <TableBody>{renderRecentResults()}</TableBody>
            </Table>
          </CardContent>
          {lastCompletedMatch && (
             <CardFooter className="justify-center border-t pt-4">
              <Button asChild variant="link">
                <Link href={`/public/match/${lastCompletedMatch.id}`}>View Full Details</Link>
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      <Card className="block lg:hidden">
        <CardHeader>
          <CardTitle>Recent Photos</CardTitle>
          <CardDescription>
            Photos from the last completed match.
          </CardDescription>
        </CardHeader>
        <CardContent>{renderImageGallery()}</CardContent>
      </Card>
    </div>
  );
}
