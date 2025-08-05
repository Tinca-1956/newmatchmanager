'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LearnMorePage() {
    const benefitsBody = "Registered users can register for matches for their preferred club. They can also view historical match results. Registered users can also view WEIGH-IN data in realtime. Add and view match related images. Prepare and save PDF versions of angler lists and match results";
    const adminBody = "Admin users can request full READ/WRITE access from the SITE ADMINISTRATOR. This enables the creation and management of series, matches and anglers.";
    const contactBody = `Contact Stuart at stuart@emancium.com.au for more information about using MATCH MANAGER for your club's match management.`;
    const mailtoLink = `mailto:stuart@emancium.com.au?subject=${encodeURIComponent("Enquiry about Match Manager")}`;

  return (
    <>
      <div className="flex flex-col items-center justify-center p-8 bg-background">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Learn More About Match Manager</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Discover the features and benefits of using our platform to manage your fishing club and matches.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>BENEFITS OF SIGNING UP</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{benefitsBody}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ADMIN USERS</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{adminBody}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CONTACT</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-muted-foreground">
                    Contact Stuart at <a href={mailtoLink} className="text-primary hover:underline">stuart@emancium.com.au</a> for more information about using MATCH MANAGER for your club's match management.
                </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}