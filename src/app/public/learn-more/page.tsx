
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';

export default function LearnMorePage() {
  const mailtoLink = "mailto:stuart@emancium.com.au?subject=MATCH%20MANAGER%20Inquiry";

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center tracking-tight">
            MATCH MANAGER
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 text-lg">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold">Benefits of Signing Up</h2>
            <p className="text-muted-foreground leading-relaxed">
              Registered users can register online for matches with their preferred club. They can also view historical match results and series standings. Registered users can also view WEIGH-IN data in realtime, add and view match related images, and prepare and save PDF versions of angler lists and match results.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold">Admin Users</h2>
            <p className="text-muted-foreground leading-relaxed">
              Admin users can request full READ/WRITE access from the match manager SITE ADMINISTRATOR. This enables the creation and management of series, matches and anglers.
            </p>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Contact Stuart at <Link href={mailtoLink} className="text-primary underline">stuart@emancium.com.au</Link> for more information about using MATCH MANAGER for your club&apos;s match management.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
