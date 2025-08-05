
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, writeBatch, doc, getDocs, orderBy, query } from 'firebase/firestore';
import type { Club, User } from '@/lib/types';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const sampleUsers = (clubId: string): Omit<User, 'id'>[] => [
  { firstName: 'John', lastName: 'Angler', email: 'john.angler@test.com', role: 'Angler', memberStatus: 'Member', primaryClubId: clubId },
  { firstName: 'Peter', lastName: 'Smith', email: 'peter.smith@test.com', role: 'Club Admin', memberStatus: 'Member', primaryClubId: clubId },
  { firstName: 'Susan', lastName: 'Reel', email: 'susan.reel@test.com', role: 'Angler', memberStatus: 'Pending', primaryClubId: clubId },
];


export default function SeedDataPage() {
    const { isSiteAdmin, loading: adminLoading } = useAdminAuth();
    const { toast } = useToast();
    const [isSeeding, setIsSeeding] = useState(false);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [isLoadingClubs, setIsLoadingClubs] = useState(true);

    useEffect(() => {
        if (!isSiteAdmin) return;

        const fetchClubs = async () => {
            if (!firestore) return;
            setIsLoadingClubs(true);
            const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
            const clubsSnapshot = await getDocs(clubsQuery);
            const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setClubs(clubsData);
            if (clubsData.length > 0) {
                setSelectedClubId(clubsData[0].id);
            }
            setIsLoadingClubs(false);
        };

        fetchClubs();
    }, [isSiteAdmin]);

    const handleSeedUsers = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not initialized.' });
            return;
        }

        if (!selectedClubId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a club to seed users into.' });
            return;
        }

        setIsSeeding(true);
        try {
            const usersBatch = writeBatch(firestore);
            sampleUsers(selectedClubId).forEach(user => {
                // Note: This doesn't create auth users, just firestore user documents
                const docRef = doc(collection(firestore, 'users'));
                usersBatch.set(docRef, user);
            });
            await usersBatch.commit();
            
            toast({ title: 'Success!', description: `Sample users have been seeded into the selected club.` });
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
                    Seeding data will add new documents and may create duplicates if run multiple times.
                </AlertDescription>
            </Alert>
            <Card>
                <CardHeader>
                    <CardTitle>Seed Actions</CardTitle>
                    <CardDescription>Select a club and click the button to add sample users to your database.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                         <Label htmlFor="club-select">Target Club</Label>
                        {isLoadingClubs ? (
                            <Skeleton className="h-10 w-full" />
                        ) : (
                            <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                                <SelectTrigger id="club-select">
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
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                     <Button onClick={handleSeedUsers} disabled={isSeeding || !selectedClubId || isLoadingClubs}>
                        {isSeeding ? 'Seeding...' : 'Seed Users'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
