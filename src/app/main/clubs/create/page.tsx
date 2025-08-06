
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, addDoc } from 'firebase/firestore';
import type { Club } from '@/lib/types';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const initialClubState: Omit<Club, 'id'> = {
  name: '',
  description: '',
  imageUrl: `https://placehold.co/100x100.png`,
};

export default function CreateClubPage() {
  const { toast } = useToast();
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();
  const router = useRouter();

  const [newClub, setNewClub] = useState<Omit<Club, 'id'>>(initialClubState);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewClub(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !newClub.name) {
        toast({ variant: 'destructive', title: 'Error', description: 'Club name is required.' });
        return;
    }
    
    setIsSaving(true);
    try {
        await addDoc(collection(firestore, 'clubs'), newClub);
        toast({ title: 'Success!', description: 'Club created successfully.' });
        router.push('/main/clubs');
    } catch (error) {
        console.error('Error creating club:', error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not create the club.' });
    } finally {
        setIsSaving(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-8 w-3/4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent><Skeleton className="h-48 w-full" /></CardContent>
          <CardFooter><Skeleton className="h-10 w-32" /></CardFooter>
        </Card>
      </div>
    );
  }

  if (!isSiteAdmin) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
            You do not have permission to create new clubs.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Create a New Club</h1>
            <p className="text-muted-foreground">Fill out the form below to add a new club to the system.</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Club Details</CardTitle>
            <CardDescription>Enter the name and description for the new club.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Club Name</Label>
              <Input
                id="name"
                name="name"
                value={newClub.name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Lakeside Anglers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={newClub.description}
                onChange={handleInputChange}
                placeholder="A brief description of the club."
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Create Club'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
