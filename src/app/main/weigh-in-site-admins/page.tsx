
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Scale, ArrowRight, Terminal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, query, where, getDocs, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import type { Match, Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function WeighInSelectionPage() {
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [matches, setMatches] = useState<Match[]>([]);
  const [clubName, setClubName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch matches for the user's primary club
  useEffect(() => {
    if (!firestore || !userProfile?.primaryClubId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const clubDocRef = doc(firestore, 'clubs', userProfile.primaryClubId);
    getDoc(clubDocRef).then(doc => {
      if (doc.exists()) {
        setClubName(doc.data().name);
      }
    });

    const matchesQuery = query(collection(firestore, 'matches'), where('clubId', '==', userProfile.primaryClubId));
    
    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: (data.date as Timestamp).toDate(),
        } as Match;
      });

      setMatches(matchesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching matches: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch matches for your primary club.' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, toast]);

  const handleGoToWeighIn = (matchId: string) => {
    router.push(`/main/matches/${matchId}/weigh-in`);
  };
  
  if (adminLoading) {
    return <Skeleton className="w-full h-96" />;
  }
  
  if (!isSiteAdmin) {
    return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
                You do not have permission to access this page.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Weigh-in Selection</h1>
            <p className="text-muted-foreground">Select a match to manage its weigh-in.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Matches for {clubName || 'Your Club'}</CardTitle>
                <CardDescription>
                    This list shows all matches for your primary club.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Series</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-10 w-28" /></TableCell>
                            </TableRow>
                        ))
                    ) : matches.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No matches found for your primary club.
                            </TableCell>
                        </TableRow>
                    ) : (
                        matches.map(match => (
                            <TableRow key={match.id}>
                                <TableCell>{format(match.date, 'PPP')}</TableCell>
                                <TableCell>{match.seriesName}</TableCell>
                                <TableCell className="font-medium">{match.name}</TableCell>
                                <TableCell><Badge variant="outline">{match.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button onClick={() => handleGoToWeighIn(match.id)}>
                                        <Scale className="mr-2 h-4 w-4" />
                                        Go to Weigh-in
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
