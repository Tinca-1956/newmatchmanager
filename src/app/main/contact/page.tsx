
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';
import type { Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail } from 'lucide-react';
import { sendContactEmailToClubAdmins } from '@/lib/send-email';

export default function ContactPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile?.primaryClubId || !firestore) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const clubDocRef = doc(firestore, 'clubs', userProfile.primaryClubId);
    getDoc(clubDocRef).then(docSnap => {
      if (docSnap.exists()) {
        setClub({ id: docSnap.id, ...docSnap.data() } as Club);
      }
    }).catch(error => {
      console.error("Error fetching club details: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your club details.' });
    }).finally(() => {
      setIsLoading(false);
    });

  }, [userProfile, authLoading, toast]);
  
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.primaryClubId || !userProfile.email || !subject || !message) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all fields.' });
      return;
    }
    
    setIsSending(true);
    try {
      await sendContactEmailToClubAdmins(
        userProfile.primaryClubId,
        subject,
        message,
        userProfile.email
      );

      toast({
        title: 'Email Sent!',
        description: 'Your message has been sent to your club administrators.'
      });
      setSubject('');
      setMessage('');

    } catch (error) {
      console.error('Error sending contact email:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Send Failed',
        description: `Could not send your message. Error: ${errorMessage}`
      });
    } finally {
      setIsSending(false);
    }
  };


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact Your Club</h1>
        <p className="text-muted-foreground">Send a message to your primary club's administrators.</p>
      </div>

      <form onSubmit={handleSendEmail}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Contact Form</CardTitle>
            <CardDescription>
                Your message will be sent to all Club Admins of your primary club. 
                Your email address will be included in the message.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="primaryClub">Primary Club</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Input id="primaryClub" value={club?.name || 'No primary club set.'} disabled />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="e.g., Question about upcoming match"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                placeholder="Write your message here..."
                rows={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isSending || isLoading || !club}>
              <Mail className="mr-2 h-4 w-4" />
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
