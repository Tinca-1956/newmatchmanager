
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import NextImage from 'next/image';
import { ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import type { Match, Club, Series } from '@/lib/types';
import { format } from 'date-fns';

export default function GalleryPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [seriesForClub, setSeriesForClub] = useState<Series[]>([]);
    const [matchesForSeries, setMatchesForSeries] = useState<Match[]>([]);
    
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    const [isLoadingClubs, setIsLoadingClubs] = useState(true);
    const [isLoadingSeries, setIsLoadingSeries] = useState(false);
    const [isLoadingMatches, setIsLoadingMatches] = useState(false);

    // Fetch all clubs
    useEffect(() => {
        if (authLoading || !firestore) return;
        const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
        const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setAllClubs(clubsData);
            if (!selectedClubId && userProfile?.primaryClubId) {
                setSelectedClubId(userProfile.primaryClubId);
            } else if (!selectedClubId && clubsData.length > 0) {
                setSelectedClubId(clubsData[0].id);
            }
            setIsLoadingClubs(false);
        }, (error) => {
             console.error("Error fetching clubs:", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not load clubs.' });
             setIsLoadingClubs(false);
        });
        return () => unsubscribe();
    }, [authLoading, userProfile, firestore, toast, selectedClubId]);

    // Fetch series for selected club
    useEffect(() => {
        setSeriesForClub([]);
        setMatchesForSeries([]);
        setSelectedSeriesId('');
        setSelectedMatch(null);
        if (!selectedClubId || !firestore) return;

        setIsLoadingSeries(true);
        const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', selectedClubId));
        const unsubscribe = onSnapshot(seriesQuery, (snapshot) => {
            const seriesData = snapshot.docs.map(s => ({ id: s.id, ...s.data() } as Series));
            setSeriesForClub(seriesData);
            setIsLoadingSeries(false);
        }, (error) => {
            console.error("Error fetching series:", error);
            setIsLoadingSeries(false);
        });
        return () => unsubscribe();
    }, [selectedClubId]);

    // Fetch matches for selected series
    useEffect(() => {
        setMatchesForSeries([]);
        setSelectedMatch(null);
        if (!selectedSeriesId || !firestore) return;

        setIsLoadingMatches(true);
        const matchesQuery = query(collection(firestore, 'matches'), where('seriesId', '==', selectedSeriesId));
        const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
            const matchesData = snapshot.docs.map(m => ({ id: m.id, ...m.data() } as Match));
            setMatchesForSeries(matchesData);
            setIsLoadingMatches(false);
        }, (error) => {
            console.error("Error fetching matches:", error);
            setIsLoadingMatches(false);
        });
        return () => unsubscribe();
    }, [selectedSeriesId]);

    const handleSelectMatch = (matchId: string) => {
        const match = matchesForSeries.find(m => m.id === matchId) || null;
        setSelectedMatch(match);
    };

    const renderGallery = () => {
        if (!selectedMatch) {
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">Select a match to view its gallery.</p>
                </div>
            )
        }
        
        if (!selectedMatch.mediaUrls || selectedMatch.mediaUrls.length === 0) {
             return (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">No photos have been uploaded for this match yet.</p>
                </div>
            )
        }

        return (
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
                <CarouselContent>
                {selectedMatch.mediaUrls.map((url, index) => (
                    <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <div className="p-1">
                        <Card>
                        <CardContent className="flex aspect-square items-center justify-center p-0 overflow-hidden rounded-lg">
                           <div className="relative w-full h-full">
                             <NextImage
                                src={url}
                                alt={`Match image ${index + 1}`}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                style={{ objectFit: 'cover' }}
                                className="rounded-lg"
                                />
                           </div>
                        </CardContent>
                        </Card>
                    </div>
                    </CarouselItem>
                ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Image Gallery</h1>
                <p className="text-muted-foreground">View photos from past matches.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Filter Images</CardTitle>
                    <CardDescription>Select a club, series, and match to view its image gallery.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="club-select">Club</Label>
                             {isLoadingClubs ? <Skeleton className="h-10 w-full" /> : (
                                <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={allClubs.length === 0}>
                                    <SelectTrigger id="club-select">
                                        <SelectValue placeholder="Select a club..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allClubs.map((club) => (
                                            <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="series-select">Series</Label>
                            {isLoadingSeries ? <Skeleton className="h-10 w-full" /> : (
                                <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId} disabled={!selectedClubId || seriesForClub.length === 0}>
                                    <SelectTrigger id="series-select">
                                        <SelectValue placeholder="Select a series..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {seriesForClub.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="match-select">Match</Label>
                             {isLoadingMatches ? <Skeleton className="h-10 w-full" /> : (
                                <Select onValueChange={handleSelectMatch} disabled={!selectedSeriesId || matchesForSeries.length === 0}>
                                    <SelectTrigger id="match-select">
                                        <SelectValue placeholder="Select a match..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {matchesForSeries.map((m) => {
                                            const date = m.date instanceof Timestamp ? m.date.toDate() : m.date;
                                            return (
                                                <SelectItem key={m.id} value={m.id}>
                                                    {m.name} ({format(date, 'dd/MM/yy')})
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
                             )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{selectedMatch ? `Gallery: ${selectedMatch.name}` : 'Gallery'}</CardTitle>
                    <CardDescription>{selectedMatch ? `${selectedMatch.seriesName} - ${format(selectedMatch.date instanceof Timestamp ? selectedMatch.date.toDate() : selectedMatch.date, 'PPP')}` : 'Select a match to see photos'}</CardDescription>
                </CardHeader>
                <CardContent>
                   {renderGallery()}
                </CardContent>
            </Card>
        </div>
    );
}

