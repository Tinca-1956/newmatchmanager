
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function LearnMorePage() {
  const stuartEmail = "stuart@emancium.com.au";
  const subject = "MATCH MANAGER - More Information Request";
  const body = `Hi Stuart,

I'm interested in learning more about using Match Manager for my angling club.

Please let me know how I can get started.

Thanks,
[Your Name]
[Your Club Name]`;

  const mailtoLink = `mailto:${stuartEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="flex flex-col flex-grow p-4 md:p-8">
      <div className="flex-grow container mx-auto">
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3">
            <Card className="lg:col-span-1">
                <CardHeader>
                <CardTitle>BENEFITS OF SIGNING UP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                <p>Registered users can register for matches for their preferred club. They can also view historical match results.</p>
                <p>Registered users can also view WEIGH-IN data in realtime, add and view match related images, and prepare and save PDF versions of angler lists and match results.</p>
                </CardContent>
            </Card>

            <Card className="lg:col-span-1">
                <CardHeader>
                <CardTitle>ADMIN USERS</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                <p>Admin users can request full READ/WRITE access from the SITE ADMINISTRATOR. This enables the creation and management of series, matches and anglers.</p>
                </CardContent>
            </Card>

            <Card className="lg:col-span-1">
                <CardHeader>
                <CardTitle>CONTACT</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                <p>
                    Contact Stuart at <a href={mailtoLink} className="text-primary hover:underline">{stuartEmail}</a> for more information about using MATCH MANAGER for your club&apos;s match management.
                </p>
                </CardContent>
            </Card>
        </div>
      </div>
      <div className="container mx-auto mt-8">
         <Button asChild variant="outline">
            <Link href="/public/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Link>
        </Button>
      </div>
    </div>
  );
}
