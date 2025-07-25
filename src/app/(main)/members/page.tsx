
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { collection, doc, onSnapshot, query, where, updateDoc, orderBy } from 'firebase/firestore';
import type { User, UserRole, MembershipStatus, Club } from '@/lib/types';
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

interface Member extends User {
  clubName: string;
}

export default function MembersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);

  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for Edit Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for Filters
  const [selectedClubId, setSelectedClubId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch current user profile to determine role
  useEffect(() => {
    if (authLoading || !user || !firestore) {
      if (!authLoading) setIsLoading(false);
      return;
    }
    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
      if (userDoc.exists()) {
        const userProfile = { id: userDoc.id, ...userDoc.data() } as User;
        setCurrentUserProfile(userProfile);
        // Default filter to user's primary club if they are not a Site Admin
        if (userProfile.role !== 'Site Admin' && userProfile.primaryClubId) {
          setSelectedClubId(userProfile.primaryClubId);
        }
      } else {
        setIsLoading(false);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find your user profile.' });
      }
    });
    return () => unsubscribeUser();
  }, [user, authLoading, toast]);
  
  // Fetch all clubs (for Site Admin dropdown and name mapping)
  useEffect(() => {
    if (!firestore) return;
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    const unsubscribeClubs = onSnapshot(clubsQuery, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setClubs(clubsData);
    });
    return () => unsubscribeClubs();
  }, []);

  // Fetch users based on role
  useEffect(() => {
    if (!currentUserProfile || !firestore) return;

    setIsLoading(true);
    let usersQuery;
    if (currentUserProfile.role === 'Site Admin') {
        // Site Admins fetch all users
        usersQuery = query(collection(firestore, 'users'));
    } else {
        // Other roles (Club Admin) fetch only users from their primary club
        usersQuery = query(collection(firestore, 'users'), where('primaryClubId', '==', currentUserProfile.primaryClubId));
    }
    
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setAllUsers(usersData.filter(u => u.memberStatus !== 'Deleted'));
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching members: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch club members.' });
        setIsLoading(false);
    });

    return () => unsubscribeUsers();
  }, [currentUserProfile, toast]);

  const getClubName = (clubId?: string) => {
    if (!clubId) return 'N/A';
    return clubs.find(c => c.id === clubId)?.name || 'Unknown Club';
  };
  
  const handleEditClick = (member: Member) => {
    setSelectedMember(member);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !firestore) return;
    
    const clubAdmins = filteredMembers.filter(m => m.role === 'Club Admin' && m.primaryClubId === selectedMember.primaryClubId);
    if (
      clubAdmins.length === 1 && 
      clubAdmins[0].id === selectedMember.id &&
      selectedMember.role !== 'Club Admin'
    ) {
      toast({
        variant: 'destructive',
        title: 'Action Prohibited',
        description: 'You cannot remove the last Club Admin from this club.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const memberDocRef = doc(firestore, 'users', selectedMember.id);
      await updateDoc(memberDocRef, {
        firstName: selectedMember.firstName,
        lastName: selectedMember.lastName,
        role: selectedMember.role,
        memberStatus: selectedMember.memberStatus,
      });

      toast({
        title: 'Success!',
        description: `${selectedMember.firstName}'s profile has been updated.`,
      });
      setIsEditDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Error updating member:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the member details. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setRoleFilter('all');
    // Site admins reset to all clubs, others reset to their own
    if (currentUserProfile?.role === 'Site Admin') {
      setSelectedClubId('all');
    } else {
      setSelectedClubId(currentUserProfile?.primaryClubId || 'all');
    }
  };

  const filteredMembers = useMemo(() => {
    return allUsers.filter(member => {
        const clubMatch = selectedClubId === 'all' || member.primaryClubId === selectedClubId;
        const statusMatch = statusFilter === 'all' || member.memberStatus === statusFilter;
        const roleMatch = roleFilter === 'all' || member.role === roleFilter;
        const searchMatch = searchTerm.trim() === '' ||
                          `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
        return clubMatch && statusMatch && roleMatch && searchMatch;
      }).map(member => ({
        ...member,
        clubName: getClubName(member.primaryClubId)
      }));
  }, [allUsers, selectedClubId, statusFilter, roleFilter, searchTerm, clubs]);

  const canEdit = currentUserProfile?.role === 'Site Admin' || currentUserProfile?.role === 'Club Admin';

  const renderMemberList = () => {
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
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            {canEdit && <TableCell className="text-right"><Skeleton className="h-10 w-12" /></TableCell>}
          </TableRow>
      ));
    }
    
    if (filteredMembers.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={canEdit ? 4 : 3} className="h-24 text-center">
            No members found with the selected filters.
          </TableCell>
        </TableRow>
      );
    }
    
    return filteredMembers.map((member) => (
       <TableRow key={member.id}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                 <AvatarFallback><UserIcon className="h-5 w-5"/></AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{`${member.firstName} ${member.lastName}`}</p>
              </div>
            </div>
          </TableCell>
          <TableCell>{member.memberStatus}</TableCell>
          <TableCell>{member.role}</TableCell>
          {canEdit && (
            <TableCell className="text-right">
              <Button variant="outline" size="sm" onClick={() => handleEditClick(member)}>
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit Member</span>
              </Button>
            </TableCell>
          )}
        </TableRow>
    ))
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground">Manage your club members here.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>
                    {currentUserProfile?.role === 'Site Admin' ? 'All Club Members' : `${getClubName(currentUserProfile?.primaryClubId)} Members` }
                </CardTitle>
                <CardDescription>
                    {currentUserProfile?.role === 'Site Admin' ? 'A list of all members in the system.' : 'A list of all members in your primary club.'}
                </CardDescription>
            </div>
            <div className="flex items-end gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder="Search by name..."
                      className="pl-8 sm:w-[250px] h-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {currentUserProfile?.role === 'Site Admin' && (
                  <div className="grid w-52 gap-1.5">
                    <Label htmlFor="club-filter">Club</Label>
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                      <SelectTrigger id="club-filter">
                        <SelectValue placeholder="Filter by club..." />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="all">All Clubs</SelectItem>
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={club.id}>
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid w-48 gap-1.5">
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger id="status-filter">
                            <SelectValue placeholder="Filter by status..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Member">Member</SelectItem>
                            <SelectItem value="Suspended">Suspended</SelectItem>
                            <SelectItem value="Blocked">Blocked</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid w-48 gap-1.5">
                    <Label htmlFor="role-filter">Role</Label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger id="role-filter">
                            <SelectValue placeholder="Filter by role..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="Angler">Angler</SelectItem>
                            <SelectItem value="Marshal">Marshal</SelectItem>
                            <SelectItem value="Club Admin">Club Admin</SelectItem>
                             {currentUserProfile?.role === 'Site Admin' && <SelectItem value="Site Admin">Site Admin</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
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
      
      {selectedMember && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <form onSubmit={handleUpdateMember}>
              <DialogHeader>
                <DialogTitle>Edit Member</DialogTitle>
                <DialogDescription>
                  Update details for {selectedMember.firstName} {selectedMember.lastName}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={selectedMember.firstName} 
                      onChange={(e) => setSelectedMember({...selectedMember, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={selectedMember.lastName} 
                      onChange={(e) => setSelectedMember({...selectedMember, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={selectedMember.email} disabled />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={selectedMember.memberStatus}
                    onValueChange={(value) => setSelectedMember({...selectedMember, memberStatus: value as MembershipStatus})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Member">Member</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={selectedMember.role}
                    onValueChange={(value) => setSelectedMember({...selectedMember, role: value as UserRole})}
                    disabled={selectedMember.id === user?.uid}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem 
                        value="Site Admin"
                        disabled={currentUserProfile?.role !== 'Site Admin'}
                      >
                        Site Admin
                      </SelectItem>
                      <SelectItem 
                        value="Club Admin" 
                        disabled={selectedMember.role === 'Site Admin' && currentUserProfile?.role !== 'Site Admin'}
                      >
                        Club Admin
                      </SelectItem>
                      <SelectItem 
                        value="Marshal"
                        disabled={selectedMember.role === 'Site Admin' && currentUserProfile?.role !== 'Site Admin'}
                      >
                        Marshal
                      </SelectItem>
                      <SelectItem 
                        value="Angler"
                        disabled={selectedMember.role === 'Site Admin' && currentUserProfile?.role !== 'Site Admin'}
                      >
                        Angler
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedMember.id === user?.uid && (
                    <p className="text-xs text-muted-foreground">You cannot change your own role.</p>
                  )}
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
