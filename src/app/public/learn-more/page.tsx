
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Fish } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">About Match Manager</h1>
        <p className="text-lg text-muted-foreground mt-2">The ultimate solution for managing your fishing club's events.</p>
      </div>

      <Card>
        <CardHeader className="items-center text-center">
            <div className="flex justify-center pb-4">
              <Fish className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-3xl">Match Manager Pro</CardTitle>
            <CardDescription>Version 1.0.0</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center text-muted-foreground space-y-4 max-w-2xl mx-auto">
                <p>This application is designed to help fishing clubs manage their matches, members, and results with ease.</p>
                <p>Built with modern technology to provide a seamless and responsive experience for club administrators, marshals, and anglers alike.</p>
                <p className="font-semibold text-foreground">Interested in getting your club on board?</p>
                <p>To start using the app for your club, send your details via email. Click the button below to open a pre-filled email template.</p>
            </div>
        </CardContent>
         <CardFooter className="flex-col items-center gap-4 text-center">
            <Button asChild size="lg">
                <a href={mailtoLink}>Contact Us To Get Started</a>
            </Button>
            <p className="pt-4 text-xs text-muted-foreground">
                We'll get back to you to set up your club profile.
            </p>
        </CardFooter>
      </Card>
       <div className="text-center">
          <Button asChild variant="link">
            <Link href="/public/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
    </div>
  );
}
