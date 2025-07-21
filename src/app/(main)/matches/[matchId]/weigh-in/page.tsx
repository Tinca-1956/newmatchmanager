'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { Match, User } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type AnglerDetails = Pick<User, 'id' | 'firstName' | 'lastName'>;

export default function WeighInPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const matchId = params.matchId as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [anglers, setAnglers] = useState<AnglerDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuthorizationAndFetchData() {
      if (!user || !firestore || !matchId) {
        if (user === null) router.push('/login'); // Redirect if not logged in
        return;
      }
      
      setIsLoading(true);

      try {
        // 1. Check user role
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          const authorizedRoles = ['Site Admin', 'Club Admin', 'Marshal'];
          if (authorizedRoles.includes(userData.role)) {
            setIsAuthorized(true);
          } else {
             throw new Error('You are not authorized to view this page.');
          }
        } else {
           throw new Error('User profile not found.');
        }
        
        // 2. Fetch Match Details
        const matchDocRef = doc(firestore, 'matches', matchId);
        const matchDoc = await getDoc(matchDocRef);
        if (!matchDoc.exists()) {
          throw new Error('Match not found.');
        }
        const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
        setMatch({ ...matchData, date: (matchData.date as any).toDate() });

        // 3. Fetch Registered Anglers
        if (matchData.registeredAnglers && matchData.registeredAnglers.length > 0) {
            const anglersData: AnglerDetails[] = [];
            const chunks: string[][] = [];
            for (let i = 0; i < matchData.registeredAnglers.length; i += 30) {
                chunks.push(matchData.registeredAnglers.slice(i, i + 30));
            }

            for (const chunk of chunks) {
                if(chunk.length === 0) continue;
                const usersQuery = query(collection(firestore, 'users'), where('__name__', 'in', chunk));
                const querySnapshot = await getDocs(usersQuery);
                const chunkData = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        firstName: data.firstName || 'N/A',
                        lastName: data.lastName || 'N/A',
                    } as AnglerDetails;
                });
                anglersData.push(...chunkData);
            }
            setAnglers(anglersData);
        }

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'An unexpected error occurred.',
        });
        setIsAuthorized(false);
        router.push('/matches');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthorizationAndFetchData();
  }, [user, matchId, router, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <div>
           <Skeleton className="h-9 w-1/3 mb-2" />
           <Skeleton className="h-5 w-1/2" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
             <Card key={i}>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    // This will be shown briefly before redirection
    return <p>Redirecting...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/matches">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Weigh-in: {match?.name}</h1>
            <p className="text-muted-foreground">
            {match ? `${match.seriesName} - ${format(match.date, 'PPP')}` : 'Loading...'}
            </p>
        </div>
      </div>
      
      {anglers.length === 0 ? (
        <Card>
            <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No anglers registered for this match.</p>
            </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {anglers.map((angler) => (
            <Card key={angler.id}>
                <CardHeader>
                <CardTitle className="text-lg">WEIGH-IN for {angler.firstName} {angler.lastName}</CardTitle>
                </CardHeader>
                <CardContent>
                {/* Weigh-in form elements will go here */}
                <p className="text-sm text-muted-foreground">Weigh-in controls coming soon.</p>
                </CardContent>
            </Card>
            ))}
        </div>
      )}
    </div>
  );
}
