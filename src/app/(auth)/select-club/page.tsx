import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { mockClubs } from '@/lib/mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SelectClubPage() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Select Your Primary Club</CardTitle>
        <CardDescription>
          Choose a club to see its dashboard and manage your activities. You can
          change this later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          <div className="space-y-4 pr-6">
            {mockClubs.map((club) => (
              <div
                key={club.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
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
                <Button>Select</Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          If you don't see your club, contact a club administrator.
        </p>
      </CardFooter>
    </Card>
  );
}
