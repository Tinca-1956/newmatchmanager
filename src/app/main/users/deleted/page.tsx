
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
import { useToast } from '@/hooks/use-toast';
import { firestore, auth } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, UserCheck, UserX } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


export default function DeletedUsersPage() {
    const { isSiteAdmin, loading: adminLoading } = useAdminAuth();
    const { toast } = useToast();
    const [deletedUsers, setDeletedUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!isSiteAdmin || !firestore) {
            setIsLoading(false);
            return;
        }

        const usersQuery = query(collection(firestore, 'users'), where('memberStatus', '==', 'Deleted'));
        
        const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setDeletedUsers(usersData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching deleted users:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch deleted users.' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isSiteAdmin, toast]);

    const handleRestoreUser = async (userId: string) => {
        if (!firestore) return;
        setIsProcessing(true);
        try {
            const userDocRef = doc(firestore, 'users', userId);
            await updateDoc(userDocRef, { memberStatus: 'Member' });
            toast({ title: 'Success', description: 'User has been restored.' });
        } catch (error) {
            console.error("Error restoring user:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to restore user.' });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handlePermanentDelete = async (userId: string, email: string) => {
        if (!firestore) return;
        setIsProcessing(true);
        try {
            // Note: This deletes the Firestore document.
            // The Firebase Auth user must be deleted separately, often via a Cloud Function
            // triggered by this document deletion for security reasons.
            // We'll just delete the doc here.
            const userDocRef = doc(firestore, 'users', userId);
            await deleteDoc(userDocRef);

            toast({ title: 'Success', description: 'User document permanently deleted. Auth record may still exist.' });
        } catch (error) {
            console.error("Error permanently deleting user:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to permanently delete user.' });
        } finally {
            setIsProcessing(false);
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
            return Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-10 w-44" /></TableCell>
                </TableRow>
            ));
        }

        if (deletedUsers.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        No deleted users found.
                    </TableCell>
                </TableRow>
            );
        }

        return deletedUsers.map(user => (
            <TableRow key={user.id}>
                <TableCell className="font-medium">{`${user.firstName} ${user.lastName}`}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="text-right space-x-2">
                     <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRestoreUser(user.id)}
                        disabled={isProcessing}
                    >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Restore
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" size="sm" disabled={isProcessing}>
                                <UserX className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the user's data from the database. The associated authentication account will need to be removed manually or via a backend function.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handlePermanentDelete(user.id, user.email)}>
                                    Yes, permanently delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                   
                </TableCell>
            </TableRow>
        ));
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Deleted Users</h1>
                <p className="text-muted-foreground">Manage users that have been marked for deletion.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Deleted User List</CardTitle>
                    <CardDescription>Users with a 'Deleted' status can be restored or permanently removed.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
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

