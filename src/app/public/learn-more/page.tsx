
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LearnMorePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-3xl font-bold tracking-tight">Learn More About Match Manager</h1>
            <p className="text-muted-foreground">Discover the features and benefits of using the app.</p>
        </div>
         <Button asChild variant="outline">
          <Link href="/public/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Benefits of Signing Up</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>
              Registered users can register for matches for their preferred club. They can also view historical match results.
            </p>
            <p>
              Registered users can also view WEIGH-IN data in realtime, add and view match related images, and prepare and save PDF versions of angler lists and match results.
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Admin Users</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              Admin users can request full READ/WRITE access from the SITE ADMINISTRATOR. This enables the creation and management of series, matches and anglers.
            </p>
          </CardContent>
        </Card>
         <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              Contact Stuart at <a href="mailto:stuart@emancium.com.au" className="text-primary hover:underline">stuart@emancium.com.au</a> for more information about using MATCH MANAGER for your club's match management.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
