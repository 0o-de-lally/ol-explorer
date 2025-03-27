import { useState, useEffect } from 'react';
import { blockchainActions, blockchainStore } from '../store/blockchainStore';
import { useSdkContext } from '../context/SdkContext';
import { useObservable } from '@legendapp/state/react';

/**
 * Hook that forces a component to update when blockchain data changes
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
        console.log('Force update triggered by lastUpdated change:', lastUpdated.get());
        setUpdateCounter(prev => prev + 1);
    }, [lastUpdated.get()]);

    // Update when SDK initialization changes
    useEffect(() => {
        if (isInitialized && !isInitializing) {
            console.log('Force update triggered by SDK initialization');
            setUpdateCounter(prev => prev + 1);

            // Force update blockchain store
            blockchainActions.forceUpdate();
        }
    }, [isInitialized, isInitializing]);

    // Listen for sdkinitialized events
    useEffect(() => {
        const handleSdkInitialized = () => {
            console.log('Force update triggered by SDK initialized event');
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
        const handleBlockchainUpdated = () => {
            console.log('Force update triggered by blockchain-updated event');
            setUpdateCounter(prev => prev + 1);
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('blockchain-updated', handleBlockchainUpdated);

            return () => {
                window.removeEventListener('blockchain-updated', handleBlockchainUpdated);
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
                    console.log('Force update triggered by safety timer');
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