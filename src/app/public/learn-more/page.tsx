'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Fish } from 'lucide-react';
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
    <div className="container mx-auto max-w-4xl py-12 px-4">
        <Card>
            <CardHeader className="items-center text-center">
                <div className="flex justify-center pb-4">
                <Fish className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-3xl">Match Manager Pro</CardTitle>
                <CardDescription>Version 1.0.0</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center text-lg text-muted-foreground">
                <p>This application is designed to help fishing clubs manage their matches, members, and results with ease.</p>
                <p>Built with modern technology to provide a seamless and responsive experience for club administrators, marshals, and anglers alike.</p>
                <p className="pt-4">
                    Contact the site owner at{' '}
                    <a href="mailto:stuart@emancium.com.au" className="underline text-primary hover:text-primary/80">
                        stuart@emancium.com.au
                    </a>
                </p>
            </CardContent>
            <CardFooter className="flex-col items-center gap-4 text-center">
                <Button asChild size="lg">
                    <a href={mailtoLink}>Get your club added to MATCH MANAGER</a>
                </Button>
                <Button asChild size="lg" variant="outline">
                    <Link href="/public/subscriptions">Renew my club subscription</Link>
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
