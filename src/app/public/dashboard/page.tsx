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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MapPin, Trophy, ArrowRight, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { usePublicData } from '@/hooks/use-public-data';
import { Button } from '@/components/ui/button';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      return Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
        </TableRow>
      ));
    }
    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
            No upcoming matches found.
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
                <div>
                    <span>{match.location}</span>
                </div>
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
                        <p>Sign in for more details</p>
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
        </TableRow>
      ));
    }

    if (!lastCompletedMatch) {
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
    
    const paidPlaces = 0; // Public page doesn't show payouts

    return lastCompletedMatch.results.map(result => {
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

  const recentResultsTitle = lastCompletedMatch ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` : 'Last completed match';

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
                <p className="text-muted-foreground">
                View upcoming matches and recent results from all clubs.
                </p>
            </div>
             <div className="flex flex-col gap-1.5">
                <Label htmlFor="club-filter">Filter by Club</Label>
                <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                    <SelectTrigger id="club-filter" className="w-[220px]">
                        <SelectValue placeholder="Select a club..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all-clubs">All Clubs</SelectItem>
                        {isLoading ? (
                            <SelectItem value="loading" disabled>Loading clubs...</SelectItem>
                        ) : (
                            clubs.map((club) => (
                                <SelectItem key={club.id} value={club.id}>
                                    {club.name}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Matches</CardTitle>
                        <CardDescription>Publicly listed upcoming matches.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date &amp; Series</TableHead>
                                    <TableHead>Match</TableHead>
                                    <TableHead>Venue</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderUpcomingMatches()}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-1">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Recent Results</CardTitle>
                        {isLoading ? (
                            <Skeleton className="h-5 w-48" />
                        ) : (
                            <CardDescription>{lastCompletedMatch ? recentResultsTitle : "No completed matches"}</CardDescription>
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
                </Card>
            </div>
        </div>
      </div>
    </>
  );
}