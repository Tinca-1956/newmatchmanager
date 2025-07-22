
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, Timestamp, setDoc } from 'firebase/firestore';
import type { Match, User, Result } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type WeighInStatus = 'NYW' | 'OK' | 'DNF' | 'DNW' | 'DSQ';
type ViewMode = 'card' | 'list';

type AnglerDetails = Pick<User, 'id' | 'firstName' | 'lastName'> & {
  peg: string;
  section: string;
  weight: string;
  status: WeighInStatus;
  rank: string;
  isSaving: boolean;
};

// Function to convert kg to oz
const kgToOz = (kg: number): number => {
  return Math.round(kg * 35.274);
};

// Function to convert oz to kg for display
const ozToKg = (oz: number): string => {
  if (!oz) return '';
  return (oz / 35.274).toFixed(3);
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
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('card');

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
        
        // Fetch existing results to populate the form
        const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', matchId));
        const resultsSnapshot = await getDocs(resultsQuery);
        const existingResults = new Map<string, Result>();
        resultsSnapshot.forEach(doc => {
            const result = doc.data() as Result;
            existingResults.set(result.userId, result);
        });

        if (matchData.registeredAnglers && matchData.registeredAnglers.length > 0) {
            const anglersData: Omit<AnglerDetails, 'peg' | 'section' | 'weight' | 'status' | 'rank' | 'isSaving'>[] = [];
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
                    } as Omit<AnglerDetails, 'peg' | 'section' | 'weight' | 'status' | 'rank' | 'isSaving'>;
                });
                anglersData.push(...chunkData);
            }
            const initialAnglers = anglersData.map(a => {
                const result = existingResults.get(a.id);
                return { 
                    ...a, 
                    peg: result?.peg || '',
                    section: result?.section || '',
                    weight: result?.weight ? ozToKg(result.weight) : '', 
                    status: (result?.status || 'NYW') as WeighInStatus, 
                    rank: result?.position?.toString() || '',
                    isSaving: false
                }
            });
            setAnglers(initialAnglers);
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

  const handleFieldChange = (anglerId: string, field: keyof Omit<AnglerDetails, 'id' | 'firstName' | 'lastName' | 'isSaving'>, value: string) => {
    setAnglers(prev => 
      prev.map(angler => 
        angler.id === anglerId ? { ...angler, [field]: value } : angler
      )
    );
  };
  
  const handleSaveAngler = async (anglerId: string) => {
    if (!firestore || !match) return;
    
    const angler = anglers.find(a => a.id === anglerId);
    if (!angler) return;

    setAnglers(prev => prev.map(a => a.id === anglerId ? { ...a, isSaving: true } : a));

    try {
        const resultId = `${match.id}_${angler.id}`;
        const resultDocRef = doc(firestore, 'results', resultId);
        
        const weightInKg = parseFloat(angler.weight || '0');
        const totalOz = kgToOz(weightInKg);
        
        // Save the individual angler's result
        const dataToSave: Partial<Result> = {
            matchId: match.id,
            userId: angler.id,
            userName: `${angler.firstName} ${angler.lastName}`,
            weight: totalOz,
            date: match.date,
            seriesId: match.seriesId,
            clubId: match.clubId,
            peg: angler.peg,
            section: angler.section,
            status: angler.status,
        };
        await setDoc(resultDocRef, dataToSave, { merge: true });

        // Now, fetch all results for the match to recalculate ranks
        const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', matchId));
        const resultsSnapshot = await getDocs(resultsQuery);
        
        const resultsToProcess: Result[] = [];
        resultsSnapshot.forEach(doc => {
            resultsToProcess.push(doc.data() as Result);
        });

        // Sort by weight descending to assign positions for 'OK' statuses
        resultsToProcess
          .filter(r => r.status === 'OK' && r.weight > 0)
          .sort((a, b) => b.weight - a.weight)
          .forEach((result, index) => {
            const resultToUpdate = resultsToProcess.find(r => r.userId === result.userId);
            if (resultToUpdate) {
                resultToUpdate.position = index + 1;
                resultToUpdate.points = index + 1;
            }
          });


        // Update all result documents with new ranks in a batch
        const batch = writeBatch(firestore);
        resultsToProcess.forEach((result) => {
            const docRef = doc(firestore, 'results', `${match.id}_${result.userId}`);
            batch.update(docRef, { 
                position: result.position || null, 
                points: result.points || null
            });
        });
        await batch.commit();

        // Update local state to reflect new ranks for all anglers
        setAnglers(prevAnglers => {
            const newAnglers = [...prevAnglers];
            resultsToProcess.forEach((result) => {
                const anglerIndex = newAnglers.findIndex(a => a.id === result.userId);
                if (anglerIndex !== -1) {
                    newAnglers[anglerIndex].rank = result.position ? result.position.toString() : '';
                }
            });
            // Also reset ranks for those not in the results (e.g., DNW)
            newAnglers.forEach(a => {
                if (!resultsToProcess.some(r => r.userId === a.id)) {
                    a.rank = '';
                }
            });
            return newAnglers;
        });

        toast({
            title: 'Success!',
            description: `${angler.firstName}'s weigh-in data saved. Ranks updated.`,
        });

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: error.message || 'An unexpected error occurred while saving.',
        });
    } finally {
        setAnglers(prev => prev.map(a => a.id === anglerId ? { ...a, isSaving: false } : a));
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

  const renderCardView = () => (
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
                    <Label htmlFor={`weight-${angler.id}`}>Weight (Kg)</Label>
                    <Input
                        id={`weight-${angler.id}`}
                        type="number"
                        placeholder="e.g. 8.5"
                        value={angler.weight}
                        onChange={(e) => handleFieldChange(angler.id, 'weight', e.target.value)}
                        step="0.001"
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
            <CardFooter>
                <Button 
                    className="w-full"
                    onClick={() => handleSaveAngler(angler.id)}
                    disabled={angler.isSaving}
                >
                    <Save className="mr-2 h-4 w-4" />
                    {angler.isSaving ? 'Saving...' : 'Save'}
                </Button>
            </CardFooter>
        </Card>
        ))}
    </div>
  );
  
  const renderListView = () => (
     <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Angler</TableHead>
                <TableHead>Peg</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Weight (Kg)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anglers.map((angler) => (
                <TableRow key={angler.id}>
                  <TableCell className="font-medium">{angler.firstName} {angler.lastName}</TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-20"
                      type="text"
                      placeholder="e.g. 14"
                      value={angler.peg}
                      onChange={(e) => handleFieldChange(angler.id, 'peg', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-20"
                      type="text"
                      placeholder="e.g. A"
                      value={angler.section}
                      onChange={(e) => handleFieldChange(angler.id, 'section', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-24"
                      type="number"
                      placeholder="e.g. 8.5"
                      value={angler.weight}
                      onChange={(e) => handleFieldChange(angler.id, 'weight', e.target.value)}
                      step="0.001"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                        value={angler.status}
                        onValueChange={(value) => handleFieldChange(angler.id, 'status', value)}
                    >
                        <SelectTrigger className="h-8 w-28">
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
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-20"
                      type="number"
                      placeholder="-"
                      value={angler.rank}
                      onChange={(e) => handleFieldChange(angler.id, 'rank', e.target.value)}
                      disabled
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleSaveAngler(angler.id)}
                      disabled={angler.isSaving}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {angler.isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
     </Card>
  );

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
        <div className="flex items-center gap-2">
            <Label htmlFor="view-mode">Display</Label>
            <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                <SelectTrigger id="view-mode" className="w-32">
                    <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="list">List</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
      
      {anglers.length === 0 ? (
        <Card>
            <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No anglers registered for this match.</p>
            </CardContent>
        </Card>
      ) : (
        viewMode === 'card' ? renderCardView() : renderListView()
      )}
    </div>
  );
}
