
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { sendContactEmailToClubAdmins } from '@/lib/send-email';

interface ClubAdmin {
  id: string;
  name: string;
  email: string;
}

export default function ContactPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [admins, setAdmins] = useState<ClubAdmin[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [selectedAdminEmail, setSelectedAdminEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading || !userProfile?.primaryClubId || !firestore) {
      if (!authLoading) setIsLoadingAdmins(false);
      return;
    }

    const fetchAdmins = async () => {
      setIsLoadingAdmins(true);
      try {
        const adminsQuery = query(
          collection(firestore, 'users'),
          where('primaryClubId', '==', userProfile.primaryClubId),
          where('role', '==', 'Club Admin')
        );
        const adminSnapshot = await getDocs(adminsQuery);
        const adminData = adminSnapshot.docs.map(doc => {
          const data = doc.data() as User;
          return {
            id: doc.id,
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
          };
        });
        setAdmins(adminData);
      } catch (error) {
        console.error("Error fetching club admins:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load the list of club admins.',
        });
      } finally {
        setIsLoadingAdmins(false);
      }
    };

    fetchAdmins();
  }, [userProfile, authLoading, toast]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminEmail || !subject || !message || !userProfile?.email) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select an admin, and fill out the subject and message fields.' });
        return;
    }

    setIsSending(true);
    try {
        await sendContactEmailToClubAdmins(selectedAdminEmail, subject, message, userProfile.email);
        toast({ title: 'Email Sent!', description: 'Your message has been sent to the club administrator.' });
        // Reset form
        setSelectedAdminEmail('');
        setSubject('');
        setMessage('');
    } catch (error) {
        console.error('Error sending contact email:', error);
        toast({ variant: 'destructive', title: 'Send Failed', description: 'There was a problem sending your email. Please try again.' });
    } finally {
        setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact your club admin</h1>
        <p className="text-muted-foreground">
          Use this form to send a message directly to an administrator of your primary club.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
         <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Contact Form</CardTitle>
                <CardDescription>
                    Select an admin, write your message, and click send. Your email address will be included in the message.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-2">
                    <Label htmlFor="admin-select">To (Club Admin)</Label>
                    {isLoadingAdmins ? <Skeleton className="h-10 w-full" /> : (
                         <Select value={selectedAdminEmail} onValueChange={setSelectedAdminEmail} required>
                            <SelectTrigger id="admin-select">
                                <SelectValue placeholder="Select an administrator..." />
                            </SelectTrigger>
                            <SelectContent>
                                {admins.length > 0 ? (
                                    admins.map(admin => (
                                        <SelectItem key={admin.id} value={admin.email}>
                                            {admin.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="no-admins" disabled>No admins found for your club</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input 
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., Question about upcoming match"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea 
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Please type your message here..."
                        required
                        rows={6}
                    />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button type="submit" disabled={isSending || isLoadingAdmins || admins.length === 0}>
                    {isSending ? 'Sending...' : 'Send Message'}
                </Button>
            </CardFooter>
        </Card>
      </form>
    </div>
  );
}
