'use client';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockClubs } from '@/lib/mock-data';
import { PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function ClubsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clubs</h1>
          <p className="text-muted-foreground">
            Browse and manage your fishing clubs.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Club
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {mockClubs.map((club) => (
              <div
                key={club.id}
                className="flex items-center justify-between p-4 border-b last:border-b-0"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12" data-ai-hint="fishing club">
                    <AvatarImage src={club.imageUrl} alt={club.name} />
                    <AvatarFallback>{club.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{club.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {club.description}
                    </p>
                  </div>
                </div>
                <Button variant="outline">View Details</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
