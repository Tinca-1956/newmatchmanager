
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
          Elevate Your Club's Match Fishing Experience
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Match Manager is the all-in-one solution designed specifically for angling clubs. Streamline your operations, engage your members, and focus on what truly matters: the fishing.
        </p>
      </div>

      <div className="mt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Automated Admin</CardTitle>
              <CardDescription>
                Reduce hours of manual work. Manage series, matches, and member registrations with ease.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                    <li>Create and manage multi-match series</li>
                    <li>Automate angler registration and communication</li>
                    <li>Set match capacities and paid places</li>
                    <li>Define match rules and details in one place</li>
                </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Live on the Bank</CardTitle>
              <CardDescription>
                From peg draw to final results, everything is handled in real-time, right from your phone.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                    <li>Randomised digital peg draws</li>
                    <li>Live weigh-in recording and submission</li>
                    <li>Instant results calculation and display</li>
                    <li>Public dashboards for spectators</li>
                </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Engaged Community</CardTitle>
              <CardDescription>
                Build a stronger club with features that connect and inform your members.
              </CardDescription>
            </CardHeader>
            <CardContent>
                 <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                    <li>Club news and blog posts</li>
                    <li>Automated email notifications</li>
                    <li>Member profiles and status management</li>
                    <li>Centralized image galleries for every match</li>
                </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      
       <div className="text-center mt-20">
        <h2 className="text-3xl font-bold tracking-tight text-primary">
          Ready to get started?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Contact us today to get your club set up on Match Manager.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <a href={mailtoLink}>Enquire About Your Club</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
