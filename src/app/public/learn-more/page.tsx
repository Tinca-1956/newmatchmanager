
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Fish, Calendar, Users, BarChart2, Shield, Gem } from 'lucide-react';
import NextImage from 'next/image';

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
    <div className="flex flex-col gap-8 p-4 lg:p-8 bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Manage Your Fishing Club Like a Pro</h1>
        <p className="text-xl text-muted-foreground mt-2">All-in-one platform for series, matches, members, and results.</p>
      </div>

       <div className="relative w-full max-w-4xl mx-auto aspect-video rounded-lg overflow-hidden shadow-2xl">
            <NextImage
                src="https://placehold.co/1280x720.png"
                alt="Match Manager Dashboard"
                fill
                className="object-cover"
                data-ai-hint="fishing app screenshot"
            />
       </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader className="items-center text-center">
            <div className="flex justify-center pb-4">
              <Fish className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl">Why Choose Match Manager?</CardTitle>
            <CardDescription className="text-lg">Focus on the fishing, not the paperwork.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-center">
                <div className="flex flex-col items-center gap-2">
                    <Calendar className="h-10 w-10 text-primary" />
                    <h3 className="font-semibold">Match & Series Scheduling</h3>
                    <p className="text-muted-foreground">Easily create and manage year-long series and individual matches.</p>
                </div>
                 <div className="flex flex-col items-center gap-2">
                    <Users className="h-10 w-10 text-primary" />
                    <h3 className="font-semibold">Member Management</h3>
                    <p className="text-muted-foreground">Control member access with roles and statuses, from pending to paid.</p>
                </div>
                 <div className="flex flex-col items-center gap-2">
                    <BarChart2 className="h-10 w-10 text-primary" />
                    <h3 className="font-semibold">Live Weigh-in & Results</h3>
                    <p className="text-muted-foreground">Enter weights directly on the bank and generate instant results and league tables.</p>
                </div>
                 <div className="flex flex-col items-center gap-2">
                    <Shield className="h-10 w-10 text-primary" />
                    <h3 className="font-semibold">Role-Based Access</h3>
                    <p className="text-muted-foreground">Secure access for Site Admins, Club Admins, and Anglers.</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <Gem className="h-10 w-10 text-primary" />
                    <h3 className="font-semibold">Public & Private Dashboards</h3>
                    <p className="text-muted-foreground">Share results with the public while keeping admin controls private.</p>
                </div>
                 <div className="flex flex-col items-center gap-2">
                    <Fish className="h-10 w-10 text-primary" />
                    <h3 className="font-semibold">And much more...</h3>
                    <p className="text-muted-foreground">Image galleries, standard texts, PDF exports, and email notifications.</p>
                </div>
            </div>
        </CardContent>
      </Card>
      
       <Card className="max-w-2xl mx-auto text-center">
        <CardHeader>
            <CardTitle className="text-3xl">Interested in a Demo?</CardTitle>
            <CardDescription>Contact us to get your club set up on Match Manager.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                Click the link below to open your email client with a pre-filled template. Please provide your club's details so we can get in touch.
            </p>
        </CardContent>
        <CardFooter className="justify-center">
            <a href={mailtoLink} className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                Contact Us for a Demo
            </a>
        </CardFooter>
       </Card>
    </div>
  );
}
