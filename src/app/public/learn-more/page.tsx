
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
import { CheckCircle, Fish } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function LearnMorePage() {
  const features = [
    'Centralized dashboard for all club activities.',
    'Automated results calculation and league standings.',
    'Easy match creation and management.',
    'Seamless angler registration for events.',
    'Public-facing pages to showcase your club.',
    'Secure role-based access for admins and members.',
  ];

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center text-center">
        <Fish className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          Elevate Your Match Fishing Experience
        </h1>
        <p className="mt-4 max-w-2xl text-xl text-muted-foreground">
          Match Manager is the all-in-one platform designed to simplify the
          administration of fishing clubs and competitions, letting you focus
          on what you love—fishing.
        </p>
        <div className="mt-8 flex gap-4">
            <Button asChild size="lg">
                <Link href="/auth/register">Get Started Now</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
                <Link href="/public/dashboard">View Public Dashboard</Link>
            </Button>
        </div>
      </div>

      <div className="mt-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">
              Powerful Features, Simple Interface
            </h2>
            <p className="text-lg text-muted-foreground">
              We've packed Match Manager with all the tools you need to run your
              club efficiently, without the headache.
            </p>
            <ul className="space-y-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="aspect-video w-full relative rounded-lg overflow-hidden shadow-xl">
             <Image
                src="https://placehold.co/1280x720.png"
                alt="Match Manager Dashboard Screenshot"
                fill
                className="object-cover"
                data-ai-hint="fishing app dashboard"
              />
          </div>
        </div>
      </div>

       <div className="mt-20 text-center">
           <Card className="max-w-2xl mx-auto">
               <CardHeader>
                   <CardTitle>Ready to get started?</CardTitle>
                   <CardDescription>Join the growing community of clubs using Match Manager.</CardDescription>
               </CardHeader>
               <CardContent>
                   <p className="text-muted-foreground">
                       Create an account today to explore the features and see how Match Manager can benefit your club.
                   </p>
               </CardContent>
               <CardFooter className="justify-center">
                    <Button asChild size="lg">
                        <Link href="/auth/register">Sign Up for Free</Link>
                    </Button>
               </CardFooter>
           </Card>
       </div>
    </div>
  );
}
