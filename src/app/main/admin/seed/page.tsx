
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
import { collection, writeBatch, doc, getDocs, orderBy, query, getDoc } from 'firebase/firestore';
import type { Club, User } from '@/lib/types';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';

const sampleUsers = (clubId: string): Omit<User, 'id'>[] => [
  { firstName: 'John', lastName: 'Angler', email: 'john.angler@test.com', role: 'Angler', memberStatus: 'Pending', primaryClubId: clubId },
  { firstName: 'Peter', lastName: 'Smith', email: 'peter.smith@test.com', role: 'Angler', memberStatus: 'Pending', primaryClubId: clubId },
  { firstName: 'Susan', lastName: 'Reel', email: 'susan.reel@test.com', role: 'Angler', memberStatus: 'Pending', primaryClubId: clubId },
  { firstName: 'Mike', lastName: 'Fisher', email: 'mike.fisher@test.com', role: 'Angler', memberStatus: 'Pending', primaryClubId: clubId },
  { firstName: 'Chloe', lastName: 'Waters', email: 'chloe.waters@test.com', role: 'Angler', memberStatus: 'Pending', primaryClubId: clubId },
];


export default function SeedDataPage() {
    const { userProfile } = useAuth();
    const { isSiteAdmin, isClubAdmin, loading: adminLoading } = useAdminAuth();
    const { toast } = useToast();
    const [isSeeding, setIsSeeding] = useState(false);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [isLoadingClubs, setIsLoadingClubs] = useState(true);

    useEffect(() => {
        if (adminLoading || !firestore) return;

        const fetchClubs = async () => {
            setIsLoadingClubs(true);
            try {
                if (isSiteAdmin) {
                    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
                    const clubsSnapshot = await getDocs(clubsQuery);
                    const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
                    setClubs(clubsData);
                    if (clubsData.length > 0 && !selectedClubId) {
                        setSelectedClubId(clubsData[0].id);
                    }
                } else if (isClubAdmin && userProfile?.primaryClubId) {
                    const clubDocRef = doc(firestore, 'clubs', userProfile.primaryClubId);
                    const clubDoc = await getDoc(clubDocRef);
                    if (clubDoc.exists()) {
                        const clubData = { id: clubDoc.id, ...clubDoc.data() } as Club;
                        setClubs([clubData]);
                        setSelectedClubId(clubData.id);
                    }
                }
            } catch (error) {
                console.error("Error fetching clubs:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load clubs.' });
            } finally {
                setIsLoadingClubs(false);
            }
        };

        fetchClubs();
    }, [isSiteAdmin, isClubAdmin, userProfile, adminLoading, toast, selectedClubId]);


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
            
            toast({ title: 'Success!', description: `Sample users have been added into the selected club.` });
        } catch (error) {
            console.error('Error seeding data:', error);
            toast({ variant: 'destructive', title: 'Seed Failed', description: 'Could not add sample users.' });
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

    if (!isSiteAdmin && !isClubAdmin) {
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
            <Card>
                <CardHeader>
                    <CardTitle>Add Anglers</CardTitle>
                    <CardDescription>Click the button below to add 5 random anglers to your club's member list. Then navigate to the MEMBERS page and edit the names. THese anglers may then be added to matches.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                     <div className="space-y-2">
                        <Label htmlFor="club-select">Target Club</Label>
                        {isLoadingClubs ? (
                            <Skeleton className="h-10 w-full" />
                        ) : isSiteAdmin ? (
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
                        ) : (
                            <Input value={clubs.length > 0 ? clubs[0].name : 'Loading...'} disabled />
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                     <Button onClick={handleSeedUsers} disabled={isSeeding || !selectedClubId || isLoadingClubs}>
                        {isSeeding ? 'Adding...' : 'Add Sample Anglers'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
