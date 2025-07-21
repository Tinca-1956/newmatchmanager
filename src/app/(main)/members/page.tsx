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
import type { User, UserRole, MembershipStatus } from '@/lib/types';
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

interface Member extends User {
  clubName: string;
}

export default function MembersPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [clubName, setClubName] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !firestore) {
      if (!authLoading) {
        setIsLoading(false);
      }
      return;
    }

    let unsubscribe: () => void = () => {};

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, async (userDoc) => {
      if (unsubscribe) {
        unsubscribe(); // Detach previous members listener
      }

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
        setMembers([]);
        setIsLoading(false);
        return;
      }
      
      const clubDocRef = doc(firestore, 'clubs', primaryClubId);
      const clubDoc = await getDoc(clubDocRef);
      const currentClubName = clubDoc.exists() ? clubDoc.data().name : 'Unknown Club';
      setClubName(currentClubName);

      const usersCollection = collection(firestore, 'users');
      const membersQuery = query(usersCollection, where('primaryClubId', '==', primaryClubId));

      unsubscribe = onSnapshot(membersQuery, (snapshot) => {
        const membersData = snapshot.docs.map(doc => {
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
          } as Member;
        });
        setMembers(membersData);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching members: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch club members.',
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
  
  const handleEditClick = (member: Member) => {
    setSelectedMember(member);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !firestore) return;
    
    // Rule: Cannot leave club with no admin
    const clubAdmins = members.filter(m => m.role === 'Club Admin');
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
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            {canEdit && <TableCell><Skeleton className="h-10 w-20" /></TableCell>}
          </TableRow>
      ));
    }
    
    if (members.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={canEdit ? 5 : 4} className="h-24 text-center">
            No members found for this club.
          </TableCell>
        </TableRow>
      );
    }
    
    return members.map((member) => (
       <TableRow key={member.id}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                 <AvatarFallback><UserIcon className="h-5 w-5"/></AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{`${member.firstName} ${member.lastName}`}</p>
                 <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
            </div>
          </TableCell>
          <TableCell>{member.clubName}</TableCell>
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
        <CardHeader>
          <CardTitle>
            {isLoading ? <Skeleton className="h-6 w-48" /> : `${clubName} Members`}
          </CardTitle>
          <CardDescription>
            A list of all the members in your primary club.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Primary Club</TableHead>
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
