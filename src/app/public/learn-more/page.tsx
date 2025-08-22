
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fish, Trophy, Users, Scale } from 'lucide-react';
import Link from 'next/link';

export default function LearnMorePage() {
  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4 sm:text-5xl md:text-6xl">
          Manage Your Fishing Matches with Ease
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-muted-foreground sm:text-xl">
          Match Manager is a comprehensive platform designed to streamline every aspect of running a fishing competition. From angler registration and peg draws to live weigh-ins and instant results, we've got you covered.
        </p>
        <div className="mt-8 flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/auth/register">Get Started for Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/public/dashboard">View Public Dashboard</Link>
            </Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Club & Member Management</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Easily manage club details, control member access with specific roles, and handle subscriptions all in one place.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Effortless Match Setup</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Create and manage series and matches, set capacities, handle angler registrations, and automate peg draws.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Live Weigh-in & Results</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Enter weights as they happen with our streamlined weigh-in interface. Results and league standings are calculated instantly.
            </p>
          </CardContent>
        </Card>
      </div>

       <div className="mt-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-6">
                Create an account and set up your club in minutes.
            </p>
            <Button asChild>
                <Link href="/auth/register">Sign Up Now</Link>
            </Button>
        </div>
    </div>
  );
}
