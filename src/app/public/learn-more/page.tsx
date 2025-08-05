
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Fish } from 'lucide-react';
import Link from 'next/link';

export default function LearnMorePage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex h-14 items-center justify-between border-b bg-gray-900 px-4 text-white lg:h-[60px] lg:px-6">
        <Link href="/public/dashboard" className="flex items-center gap-2 font-semibold">
            <Fish className="h-6 w-6" />
            <span>MATCH MANAGER</span>
        </Link>
        <Button asChild variant="outline" className="bg-gray-800 hover:bg-gray-700">
          <Link href="/auth/login">
            Login / Register
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </header>
      <main className="flex-1 bg-muted/40 p-4 md:p-10">
        <div className="mx-auto grid max-w-6xl gap-6">
            <div className="space-y-4 text-center">
                 <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Learn More About Match Manager</h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                    Discover the features and benefits of using our platform to manage your fishing club and matches.
                </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 <Card>
                    <CardHeader>
                        <CardTitle>BENEFITS OF SIGNING UP</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground">
                        <p>Registered users can register for matches for their preferred club. They can also view historical match results. Registered users can also view WEIGH-IN data in realtime. Add and view match related images. Prepare and save PDF versions of angler lists and match results</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>ADMIN USERS</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground">
                        <p>Admin users can request full READ/WRITE access from the SITE ADMINISTRATOR. This enables the creation and management of series, matches and anglers.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>CONTACT</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground">
                        <p>Contact Stuart at <a href="mailto:stuart@emancium.com.au" className="text-primary hover:underline">stuart@emancium.com.au</a> for more information about using MATCH MANAGER for your club&apos;s match management.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
