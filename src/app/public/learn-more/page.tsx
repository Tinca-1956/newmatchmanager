
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export default function LearnMorePage() {

    const subject = "MATCH MANAGER - ADD NEW CLUB ENQUIRY";
    const body = `Dear Stuart,

I am interested in learning more about MATCH MANAGER for my club.

Here are my club details:

Club/association name			:	FILL IN DETAILS HERE
Number of members			:	FILL IN MEMBER NUMBER HERE
Number of matches per year	:	FILL IN MATCH NUMBER HERE
Country						:	FILL IN COUNTRY HERE
State/County/Province			:	FILL IN COUNTY HERE

Warmest regards

YOUR FULL NAME HERE`;

    const mailtoLink = `mailto:stuart@emancium.com.au?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        {/* Left Column: Video */}
        <div className="rounded-lg overflow-hidden shadow-2xl">
           <video
            className="w-full h-full object-cover"
            src="https://firebasestorage.googleapis.com/v0/b/new-match-manager.firebasestorage.app/o/help_documents%2F1754728555716-Signing%20Up.mp4?alt=media&token=3815e632-5cf8-4cdf-b103-9d526b319fbc"
            controls
            autoPlay
            muted
            loop
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Right Column: Text Content */}
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Focus on the Fishing, Not the Paperwork.
          </h1>
          <p className="text-lg text-muted-foreground">
            Match Manager is the all-in-one solution for running fishing clubs and competitions. Spend less time on admin and more time on the bank. Watch the video to learn how to sign up to an existing club., or click the button at the bottom of the page to get your club added to the app.
          </p>
          
          <div className="space-y-4">
              <h3 className="text-2xl font-semibold">Key Features</h3>
              <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                      <Check className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                      <div>
                          <p className="font-semibold">Automated Dashboard</p>
                          <p className="text-sm text-muted-foreground">Instantly see upcoming matches and recent results for your primary club.</p>
                      </div>
                  </li>
                   <li className="flex items-start gap-3">
                      <Check className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                      <div>
                          <p className="font-semibold">Simplified Registration</p>
                          <p className="text-sm text-muted-foreground">Anglers can easily register for upcoming matches with a single click.</p>
                      </div>
                  </li>
                  <li className="flex items-start gap-3">
                      <Check className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                      <div>
                          <p className="font-semibold">Live Leaderboards</p>
                          <p className="text-sm text-muted-foreground">Real-time weigh-in and results tracking keeps everyone informed.</p>
                      </div>
                  </li>
              </ul>
          </div>
        </div>
      </div>

       <Card className="mt-16 bg-muted/40">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl">Ready to Get Started?</CardTitle>
                <CardDescription>
                    Contact us to get your club set up on Match Manager today.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Button asChild size="lg">
                    <a href={mailtoLink}>
                       Get your club added to MATCH MANAGER
                    </a>
                </Button>
            </CardContent>
            <CardFooter className="flex justify-center">
                 <p className="text-xs text-muted-foreground">We'll get back to you to set up your club profile.</p>
            </CardFooter>
        </Card>
    </div>
  );
}
