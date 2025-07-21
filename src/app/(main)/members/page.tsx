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
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User as UserIcon } from 'lucide-react';

interface Member extends User {
  clubName: string;
}

export default function MembersPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [clubName, setClubName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user || !firestore) {
      if (!authLoading && !user) {
        setIsLoading(false);
      }
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    let unsubscribeMembers: () => void = () => {};

    const fetchPrimaryClubAndMembers = async () => {
      try {
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not find your user profile.' });
          setIsLoading(false);
          return;
        }

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

        unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
          const membersData = snapshot.docs.map(doc => {
            const data = doc.data();
            const nameParts = (data.displayName || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            return {
              id: doc.id,
              name: data.displayName || '',
              firstName: firstName,
              lastName: lastName,
              email: data.email || '',
              role: data.role || 'Angler',
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
        
      } catch (error) {
        console.error("Error fetching user/club data: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load initial data.' });
        setIsLoading(false);
      }
    };
    
    fetchPrimaryClubAndMembers();

    return () => {
      unsubscribeMembers();
    };
  }, [user, authLoading, toast]);
  
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
            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
          </TableRow>
      ));
    }
    
    if (members.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
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
                <p className="font-medium">{member.name}</p>
                 <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
            </div>
          </TableCell>
          <TableCell>{member.clubName}</TableCell>
          <TableCell>{member.role}</TableCell>
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
