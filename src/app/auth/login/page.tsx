
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
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
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

  const handleLogin = async (e: React.FormEvent, isResendAttempt = false) => {
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
        // Send verification email on the first failed login attempt or on resend click
        await sendEmailVerification(user);
        
        toast({
          variant: 'destructive',
          title: 'Email Not Verified',
          description: `A new verification link has been sent to ${user.email}. Please check your inbox.`,
        });
        
        setShowResend(true); // Show the resend button
        await auth.signOut(); // Log out the user until they are verified
        return;
      }
      
      // Check if user document exists in Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
         router.push('/main/dashboard');
      } else {
        // This is a first-time login for a registered user
        router.push('/auth/select-club');
      }
    } catch (error: unknown) {
      // if it's a resend attempt and the password is wrong, that's okay.
      // we still want to show the resend toast
      if(isResendAttempt && (error as any)?.code?.includes('auth/wrong-password')){
        toast({
          title: 'Verification Email Sent',
          description: `A new verification link has been sent to ${email}.`,
        });
        return;
      }

      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: getErrorMessage(error),
      });
    }
  };
  
  const handleResendClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // To resend, we need the user object, which we only get after a sign-in attempt.
    // So, we re-run the login handler. If password is wrong, the catch block
    // will show a toast. If email is unverified, the logic inside the `try` block handles it.
     handleLogin(e as any, true);
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
                    onClick={handleResendClick}
                >
                    Resend verification
                </Button>
            </div>
          )}
        </CardContent>
      </form>
      <CardFooter className="text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" className="underline ml-1">
          Sign up
        </Link>
      </CardFooter>
    </Card>
  );
}
