
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Fish } from 'lucide-react';
import Link from 'next/link';

export default function LearnMorePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/public/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
      </header>
      <main className="container mx-auto grid flex-1 auto-rows-max gap-8 px-4 md:px-8 lg:px-12 xl:px-16 py-8">
         <div className="flex items-center justify-center gap-4 text-center">
            <Fish className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Match Manager</h1>
            </div>
          </div>
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>BENEFITS OF SIGNING UP</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Registered users can register for matches for their preferred club. They can also view historical match results. Registered users can also view WEIGH-IN data in realtime. Add and view match related images. Prepare and save PDF versions of angler lists and match results
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>ADMIN USERS</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Admin users can request full READ/WRITE access from the SITE ADMINISTRATOR. This enables the creation and management of series, matches and anglers.
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>CONTACT</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                         Contact Stuart at <a href="mailto:stuart@emancium.com.au" className="text-primary underline">stuart@emancium.com.au</a> for more information about using MATCH MANAGER for your club's match management.
                    </p>
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
