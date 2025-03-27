import { useEffect } from 'react';
import { blockchainStore } from '../store/blockchainStore';
import { blockTimeStore } from '../store/blockTimeStore';
import { calculateBlockTime } from '../store/blockTimeStore';
import { useSdkContext } from '../context/SdkContext';

/**
 * Hook to calculate and update block time metrics
 */
export const useBlockTime = () => {
    const { sdk } = useSdkContext();

    // Update ledger time and block time whenever transactions are updated
    useEffect(() => {
        const transactions = blockchainStore.transactions.get();

        // Get ledger info for timestamp regardless of transactions
        const updateLedgerInfo = async () => {
            try {
                if (!sdk) return;

                const ledgerInfo = await sdk.getLedgerInfo();

                if (ledgerInfo && ledgerInfo.ledger_timestamp) {
                    const timestamp = Number(ledgerInfo.ledger_timestamp);
                    if (!isNaN(timestamp)) {
                        // Update ledger timestamp from ledger info
                        blockTimeStore.lastBlockTimestamp.set(timestamp);
                        // Also update last block height
                        if (ledgerInfo.block_height) {
                            blockTimeStore.lastBlockHeight.set(Number(ledgerInfo.block_height));
                        }
                    }
                }
            } catch (error) {
                console.error('Error getting ledger info:', error);
            }
        };

        // Update ledger info immediately
        updateLedgerInfo();

        // Calculate block time if we have enough transactions
        if (!transactions || transactions.length < 2) {
            console.log('Not enough transactions to calculate block time');
            return;
        }

        try {
            // Set calculating flag
            blockTimeStore.isCalculating.set(true);

            // Get the latest and second latest transactions
            const latestTx = transactions[0];
            const previousTx = transactions[1];

            // Extract heights and timestamps
            const latestHeight = latestTx.version;
            const previousHeight = previousTx.version;
            const latestTimestamp = new Date(latestTx.timestamp).getTime();
            const previousTimestamp = new Date(previousTx.timestamp).getTime();

            if (!latestHeight || !previousHeight || !latestTimestamp || !previousTimestamp) {
                console.error('Missing data for block time calculation');
                return;
            }

            // Calculate average block time in ms
            const blockTimeMs = calculateBlockTime(
                latestHeight,
                latestTimestamp,
                previousHeight,
                previousTimestamp
            );

            console.log(`Calculated block time: ${blockTimeMs}ms (${blockTimeMs / 1000}s) from versions ${latestHeight} to ${previousHeight}`);

            // Update store with the calculated values
            blockTimeStore.blockTimeMs.set(blockTimeMs);
        } catch (error) {
            console.error('Error calculating block time:', error);
        } finally {
            blockTimeStore.isCalculating.set(false);
        }
    }, [blockchainStore.transactions.get(), sdk]);
}; 