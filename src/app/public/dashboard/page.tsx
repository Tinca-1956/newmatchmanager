
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fish, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function PublicDashboard() {
  return (
    <div className="flex-1 w-full">
        <main className="flex-1 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold">Welcome to Match Manager</h1>
                <Button asChild>
                    <Link href="/auth/login">
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6">
                 <Card className="flex flex-col items-center justify-center text-center p-8">
                    <CardHeader>
                        <div className="mx-auto bg-primary text-primary-foreground rounded-full p-4 w-20 h-20 flex items-center justify-center mb-4">
                            <Fish className="h-10 w-10" />
                        </div>
                        <CardTitle className="text-3xl">Streamline Your Fishing Club</CardTitle>
                        <CardDescription className="max-w-prose">
                            Match Manager is the ultimate tool for organizing fishing matches, tracking results, and managing members. Sign in to access your club's dashboard or contact an administrator to get your club set up.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mt-6">
                             <h3 className="text-xl font-semibold">Ready to get started?</h3>
                             <p className="text-muted-foreground mt-2">Sign in to your account to view your personalized dashboard.</p>
                             <Button asChild className="mt-4">
                                <Link href="/auth/login">
                                    Go to Sign In
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    </div>
  );
}
