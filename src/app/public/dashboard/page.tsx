
'use client';

import { useState, useEffect } from 'react';
import { usePublicData } from '@/hooks/use-public-data';
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import NextImage from 'next/image';
import { MapPin, Image as ImageIcon, Trophy } from 'lucide-react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Completed':
      return 'bg-blue-100 text-blue-800';
    case 'In Progress':
      return 'bg-green-100 text-green-800';
    case 'Weigh-in':
      return 'bg-yellow-100 text-yellow-800';
    case 'Cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatWeight = (weight: number) => {
  if (weight === 0) return '0.000kg';
  return `${weight.toFixed(3)}kg`;
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

  const renderUpcomingMatches = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
        </TableRow>
      ));
    }
    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            No upcoming matches found.
          </TableCell>
        </TableRow>
      );
    }
    return upcomingMatches.map((match) => (
      <TableRow key={match.id}>
        <TableCell>
          {format(new Date((match.date as Timestamp).seconds * 1000), 'dd/MM/yyyy')}
        </TableCell>
        <TableCell>{match.seriesName}</TableCell>
        <TableCell>{match.name}</TableCell>
        <TableCell>
          <Badge className={getStatusColor(match.status)}>{match.status}</Badge>
        </TableCell>
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
        </TableRow>
      ));
    }
    if (!lastCompletedMatch || lastCompletedMatch.results.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center">
            No recent results found.
          </TableCell>
        </TableRow>
      );
    }

    // Sort results by position before rendering
    const sortedResults = [...lastCompletedMatch.results].sort((a, b) => (a.position || 999) - (b.position || 999));


    return sortedResults.map((result, index) => (
      <TableRow
        key={result.userId}
        className={
          index < 3 && result.position ? 'bg-green-100 dark:bg-green-900/30' : ''
        }
      >
        <TableCell>{result.position}</TableCell>
        <TableCell className="font-medium">{result.userName}</TableCell>
        <TableCell>{formatWeight(result.weight)}</TableCell>
      </TableRow>
    ));
  };
  
  const renderImageGallery = () => {
    if (isLoading) {
        return <Skeleton className="w-full h-full min-h-[200px]" />
    }
    if (!lastCompletedMatch || !lastCompletedMatch.mediaUrls || lastCompletedMatch.mediaUrls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last completed match.</p>
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
            <p className="text-muted-foreground">
                Welcome! View public match schedules and recent results.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <Label htmlFor="club-filter" className="text-nowrap">Filter by Club</Label>
            <Select
                value={selectedClubId}
                onValueChange={setSelectedClubId}
                disabled={isLoading}
            >
                <SelectTrigger id="club-filter" className="w-52">
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
                    <TableHead>Date</TableHead>
                    <TableHead>Series</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderUpcomingMatches()}</TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1 hidden lg:block">
            <CardHeader>
              <CardTitle>Recent Photos</CardTitle>
              {isLoading ? (
                <Skeleton className="h-5 w-48" />
              ) : (
                <CardDescription>
                  {lastCompletedMatch ? `Photos from ${lastCompletedMatch.name}` : 'No recent photos'}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>{renderImageGallery()}</CardContent>
          </Card>
        </div>

        <Card className="flex flex-col lg:col-span-1">
          <CardHeader>
            <CardTitle>Last Completed Match</CardTitle>
            {isLoading ? (
                <Skeleton className="h-5 w-48" />
            ) : (
                <CardDescription>
                    {lastCompletedMatch
                        ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}`
                        : 'No completed matches found'}
                </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-grow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pos</TableHead>
                  <TableHead>Angler</TableHead>
                  <TableHead>Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderRecentResults()}</TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       <Card className="block lg:hidden">
          <CardHeader>
              <CardTitle>Recent Photos</CardTitle>
               {isLoading ? (
                <Skeleton className="h-5 w-48" />
              ) : (
                <CardDescription>
                  {lastCompletedMatch ? `Photos from ${lastCompletedMatch.name}` : 'No recent photos'}
                </CardDescription>
              )}
          </CardHeader>
          <CardContent>
              {renderImageGallery()}
          </CardContent>
        </Card>
    </div>
  );
}
