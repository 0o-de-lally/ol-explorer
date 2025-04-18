import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { useSdk } from './useSdk';
import { useSdkContext } from '../context/SdkContext';
import { vouchingStore, vouchingActions, VOUCHING_DATA_CONFIG } from '../store/vouchingStore';

interface UseVouchingResult {
    vouchesOutbound: string[];
    vouchesInbound: string[];
    pageRankScore: number;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export const useVouching = (address: string, isVisible = true): UseVouchingResult => {
    const sdk = useSdk();
    const { isInitialized } = useSdkContext();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Get store data using observables
    const vouchingData = useObservable(vouchingStore.items[address]);
    const isLoadingObservable = useObservable(vouchingStore.isLoading);
    const errorObservable = useObservable(vouchingStore.error);

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
                if (isVisible && isMounted.current && address) {
                    fetchData(true);
                }
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [isVisible, address]);

    // Fetch data function
    const fetchData = async (force = false) => {
        if (!isInitialized || !sdk || !address) return;

        // Skip fetch if data is fresh enough and not forced
        if (!force && !vouchingActions.isDataStale(address)) {
            return;
        }

        try {
            // Set loading state WITHOUT clearing existing data
            vouchingActions.setLoading(true);

            // Check SDK methods at runtime
            const hasOutboundMethod = typeof sdk.getAccountVouchesOutbound === 'function';
            const hasInboundMethod = typeof sdk.getAccountVouchesInbound === 'function';
            const hasPageRankMethod = typeof sdk.getAccountPageRankScore === 'function';

            // Parallel fetch all vouching data
            const [outboundResult, inboundResult, pageRankResult] = await Promise.allSettled([
                hasOutboundMethod ? sdk.getAccountVouchesOutbound(address) : Promise.resolve([]),
                hasInboundMethod ? sdk.getAccountVouchesInbound(address) : Promise.resolve([]),
                hasPageRankMethod ? sdk.getAccountPageRankScore(address) : Promise.resolve(0)
            ]);

            if (isMounted.current) {
                // Update store with all data at once
                vouchingActions.updateVouchingData(address, {
                    vouchesOutbound: outboundResult.status === 'fulfilled' ? outboundResult.value : [],
                    vouchesInbound: inboundResult.status === 'fulfilled' ? inboundResult.value : [],
                    pageRankScore: pageRankResult.status === 'fulfilled' ? pageRankResult.value : 0
                });

                vouchingActions.setError(null);
            }
        } catch (error) {
            console.error(`Error fetching vouching data for ${address}:`, error);

            if (isMounted.current) {
                vouchingActions.setError(
                    error instanceof Error ? error.message : 'Error fetching vouching data'
                );
            }
        } finally {
            if (isMounted.current) {
                vouchingActions.setLoading(false);
                setIsRefreshing(false);
            }
        }
    };

    // Setup polling
    useEffect(() => {
        if (isVisible && isInitialized && address) {
            // Initial fetch
            fetchData();

            // Set up polling interval
            pollingIntervalRef.current = setInterval(() => {
                fetchData();
            }, VOUCHING_DATA_CONFIG.REFRESH_INTERVAL_MS);

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
    }, [isVisible, isInitialized, address]);

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
    const vouchingDataUnwrapped = unwrapObservable(vouchingData) || {
        vouchesOutbound: [],
        vouchesInbound: [],
        pageRankScore: 0
    };

    return {
        vouchesOutbound: vouchingDataUnwrapped.vouchesOutbound,
        vouchesInbound: vouchingDataUnwrapped.vouchesInbound,
        pageRankScore: vouchingDataUnwrapped.pageRankScore,
        isLoading: unwrapObservable(isLoadingObservable),
        error: unwrapObservable(errorObservable),
        refresh
    };
}; 