import { useState, useEffect } from 'react';
import { blockchainActions, blockchainStore } from '../store/blockchainStore';
import { useSdkContext } from '../context/SdkContext';
import { useObservable } from '@legendapp/state/react';

/**
 * Hook that forces a component to update when any blockchain data changes
 * or SDK initialization status changes.
 * 
 * @returns A counter value that changes when updates occur (for dependency arrays)
 */
export const useForceUpdate = (): number => {
    const [updateCounter, setUpdateCounter] = useState(0);
    const { isInitialized, isInitializing } = useSdkContext();

    // Use useObservable to automatically subscribe to changes
    const lastUpdated = useObservable(blockchainStore.lastUpdated);

    // React to changes in lastUpdated
    useEffect(() => {
        setUpdateCounter(prev => prev + 1);
    }, [lastUpdated.get()]);

    // Update when SDK initialization changes
    useEffect(() => {
        if (isInitialized && !isInitializing) {
            setUpdateCounter(prev => prev + 1);

            // Force update blockchain store
            blockchainActions.forceUpdate();
        }
    }, [isInitialized, isInitializing]);

    // Listen for sdkinitialized events
    useEffect(() => {
        const handleSdkInitialized = () => {
            setUpdateCounter(prev => prev + 1);

            // Force update the blockchain store
            blockchainActions.forceUpdate();

            // Force another update after a delay to catch any late data
            setTimeout(() => {
                setUpdateCounter(prev => prev + 1);
            }, 500);
        };

        // Listen for custom sdk initialized event
        if (typeof window !== 'undefined') {
            window.addEventListener('sdkinitialized', handleSdkInitialized);

            return () => {
                window.removeEventListener('sdkinitialized', handleSdkInitialized);
            };
        }
    }, []);

    // Listen for blockchain-updated events
    useEffect(() => {
        const handleBlockchainUpdated = (event: CustomEvent) => {
            setUpdateCounter(prev => prev + 1);
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('blockchain-updated', handleBlockchainUpdated as EventListener);

            return () => {
                window.removeEventListener('blockchain-updated', handleBlockchainUpdated as EventListener);
            };
        }
    }, []);

    // Also set up a safety timer to periodically force updates
    // This ensures components don't get stuck in loading state
    useEffect(() => {
        if (isInitialized) {
            const timer = setInterval(() => {
                // Only force update if it's been a while since the last update
                const lastUpdateTime = blockchainStore.lastUpdated.get();
                const now = Date.now();
                if (now - lastUpdateTime > 5000) {
                    setUpdateCounter(prev => prev + 1);
                }
            }, 2000); // Check every 2 seconds

            return () => {
                clearInterval(timer);
            };
        }
    }, [isInitialized]);

    return updateCounter;
};

/**
 * Hook that forces a component to update when metrics data changes.
 * Use this in metrics-specific components to avoid unnecessary updates from transactions.
 * 
 * @returns A counter value that changes when metrics updates occur
 */
export const useForceUpdateMetrics = (): number => {
    const [updateCounter, setUpdateCounter] = useState(0);
    const { isInitialized, isInitializing } = useSdkContext();

    // Use useObservable to automatically subscribe to metrics-specific changes
    const lastMetricsUpdated = useObservable(blockchainStore.lastMetricsUpdated);

    // React to changes in lastMetricsUpdated
    useEffect(() => {
        setUpdateCounter(prev => prev + 1);
    }, [lastMetricsUpdated.get()]);

    // Update when SDK initialization changes
    useEffect(() => {
        if (isInitialized && !isInitializing) {
            setUpdateCounter(prev => prev + 1);

            // Force update metrics data
            blockchainActions.forceUpdateMetrics();
        }
    }, [isInitialized, isInitializing]);

    // Listen for sdkinitialized events
    useEffect(() => {
        const handleSdkInitialized = () => {
            setUpdateCounter(prev => prev + 1);

            // Force update metrics data
            blockchainActions.forceUpdateMetrics();
        };

        // Listen for custom sdk initialized event
        if (typeof window !== 'undefined') {
            window.addEventListener('sdkinitialized', handleSdkInitialized);

            return () => {
                window.removeEventListener('sdkinitialized', handleSdkInitialized);
            };
        }
    }, []);

    // Listen for blockchain-updated events related to metrics
    useEffect(() => {
        const handleBlockchainUpdated = (event: CustomEvent) => {
            // Only trigger update if this is a metrics update or all update
            if (event.detail?.updateType === 'metrics' || event.detail?.updateType === 'all') {
                setUpdateCounter(prev => prev + 1);
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('blockchain-updated', handleBlockchainUpdated as EventListener);

            return () => {
                window.removeEventListener('blockchain-updated', handleBlockchainUpdated as EventListener);
            };
        }
    }, []);

    return updateCounter;
};

/**
 * Hook that forces a component to update when transactions data changes.
 * Use this in transaction-specific components to avoid unnecessary updates from metrics.
 * 
 * @returns A counter value that changes when transaction updates occur
 */
export const useForceUpdateTransactions = (): number => {
    const [updateCounter, setUpdateCounter] = useState(0);
    const { isInitialized, isInitializing } = useSdkContext();

    // Use useObservable to automatically subscribe to transaction-specific changes
    const lastTransactionsUpdated = useObservable(blockchainStore.lastTransactionsUpdated);

    // React to changes in lastTransactionsUpdated
    useEffect(() => {
        setUpdateCounter(prev => prev + 1);
    }, [lastTransactionsUpdated.get()]);

    // Update when SDK initialization changes
    useEffect(() => {
        if (isInitialized && !isInitializing) {
            setUpdateCounter(prev => prev + 1);

            // Force update transactions data
            blockchainActions.forceUpdateTransactions();
        }
    }, [isInitialized, isInitializing]);

    // Listen for sdkinitialized events
    useEffect(() => {
        const handleSdkInitialized = () => {
            setUpdateCounter(prev => prev + 1);

            // Force update transactions data
            blockchainActions.forceUpdateTransactions();
        };

        // Listen for custom sdk initialized event
        if (typeof window !== 'undefined') {
            window.addEventListener('sdkinitialized', handleSdkInitialized);

            return () => {
                window.removeEventListener('sdkinitialized', handleSdkInitialized);
            };
        }
    }, []);

    // Listen for blockchain-updated events related to transactions
    useEffect(() => {
        const handleBlockchainUpdated = (event: CustomEvent) => {
            // Only trigger update if this is a transactions update or all update
            if (event.detail?.updateType === 'transactions' || event.detail?.updateType === 'all') {
                setUpdateCounter(prev => prev + 1);
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('blockchain-updated', handleBlockchainUpdated as EventListener);

            return () => {
                window.removeEventListener('blockchain-updated', handleBlockchainUpdated as EventListener);
            };
        }
    }, []);

    return updateCounter;
}; 