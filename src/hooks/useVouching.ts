import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { useSdk, VouchInfo } from './useSdk';
import { useSdkContext } from '../context/SdkContext';
import { vouchingStore, vouchingActions, VOUCHING_DATA_CONFIG } from '../store/vouchingStore';
import appConfig from '../config/appConfig';

interface UseVouchingResult {
    vouchesOutbound: VouchInfo[];
    vouchesInbound: VouchInfo[];
    pageRankScore: number;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    currentEpoch: number;
}

export const useVouching = (address: string, isVisible = true): UseVouchingResult => {
    const sdk = useSdk();
    const { isInitialized } = useSdkContext();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentEpoch, setCurrentEpoch] = useState(0);

    // Track state directly with useState to guarantee reactivity
    const [outboundVouches, setOutboundVouches] = useState<VouchInfo[]>([]);
    const [inboundVouches, setInboundVouches] = useState<VouchInfo[]>([]);
    const [pageRankScore, setPageRankScore] = useState(0);

    // Get store loading and error states
    const isLoadingObs = useObservable(vouchingStore.isLoading);
    const errorObs = useObservable(vouchingStore.error);

    // Refs for lifecycle management
    const isMounted = useRef(true);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const appState = useRef(AppState.currentState);

    // Set isMounted ref for proper cleanup
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

    // Fetch data function (now uses the dedicated getCurrentEpoch function)
    const fetchData = async (force = false) => {
        if (!isInitialized || !sdk || !address) return;

        // Skip fetch if data is fresh enough and not forced
        if (!force && !vouchingActions.isDataStale(address)) {
            return;
        }

        try {
            // Set loading state WITHOUT clearing existing data
            vouchingActions.setLoading(true);

            // Fetch epoch directly using the dedicated function
            let epochValue = 0;
            try {
                if (typeof sdk.getCurrentEpoch === 'function') {
                    const fetchedEpoch = await sdk.getCurrentEpoch();
                    epochValue = fetchedEpoch;
                    setCurrentEpoch(epochValue);
                    console.log('Fetched current epoch:', epochValue);
                }
            } catch (epochError) {
                console.warn('Error fetching epoch, using current value:', epochError);
            }

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
                // Process results safely
                const outboundVouches = outboundResult.status === 'fulfilled' ? outboundResult.value : [];
                const inboundVouches = inboundResult.status === 'fulfilled' ? inboundResult.value : [];
                const pageRankValue = pageRankResult.status === 'fulfilled' ? pageRankResult.value : 0;

                // Ensure arrays are properly initialized
                const safeOutboundVouches = Array.isArray(outboundVouches) ? outboundVouches : [];
                const safeInboundVouches = Array.isArray(inboundVouches) ? inboundVouches : [];

                // Update local state for immediate UI reactivity
                setOutboundVouches(safeOutboundVouches);
                setInboundVouches(safeInboundVouches);
                setPageRankScore(pageRankValue);

                // Update store with all data at once
                vouchingActions.updateVouchingData(address, {
                    vouchesOutbound: safeOutboundVouches,
                    vouchesInbound: safeInboundVouches,
                    pageRankScore: pageRankValue,
                    lastUpdated: Date.now(),
                    currentEpoch: epochValue // We'll need to add this to the type
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

    // Force a refresh if we have no data but should have received it
    useEffect(() => {
        if (outboundVouches.length === 0 && inboundVouches.length === 0 &&
            !isLoadingObs.get() && address && isInitialized) {
            console.log("No vouches data, forcing refresh");
            refresh();
        }
    }, [address, isInitialized]);

    // Get the stored error value safely
    const getErrorValue = (): string | null => {
        try {
            const error = errorObs.get();
            return typeof error === 'string' ? error : null;
        } catch (e) {
            return null;
        }
    };

    return {
        vouchesOutbound: outboundVouches,
        vouchesInbound: inboundVouches,
        pageRankScore: pageRankScore,
        isLoading: isLoadingObs.get(),
        error: getErrorValue(),
        refresh,
        currentEpoch: currentEpoch
    };
}; 