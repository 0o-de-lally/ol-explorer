import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { useSdk } from './useSdk';
import { useSdkContext } from '../context/SdkContext';
import { donationsStore, donationsActions, DONATIONS_DATA_CONFIG, Donation } from '../store/donationsStore';

interface UseDonationsResult {
    donationsMade: Donation[];
    donationsReceived: Donation[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export const useDonations = (address: string, isCommunityWallet: boolean, isVisible = true): UseDonationsResult => {
    const sdk = useSdk();
    const { isInitialized } = useSdkContext();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Get store data using observables
    const donationsData = useObservable(donationsStore.items[address]);
    const isLoadingObservable = useObservable(donationsStore.isLoading);
    const errorObservable = useObservable(donationsStore.error);

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
        if (!force && !donationsActions.isDataStale(address)) {
            return;
        }

        try {
            // Set loading state WITHOUT clearing existing data
            donationsActions.setLoading(true);

            // Check SDK methods at runtime
            const hasDonationsMadeMethod = typeof sdk.getDonationsMadeByAccount === 'function';
            const hasDonationsReceivedMethod = typeof sdk.getDonationsReceivedByDV === 'function';

            // Conditionally fetch data based on account type
            if (isCommunityWallet && hasDonationsReceivedMethod) {
                // For community wallets, get donations received
                const donationsReceived = await sdk.getDonationsReceivedByDV(address);

                // Format the donations to match our store format
                const formattedDonations = donationsReceived.map(donor => ({
                    dvAccount: address,
                    amount: donor.amount || 0,
                    donor: donor.donor || ''
                }));

                if (isMounted.current) {
                    donationsActions.updateDonationsData(address, {
                        donationsReceived: formattedDonations
                    });
                }
            } else if (!isCommunityWallet && hasDonationsMadeMethod) {
                // For regular accounts, get donations made
                const donationsMade = await sdk.getDonationsMadeByAccount(address);

                // Format the donations to match our store format
                const formattedDonations = donationsMade.map(donation => ({
                    dvAccount: donation.dv_account || '',
                    amount: donation.amount || 0
                }));

                if (isMounted.current) {
                    donationsActions.updateDonationsData(address, {
                        donationsMade: formattedDonations
                    });
                }
            }

            if (isMounted.current) {
                donationsActions.setError(null);
            }
        } catch (error) {
            console.error(`Error fetching donation data for ${address}:`, error);

            if (isMounted.current) {
                donationsActions.setError(
                    error instanceof Error ? error.message : 'Error fetching donation data'
                );
            }
        } finally {
            if (isMounted.current) {
                donationsActions.setLoading(false);
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
            }, DONATIONS_DATA_CONFIG.REFRESH_INTERVAL_MS);

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
    }, [isVisible, isInitialized, address, isCommunityWallet]);

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
    const donationsDataUnwrapped = unwrapObservable(donationsData) || {
        donationsMade: [],
        donationsReceived: []
    };

    return {
        donationsMade: donationsDataUnwrapped.donationsMade,
        donationsReceived: donationsDataUnwrapped.donationsReceived,
        isLoading: unwrapObservable(isLoadingObservable),
        error: unwrapObservable(errorObservable),
        refresh
    };
}; 