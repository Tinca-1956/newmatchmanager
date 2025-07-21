'use client';

import Link from 'next/link';
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
import { Fish } from 'lucide-react';
import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
     if ('code' in error) {
      switch ((error as any).code) {
        case 'auth/email-already-in-use':
          return 'This email address is already in use by another account.';
        case 'auth/weak-password':
          return 'Password should be at least 6 characters.';
        default:
          return error.message;
      }
    }
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }
  if (typeof error === "string") {
    return error;
  }
  return 'An unexpected error occurred.';
}

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
     if (!auth) {
       toast({
        variant: 'destructive',
        title: 'Configuration Error',
        description: 'Firebase is not configured. Please add your API keys.',
      });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      if (user) {
        await updateProfile(user, {
          displayName: `${firstName} ${lastName}`.trim(),
        });

        await sendEmailVerification(user);

        toast({
          title: 'Registration Successful!',
          description: 'A verification email has been sent. Please check your inbox and click the link to activate your account before logging in.',
        });
        
        await auth.signOut();
        router.push('/login');
      }

    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center pb-4">
          <Fish className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleRegister}>
        <CardContent className="grid gap-4">
           <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                placeholder="John"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input
                id="last-name"
                placeholder="Angler"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </CardContent>
      </form>
      <CardFooter className="text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="underline ml-1">
          Login
        </Link>
      </CardFooter>
    </Card>
  );
}
