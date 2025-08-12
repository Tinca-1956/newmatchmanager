import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LearnMorePage() {
    const videoSrc = "https://firebasestorage.googleapis.com/v0/b/new-match-manager.firebasestorage.app/o/help_documents%2F1754728610588-After%20First%20Login.mp4?alt=media&token=33e6aca2-9a06-4137-866c-26dc454e5463";

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Learn More</h1>
                    <p className="text-muted-foreground">Discover the features of Match Manager.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Getting Started Video</CardTitle>
                        <CardDescription>Watch this short video to see how to get started after your first login.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video w-full max-w-3xl mx-auto rounded-lg overflow-hidden border">
                            <video
                                controls
                                className="w-full h-full"
                                src={videoSrc}
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
