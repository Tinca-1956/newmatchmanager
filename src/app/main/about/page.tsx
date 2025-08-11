
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


export default function AboutPage() {

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
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">About Match Manager</h1>
        <p className="text-muted-foreground">Information about the application.</p>
      </div>

      <Card>
        <CardHeader className="items-center">
            <div className="flex justify-center pb-4">
              <Fish className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-center">Match Manager Pro</CardTitle>
            <CardDescription className="text-center">Version 1.0.0</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center text-muted-foreground space-y-4">
                <p>This application is designed to help fishing clubs manage their matches, members, and results with ease.</p>
                <p>Built with modern technology to provide a seamless and responsive experience for club administrators, marshals, and anglers alike.</p>
                 <p className="pt-4">
                    Contact the site owner at{' '}
                    <a href="mailto:stuart@emancium.com.au" className="underline text-primary">
                        stuart@emancium.com.au
                    </a>
                </p>
            </div>
        </CardContent>
         <CardFooter className="flex-col items-center gap-4 text-center">
             <p className="pt-4 text-xs text-muted-foreground">
                Copyright EMANCIUM 2025 - All rights reserved
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
