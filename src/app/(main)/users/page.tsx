
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
import { collection, doc, onSnapshot, updateDoc, getDocs } from 'firebase/firestore';
import type { User, UserRole, Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User as UserIcon, Edit, Search } from 'lucide-react';
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
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClubIdFilter, setSelectedClubIdFilter] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  const getClubName = (clubId: string | undefined) => {
    if (!clubId) return 'N/A';
    const club = clubs.find(c => c.id === clubId);
    return club ? club.name : clubId;
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || !firestore) {
      router.push('/login');
      return;
    }

    let unsubscribeUser: () => void = () => {};
    let unsubscribeClubs: () => void = () => {};
    let unsubscribeAllUsers: () => void = () => {};

    unsubscribeUser = onSnapshot(doc(firestore, 'users', user.uid), (userDoc) => {
      if (userDoc.exists() && userDoc.data().role === 'Site Admin') {
        setCurrentUserProfile({ id: userDoc.id, ...userDoc.data() } as User);
        
        // Fetch all clubs
        unsubscribeClubs = onSnapshot(collection(firestore, 'clubs'), (snapshot) => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setClubs(clubsData);
        });
        
        // Fetch all users
        unsubscribeAllUsers = onSnapshot(collection(firestore, 'users'), (snapshot) => {
          const usersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as User));
          setUsers(usersData);
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching all users: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch users.' });
          setIsLoading(false);
        });

      } else {
        toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission to view this page.' });
        router.push('/dashboard');
      }
    });

    return () => {
        unsubscribeUser();
        unsubscribeClubs();
        unsubscribeAllUsers();
    };
  }, [user, authLoading, router, toast]);
  
  const handleEditClick = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !firestore) return;

    setIsSaving(true);
    try {
      const userDocRef = doc(firestore, 'users', selectedUser.id);
      await updateDoc(userDocRef, {
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        role: selectedUser.role,
        primaryClubId: selectedUser.primaryClubId,
      });

      toast({
        title: 'Success!',
        description: `${selectedUser.firstName}'s profile has been updated.`,
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the user details. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const filteredUsers = users.filter(u => {
    const clubMatch = selectedClubIdFilter === 'all' || 
                      (selectedClubIdFilter === 'none' && !u.primaryClubId) || 
                      u.primaryClubId === selectedClubIdFilter;
    const roleMatch = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    
    const searchMatch = searchTerm.trim() === '' ||
                        (u.firstName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (u.lastName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (u.email?.toLowerCase().includes(searchTerm.toLowerCase()));

    return clubMatch && roleMatch && searchMatch;
  });

  const renderUserList = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell>
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-10 w-20" /></TableCell>
          </TableRow>
      ));
    }
    
    if (filteredUsers.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="h-24 text-center">
            No users found for this filter.
          </TableCell>
        </TableRow>
      );
    }

    return filteredUsers.map((u) => (
       <TableRow key={u.id}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                 <AvatarFallback><UserIcon className="h-5 w-5"/></AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{u.firstName}</p>
              </div>
            </div>
          </TableCell>
          <TableCell>{u.lastName}</TableCell>
          <TableCell>{getClubName(u.primaryClubId)}</TableCell>
          <TableCell>{u.email}</TableCell>
          <TableCell>{u.role}</TableCell>
          <TableCell className="text-right">
            <Button variant="outline" size="sm" onClick={() => handleEditClick(u)}>
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit User</span>
            </Button>
          </TableCell>
        </TableRow>
    ))
  }

  if (!currentUserProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage all application users here.</p>
        </div>
        <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="grid w-full md:w-auto gap-1.5">
                <Label htmlFor="search-users">Search</Label>
                 <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="search-users"
                        type="search"
                        placeholder="Search by name or email..."
                        className="pl-8 sm:w-[300px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="grid w-full md:w-52 gap-1.5">
                <Label htmlFor="club-filter">Club</Label>
                <Select value={selectedClubIdFilter} onValueChange={setSelectedClubIdFilter} disabled={clubs.length === 0}>
                    <SelectTrigger id="club-filter">
                        <SelectValue placeholder="Filter by club..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Clubs</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                        {clubs.map((club) => (
                            <SelectItem key={club.id} value={club.id}>
                                {club.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid w-full md:w-52 gap-1.5">
                <Label htmlFor="role-filter">Role</Label>
                <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
                    <SelectTrigger id="role-filter">
                        <SelectValue placeholder="Filter by role..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="Site Admin">Site Admin</SelectItem>
                        <SelectItem value="Club Admin">Club Admin</SelectItem>
                        <SelectItem value="Marshal">Marshal</SelectItem>
                        <SelectItem value="Angler">Angler</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            A list of all users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderUserList()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {selectedUser && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <form onSubmit={handleUpdateUser}>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update details for {selectedUser.firstName} {selectedUser.lastName}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={selectedUser.firstName} 
                      onChange={(e) => setSelectedUser({...selectedUser, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={selectedUser.lastName} 
                      onChange={(e) => setSelectedUser({...selectedUser, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={selectedUser.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(value) => setSelectedUser({...selectedUser, role: value as UserRole})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Site Admin">Site Admin</SelectItem>
                      <SelectItem value="Club Admin">Club Admin</SelectItem>
                      <SelectItem value="Marshal">Marshal</SelectItem>
                      <SelectItem value="Angler">Angler</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="primaryClubId">Primary Club</Label>
                     <Select
                        value={selectedUser.primaryClubId || 'no-club'}
                        onValueChange={(value) => {
                            const newClubId = value === 'no-club' ? '' : value;
                            setSelectedUser({...selectedUser, primaryClubId: newClubId})
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a club" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="no-club">None</SelectItem>
                            {clubs.map(club => (
                                <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                            ))}
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

    