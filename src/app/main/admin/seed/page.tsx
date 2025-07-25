
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, writeBatch, doc, Timestamp, getDocs } from 'firebase/firestore';
import type { Club, Series, User, Match, Result } from '@/lib/types';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const sampleClubs: Omit<Club, 'id'>[] = [
  { name: 'Tring Anglers', description: 'A friendly fishing club based in Tring.', imageUrl: 'https://placehold.co/100x100.png?text=TA' },
  { name: 'Grand Union Canal Club', description: 'Canal fishing specialists.', imageUrl: 'https://placehold.co/100x100.png?text=GUCC' },
];

const sampleSeries = (clubId: string): Omit<Series, 'id'>[] => [
    { clubId, name: 'Summer League 2024' },
    { clubId, name: 'Winter League 2024' },
    { clubId, name: 'Canal Championship' },
];

const sampleUsers = (clubId: string): Omit<User, 'id'>[] => [
  { firstName: 'John', lastName: 'Angler', email: 'john.angler@test.com', role: 'Angler', memberStatus: 'Member', primaryClubId: clubId },
  { firstName: 'Jane', lastName: 'Fisher', email: 'jane.fisher@test.com', role: 'Marshal', memberStatus: 'Member', primaryClubId: clubId },
  { firstName: 'Peter', lastName: 'Smith', email: 'peter.smith@test.com', role: 'Club Admin', memberStatus: 'Member', primaryClubId: clubId },
  { firstName: 'Susan', lastName: 'Reel', email: 'susan.reel@test.com', role: 'Angler', memberStatus: 'Pending', primaryClubId: clubId },
];

const sampleMatches = (clubId: string, seriesId: string): Omit<Match, 'id'>[] => [
    { 
        clubId, 
        seriesId, 
        seriesName: 'Summer League 2024',
        name: 'Match 1', 
        location: 'Tring Reservoirs', 
        date: Timestamp.fromDate(new Date('2024-06-15')), 
        status: 'Completed', 
        drawTime: '08:00',
        startTime: '09:00',
        endTime: '15:00',
        capacity: 20,
        registeredCount: 4,
        registeredAnglers: [],
        paidPlaces: 3,
    },
    { 
        clubId, 
        seriesId,
        seriesName: 'Summer League 2024',
        name: 'Match 2', 
        location: 'Grand Union Canal, Lock 39', 
        date: Timestamp.fromDate(new Date('2024-06-22')), 
        status: 'Upcoming', 
        drawTime: '08:00',
        startTime: '09:00',
        endTime: '15:00',
        capacity: 20,
        registeredCount: 0,
        registeredAnglers: [],
        paidPlaces: 3,
    },
];

const sampleResults = (clubId: string, seriesId: string, matchId: string, users: User[]): Omit<Result, 'matchId'>[] => [
  { seriesId, clubId, userId: users[0].id, userName: `${users[0].firstName} ${users[0].lastName}`, position: 1, weight: 15.5, date: Timestamp.fromDate(new Date('2024-06-15')), status: 'OK', peg: 'A1', section: 'A', points: 1 },
  { seriesId, clubId, userId: users[1].id, userName: `${users[1].firstName} ${users[1].lastName}`, position: 2, weight: 12.2, date: Timestamp.fromDate(new Date('2024-06-15')), status: 'OK', peg: 'A2', section: 'A', points: 2 },
  { seriesId, clubId, userId: users[2].id, userName: `${users[2].firstName} ${users[2].lastName}`, position: 3, weight: 9.8, date: Timestamp.fromDate(new Date('2024-06-15')), status: 'OK', peg: 'B1', section: 'B', points: 1 },
  { seriesId, clubId, userId: users[3].id, userName: `${users[3].firstName} ${users[3].lastName}`, position: null, weight: 0, date: Timestamp.fromDate(new Date('2024-06-15')), status: 'DNW', peg: 'B2', section: 'B', points: 3 },
];


