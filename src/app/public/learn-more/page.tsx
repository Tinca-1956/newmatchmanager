
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export default function LearnMorePage() {
  const videoUrl = "https://firebasestorage.googleapis.com/v0/b/new-match-manager.firebasestorage.app/o/help_documents%2F1754728610588-After%20First%20Login.mp4?alt=media&token=33e6aca2-9a06-4137-866c-26dc454e5463";

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Learn More About Match Manager</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Watch our introductory video to see how Match Manager can streamline your angling club's administration.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Introduction Video</CardTitle>
            <CardDescription>A quick guide to getting started with Match Manager after your first login.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full overflow-hidden rounded-lg border">
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-cover"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </CardContent>
        </Card>

        <div className="prose prose-lg max-w-none dark:prose-invert">
          <h2 className="text-2xl font-semibold">Key Features</h2>
          <ul>
            <li><strong>Centralized Dashboard:</strong> View upcoming matches, recent results, and photos all in one place.</li>
            <li><strong>Club & Series Management:</strong> Admins can easily create and manage clubs, series, and matches.</li>
            <li><strong>Simple Registration:</strong> Anglers can register for upcoming matches with a single click.</li>
            <li><strong>Live Weigh-in:</strong> Real-time updates during the weigh-in process, accessible to all participants.</li>
            <li><strong>Automated Results & Standings:</strong> Automatic calculation of match results and league standings.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
