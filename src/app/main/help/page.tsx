
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help</h1>
        <p className="text-muted-foreground">
          Find answers to your questions here.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Watch these short videos to guide you through MATCH MANAGER</CardTitle>
          <CardDescription>
            This section will be updated with common questions and answers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Help content will be added here soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
