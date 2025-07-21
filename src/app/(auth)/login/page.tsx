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
import { signInWithEmailAndPassword, sendEmailVerification, AuthError } from 'firebase/auth';
import { auth, firestore } from '@/lib/firebase-client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if ('code' in error) {
      switch ((error as any).code) {
        case 'auth/user-not-found':
          return 'No user found with this email.';
        case 'auth/wrong-password':
          return 'Incorrect password. Please try again.';
        case 'auth/invalid-credential':
          return 'Invalid credentials. Please check your email and password.';
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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showResend, setShowResend] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowResend(false); // Reset on new login attempt
    if (!auth || !firestore) {
       toast({
        variant: 'destructive',
        title: 'Configuration Error',
        description: 'Firebase is not configured. Please add your API keys.',
      });
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        toast({
          variant: 'destructive',
          title: 'Email Not Verified',
          description: 'Please verify your email address before logging in. Check your inbox for a verification link.',
        });
        setShowResend(true); // Show the resend link
        await auth.signOut(); // Log out the user until they are verified
        return;
      }
      
      // Check if user document exists in Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
         router.push('/dashboard');
      } else {
        // This is a first-time login for a registered user
        router.push('/select-club');
      }
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: getErrorMessage(error),
      });
    }
  };
  
  const handleResendVerification = async () => {
    if (!auth || !email) {
       toast({ variant: 'destructive', title: 'Error', description: 'Email address is required.' });
       return;
    }
    try {
      // To resend, we need a user object. We get this by signing in briefly.
      // We must provide a password, but it doesn't have to be correct to get the user object
      // if the user exists. We'll catch the wrong-password error.
      await sendEmailVerification(auth.currentUser!);
       toast({
        title: 'Verification Email Sent',
        description: 'A new verification link has been sent to your email address.',
      });
    } catch (error) {
        // This is a bit of a workaround. We sign in the user to get the user object,
        // send the email, and then sign out. The password can be fake.
        if ((error as AuthError).code === 'auth/wrong-password' || (error as AuthError).code === 'auth/invalid-credential') {
             try {
                // We don't have the user object, so we can't call sendEmailVerification directly.
                // We'll have to rely on the toast message from the original login attempt.
                // This logic is tricky with Firebase limitations. The best way is to send it when user is briefly logged in.
                toast({
                    title: 'Action Needed',
                    description: 'Please attempt to log in first to enable the resend functionality.'
                });
             } catch (resendError) {
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not resend verification email. Please contact support.' });
             }
        } else if (auth.currentUser && !auth.currentUser.emailVerified) {
            // This case handles when the login succeeds but email is not verified.
            await sendEmailVerification(auth.currentUser);
            await auth.signOut();
            toast({
                title: 'Verification Email Sent',
                description: 'A new verification link has been sent to your email address.',
            });
        }
        else {
             toast({ variant: 'destructive', title: 'Error', description: getErrorMessage(error) });
        }
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center pb-4">
          <Fish className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="grid gap-4">
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
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link href="#" className="ml-auto inline-block text-sm underline">
                Forgot your password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            Login
          </Button>
          {showResend && (
            <div className="text-center text-sm">
                <p>Didn't get an email?</p>
                <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto"
                    onClick={handleResendVerification}
                >
                    Resend verification
                </Button>
            </div>
          )}
        </CardContent>
      </form>
      <CardFooter className="text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="underline ml-1">
          Sign up
        </Link>
      </CardFooter>
    </Card>
  );
}
