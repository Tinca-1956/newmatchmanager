
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
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import type { Application, Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function ApplicationsPage() {
  const { isSiteAdmin, isClubAdmin, userProfile, loading: adminLoading } = useAdminAuth();
  const { toast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Effect to set the initial club for fetching applications
  useEffect(() => {
    if (adminLoading) return;
    if (isSiteAdmin) {
      if (!firestore) return;
      const clubsQuery = query(collection(firestore, 'clubs'));
      const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setClubs(clubsData);
        if (clubsData.length > 0 && !selectedClubId) {
          setSelectedClubId(clubsData[0].id);
        }
      }, (error) => {
        console.error("Error fetching clubs for site admin:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
      });
      return () => unsubscribe();
    } else if (userProfile?.primaryClubId) {
      setSelectedClubId(userProfile.primaryClubId);
    }
  }, [isSiteAdmin, userProfile, adminLoading, selectedClubId, toast]);

  // Effect to fetch applications for the selected club
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      if (!adminLoading) {
        setApplications([]);
        setIsLoading(false);
      }
      return;
    }
    
    setIsLoading(true);
    const applicationsQuery = query(
      collection(firestore, 'applications'),
      where('clubId', '==', selectedClubId),
      where('status', '==', 'pending')
    );
    
    const unsubscribe = onSnapshot(applicationsQuery, (snapshot) => {
      const appsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
      setApplications(appsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching applications: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch applications.' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClubId, toast, adminLoading]);

  const handleAccept = (applicationId: string) => {
    // This will be implemented in the next step
    toast({
      title: 'Pending Implementation',
      description: `Accept functionality for application ${applicationId} is not yet implemented.`,
    });
  };

  if (adminLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-8 w-3/4" />
        <Card><CardHeader><Skeleton className="h-8 w-1/4" /><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!isSiteAdmin && !isClubAdmin) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>You do not have permission to view this page.</AlertDescription>
      </Alert>
    );
  }

  const renderApplicationList = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
          <TableCell><Skeleton className="h-4 w-52" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-10 w-24" /></TableCell>
        </TableRow>
      ));
    }

    if (applications.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            No pending applications for this club.
          </TableCell>
        </TableRow>
      );
    }

    return applications.map((app) => (
      <TableRow key={app.id}>
        <TableCell className="font-medium">{app.userName}</TableCell>
        <TableCell>{app.userEmail}</TableCell>
        <TableCell>
          {app.createdAt instanceof Timestamp ? format(app.createdAt.toDate(), 'PPP p') : 'N/A'}
        </TableCell>
        <TableCell className="text-right">
          <Button onClick={() => handleAccept(app.id)}>Accept</Button>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground">Review and accept applications from new members.</p>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <CardTitle>Pending Applications</CardTitle>
              <CardDescription>A list of all users waiting for club membership approval.</CardDescription>
            </div>
            {isSiteAdmin && (
              <div className="flex items-center gap-2">
                <Label htmlFor="club-filter" className="text-nowrap">Club</Label>
                <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                  <SelectTrigger id="club-filter" className="w-[180px]">
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
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Date Applied</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderApplicationList()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
