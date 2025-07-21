
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import type { Match, User, Result } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type WeighInStatus = 'NYW' | 'OK' | 'DNF' | 'DNW' | 'DSQ';

type AnglerDetails = Pick<User, 'id' | 'firstName' | 'lastName'> & {
  peg: string;
  section: string;
  weight: string;
  status: WeighInStatus;
  rank: string;
};

export default function WeighInPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const matchId = params.matchId as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [anglers, setAnglers] = useState<AnglerDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuthorizationAndFetchData() {
      if (!user || !firestore || !matchId) {
        if (user === null) router.push('/login');
        return;
      }
      
      setIsLoading(true);

      try {
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
        
        const matchDocRef = doc(firestore, 'matches', matchId);
        const matchDoc = await getDoc(matchDocRef);
        if (!matchDoc.exists()) {
          throw new Error('Match not found.');
        }
        const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
        setMatch({ ...matchData, date: (matchData.date as any).toDate() });

        if (matchData.registeredAnglers && matchData.registeredAnglers.length > 0) {
            const anglersData: Omit<AnglerDetails, 'peg' | 'section' | 'weight' | 'status' | 'rank'>[] = [];
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
                    } as Omit<AnglerDetails, 'peg' | 'section' | 'weight' | 'status' | 'rank'>;
                });
                anglersData.push(...chunkData);
            }
            setAnglers(anglersData.map(a => ({ ...a, peg: '', section: '', weight: '', status: 'NYW', rank: '' })));
        }

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'An unexpected error occurred.',
        });
        setIsAuthorized(false);
        if (error.message.includes('authorized')) {
            router.push('/matches');
        }
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthorizationAndFetchData();
  }, [user, matchId, router, toast]);

  const handleFieldChange = (anglerId: string, field: keyof Omit<AnglerDetails, 'id' | 'firstName' | 'lastName'>, value: string) => {
    setAnglers(prev => 
      prev.map(angler => 
        angler.id === anglerId ? { ...angler, [field]: value } : angler
      )
    );
  };
  
  const handleSaveAll = async () => {
    if (!firestore || !match) return;

    setIsSaving(true);
    try {
        const batch = writeBatch(firestore);
        
        const results: Omit<Result, 'position' | 'points'>[] = anglers
            .filter(angler => angler.status === 'OK' && parseInt(angler.weight) > 0)
            .map(angler => {
                const totalOz = parseInt(angler.weight || '0');
                return {
                    matchId: match.id,
                    userId: angler.id,
                    userName: `${angler.firstName} ${angler.lastName}`,
                    weight: totalOz,
                };
            });
            
        // Sort by weight descending to assign positions
        results.sort((a, b) => b.weight - a.weight);
        
        results.forEach((result, index) => {
            const resultId = `${match.id}_${result.userId}`;
            const resultDocRef = doc(firestore, 'results', resultId);
            const data: Result = {
                ...result,
                position: index + 1,
                points: index + 1, // Simplified points system
                date: match.date,
                seriesId: match.seriesId,
                clubId: match.clubId,
            }
            batch.set(resultDocRef, data, { merge: true });
        });
        
        await batch.commit();

        toast({
            title: 'Success!',
            description: 'All weigh-in data has been saved.',
        });

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: error.message || 'An unexpected error occurred while saving results.',
        });
    } finally {
        setIsSaving(false);
    }
  };

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
                <CardContent><Skeleton className="h-24 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
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
        <Button onClick={handleSaveAll} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save All Results'}
        </Button>
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
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor={`peg-${angler.id}`}>Peg</Label>
                            <Input
                                id={`peg-${angler.id}`}
                                type="text"
                                placeholder="e.g. 14"
                                value={angler.peg}
                                onChange={(e) => handleFieldChange(angler.id, 'peg', e.target.value)}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor={`section-${angler.id}`}>Section</Label>
                            <Input
                                id={`section-${angler.id}`}
                                type="text"
                                placeholder="e.g. A"
                                value={angler.section}
                                onChange={(e) => handleFieldChange(angler.id, 'section', e.target.value)}
                            />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor={`weight-${angler.id}`}>Weight</Label>
                        <Input
                            id={`weight-${angler.id}`}
                            type="number"
                            placeholder="e.g. 256"
                            value={angler.weight}
                            onChange={(e) => handleFieldChange(angler.id, 'weight', e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor={`status-${angler.id}`}>Status</Label>
                            <Select 
                                value={angler.status}
                                onValueChange={(value) => handleFieldChange(angler.id, 'status', value)}
                            >
                                <SelectTrigger id={`status-${angler.id}`}>
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NYW">NYW</SelectItem>
                                    <SelectItem value="OK">OK</SelectItem>
                                    <SelectItem value="DNF">DNF</SelectItem>
                                    <SelectItem value="DNW">DNW</SelectItem>
                                    <SelectItem value="DSQ">DSQ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`rank-${angler.id}`}>Rank</Label>
                             <Input
                                id={`rank-${angler.id}`}
                                type="number"
                                placeholder="-"
                                value={angler.rank}
                                onChange={(e) => handleFieldChange(angler.id, 'rank', e.target.value)}
                                disabled
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
            ))}
        </div>
      )}
    </div>
  );
}
