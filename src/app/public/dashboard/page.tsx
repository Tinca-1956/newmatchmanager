
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { firestore } from '@/lib/firebase-client';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import type { Club } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function PublicDashboardPage() {
  const { toast } = useToast();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);

  // Effect to fetch the list of clubs
  useEffect(() => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not initialized.' });
      setIsLoadingClubs(false);
      return;
    }

    setIsLoadingClubs(true);
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setClubs(clubsData);
        setIsLoadingClubs(false);
    }, (error) => {
        console.error("Error fetching clubs: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs from the database.' });
        setIsLoadingClubs(false);
    });

    return () => unsubscribe();
  }, [toast]);


  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Public Dashboard</h1>
        <Button asChild>
          <Link href="/auth/login">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>View Match Results</CardTitle>
          <CardDescription>Select a club to view recent match results and upcoming events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="club-select">Select a Club</Label>
                {isLoadingClubs ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                        <SelectTrigger id="club-select">
                            <SelectValue placeholder="Select a club..." />
                        </SelectTrigger>
                        <SelectContent>
                            {clubs.length > 0 ? (
                                clubs.map((club) => (
                                    <SelectItem key={club.id} value={club.id}>
                                        {club.name}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>No clubs found</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* Placeholder for future content */}
            <div className="border-t pt-4 mt-4">
                <p className="text-center text-muted-foreground">Please select a club to see information.</p>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
