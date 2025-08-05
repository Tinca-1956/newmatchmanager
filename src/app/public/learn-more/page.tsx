
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Fish } from "lucide-react";
import Link from "next/link";

export default function LearnMorePage() {
    return (
        <div className="min-h-screen bg-muted/40">
             <header className="fixed top-0 left-0 right-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <h1 className="text-xl font-bold">Learn More</h1>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/public/dashboard">Back to Dashboard</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/auth/login">Sign In</Link>
                    </Button>
                </div>
            </header>
            <main className="flex justify-center items-start p-4 sm:p-6 pt-24">
                <Card className="w-full max-w-4xl">
                    <CardHeader className="items-center text-center">
                        <Fish className="h-12 w-12 text-primary" />
                        <CardTitle className="text-3xl">About Match Manager</CardTitle>
                        <CardDescription>Your all-in-one solution for managing fishing competitions.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center text-lg text-muted-foreground p-8">
                        <p>
                            [Your descriptive text about the application will go here.]
                        </p>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
