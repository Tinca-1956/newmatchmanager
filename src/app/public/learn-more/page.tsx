
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import Link from 'next/link';

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
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Supercharge Your Fishing Club
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Match Manager is the all-in-one platform to manage your members, schedule matches, record results, and build your angling community.
        </p>
      </div>

      <div className="mt-16">
        <div className="relative aspect-video w-full max-w-4xl mx-auto overflow-hidden rounded-lg shadow-xl">
           <video
            src="https://firebasestorage.googleapis.com/v0/b/new-match-manager.firebasestorage.app/o/help_documents%2F1754728610588-After%20First%20Login.mp4?alt=media&token=33e6aca2-9a06-4137-866c-26dc454e5463"
            controls
            className="w-full h-full object-cover"
            />
        </div>
      </div>

      <div className="mt-20">
        <h2 className="text-3xl font-bold tracking-tight text-center text-foreground">Key Features</h2>
        <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground">
                <Check className="h-6 w-6" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium leading-6 text-foreground">Member Management</h3>
              <p className="mt-2 text-base text-muted-foreground">
                Easily manage your club's members, their status, and roles.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground">
                <Check className="h-6 w-6" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium leading-6 text-foreground">Match Scheduling</h3>
              <p className="mt-2 text-base text-muted-foreground">
                Create and manage match series and individual events with ease.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground">
                <Check className="h-6 w-6" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium leading-6 text-foreground">Live Weigh-in & Results</h3>
              <p className="mt-2 text-base text-muted-foreground">
                Enter weights as they happen and generate instant results and league standings.
              </p>
            </div>
          </div>
        </div>
      </div>

       <div className="mt-20">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl">Get Started</CardTitle>
                <CardDescription>
                    Interested in using Match Manager for your club? Send us an enquiry.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Button asChild size="lg">
                    <a href={mailtoLink}>Enquire Now</a>
                </Button>
            </CardContent>
            <CardFooter className="flex justify-center">
                 <p className="text-xs text-muted-foreground">We'll get back to you to set up your club profile.</p>
            </CardFooter>
        </Card>
      </div>

    </div>
  );
}
