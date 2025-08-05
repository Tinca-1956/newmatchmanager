
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trophy, Image as ImageIcon } from 'lucide-react';

export default function PublicDashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to Match Manager</h1>
            <p className="text-muted-foreground">
                The premier platform for managing your fishing club's events and results.
            </p>
        </div>
        <Button asChild>
          <Link href="/auth/login">
            Sign In
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-4">
        {/* Upcoming Matches Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Matches</CardTitle>
            <CardDescription>Select a club to see their scheduled matches.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              <p>Upcoming matches will be displayed here.</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Results Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Results</CardTitle>
            <CardDescription>Latest match results from the selected club.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
                <Trophy className="h-8 w-8 mb-2" />
                <p>Recent results will appear here.</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Photos Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Photos</CardTitle>
            <CardDescription>Photos from the latest matches.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
                <ImageIcon className="h-8 w-8 mb-2" />
                <p>Recent photos will appear here.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="text-center">
        <CardHeader>
            <CardTitle>Ready to Get Started?</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Sign in to manage your profile, register for matches, and view detailed results for your club.</p>
        </CardContent>
      </Card>
    </div>
  );
}
