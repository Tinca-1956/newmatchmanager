
'use client';

import { useState, useEffect, useMemo } from 'react';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, Timestamp, limit, getDocs } from 'firebase/firestore';
import type { PublicMatch, Club, Series, PublicUpcomingMatch } from '@/lib/types';
import { useToast } from './use-toast';

interface UsePublicDataReturn {
    clubs: Club[];
    selectedClubId: string;
    setSelectedClubId: (id: string) => void;
    isLoading: boolean;
    upcomingMatches: PublicUpcomingMatch[];
    lastCompletedMatch: PublicMatch | null;
}

export const usePublicData = (): UsePublicDataReturn => {
    const { toast } = useToast();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [allPublicCompleted, setAllPublicCompleted] = useState<PublicMatch[]>([]);
    const [allPublicUpcoming, setAllPublicUpcoming] = useState<PublicUpcomingMatch[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string>('all-clubs'); // Default to 'all-clubs'
    const [isLoadingClubs, setIsLoadingClubs] = useState(true);
    const [isLoadingCompleted, setIsLoadingCompleted] = useState(true);
    const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);

    // Fetch all clubs once
    useEffect(() => {
        if (!firestore) {
            setIsLoadingClubs(false);
            return;
        }
        const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
        const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setClubs(clubsData);
            setIsLoadingClubs(false);
        }, (error) => {
            console.error("Error fetching clubs: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
            setIsLoadingClubs(false);
        });
        return () => unsubscribe();
    }, [toast]);

    // Fetch all public completed matches once
    useEffect(() => {
        if (!firestore) {
            setIsLoadingCompleted(false);
            return;
        }
        const matchesQuery = query(collection(firestore, 'publicMatches'));
        const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
            const matchesData = snapshot.docs.map(doc => doc.data() as PublicMatch);
            setAllPublicCompleted(matchesData);
            setIsLoadingCompleted(false);
        }, (error) => {
            console.error("Error fetching public completed matches: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch completed match data.' });
            setIsLoadingCompleted(false);
        });
        return () => unsubscribe();
    }, [toast]);
    
    // Fetch all public upcoming matches once
    useEffect(() => {
        if (!firestore) {
            setIsLoadingUpcoming(false);
            return;
        }
        const matchesQuery = query(collection(firestore, 'publicUpcomingMatches'));
        const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
            const matchesData = snapshot.docs.map(doc => doc.data() as PublicUpcomingMatch);
            setAllPublicUpcoming(matchesData);
            setIsLoadingUpcoming(false);
        }, (error) => {
            console.error("Error fetching public upcoming matches: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch upcoming match data.' });
            setIsLoadingUpcoming(false);
        });
        return () => unsubscribe();
    }, [toast]);
    
    const upcomingMatches = useMemo(() => {
        const source = selectedClubId === 'all-clubs' 
            ? allPublicUpcoming 
            : allPublicUpcoming.filter(m => m.clubId === selectedClubId);
            
        return source
            .sort((a, b) => a.date.seconds - b.date.seconds);

    }, [allPublicUpcoming, selectedClubId]);

    const lastCompletedMatch = useMemo(() => {
        const source = selectedClubId === 'all-clubs'
            ? allPublicCompleted
            : allPublicCompleted.filter(m => m.clubId === selectedClubId);

        if (source.length === 0) return null;
        
        return source.sort((a, b) => b.date.seconds - a.date.seconds)[0];

    }, [allPublicCompleted, selectedClubId]);
    
    const isLoading = isLoadingClubs || isLoadingCompleted || isLoadingUpcoming;

    return {
        clubs,
        selectedClubId,
        setSelectedClubId,
        isLoading,
        upcomingMatches,
        lastCompletedMatch,
    };
};
