'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { mockClubs, mockUser } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [primaryClubId, setPrimaryClubId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      // In a real app, this would come from the user's profile in the database.
      // We'll use the mockUser for now.
      setPrimaryClubId(mockUser.primaryClubId || '');
    }
  }, [user]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auth?.currentUser) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to save changes.',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update display name in Firebase Auth
      if (displayName !== user.displayName) {
        await updateProfile(auth.currentUser, { displayName });
      }

      // Here you would typically also save the primaryClubId to your database (e.g., Firestore)
      // For this example, we'll just show a success message.
      console.log('Saving primary club ID:', primaryClubId);

      toast({
        title: 'Success!',
        description: 'Your profile has been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not save your changes. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and club association.
        </p>
      </div>
      <form onSubmit={handleSaveChanges}>
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>
              Update your personal details here. Click save when you're done.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Angler Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryClub">Primary Club</Label>
              <Select value={primaryClubId} onValueChange={setPrimaryClubId}>
                <SelectTrigger id="primaryClub">
                  <SelectValue placeholder="Select a club" />
                </SelectTrigger>
                <SelectContent>
                  {mockClubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ''} disabled />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
