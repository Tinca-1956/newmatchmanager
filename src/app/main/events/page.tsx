
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { format } from 'date-fns';
import type { Match } from '@/lib/types';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

export default function EventsPage() {
  const { userProfile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.primaryClubId || !firestore) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    // Query without ordering to simplify security rules
    const matchesQuery = query(
      collection(firestore, 'matches'),
      where('clubId', '==', userProfile.primaryClubId)
    );

    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: (data.date as Timestamp).toDate(),
        } as Match;
      });
      
      // Sort the matches on the client-side
      matchesData.sort((a, b) => b.date.getTime() - a.date.getTime());

      setMatches(matchesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching matches:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const renderMatchList = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        </TableRow>
      ));
    }

    if (matches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="h-24 text-center">
            No events (matches) found for your primary club.
          </TableCell>
        </TableRow>
      );
    }

    return matches.map(match => (
      <TableRow key={match.id}>
        <TableCell className="font-medium">{match.seriesName}</TableCell>
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
        <TableCell>{format(match.date, 'dd/MM/yyyy')}</TableCell>
        <TableCell><Badge variant="outline">{match.status}</Badge></TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground">A list of all matches for your primary club.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Match List</CardTitle>
          <CardDescription>All upcoming and past events.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Series</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderMatchList()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
