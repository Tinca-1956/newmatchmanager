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
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import type { User, Club, MembershipStatus, UserRole } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ListFilter, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminAuth } from '@/hooks/use-admin-auth';

export default function MembersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();

  const [members, setMembers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MembershipStatus[]>([]);
  const [roleFilter, setRoleFilter] = useState<UserRole[]>([]);

  useEffect(() => {
    if (adminLoading) return;
    setIsLoading(true);

    if (isSiteAdmin) {
      // Site Admin: Fetch all clubs
      const clubsQuery = collection(firestore, 'clubs');
      const unsubscribeClubs = onSnapshot(clubsQuery, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setClubs(clubsData);
        if (user) {
            const userDocRef = doc(firestore, 'users', user.uid);
            getDoc(userDocRef).then(userDoc => {
                if(userDoc.exists()) {
                    setSelectedClubId(userDoc.data().primaryClubId || (clubsData.length > 0 ? clubsData[0].id : ''));
                }
            });
        }
      });
      return () => unsubscribeClubs();
    } else if (user) {
      // Other roles: fetch their primary club
      const userDocRef = doc(firestore, 'users', user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSelectedClubId(userData.primaryClubId);
        }
      });
      return () => unsubscribeUser();
    }
  }, [user, isSiteAdmin, adminLoading]);

  useEffect(() => {
    if (!selectedClubId) {
      setIsLoading(false);
      setMembers([]);
      return;
    }
    
    setIsLoading(true);
    const membersQuery = query(collection(firestore, 'users'), where('primaryClubId', '==', selectedClubId));

    const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setMembers(membersData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching club members: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch club members.' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClubId, toast]);

  const handleStatusChange = async (memberId: string, newStatus: MembershipStatus) => {
    setIsUpdating(true);
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

  const filteredMembers = members.filter(member => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(member.memberStatus);
    const matchesRole = roleFilter.length === 0 || roleFilter.includes(member.role);
    return matchesSearch && matchesStatus && matchesRole;
  });

  const canEdit = isSiteAdmin || members.find(m => m.id === user?.uid)?.role === 'Club Admin';

  const renderMemberList = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
          <TableCell><Skeleton className="h-8 w-24" /></TableCell>
          <TableCell><Skeleton className="h-8 w-32" /></TableCell>
        </TableRow>
      ));
    }
    
    if (filteredMembers.length === 0) {
        return <TableRow><TableCell colSpan={4} className="h-24 text-center">No members found.</TableCell></TableRow>;
    }
    
    return filteredMembers.map(member => (
      <TableRow key={member.id}>
        <TableCell className="font-medium">{`${member.firstName} ${member.lastName}`}</TableCell>
        <TableCell>{member.email}</TableCell>
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
           {canEdit ? (
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
                <SelectItem value="Site Admin">Site Admin</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span>{member.role}</span>
          )}
        </TableCell>
      </TableRow>
    ));
  };


  return (
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
                <DropdownMenuCheckboxItem
                  checked={roleFilter.includes('Site Admin')}
                  onCheckedChange={() => toggleFilter('role', 'Site Admin')}
                >
                  Site Admin
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderMemberList()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
