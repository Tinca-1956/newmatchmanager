
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AddAnglerPage() {
    const { isSiteAdmin, isClubAdmin, loading: adminLoading } = useAdminAuth();
    const { userProfile } = useAuth();
    const { toast } = useToast();
    
    const [isSaving, setIsSaving] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    const handleAddAngler = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not initialized.' });
            return;
        }
        if (!userProfile?.primaryClubId) {
             toast({ variant: 'destructive', title: 'Error', description: 'Your primary club is not set.' });
            return;
        }
        if (!firstName.trim() || !lastName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'First and last name are required.' });
            return;
        }

        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            const newUserRef = doc(collection(firestore, 'users'));
            
            const newAnglerData = {
                firstName: firstName,
                lastName: lastName,
                email: '',
                role: 'Angler',
                memberStatus: 'Unverified',
                primaryClubId: userProfile.primaryClubId,
            };

            batch.set(newUserRef, newAnglerData);
            await batch.commit();
            
            toast({ title: 'Success!', description: `Unverified angler '${firstName} ${lastName}' has been added.` });
            setFirstName('');
            setLastName('');

        } catch (error) {
            console.error('Error adding angler:', error);
            if (error instanceof Error && error.message.includes('permission-denied')) {
                toast({ variant: 'destructive', title: 'Permission Denied', description: 'Your security rules are preventing this operation.' });
            } else {
                toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not add the angler.' });
            }
        } finally {
            setIsSaving(false);
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
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Add Unverified Angler</h1>
                <p className="text-muted-foreground">Manually add an angler who does not have an email or account.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Angler Details</CardTitle>
                    <CardDescription>The new angler will be associated with your primary club: <span className="font-semibold">{userProfile?.primaryClubId || 'N/A'}</span></CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                     <Button onClick={handleAddAngler} disabled={isSaving}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {isSaving ? 'Adding...' : 'Add Angler'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
