
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';
import type { User, Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-admin-auth';

export default function MarshalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();

  const [marshals, setMarshals] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  // Fetch initial data based on user role
  useEffect(() => {
    if (adminLoading || !user || !firestore) return;

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                setIsLoading(false);
                return;
            }
            const userData = userDoc.data() as User;

            if (isSiteAdmin) {
                // Fetch all clubs for Site Admin
                const clubsQuery = collection(firestore, 'clubs');
                const clubsSnapshot = await getDocs(clubsQuery);
                const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
                setClubs(clubsData);
                setSelectedClubId(userData.primaryClubId || (clubsData.length > 0 ? clubsData[0].id : ''));
            } else {
                setSelectedClubId(userData.primaryClubId || '');
            }
        } catch (error) {
            console.error("Error fetching initial data: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load initial data.' });
        } finally {
            // The loading state will be set to false in the next useEffect
        }
    };
    
    fetchInitialData();

  }, [user, adminLoading, isSiteAdmin, toast]);

  // Fetch marshals based on selected club
  useEffect(() => {
    if (!selectedClubId || !firestore) {
        if(!isSiteAdmin) setIsLoading(false);
        setMarshals([]);
        return;
    }
    
    setIsLoading(true);

    const marshalsQuery = query(
        collection(firestore, 'users'),
        where('primaryClubId', '==', selectedClubId),
        where('role', '==', 'Marshal')
    );

    const unsubscribe = onSnapshot(marshalsQuery, (snapshot) => {
        const marshalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setMarshals(marshalsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching marshals: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch marshals.' });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClubId, firestore, toast, isSiteAdmin]);


  const filteredMarshals = marshals.filter(marshal => {
    const fullName = `${marshal.firstName} ${marshal.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const renderMarshalList = () => {
    if (isLoading) {
      return Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
        </TableRow>
      ));
    }
    
    if (filteredMarshals.length === 0) {
        return <TableRow><TableCell colSpan={2} className="h-24 text-center">No marshals found for this club.</TableCell></TableRow>;
    }
    
    return filteredMarshals.map(marshal => (
      <TableRow key={marshal.id}>
        <TableCell className="font-medium">{`${marshal.firstName} ${marshal.lastName}`}</TableCell>
        <TableCell>{marshal.email}</TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marshals</h1>
        <p className="text-muted-foreground">View all club marshals.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Marshal List</CardTitle>
          <CardDescription>A list of all members with the Marshal role.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
             {isSiteAdmin && (
              <div className="flex items-center gap-2">
                <Label htmlFor="club-filter" className="text-nowrap">Club</Label>
                <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                    <SelectTrigger id="club-filter" className="w-52">
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
              </div>
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
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderMarshalList()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

