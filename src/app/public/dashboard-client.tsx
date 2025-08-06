
'use client';

import { useState } from 'react';
import { usePublicData } from '@/hooks/use-public-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format, isToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import NextImage from 'next/image';
import { MapPin, Trophy, Calendar, Clock, Image as ImageIcon } from 'lucide-react';
import PublicHeader from '@/components/public-header';

// Main Client Component
export default function DashboardClient() {
  const {
    clubs,
    selectedClubId,
    setSelectedClubId,
    upcomingMatches,
    lastCompletedMatch,
  } = usePublicData();
  
  const [showAll, setShowAll] = useState(false);
  const visibleMatches = showAll ? upcomingMatches : upcomingMatches.slice(0, 5);


  const renderUpcomingMatches = () => (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Upcoming Matches</CardTitle>
        <CardDescription>A schedule of upcoming events.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Series</TableHead>
              <TableHead>Match</TableHead>
              <TableHead>Venue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleMatches.length > 0 ? (
              visibleMatches.map(match => (
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
                      <span>{match.location}</span>
                      {isToday(match.date.toDate()) && <Badge variant="destructive">Today</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No upcoming matches scheduled.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {upcomingMatches.length > 5 && (
            <div className="text-center mt-4">
                <button 
                    onClick={() => setShowAll(!showAll)}
                    className="text-sm text-primary hover:underline"
                >
                    {showAll ? 'Show Less' : `Show ${upcomingMatches.length - 5} More`}
                </button>
            </div>
        )}
      </CardContent>
    </Card>
  );

  const renderRecentResults = () => {
    if (!lastCompletedMatch) {
      return (
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Recent Results</CardTitle>
            <CardDescription>Results from the last completed match.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
            <div className="text-center text-muted-foreground space-y-2">
              <Trophy className="h-10 w-10 mx-auto" />
              <p>No recent results found for this club.</p>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    const paidPlaces = 0; // Public view doesn't show paid places styling

    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Recent Results</CardTitle>
          <CardDescription>
            {lastCompletedMatch.seriesName} - {lastCompletedMatch.name}
          </CardDescription>
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
                {lastCompletedMatch.results
                    .sort((a,b) => (a.position || 999) - (b.position || 999))
                    .map(result => (
                        <TableRow key={result.userId} className={result.position && result.position <= paidPlaces ? 'bg-green-100 dark:bg-green-900/30' : ''}>
                            <TableCell>{result.position || '-'}</TableCell>
                            <TableCell className="font-medium">{result.userName}</TableCell>
                            <TableCell>{result.weight.toFixed(3)}kg</TableCell>
                        </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <>
      <PublicHeader />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="flex justify-end mb-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="club-filter">Filter by Club</Label>
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger id="club-filter" className="w-48">
                <SelectValue placeholder="All Clubs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-clubs">All Clubs</SelectItem>
                {clubs.map(club => (
                  <SelectItem key={club.id} value={club.id}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {renderUpcomingMatches()}
          {renderRecentResults()}
        </div>
      </main>
    </>
  );
}
