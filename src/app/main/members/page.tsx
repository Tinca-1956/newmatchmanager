
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, getDocs, orderBy } from 'firebase/firestore';
import type { User, Club, MembershipStatus, UserRole } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ListFilter, Search, Edit, UserX, CheckCircle, XCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface UserWithVerification extends User {
    isEmailVerified?: boolean;
}

export default function MembersPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const { isSiteAdmin, isClubAdmin, loading: adminLoading } = useAdminAuth();
  
  const [allUsers, setAllUsers] = useState<UserWithVerification[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MembershipStatus[]>([]);
  const [roleFilter, setRoleFilter] = useState<UserRole[]>([]);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);


  // Fetch initial data based on user role
  useEffect(() => {
    if (adminLoading) return;
    
    const fetchInitialData = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firestore not available.' });
            return;
        }

        try {
            if (isSiteAdmin) {
                const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
                const clubsSnapshot = await getDocs(clubsQuery);
                const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
                setClubs(clubsData);
                if (userProfile?.primaryClubId) {
                    setSelectedClubId(userProfile.primaryClubId);
                } else if (clubsData.length > 0) {
                    setSelectedClubId(clubsData[0].id);
                }
            } else {
                setSelectedClubId(userProfile?.primaryClubId || '');
            }
        } catch (error) {
            console.error("Error fetching initial data: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load initial data.' });
        }
    };
    
    fetchInitialData();

  }, [userProfile, isSiteAdmin, adminLoading, toast]);
  
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      if (!adminLoading) { // Only stop loading if we aren't waiting for admin status
        setIsLoading(false);
      }
      setAllUsers([]);
      return;
    }
    
    setIsLoading(true);
    const membersQuery = query(collection(firestore, 'users'), where('primaryClubId', '==', selectedClubId));
    const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
        const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserWithVerification));
        setAllUsers(membersData);

        // After fetching users, get their verification status
        if (membersData.length > 0 && (isSiteAdmin || isClubAdmin)) {
            const functions = getFunctions();
            const checkEmailVerification = httpsCallable(functions, 'checkEmailVerification');
            const uids = membersData.map(m => m.id);
            
            checkEmailVerification({ uids })
                .then(result => {
                    const statuses = result.data as { [uid: string]: boolean };
                    setAllUsers(prevUsers => prevUsers.map(u => ({
                        ...u,
                        isEmailVerified: statuses[u.id]
                    })));
                })
                .catch(error => {
                    console.error("Error checking email verification:", error);
                    toast({
                        variant: 'destructive',
                        title: 'Could not get verification status',
                        description: 'Please check console for errors.',
                    });
                });
        }

        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching club members: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch club members.' });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClubId, toast, adminLoading, isSiteAdmin, isClubAdmin]);
  
  const handleEditClick = (userToEdit: User) => {
    setSelectedUser({ ...userToEdit }); // Create a copy to edit
    setIsEditDialogOpen(true);
  };
  
  const handleUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !firestore) return;

    setIsSaving(true);
    try {
      const userDocRef = doc(firestore, 'users', selectedUser.id);
      await updateDoc(userDocRef, {
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
      });
      toast({ title: 'Success!', description: "Member's name has been updated." });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update user details.' });
    } finally {
      setIsSaving(false);
    }
  };


  const handleStatusChange = async (memberId: string, newStatus: MembershipStatus) => {
    setIsUpdating(true);
    if (!firestore) return;
    try {
      const memberDocRef = doc(firestore, 'users', memberId);
      await updateDoc(memberDocRef, { memberStatus: newStatus });
      toast({ title: "Success", description: "Member status updated." });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update member status.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
     setIsUpdating(true);
     if (!firestore) return;
    try {
      const memberDocRef = doc(firestore, 'users', memberId);
      await updateDoc(memberDocRef, { role: newRole });
      toast({ title: "Success", description: "Member role updated." });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update member role.' });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleDeleteUser = async (memberId: string) => {
    setIsUpdating(true);
    if (!firestore) return;
    try {
      const memberDocRef = doc(firestore, 'users', memberId);
      // Soft delete by changing status
      await updateDoc(memberDocRef, { memberStatus: 'Deleted' });
      toast({ title: "User Deleted", description: "The user's status has been set to 'Deleted'. They can be managed from the 'Deleted Users' page." });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the user.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleFilter = (filter: 'status' | 'role', value: MembershipStatus | UserRole) => {
    if (filter === 'status') {
      setStatusFilter(prev =>
        prev.includes(value as MembershipStatus)
          ? prev.filter(s => s !== value)
          : [...prev, value as MembershipStatus]
      );
    } else {
      setRoleFilter(prev =>
        prev.includes(value as UserRole)
          ? prev.filter(r => r !== value)
          : [...prev, value as UserRole]
      );
    }
  };

  const filteredMembers = allUsers.filter(member => {
    const clubMatch = !selectedClubId || member.primaryClubId === selectedClubId;
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(member.memberStatus);
    const matchesRole = roleFilter.length === 0 || roleFilter.includes(member.role);
    const notDeleted = member.memberStatus !== 'Deleted';
    return clubMatch && matchesSearch && matchesStatus && matchesRole && notDeleted;
  });

  const canEdit = isSiteAdmin || isClubAdmin;
  const canViewEmail = canEdit;

  const renderMemberList = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          {canViewEmail && <TableCell><Skeleton className="h-4 w-48" /></TableCell>}
          <TableCell><Skeleton className="h-8 w-24" /></TableCell>
          <TableCell><Skeleton className="h-8 w-32" /></TableCell>
          {canEdit && <TableCell><Skeleton className="h-8 w-20" /></TableCell>}
        </TableRow>
      ));
    }
    
    if (filteredMembers.length === 0) {
        return <TableRow><TableCell colSpan={canEdit ? (canViewEmail ? 6 : 5) : (canViewEmail ? 5 : 4)} className="h-24 text-center">No members found.</TableCell></TableRow>;
    }
    
    return filteredMembers.map(member => (
      <TableRow key={member.id}>
        <TableCell className="font-medium">{`${member.firstName} ${member.lastName}`}</TableCell>
        {canViewEmail && (
            <TableCell>
                 <div className="flex items-center gap-2">
                    <span>{member.email}</span>
                    {member.isEmailVerified === undefined ? (
                         <Skeleton className="h-4 w-4 rounded-full" />
                    ) : member.isEmailVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                    )}
                 </div>
            </TableCell>
        )}
        <TableCell>
          {canEdit ? (
            <Select
              value={member.memberStatus}
              onValueChange={(value) => handleStatusChange(member.id, value as MembershipStatus)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Member">Member</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant={member.memberStatus === 'Member' ? 'default' : 'secondary'}>{member.memberStatus}</Badge>
          )}
        </TableCell>
        <TableCell>
           {canEdit && member.role !== 'Site Admin' ? (
            <Select
              value={member.role}
              onValueChange={(value) => handleRoleChange(member.id, value as UserRole)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Angler">Angler</SelectItem>
                <SelectItem value="Marshal">Marshal</SelectItem>
                <SelectItem value="Club Admin">Club Admin</SelectItem>
                {isSiteAdmin && <SelectItem value="Site Admin">Site Admin</SelectItem>}
              </SelectContent>
            </Select>
          ) : (
            <span>{member.role}</span>
          )}
        </TableCell>
        {canEdit && (
            <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="icon" onClick={() => handleEditClick(member)}>
                    <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <UserX className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will mark {member.firstName} {member.lastName} as 'Deleted'. They will no longer appear in member lists and will lose access. This action can be reversed by a Site Admin.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => handleDeleteUser(member.id)}
                    >
                        Confirm Delete
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            </TableCell>
        )}
      </TableRow>
    ));
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">View and manage club members.</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Member List</CardTitle>
            <CardDescription>A list of all members in the selected club.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
               {isSiteAdmin && (
                <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                    <SelectTrigger className="w-48">
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
              <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder="Search by name..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="ml-auto">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={statusFilter.includes('Pending')}
                        onCheckedChange={() => toggleFilter('status', 'Pending')}
                      >
                        Pending
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={statusFilter.includes('Member')}
                        onCheckedChange={() => toggleFilter('status', 'Member')}
                      >
                        Member
                      </DropdownMenuCheckboxItem>
                       <DropdownMenuCheckboxItem
                        checked={statusFilter.includes('Suspended')}
                        onCheckedChange={() => toggleFilter('status', 'Suspended')}
                      >
                        Suspended
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={statusFilter.includes('Blocked')}
                        onCheckedChange={() => toggleFilter('status', 'Blocked')}
                      >
                        Blocked
                      </DropdownMenuCheckboxItem>

                      <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                       <DropdownMenuCheckboxItem
                        checked={roleFilter.includes('Angler')}
                        onCheckedChange={() => toggleFilter('role', 'Angler')}
                      >
                        Angler
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={roleFilter.includes('Marshal')}
                        onCheckedChange={() => toggleFilter('role', 'Marshal')}
                      >
                        Marshal
                      </DropdownMenuCheckboxItem>
                       <DropdownMenuCheckboxItem
                        checked={roleFilter.includes('Club Admin')}
                        onCheckedChange={() => toggleFilter('role', 'Club Admin')}
                      >
                        Club Admin
                      </DropdownMenuCheckboxItem>
                      {isSiteAdmin && (
                        <DropdownMenuCheckboxItem
                            checked={roleFilter.includes('Site Admin')}
                            onCheckedChange={() => toggleFilter('role', 'Site Admin')}
                        >
                            Site Admin
                        </DropdownMenuCheckboxItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {canViewEmail && <TableHead>Email</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderMemberList()}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {selectedUser && canEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={() => { setIsEditDialogOpen(false); setSelectedUser(null); }}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleUserUpdate}>
              <DialogHeader>
                <DialogTitle>Edit Member</DialogTitle>
                <DialogDescription>
                  Update the name for {selectedUser.firstName} {selectedUser.lastName}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                            id="firstName"
                            value={selectedUser.firstName}
                            onChange={(e) => setSelectedUser({ ...selectedUser, firstName: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                            id="lastName"
                            value={selectedUser.lastName}
                            onChange={(e) => setSelectedUser({ ...selectedUser, lastName: e.target.value })}
                            required
                        />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={selectedUser.email} disabled />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => { setIsEditDialogOpen(false); setSelectedUser(null); }}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
