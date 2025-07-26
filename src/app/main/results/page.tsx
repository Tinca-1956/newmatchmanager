
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export default function ResultsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Results</h1>
        <p className="text-muted-foreground">View match and series results.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Match Results</CardTitle>
          <CardDescription>Detailed results from completed matches.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-12">
            Results content will be implemented here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
