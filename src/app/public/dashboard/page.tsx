
'use client';

import { usePublicData } from '@/hooks/use-public-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import NextImage from 'next/image';
import { ArrowRight, Trophy } from 'lucide-react';
import PublicHeader from '@/components/public-header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


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
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
           <TableCell><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
      ));
    }

    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
            No upcoming matches found {selectedClubId !== 'all-clubs' && 'for this club'}.
          </TableCell>
        </TableRow>
      );
    }

    return upcomingMatches.map(match => (
      <TableRow key={match.id}>
        <TableCell>
            <div className="flex flex-col">
                <span className="font-medium">{format(match.date.toDate(), 'eee, dd MMM yyyy')}</span>
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(match.date.toDate(), { addSuffix: true })}</span>
            </div>
        </TableCell>
        <TableCell>{match.seriesName}</TableCell>
        <TableCell>{match.name}</TableCell>
        <TableCell>{match.location}</TableCell>
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
                        <p>Sign in to register or view more</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </TableCell>
      </TableRow>
    ));
  };

  const renderLastCompletedMatch = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
               <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-1 space-y-4">
               <Skeleton className="h-96 w-full" />
          </div>
        </div>
      );
    }
    
    if (!lastCompletedMatch) {
       return (
         <div className="text-center py-12 text-muted-foreground">
           <Trophy className="mx-auto h-12 w-12" />
           <p className="mt-4">No completed match results found.</p>
         </div>
       )
    }

    const paidPlaces = lastCompletedMatch.results.filter(r => r.payout && r.payout > 0).length || 3;

    return (
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <Card>
                <CardHeader>
                    <CardTitle>Last Completed Match: {lastCompletedMatch.name}</CardTitle>
                    <CardDescription>
                        {lastCompletedMatch.seriesName} at {lastCompletedMatch.location} - {format(lastCompletedMatch.date.toDate(), 'PPP')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pos</TableHead>
                                <TableHead>Angler</TableHead>
                                <TableHead>Weight</TableHead>
                                <TableHead>Peg</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lastCompletedMatch.results
                                .sort((a,b) => (a.position || 999) - (b.position || 999))
                                .map((result) => {
                                const isPaidPlace = result.position !== null && result.position <= paidPlaces;
                                return (
                                    <TableRow key={result.userId} className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}>
                                        <TableCell>
                                            <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                                                {result.position || '-'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{result.userName}</TableCell>
                                        <TableCell>{result.weight.toFixed(3)}kg</TableCell>
                                        <TableCell>{result.peg}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
          {lastCompletedMatch.mediaUrls && lastCompletedMatch.mediaUrls.length > 0 && (
             <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
                <CardDescription>Photos from the last match.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {lastCompletedMatch.mediaUrls.map((url) => (
                    <div key={url} className="relative aspect-square w-full">
                      <NextImage 
                        src={url}
                        alt="Match Photo"
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 15vw"
                        style={{ objectFit: 'cover' }}
                        className="rounded-md"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <PublicHeader />
      <main className="flex-1 bg-muted/40 p-4 lg:p-6">
        <div className="space-y-8 max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to Match Manager. View upcoming public matches and recent results.
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                      <CardTitle>Upcoming Matches</CardTitle>
                      <CardDescription>All publicly listed upcoming matches. Sign in to register.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                      <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={isLoading}>
                          <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Filter by club..." />
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
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Series</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderUpcomingMatches()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {renderLastCompletedMatch()}

        </div>
      </main>
    </>
  );
}