export default function SeedDataPage() {
    const { isSiteAdmin, loading: adminLoading } = useAdminAuth();
    const { toast } = useToast();
    const [isSeeding, setIsSeeding] = useState(false);

    const handleSeedData = async (seedType: string) => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not initialized.' });
            return;
        }

        setIsSeeding(true);
        try {
            const batch = writeBatch(firestore);

            if (seedType === 'all' || seedType === 'clubs') {
                sampleClubs.forEach(club => {
                    const docRef = doc(collection(firestore, 'clubs'));
                    batch.set(docRef, club);
                });
                toast({ title: 'Seeding...', description: 'Seeding Clubs...' });
                await batch.commit();
            }

            // For other types, we need a club to associate with
            const clubsSnapshot = await getDocs(collection(firestore, 'clubs'));
            if (clubsSnapshot.empty) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please seed clubs first.' });
                setIsSeeding(false);
                return;
            }
            const firstClub = { id: clubsSnapshot.docs[0].id, ...clubsSnapshot.docs[0].data() } as Club;

            if (seedType === 'all' || seedType === 'series') {
                const seriesBatch = writeBatch(firestore);
                sampleSeries(firstClub.id).forEach(series => {
                    const docRef = doc(collection(firestore, 'series'));
                    seriesBatch.set(docRef, series);
                });
                toast({ title: 'Seeding...', description: 'Seeding Series...' });
                await seriesBatch.commit();
            }
            
            if (seedType === 'all' || seedType === 'users') {
                 const usersBatch = writeBatch(firestore);
                sampleUsers(firstClub.id).forEach(user => {
                    // Note: This doesn't create auth users, just firestore user documents
                    const docRef = doc(collection(firestore, 'users'));
                    usersBatch.set(docRef, user);
                });
                toast({ title: 'Seeding...', description: 'Seeding Users...' });
                await usersBatch.commit();
            }

            if (seedType === 'all' || seedType === 'matches') {
                const seriesSnapshot = await getDocs(query(collection(firestore, 'series'), where('clubId', '==', firstClub.id)));
                if(seriesSnapshot.empty) {
                     toast({ variant: 'destructive', title: 'Error', description: 'Please seed series first.' });
                     setIsSeeding(false);
                     return;
                }
                const firstSeries = { id: seriesSnapshot.docs[0].id, ...seriesSnapshot.docs[0].data() } as Series;
                
                const matchesBatch = writeBatch(firestore);
                sampleMatches(firstClub.id, firstSeries.id).forEach(match => {
                    const docRef = doc(collection(firestore, 'matches'));
                    matchesBatch.set(docRef, match);
                });
                toast({ title: 'Seeding...', description: 'Seeding Matches...' });
                await matchesBatch.commit();
            }

             if (seedType === 'all' || seedType === 'results') {
                const seriesSnapshot = await getDocs(query(collection(firestore, 'series'), where('clubId', '==', firstClub.id)));
                const matchesSnapshot = await getDocs(query(collection(firestore, 'matches'), where('clubId', '==', firstClub.id)));
                const usersSnapshot = await getDocs(query(collection(firestore, 'users'), where('primaryClubId', '==', firstClub.id)));
                
                if (seriesSnapshot.empty || matchesSnapshot.empty || usersSnapshot.empty) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Need clubs, series, matches, and users to seed results.' });
                    setIsSeeding(false);
                    return;
                }

                const firstSeries = { id: seriesSnapshot.docs[0].id } as Series;
                const firstMatch = { id: matchesSnapshot.docs[0].id } as Match;
                const users = usersSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as User);
                
                const resultsBatch = writeBatch(firestore);
                sampleResults(firstClub.id, firstSeries.id, firstMatch.id, users).forEach(result => {
                    const docRef = doc(collection(firestore, 'results'));
                    resultsBatch.set(docRef, {...result, matchId: firstMatch.id });
                });
                toast({ title: 'Seeding...', description: 'Seeding Results...' });
                await resultsBatch.commit();
            }


            toast({ title: 'Success!', description: 'Database has been seeded.' });
        } catch (error) {
            console.error('Error seeding data:', error);
            toast({ variant: 'destructive', title: 'Seed Failed', description: 'Could not seed the database.' });
        } finally {
            setIsSeeding(false);
        }
    };
    
    if(adminLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-8 w-3/4" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-6 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!isSiteAdmin) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                    You do not have permission to view this page.
                </AlertDescription>
            </Alert>
        )
    }


    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Seed Database</h1>
                <p className="text-muted-foreground">Use these actions to populate your Firestore database with sample data.</p>
            </div>
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                    Seeding data will add new documents and may create duplicates if run multiple times. This is a destructive action.
                </AlertDescription>
            </Alert>
            <Card>
                <CardHeader>
                    <CardTitle>Seed Actions</CardTitle>
                    <CardDescription>Click a button to seed the corresponding data type. Seeding may take a few moments.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Button onClick={() => handleSeedData('clubs')} disabled={isSeeding}>
                        {isSeeding ? 'Seeding...' : 'Seed Clubs'}
                    </Button>
                     <Button onClick={() => handleSeedData('series')} disabled={isSeeding}>
                        {isSeeding ? 'Seeding...' : 'Seed Series'}
                    </Button>
                     <Button onClick={() => handleSeedData('users')} disabled={isSeeding}>
                        {isSeeding ? 'Seeding...' : 'Seed Users'}
                    </Button>
                     <Button onClick={() => handleSeedData('matches')} disabled={isSeeding}>
                        {isSeeding ? 'Seeding...' : 'Seed Matches'}
                    </Button>
                    <Button onClick={() => handleSeedData('results')} disabled={isSeeding}>
                        {isSeeding ? 'Seeding...' : 'Seed Results'}
                    </Button>
                     <Button variant="destructive" onClick={() => handleSeedData('all')} disabled={isSeeding}>
                        {isSeeding ? 'Seeding...' : 'Seed All Data'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
