
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LearnMorePage() {
  const mailtoLink = `mailto:stuart@emancium.com.au`;

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
      <div className="space-y-12">
        <div className="text-center">
           <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            MATCH MANAGER
          </h1>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Learn More About Match Manager
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Discover the features and benefits of using our platform.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Benefits of Signing Up</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Registered users can register for matches for their preferred club. They can also view historical match results. Registered users can also view WEIGH-IN data in realtime. Add and view match related images. Prepare and save PDF versions of angler lists and match results
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Admin Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Admin users can request full READ/WRITE access from the SITE ADMINISTRATOR. This enables the creation and management of series, matches and anglers.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Contact Stuart at <a href={mailtoLink} className="text-primary hover:underline">stuart@emancium.com.au</a> for more information about using MATCH MANAGER for your club's match management.
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
