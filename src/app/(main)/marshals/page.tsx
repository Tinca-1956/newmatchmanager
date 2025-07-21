
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
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, doc, getDoc, onSnapshot, query, where, updateDoc } from 'firebase/firestore';
import type { User, UserRole } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User as UserIcon, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Marshal extends User {
  clubName: string;
}

export default function MarshalsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [marshals, setMarshals] = useState<Marshal[]>([]);
  const [clubName, setClubName] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMarshal, setSelectedMarshal] = useState<Marshal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !firestore) {
      if (!authLoading) setIsLoading(false);
      return;
    }

    let unsubscribe: () => void = () => {};

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, async (userDoc) => {
      if (unsubscribe) unsubscribe();

      if (!userDoc.exists()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find your user profile.' });
        setIsLoading(false);
        return;
      }
      
      const userProfile = { id: userDoc.id, ...userDoc.data() } as User;
      setCurrentUserProfile(userProfile);

      const primaryClubId = userDoc.data()?.primaryClubId;
      if (!primaryClubId) {
        setClubName('No primary club selected');
        setMarshals([]);
        setIsLoading(false);
        return;
      }
      
      const clubDocRef = doc(firestore, 'clubs', primaryClubId);
      const clubDoc = await getDoc(clubDocRef);
      const currentClubName = clubDoc.exists() ? clubDoc.data().name : 'Unknown Club';
      setClubName(currentClubName);

      const usersCollection = collection(firestore, 'users');
      const marshalsQuery = query(
        usersCollection,
        where('primaryClubId', '==', primaryClubId),
        where('role', '==', 'Marshal')
      );

      unsubscribe = onSnapshot(marshalsQuery, (snapshot) => {
        const marshalsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            role: data.role || 'Angler',
            memberStatus: data.memberStatus || 'Pending',
            primaryClubId: data.primaryClubId,
            clubName: currentClubName,
          } as Marshal;
        });
        setMarshals(marshalsData);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching marshals: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch club marshals.',
        });
        setIsLoading(false);
      });

    }, (error) => {
       console.error("Error fetching user data: ", error);
       toast({ variant: 'destructive', title: 'Error', description: 'Failed to load your profile.' });
       setIsLoading(false);
    });

    return () => {
      unsubscribeUser();
      unsubscribe();
    };
  }, [user, authLoading, toast]);
  
  const handleEditClick = (marshal: Marshal) => {
    setSelectedMarshal(marshal);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateMarshal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarshal || !firestore) return;

    setIsSaving(true);
    try {
      const marshalDocRef = doc(firestore, 'users', selectedMarshal.id);
      await updateDoc(marshalDocRef, {
        firstName: selectedMarshal.firstName,
        lastName: selectedMarshal.lastName,
        role: selectedMarshal.role,
      });

      toast({
        title: 'Success!',
        description: `${selectedMarshal.firstName}'s profile has been updated.`,
      });
      setIsEditDialogOpen(false);
      setSelectedMarshal(null);
    } catch (error) {
      console.error('Error updating marshal:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the marshal details. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit = currentUserProfile?.role === 'Site Admin' || currentUserProfile?.role === 'Club Admin';

  const renderMarshalList = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell>
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            {canEdit && <TableCell><Skeleton className="h-10 w-20" /></TableCell>}
          </TableRow>
      ));
    }
    
    if (marshals.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={canEdit ? 3 : 2} className="h-24 text-center">
            No marshals found for this club.
          </TableCell>
        </TableRow>
      );
    }
    
    return marshals.map((marshal) => (
       <TableRow key={marshal.id}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                 <AvatarFallback><UserIcon className="h-5 w-5"/></AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{`${marshal.firstName} ${marshal.lastName}`}</p>
                 <p className="text-sm text-muted-foreground">{marshal.email}</p>
              </div>
            </div>
          </TableCell>
          <TableCell>{marshal.role}</TableCell>
          {canEdit && (
            <TableCell className="text-right">
              <Button variant="outline" size="sm" onClick={() => handleEditClick(marshal)}>
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit Marshal</span>
              </Button>
            </TableCell>
          )}
        </TableRow>
    ))
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marshals</h1>
        <p className="text-muted-foreground">Manage your club marshals here.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {isLoading ? <Skeleton className="h-6 w-48" /> : `${clubName} Marshals`}
          </CardTitle>
          <CardDescription>
            A list of all the marshals in your primary club.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderMarshalList()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {selectedMarshal && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <form onSubmit={handleUpdateMarshal}>
              <DialogHeader>
                <DialogTitle>Edit Marshal</DialogTitle>
                <DialogDescription>
                  Update details for {selectedMarshal.firstName} {selectedMarshal.lastName}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={selectedMarshal.firstName} 
                      onChange={(e) => setSelectedMarshal({...selectedMarshal, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={selectedMarshal.lastName} 
                      onChange={(e) => setSelectedMarshal({...selectedMarshal, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={selectedMarshal.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={selectedMarshal.role}
                    onValueChange={(value) => setSelectedMarshal({...selectedMarshal, role: value as UserRole})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Angler">Angler</SelectItem>
                      <SelectItem value="Marshal">Marshal</SelectItem>
                      <SelectItem 
                        value="Club Admin"
                        disabled={currentUserProfile?.role !== 'Site Admin'}
                      >
                        Club Admin
                      </SelectItem>
                       <SelectItem 
                        value="Site Admin"
                        disabled={currentUserProfile?.role !== 'Site Admin'}
                      >
                        Site Admin
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

    