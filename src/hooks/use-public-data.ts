
'use client';

import { useState, useEffect, useMemo } from 'react';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, Timestamp, limit, getDocs } from 'firebase/firestore';
import type { PublicMatch, Club, Series } from '@/lib/types';
import { useToast } from './use-toast';

interface UsePublicDataReturn {
    clubs: Club[];
    selectedClubId: string;
    setSelectedClubId: (id: string) => void;
    isLoading: boolean;
    upcomingMatches: PublicMatch[];
    completedMatches: PublicMatch[];
    uniqueSeries: { id: string; name: string }[];
    selectedSeriesId: string;
    setSelectedSeriesId: (id: string) => void;
}

export const usePublicData = (): UsePublicDataReturn => {
    const { toast } = useToast();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [allMatches, setAllMatches] = useState<PublicMatch[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    // Fetch all clubs once
    useEffect(() => {
        if (!firestore) {
            setIsLoading(false);
            return;
        }
        const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
        const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setClubs(clubsData);
            if (clubsData.length > 0 && !selectedClubId) {
                setSelectedClubId(clubsData[0].id);
            }
        }, (error) => {
            console.error("Error fetching clubs: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
        });
        return () => unsubscribe();
    }, [toast, selectedClubId]);

    // Fetch all public matches once
    useEffect(() => {
        if (!firestore) return;
        setIsLoading(true);
        const matchesQuery = query(collection(firestore, 'publicMatches'));
        const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
            const matchesData = snapshot.docs.map(doc => doc.data() as PublicMatch);
            setAllMatches(matchesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching public matches: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch match data.' });
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [toast]);
    
    // Memoize filtered matches based on selected club
    const filteredMatches = useMemo(() => {
        if (!selectedClubId) return [];
        return allMatches.filter(m => m.clubId === selectedClubId);
    }, [allMatches, selectedClubId]);

    const upcomingMatches = useMemo(() => {
        return filteredMatches
            .filter(m => ['Upcoming', 'In Progress'].includes(m.status))
            .sort((a, b) => a.date.seconds - b.date.seconds)
            .slice(0, 5); // Limit to next 5
    }, [filteredMatches]);

    const completedMatches = useMemo(() => {
        return filteredMatches
            .filter(m => m.status === 'Completed' || m.status === 'Weigh-in')
            .sort((a, b) => b.date.seconds - a.date.seconds);
    }, [filteredMatches]);

    // Derivce unique series from the list of completed matches for the filter dropdown
    const uniqueSeries = useMemo(() => {
        const seriesMap = new Map<string, { id: string; name: string }>();
        completedMatches.forEach(match => {
            if (!seriesMap.has(match.seriesId)) {
                seriesMap.set(match.seriesId, { id: match.seriesId, name: match.seriesName });
            }
        });
        return Array.from(seriesMap.values());
    }, [completedMatches]);

    return {
        clubs,
        selectedClubId,
        setSelectedClubId,
        isLoading,
        upcomingMatches,
        completedMatches,
        uniqueSeries,
        selectedSeriesId,
        setSelectedSeriesId,
    };
};
