'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fish, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function PublicDashboard() {

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Fish className="h-6 w-6" />
          <span className="font-semibold">Match Manager</span>
        </div>
        <Button asChild>
          <Link href="/auth/login">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Link>
        </Button>
      </header>

      <main className="flex-1 p-4 md:p-8 lg:p-10">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Welcome to Match Manager
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              The easiest way to manage your fishing club's matches, members, and results.
            </p>
          </div>

          <Card>
            <CardHeader>
                <CardTitle>Explore a Club</CardTitle>
                <CardDescription>Select a club from the dropdown below to see their upcoming matches and recent results.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Placeholder for club selector and content */}
                 <div className="flex items-center justify-center h-48 rounded-lg border-2 border-dashed bg-background">
                    <p className="text-muted-foreground">Club selection and content will go here.</p>
                </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="text-center p-4 text-sm text-muted-foreground border-t">
        Copyright EMANCIUM 2025 - All rights reserved
      </footer>
    </div>
  );
}
