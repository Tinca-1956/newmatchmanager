
'use client';

import PublicHeader from '@/components/public-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LearnMorePage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <PublicHeader />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold tracking-tight text-center">MATCH MANAGER</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-lg">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">BENEFITS OF SIGNING UP</h2>
                <p className="text-muted-foreground">
                  Registered users can register online for matches with their preferred club. They can also view historical match results and series standings.
                  Registered users can also view WEIGH-IN data in realtime, add and view match related images, and prepare and save PDF versions of angler lists and match results.
                </p>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">ADMIN USERS</h2>
                <p className="text-muted-foreground">
                  Match secretaries can request full READ/WRITE access from the match manager SITE ADMINISTRATOR. This enables the creation and management of series, matches and anglers.
                </p>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">CONTACT</h2>
                <p className="text-muted-foreground">
                  Contact Stuart at stuart@emancium.com.au for more information about using MATCH MANAGER for your club&apos;s match management.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
