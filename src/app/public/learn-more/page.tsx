
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Fish } from "lucide-react";

const keyFeatures = [
    "User authentication and management",
    "Club and member management",
    "Series and match creation",
    "Automated match status updates",
    "Public-facing results dashboard",
    "Role-based access control (Site Admin, Club Admin, Angler)",
];

export default function LearnMorePage() {

  const videoUrl = "https://firebasestorage.googleapis.com/v0/b/new-match-manager.appspot.com/o/help_documents%2F1754728610588-After%20First%20Login.mp4?alt=media&token=33e6aca2-9a06-4137-866c-26dc454e5463";
  
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
      <div className="space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">How Match Manager Works</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Watch this short video to see how to get started after your first login.
          </p>
        </div>

        <Card>
          <CardContent className="p-4">
             <video
                key={videoUrl}
                controls
                className="w-full rounded-lg"
              >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Key Features</CardTitle>
                <CardDescription>Everything you need to manage a successful fishing league.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    {keyFeatures.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="items-center text-center">
                <Fish className="h-10 w-10 text-primary" />
                <CardTitle className="text-3xl">Match Manager Pro</CardTitle>
                <CardDescription>Version 1.0.0</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4 text-muted-foreground">
                <p>This application is designed to help fishing clubs manage their matches, members, and results with ease.</p>
                <p>Built with modern technology to provide a seamless and responsive experience for club administrators, marshals, and anglers alike.</p>
            </CardContent>
        </Card>
        
        <Card className="text-center">
            <CardHeader>
                <CardTitle>Interested in getting your club on board?</CardTitle>
                <CardDescription>
                    To start using the app for your club, send your details via email. Click the button below to open a pre-filled email template.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild size="lg">
                    <a href={mailtoLink}>Contact Us To Get Started</a>
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
