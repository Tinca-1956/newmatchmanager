
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Save } from 'lucide-react';

export default function EditSeedUsersPage() {
    const { isSiteAdmin, loading: adminLoading } = useAdminAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);

    useEffect(() => {
        if (!isSiteAdmin || !firestore) {
            setIsLoading(false);
            return;
        }

        const usersQuery = query(collection(firestore, 'users'), orderBy('lastName'), orderBy('firstName'));
        
        const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(usersData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch users.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isSiteAdmin, toast]);
    
    const handleInputChange = (userId: string, field: 'firstName' | 'lastName', value: string) => {
        setUsers(currentUsers =>
            currentUsers.map(user =>
                user.id === userId ? { ...user, [field]: value } : user
            )
        );
    };
    
    const handleSaveUser = async (userId: string) => {
        if (!firestore) return;
        
        const userToSave = users.find(u => u.id === userId);
        if (!userToSave) {
            toast({ variant: 'destructive', title: 'Error', description: 'User not found.' });
            return;
        }

        setIsSaving(userId);
        try {
            const userDocRef = doc(firestore, 'users', userId);
            await updateDoc(userDocRef, {
                firstName: userToSave.firstName,
                lastName: userToSave.lastName,
            });
            toast({ title: 'Success', description: `${userToSave.firstName} ${userToSave.lastName}'s details have been updated.` });
        } catch (error) {
            console.error("Error updating user:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update user.' });
        } finally {
            setIsSaving(null);
        }
    };
    
    if (adminLoading) {
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
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
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
        );
    }

    const renderUserList = () => {
        if (isLoading) {
            return Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-10 w-24" /></TableCell>
                </TableRow>
            ));
        }

        if (users.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No users found.
                    </TableCell>
                </TableRow>
            );
        }

        return users.map(user => (
            <TableRow key={user.id}>
                <TableCell>
                    <Input
                        value={user.firstName}
                        onChange={(e) => handleInputChange(user.id, 'firstName', e.target.value)}
                        className="h-9"
                    />
                </TableCell>
                 <TableCell>
                    <Input
                        value={user.lastName}
                        onChange={(e) => handleInputChange(user.id, 'lastName', e.target.value)}
                        className="h-9"
                    />
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell className="text-right">
                     <Button 
                        size="sm" 
                        onClick={() => handleSaveUser(user.id)}
                        disabled={isSaving === user.id}
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving === user.id ? 'Saving...' : 'Save'}
                    </Button>
                </TableCell>
            </TableRow>
        ));
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Seed Users</h1>
                <p className="text-muted-foreground">Directly edit user names in the database.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>
                       This provides a raw editing interface for all user documents. Use with care.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>First Name</TableHead>
                                <TableHead>Last Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderUserList()}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
