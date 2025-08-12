'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function LearnMorePage() {
    const videoUrl = "https://firebasestorage.googleapis.com/v0/b/new-match-manager.firebasestorage.app/o/help_documents%2F1754728610588-After%20First%20Login.mp4?alt=media&token=33e6aca2-9a06-4137-866c-26dc454e5463";

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Learn More About Match Manager</h1>
                    <p className="text-muted-foreground">Watch this short video to see how to get started.</p>
                </div>
                
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle>Getting Started Guide</CardTitle>
                        <CardDescription>A quick walkthrough of the first steps after you log in.</CardDescription>
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

            </div>
        </div>
    );
}
