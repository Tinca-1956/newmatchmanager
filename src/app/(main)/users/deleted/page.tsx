
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from "@/components/ui/alert-dialog"
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, doc, deleteDoc, getDocs } from 'firebase/firestore';
import type { User, Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DeletedUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [deletedUsers, setDeletedUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const isSiteAdmin = user?.uid && firestore; // A basic check, logic below is more robust

  useEffect(() => {
    if (authLoading) return;
    if (!user || !firestore) {
      router.push('/login');
      return;
    }

    let unsubscribeUsers: () => void = () => {};
    let unsubscribeClubs: () => void = () => {};

    // First, verify user is a Site Admin
    const userDocRef = doc(firestore, 'users', user.uid);
    onSnapshot(userDocRef, (userDoc) => {
      if (!userDoc.exists() || userDoc.data().role !== 'Site Admin') {
        toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission.' });
        router.push('/dashboard');
        return;
      }
      
      // If admin, fetch clubs for name mapping
      const clubsQuery = collection(firestore, 'clubs');
      unsubscribeClubs = onSnapshot(clubsQuery, (snapshot) => {
        const clubMap = new Map<string, string>();
        snapshot.forEach(doc => {
          clubMap.set(doc.id, doc.data().name);
        });
        setClubs(clubMap);
      });
      
      // If admin, fetch users marked as 'Deleted'
      const usersQuery = query(collection(firestore, 'users'), where('memberStatus', '==', 'Deleted'));
      unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setDeletedUsers(usersData);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching deleted users: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch deleted users.' });
        setIsLoading(false);
      });
    });

    return () => {
        unsubscribeUsers();
        unsubscribeClubs();
    };
  }, [user, authLoading, router, toast]);

  const handlePermanentDelete = async () => {
    if (!userToDelete || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'No user selected for deletion.' });
        return;
    }
    
    try {
        await deleteDoc(doc(firestore, 'users', userToDelete.id));
        toast({
            title: 'Success!',
            description: `${userToDelete.firstName} ${userToDelete.lastName} has been permanently deleted from Firestore.`,
        });
        setUserToDelete(null); // Close the dialog
    } catch (error) {
        console.error("Error permanently deleting user: ", error);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Could not permanently delete the user.',
        });
    }
  };
  
  const getClubName = (clubId?: string) => {
    if (!clubId) return 'N/A';
    return clubs.get(clubId) || 'Unknown Club';
  };

  const renderUserList = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-10 w-32" /></TableCell>
          </TableRow>
      ));
    }
    
    if (deletedUsers.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
            There are no users marked for deletion.
          </TableCell>
        </TableRow>
      );
    }

    return deletedUsers.map((u) => (
       <TableRow key={u.id}>
          <TableCell className="font-medium">{u.firstName} {u.lastName}</TableCell>
          <TableCell>{u.email}</TableCell>
          <TableCell>{getClubName(u.primaryClubId)}</TableCell>
          <TableCell className="text-right">
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Permanently Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the Firestore record for <strong>{u.firstName} {u.lastName}</strong>.
                            <br/><br/>
                             <strong>Important:</strong> Have you already deleted this user from the <strong>Firebase Authentication</strong> console tab? This action is not reversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handlePermanentDelete()} onMouseDown={() => setUserToDelete(u)}>
                            Yes, I have deleted them from Auth
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </TableCell>
        </TableRow>
    ))
  }
  
  if (!isSiteAdmin) {
    return <div className="flex items-center justify-center p-8"><Skeleton className="h-64 w-full" /></div>
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deleted Users</h1>
        <p className="text-muted-foreground">Manage users marked for permanent deletion.</p>
      </div>
      
       <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Two-Step Deletion Process</AlertTitle>
            <AlertDescription>
                This list shows users who are hidden from the app. To complete deletion, you must first go to your Firebase project's <strong>Authentication</strong> section and delete the user there. Afterwards, click "Permanently Delete" here to remove their data from the database.
            </AlertDescription>
        </Alert>
      
      <Card>
        <CardHeader>
          <CardTitle>Users Pending Deletion</CardTitle>
          <CardDescription>
            These user records will be permanently removed from Firestore after you click delete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Club</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderUserList()}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                If a user is deleted by mistake, you can edit their record in the main Users page and change their status back from "Deleted".
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
