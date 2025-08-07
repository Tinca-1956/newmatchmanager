
'use client';

import { useState, useEffect } from 'react';
import { usePublicData } from '@/hooks/use-public-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight, Trophy, ImageIcon, AlertCircle } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
        </TableRow>
      ));
    }

    if (!lastCompletedMatch || lastCompletedMatch.results.length === 0) {
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

    const sortedResults = [...lastCompletedMatch.results].sort((a,b) => (a.position || 999) - (b.position || 999));
    const paidPlaces = lastCompletedMatch.paidPlaces || 0;

    return sortedResults.map(result => {
        const isPaidPlace = result.position !== null && paidPlaces > 0 && result.position <= paidPlaces;
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
            </TableRow>
        );
    });
  };

  const recentResultsTitle = lastCompletedMatch 
    ? `${lastCompletedMatch.clubName}: ${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` 
    : 'Last Completed Match';


  return (
    <>
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
            <p className="text-muted-foreground">
                View upcoming matches and recent results from all clubs.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <Label htmlFor="club-filter" className="text-nowrap">Filter by Club</Label>
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger id="club-filter" className="w-[220px]">
                    <SelectValue placeholder="Select a club" />
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

       <Alert variant="default" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">Welcome to Match Manager</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-400">
              This is a public dashboard. To manage your matches, please sign in or create an account. For information on adding your club, please click 'Learn more' above.
          </AlertDescription>
      </Alert>


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
        </div>

         <Card className="flex flex-col lg:col-span-1">
            <CardHeader>
                <CardTitle>Recent Results</CardTitle>
                 {isLoading ? (
                    <Skeleton className="h-5 w-48" />
                ) : (
                    <CardDescription>{!lastCompletedMatch ? "No completed matches found" : recentResultsTitle}</CardDescription>
                )}
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
             {lastCompletedMatch && (
                <CardFooter>
                    <p className="text-xs text-muted-foreground">
                        NOTE: Highlighted rows indicate paid places for this match.
                    </p>
                </CardFooter>
            )}
        </Card>
      </div>
    </div>
    </>
  );
}
