
'use client';

import { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, MoreHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, addDoc, onSnapshot, doc, updateDoc, query, where, getDocs, getDoc, orderBy, Timestamp } from 'firebase/firestore';
import type { Match, Series, User, Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/use-admin-auth';

export default function MatchesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [clubName, setClubName] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(true);

  // Effect to get the user's primary club or all clubs for admin
  useEffect(() => {
    if (adminLoading || !user || !firestore) return;

    const fetchInitialData = async () => {
        setIsLoading(true);
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (isSiteAdmin) {
                const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
                const clubsSnapshot = await getDocs(clubsQuery);
                const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
                setClubs(clubsData);
                setSelectedClubId(userData.primaryClubId || (clubsData.length > 0 ? clubsData[0].id : ''));
            } else {
                setSelectedClubId(userData.primaryClubId || '');
            }
        }
        // No need to set loading false here, the next effect will do it.
    };

    fetchInitialData();
  }, [user, isSiteAdmin, adminLoading, toast]);
  

  // Effect to fetch matches for the selected club
  useEffect(() => {
    if (!selectedClubId || !firestore) {
        setIsLoading(false);
        setMatches([]);
        return;
    }

    setIsLoading(true);

    const clubDocRef = doc(firestore, 'clubs', selectedClubId);
    const unsubscribeClub = onSnapshot(clubDocRef, (clubDoc) => {
      setClubName(clubDoc.exists() ? clubDoc.data().name : 'Selected Club');
    });

    const matchesQuery = query(
      collection(firestore, 'matches'),
      where('clubId', '==', selectedClubId),
      orderBy('date', 'desc')
    );

    const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Match));
      setMatches(matchesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching matches: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch matches.' });
      setIsLoading(false);
    });

    return () => {
        unsubscribeClub();
        unsubscribeMatches();
    };
  }, [selectedClubId, toast]);

  const renderMatchList = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
        </TableRow>
      ));
    }

    if (matches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="h-24 text-center">
            No matches found for this club.
          </TableCell>
        </TableRow>
      );
    }

    return matches.map((match) => (
      <TableRow key={match.id}>
        <TableCell>{format(match.date, 'PPP')}</TableCell>
        <TableCell className="font-medium">{match.seriesName}</TableCell>
        <TableCell>{match.location}</TableCell>
        <TableCell><Badge variant="outline">{match.status}</Badge></TableCell>
        <TableCell>
          {/* Actions Dropdown can be added here */}
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    ));
  };
  
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
          <p className="text-muted-foreground">View and manage all matches.</p>
        </div>
        <div className="flex items-center gap-4">
             {isSiteAdmin && (
                <div className="flex items-center gap-2">
                    <Label htmlFor="club-filter" className="text-nowrap">Club</Label>
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                        <SelectTrigger id="club-filter" className="w-52">
                            <SelectValue placeholder="Select a club..." />
                        </SelectTrigger>
                        <SelectContent>
                            {clubs.map((club) => (
                                <SelectItem key={club.id} value={club.id}>
                                    {club.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <Button disabled={!selectedClubId}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Match
            </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{clubName} Matches</CardTitle>
          <CardDescription>A list of all past and upcoming matches for the selected club.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
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
