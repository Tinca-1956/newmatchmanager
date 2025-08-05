'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Fish, CheckCircle } from 'lucide-react';

export default function LearnMorePage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <header className="bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex h-14 items-center justify-between">
          <Link href="/public/dashboard" className="flex items-center gap-2 font-bold">
            <Fish className="h-6 w-6" />
            <span className="sr-only">Match Manager</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Button asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
             <Button asChild variant="secondary">
              <Link href="/auth/register">Register</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Streamline Your Fishing Competitions
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Match Manager is the all-in-one solution for angling clubs to manage matches, members, and results with unparalleled ease.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/auth/login">Get Started</Link>
                  </Button>
                </div>
              </div>
               <div className="flex justify-center">
                 <Fish className="h-48 w-48 text-primary/10" strokeWidth={1} />
               </div>
            </div>
          </div>
        </section>
        
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Why Choose Match Manager?</h2>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                   Our platform is designed by anglers, for anglers, focusing on the features that matter most to club administrators and members.
                  </p>
                </div>
              </div>
              <div className="mx-auto grid max-w-5xl items-start gap-12 sm:grid-cols-2 md:grid-cols-3 lg:gap-16 pt-12">
                <div className="grid gap-1">
                  <h3 className="text-lg font-bold">Real-time Weigh-ins</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter weights as they happen and see live leaderboards.
                  </p>
                </div>
                <div className="grid gap-1">
                  <h3 className="text-lg font-bold">Automated Payouts</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically calculate winnings for paid places.
                  </p>
                </div>
                <div className="grid gap-1">
                  <h3 className="text-lg font-bold">League Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Track angler performance across a whole series.
                  </p>
                </div>
                 <div className="grid gap-1">
                  <h3 className="text-lg font-bold">Member Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage member roles, approvals, and club affiliations.
                  </p>
                </div>
                 <div className="grid gap-1">
                  <h3 className="text-lg font-bold">Simple Registration</h3>
                  <p className="text-sm text-muted-foreground">
                   Anglers can easily find and register for upcoming matches.
                  </p>
                </div>
                 <div className="grid gap-1">
                  <h3 className="text-lg font-bold">Public Dashboards</h3>
                  <p className="text-sm text-muted-foreground">
                   Showcase your club's results and upcoming events to the public.
                  </p>
                </div>
              </div>
          </div>
        </section>
        
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Learn More and Get in Touch</h2>
                <Card className="max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle>Benefits of Signing Up</CardTitle>
                    </CardHeader>
                    <CardContent className="text-left space-y-4 text-muted-foreground">
                        <p>Registered users can register for matches for their preferred club. They can also view historical match results. Registered users can also view WEIGH-IN data in realtime. Add and view match related images. Prepare and save PDF versions of angler lists and match results</p>
                    </CardContent>
                </Card>
                 <Card className="max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle>Admin Users</CardTitle>
                    </CardHeader>
                    <CardContent className="text-left space-y-4 text-muted-foreground">
                        <p>Admin users can request full READ/WRITE access from the SITE ADMINISTRATOR. This enables the creation and management of series, matches and anglers.</p>
                    </CardContent>
                </Card>
                 <Card className="max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle>Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="text-left space-y-4 text-muted-foreground">
                       <p>Contact Stuart at <a href="mailto:stuart@emancium.com.au" className="text-primary underline">stuart@emancium.com.au</a> for more information about using MATCH MANAGER for your club's match management.</p>
                    </CardContent>
                </Card>
            </div>
          </div>
        </section>

      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Match Manager. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
