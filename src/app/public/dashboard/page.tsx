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
import Link from 'next/link';
import { LogIn } from 'lucide-react';

export default function PublicDashboardPage() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Public Dashboard</CardTitle>
              <CardDescription>
                A public list of something, to be defined later.
              </CardDescription>
            </div>
            <Button asChild>
              <Link href="/auth/login">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In to Your Club
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-12 text-center h-96 flex items-center justify-center">
            <p className="text-muted-foreground">List content will go here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
