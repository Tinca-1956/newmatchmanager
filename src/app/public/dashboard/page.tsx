
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fish } from 'lucide-react';
import Link from 'next/link';


export default function PublicDashboard() {

  return (
    <main className="flex-1 bg-muted/40">
        <section className="bg-sidebar text-sidebar-foreground py-12">
            <div className="container mx-auto px-4 text-center">
                <Fish className="h-16 w-16 mx-auto text-primary-foreground" />
                <h1 className="text-4xl font-bold mt-4">Welcome to Match Manager</h1>
                <p className="text-xl text-primary-foreground/80 mt-2">The modern solution for managing your fishing club.</p>
                <Button className="mt-6" asChild>
                    <Link href="/auth/login">
                        Sign In
                    </Link>
                </Button>
            </div>
        </section>

        <section className="py-12">
            <div className="container mx-auto px-4 space-y-8">
                 <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Ready to get started?</h2>
                    <p className="text-muted-foreground mt-2">
                        Create an account to manage your own club and members.
                    </p>
                    <Button className="mt-4" asChild>
                        <Link href="/auth/register">Sign Up Now</Link>
                    </Button>
                </div>
            </div>
        </section>
    </main>
  );
}
