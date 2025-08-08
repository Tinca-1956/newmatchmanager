
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { usePublicData } from '@/hooks/use-public-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import NextImage from 'next/image';
import { MapPin, Trophy, ArrowRight, ImageIcon } from 'lucide-react';
import Link from 'next/link';

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
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
        </TableRow>
      ));
    }
    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center">
            No upcoming matches scheduled.
          </TableCell>
        </TableRow>
      );
    }
    return upcomingMatches.map(match => (
      <TableRow key={match.id}>
        <TableCell>{format(new Date(match.date.seconds * 1000), 'dd/MM/yyyy')}</TableCell>
        <TableCell>{match.name}</TableCell>
        <TableCell>{match.location}</TableCell>
      </TableRow>
    ));
  };
  
  const renderRecentResults = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
      ));
    }
    if (!lastCompletedMatch) {
        return (
            <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                    <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2">No recent results found.</p>
                </TableCell>
            </TableRow>
        );
    }
    const paidPlaces = lastCompletedMatch.paidPlaces || 0;
    
    return lastCompletedMatch.results
        .sort((a,b) => (a.position || 999) - (b.position || 999))
        .map(result => {
             const isPaidPlace = result.position !== null && paidPlaces > 0 && result.position <= paidPlaces;
             return (
                <TableRow key={result.userId} className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}>
                    <TableCell>
                         <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                           {result.position || '-'}
                         </div>
                    </TableCell>
                    <TableCell className="font-medium">{result.userName}</TableCell>
                    <TableCell>{result.weight.toFixed(3)}kg</TableCell>
                </TableRow>
             )
        });
  };

  const renderRecentPhotos = () => {
    if (isLoading || !lastCompletedMatch) {
        return (
             <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
            </div>
        )
    }
     if (lastCompletedMatch.mediaUrls && lastCompletedMatch.mediaUrls.length > 0) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {lastCompletedMatch.mediaUrls.slice(0, 6).map((url, index) => (
                    <div key={index} className="relative aspect-square w-full">
                        <NextImage
                          src={url}
                          alt={`Recent match image ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          style={{ objectFit: 'cover' }}
                          className="rounded-md"
                        />
                    </div>
                ))}
            </div>
        )
     }
      return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
            </div>
        )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome! View public match results and upcoming events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="club-filter">Filter by Club</Label>
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger id="club-filter" className="w-[180px]">
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

             <Card>
                <CardHeader>
                    <CardTitle>Recent Photos</CardTitle>
                </CardHeader>
                <CardContent>
                   {renderRecentPhotos()}
                </CardContent>
            </Card>

         </div>

        <Card className="flex flex-col lg:col-span-1">
            <CardHeader>
                <CardTitle>Recent Results</CardTitle>
                <CardDescription>
                    {isLoading ? <Skeleton className="h-5 w-48" /> : (
                        lastCompletedMatch ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` : 'No completed matches'
                    )}
                </CardDescription>
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
                    <TableBody>
                        {renderRecentResults()}
                    </TableBody>
                </Table>
            </CardContent>
             {lastCompletedMatch && (
                <CardFooter>
                    <Button asChild variant="outline" className="w-full" disabled>
                        <Link href="#">
                            View Full Details (Coming Soon)
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
            )}
        </Card>
      </div>
    </div>
  );
}
