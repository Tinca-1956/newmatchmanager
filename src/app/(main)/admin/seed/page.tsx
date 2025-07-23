
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, doc, writeBatch, getDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Loader2, Beaker, ShieldAlert } from 'lucide-react';

const fakeAnglers = [
  { firstName: 'Graham', lastName: 'Hancock' }, { firstName: 'Irene', lastName: 'Jacobs' },
  { firstName: 'Kevin', lastName: 'Lang' }, { firstName: 'Liam', lastName: 'McDermott' },
  { firstName: 'Nancy', lastName: 'Olsen' }, { firstName: 'Oliver', lastName: 'Patel' },
  { firstName: 'Patricia', lastName: 'Quinn' }, { firstName: 'Quentin', lastName: 'Reid' },
  { firstName: 'Rebecca', lastName: 'Smith' }, { firstName: 'Samuel', lastName: 'Taylor' },
  { firstName: 'Tina', lastName: 'Underwood' }, { firstName: 'Ulysses', lastName: 'Vance' },
  { firstName: 'Victoria', lastName: 'White' }, { firstName: 'Walter', lastName: 'Xavier' },
  { firstName: 'Xena', lastName: 'Young' }, { firstName: 'Yasmine', lastName: 'Zane' },
  { firstName: 'Zachary', lastName: 'Adams' }, { firstName: 'Abigail', lastName: 'Bell' },
  { firstName: 'Benjamin', lastName: 'Carter' }, { firstName: 'Catherine', lastName: 'Davis' },
  { firstName: 'David', lastName: 'Evans' }, { firstName: 'Emily', lastName: 'Foster' },
  { firstName: 'Frank', lastName: 'Green' }, { firstName: 'Fiona', lastName: 'Hill' },
  { firstName: 'George', lastName: 'Irwin' }, { firstName: 'Grace', lastName: 'Jones' },
  { firstName: 'Henry', lastName: 'King' }, { firstName: 'Hannah', lastName: 'Lewis' },
  { firstName: 'Ian', lastName: 'Miller' }, { firstName: 'Isla', lastName: 'Nelson' },
  { firstName: 'Jack', lastName: 'Owen' }, { firstName: 'Jessica', lastName: 'Price' },
  { firstName: 'Kyle', lastName: 'Quincy' }, { firstName: 'Karen', lastName: 'Roberts' },
  { firstName: 'Leo', lastName: 'Scott' }, { firstName: 'Laura', lastName: 'Thompson' },
  { firstName: 'Michael', lastName: 'Vincent' }, { firstName: 'Megan', lastName: 'Walker' },
  { firstName: 'Nathan', lastName: 'Young' }, { firstName: 'Nora', lastName: 'Zimmerman' },
  { firstName: 'Oscar', lastName: 'Anderson' }, { firstName: 'Olivia', lastName: 'Bailey' },
  { firstName: 'Paul', lastName: 'Clark' }, { firstName: 'Penelope', lastName: 'Edwards' },
  { firstName: 'Robert', lastName: 'Fisher' }, { firstName: 'Rachel', lastName: 'Gibson' },
];

export default function SeedPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSiteAdmin, loading } = useAdminAuth();
  const router = useRouter();

  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    if (!user || !isSiteAdmin || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You are not authorized to perform this action.',
      });
      return;
    }
    
    setIsSeeding(true);
    
    try {
      // Fetch the current admin's primary club ID to assign to new users
      const adminUserDocRef = doc(firestore, 'users', user.uid);
      const adminUserDoc = await getDoc(adminUserDocRef);
      const primaryClubId = adminUserDoc.data()?.primaryClubId;

      if (!primaryClubId) {
        throw new Error("Your admin account does not have a primary club set.");
      }

      const batch = writeBatch(firestore);
      const usersCollection = collection(firestore, 'users');

      fakeAnglers.forEach((angler) => {
        // Create a new document reference with a unique ID
        const newUserRef = doc(usersCollection); 
        
        const newUserData: Omit<User, 'id'> = {
          firstName: angler.firstName,
          lastName: angler.lastName,
          // Use a fake email to signify it's not a real auth user
          email: `${angler.firstName.toLowerCase()}.${angler.lastName.toLowerCase()}${Date.now()}@fake.com`, 
          role: 'Angler',
          memberStatus: 'Member',
          primaryClubId: primaryClubId,
        };
        batch.set(newUserRef, newUserData);
      });

      await batch.commit();

      toast({
        title: 'Database Seeded!',
        description: `${fakeAnglers.length} fake anglers have been added to your primary club.`,
      });

    } catch (error: any) {
      console.error("Error seeding database: ", error);
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: error.message || 'Could not seed the database. Please try again.',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!isSiteAdmin) {
     router.push('/dashboard');
     return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Seed Database</h1>
        <p className="text-muted-foreground">
          Tools for populating your Firestore database with test data.
        </p>
      </div>

       <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>For Site Admins Only</AlertTitle>
            <AlertDescription>
              This is a powerful tool for development and testing. Use with caution. The created users will not have login credentials.
            </AlertDescription>
        </Alert>

       <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>Create Fake Anglers</CardTitle>
                <CardDescription>
                    Click the button below to add 50 fake angler records to your currently selected primary club. This is useful for testing user lists, match registrations, and results pages.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    All created users will have the role "Angler" and status "Member". They will not be real users in Firebase Authentication and cannot be used to log in.
                </p>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSeed} disabled={isSeeding}>
                    {isSeeding ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Seeding...
                        </>
                    ) : (
                        <>
                            <Beaker className="mr-2 h-4 w-4" />
                            Seed Fake Anglers
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
