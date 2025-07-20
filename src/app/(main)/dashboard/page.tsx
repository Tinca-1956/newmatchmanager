import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockUpcomingMatches, mockRecentResults } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

function weightLbsOz(totalOz: number) {
    const lbs = Math.floor(totalOz / 16);
    const oz = totalOz % 16;
    return `${lbs}lbs ${oz}oz`;
}


export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening in your club.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Matches</CardTitle>
            <CardDescription>Your next scheduled matches.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Series</TableHead>
                  <TableHead>Venue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUpcomingMatches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>{format(match.date, 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{match.seriesName}</TableCell>
                    <TableCell>{match.venue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Results</CardTitle>
             <CardDescription>Results from your last completed match.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pos</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRecentResults.slice(0, 5).map((result) => (
                  <TableRow key={result.userId}>
                    <TableCell><Badge variant="outline">{result.position}</Badge></TableCell>
                    <TableCell>{result.userName}</TableCell>
                    <TableCell>{weightLbsOz(result.weight)}</TableCell>
                    <TableCell>{format(result.date, 'MMM dd')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
