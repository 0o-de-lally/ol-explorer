import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { useSdk } from './useSdk';
import { useSdkContext } from '../context/SdkContext';
import { epochStore, epochActions, EPOCH_DATA_CONFIG } from '../store/epochStore';

interface UseEpochDataResult {
    bidders: string[];
    maxSeats: number;
    filledSeats: number;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export const useEpochData = (isVisible = true): UseEpochDataResult => {
    const sdk = useSdk();
    const { isInitialized } = useSdkContext();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Get store data using observables
    const epochData = useObservable(epochStore.data);
    const isLoadingObservable = useObservable(epochStore.isLoading);
    const errorObservable = useObservable(epochStore.error);

    // Refs for lifecycle management
    const isMounted = useRef(true);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const appState = useRef(AppState.currentState);

    // Set isMounted ref
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // App state change handler
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                // App has come to the foreground
                if (isVisible && isMounted.current) {
                    fetchData(true);
                }
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [isVisible]);

    // Fetch data function
    const fetchData = async (force = false) => {
        if (!isInitialized || !sdk) return;

        // Skip fetch if data is fresh enough and not forced
        if (!force && !epochActions.isDataStale()) {
            return;
        }

        try {
            // Set loading state WITHOUT clearing existing data
            epochActions.setLoading(true);

            // Check SDK methods at runtime
            const hasBiddersMethod = typeof sdk.getBidders === 'function';
            const hasMaxSeatsMethod = typeof sdk.getMaxSeatsOffered === 'function';
            const hasFilledSeatsMethod = typeof sdk.getFilledSeats === 'function';

            // Parallel fetch all epoch data
            const [biddersResult, maxSeatsResult, filledSeatsResult] = await Promise.allSettled([
                hasBiddersMethod ? sdk.getBidders() : Promise.resolve([]),
                hasMaxSeatsMethod ? sdk.getMaxSeatsOffered() : Promise.resolve(0),
                hasFilledSeatsMethod ? sdk.getFilledSeats() : Promise.resolve(0)
            ]);

            if (isMounted.current) {
                // Update store with all data at once
                epochActions.updateEpochData({
                    bidders: biddersResult.status === 'fulfilled' ? biddersResult.value : [],
                    maxSeats: maxSeatsResult.status === 'fulfilled' ? maxSeatsResult.value : 0,
                    filledSeats: filledSeatsResult.status === 'fulfilled' ? filledSeatsResult.value : 0
                });

                epochActions.setError(null);
            }
        } catch (error) {
            console.error('Error fetching epoch data:', error);

            if (isMounted.current) {
                epochActions.setError(
                    error instanceof Error ? error.message : 'Error fetching epoch data'
                );
            }
        } finally {
            if (isMounted.current) {
                epochActions.setLoading(false);
                setIsRefreshing(false);
            }
        }
    };

    // Setup polling
    useEffect(() => {
        if (isVisible && isInitialized) {
            // Initial fetch
            fetchData();

            // Set up polling interval
            pollingIntervalRef.current = setInterval(() => {
                fetchData();
            }, EPOCH_DATA_CONFIG.REFRESH_INTERVAL_MS);

            return () => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            };
        }

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [isVisible, isInitialized]);

    // Public refresh function
    const refresh = async () => {
        setIsRefreshing(true);
        await fetchData(true);
    };

    // Helper to safely unwrap observable values
    const unwrapObservable = (value: any): any => {
        if (value === undefined || value === null) {
            return value;
        }

        // Handle observable with get() method (LegendState observable)
        if (typeof value === 'object' && value !== null && typeof value.get === 'function') {
            try {
                return unwrapObservable(value.get());
            } catch (e) {
                return value;
            }
        }

        return value;
    };

    // Get the data from observables
    const epochDataUnwrapped = unwrapObservable(epochData) || {
        bidders: [],
        maxSeats: 0,
        filledSeats: 0
    };

    return {
        bidders: epochDataUnwrapped.bidders,
        maxSeats: epochDataUnwrapped.maxSeats,
        filledSeats: epochDataUnwrapped.filledSeats,
        isLoading: unwrapObservable(isLoadingObservable),
        error: unwrapObservable(errorObservable),
        refresh
    };
}; 