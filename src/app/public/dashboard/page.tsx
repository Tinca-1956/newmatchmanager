
'use client';

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
import { MapPin, ArrowRight, Trophy, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePublicData } from '@/hooks/use-public-data';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
    lastCompletedMatch,
  } = usePublicData();

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
            No upcoming matches scheduled for this selection.
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
              <span className="text-xs text-muted-foreground block">{match.status}</span>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button asChild variant="ghost" size="icon">
                             <Link href="/auth/login">
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Login to register or see more</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
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
              <Trophy className="h-8 w-8" />
              <p>No recent results found.</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    const sortedResults = [...lastCompletedMatch.results].sort((a, b) => (a.position || 999) - (b.position || 999));

    return sortedResults.slice(0, 10).map(result => {
        const isPaidPlace = false; // Simplified for public view
        return (
            <TableRow key={result.userId}>
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

  const renderImageGallery = () => {
    if (isLoading) {
      return <Skeleton className="w-full h-full min-h-[200px]" />;
    }
    if (!lastCompletedMatch || !lastCompletedMatch.mediaUrls || lastCompletedMatch.mediaUrls.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
          <ImageIcon className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
        </div>
      );
    }
    return (
      <Carousel
        opts={{ align: 'start', loop: true }}
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
  
  const resultsTitle = lastCompletedMatch 
    ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}`
    : 'Last Completed Match';
    
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
          <p className="text-muted-foreground">
            A public overview of matches and results.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 min-w-[200px]">
            <Label htmlFor="club-filter">Filter by Club</Label>
            <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={isLoading}>
                <SelectTrigger id="club-filter">
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
                  <TableHead>Venue &amp; Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
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
              <CardDescription>{lastCompletedMatch ? resultsTitle : 'No completed matches'}</CardDescription>
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
              <CardDescription>{lastCompletedMatch?.mediaUrls?.length ? 'From the last match' : 'No recent photos'}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
            {renderImageGallery()}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
