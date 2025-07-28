
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, DocumentSnapshot } from 'firebase/firestore';
import type { Match, Club, User } from '@/lib/types';

interface MatchDetails {
  clubName: string;
  seriesName: string;
  matchName: string;
  location: string;
}

export default function ManageImagesPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const matchId = params.matchId as string;

  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [anglerName, setAnglerName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!matchId || !firestore) {
      setIsLoading(false);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        // Fetch match document
        const matchDocRef = doc(firestore, 'matches', matchId);
        const matchDoc = await getDoc(matchDocRef);
        if (!matchDoc.exists()) {
          // Handle match not found
          setIsLoading(false);
          return;
        }
        const matchData = matchDoc.data() as Match;

        // Fetch club document
        let clubName = 'N/A';
        if (matchData.clubId) {
          const clubDocRef = doc(firestore, 'clubs', matchData.clubId);
          const clubDoc = await getDoc(clubDocRef);
          if (clubDoc.exists()) {
            clubName = (clubDoc.data() as Club).name;
          }
        }

        setMatchDetails({
          clubName: clubName,
          seriesName: matchData.seriesName,
          matchName: matchData.name,
          location: matchData.location,
        });

        // Fetch current user's name
        if (user) {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setAnglerName(`${userData.firstName} ${userData.lastName}`);
          }
        }
      } catch (error) {
        console.error('Error fetching match details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [matchId, user]);

  const renderDetails = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      );
    }
    if (!matchDetails) {
      return <p>Match details not found.</p>;
    }
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p><strong className="text-foreground">Club:</strong> {matchDetails.clubName}</p>
        <p><strong className="text-foreground">Series:</strong> {matchDetails.seriesName}</p>
        <p><strong className="text-foreground">Match:</strong> {matchDetails.matchName}</p>
        <p><strong className="text-foreground">Location:</strong> {matchDetails.location}</p>
        <p><strong className="text-foreground">Angler:</strong> {anglerName}</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Images</h1>
            <p className="text-muted-foreground">
                Upload and view photos for this match.
            </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Match Details</CardTitle>
          <CardDescription>
            You are managing images for the following match.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {renderDetails()}
        </CardContent>
      </Card>

      {/* Placeholder for future components */}
      <Card>
        <CardHeader>
            <CardTitle>Image Gallery</CardTitle>
            <CardDescription>
                This section will contain the image upload and display components.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Future Home of the Image Gallery</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
