
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
import { CheckCircle, Zap, Users, Shield } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: <Zap className="h-6 w-6 text-primary" />,
    title: 'Automated Match Setup',
    description: 'Quickly create series and matches with customizable rules, dates, and locations.',
  },
  {
    icon: <Users className="h-6 w-6 text-primary" />,
    title: 'Angler Management',
    description: 'Manage member lists, track registrations, and handle payments all in one place.',
  },
  {
    icon: <CheckCircle className="h-6 w-6 text-primary" />,
    title: 'Live Weigh-ins & Results',
    description: 'Enter weights in real-time and automatically calculate results and league standings.',
  },
  {
    icon: <Shield className="h-6 w-6 text-primary" />,
    title: 'Secure & Scalable',
    description: 'Built on modern, reliable technology to ensure your data is safe and accessible.',
  },
];

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


export default function LearnMorePage() {
  return (
    <div className="flex flex-col items-center gap-12 sm:gap-16 px-4 py-8 sm:py-12 md:py-16">
      
      <section className="text-center max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          Streamline Your Fishing Club Management
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Match Manager is the all-in-one solution for running fishing clubs and competitions. Spend less time on admin and more time on the bank.
        </p>
      </section>

      <section className="w-full max-w-5xl">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
             <div className="aspect-video bg-black">
                <video controls className="w-full h-full" autoPlay muted loop>
                  <source src="https://firebasestorage.googleapis.com/v0/b/new-match-manager.firebasestorage.app/o/help_documents%2F1754728555716-Signing%20Up.mp4?alt=media&token=3815e632-5cf8-4cdf-b103-9d526b319fbc" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="w-full max-w-5xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div>{feature.icon}</div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
      </section>
      
       <section className="w-full max-w-2xl">
        <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
                <CardDescription>Contact us today to get your club set up on Match Manager.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Button asChild size="lg">
                   <a href={mailtoLink}>Contact Us Now</a>
                </Button>
            </CardContent>
            <CardFooter className="flex justify-center">
                 <p className="text-xs text-muted-foreground">We'll get back to you to set up your club profile.</p>
            </CardFooter>
        </Card>
      </section>

    </div>
  );
}
