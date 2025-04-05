import {useEffect} from 'react';
import {blockchainStore} from '../store/blockchainStore';
import {blockTimeStore, updateMeasurements} from '../store/blockTimeStore';
import {useSdkContext} from '../context/SdkContext';

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
                    const blockHeight = Number(ledgerInfo.block_height);
                    const ledgerVersion = Number(ledgerInfo.ledger_version);

                    if (!isNaN(timestamp) && !isNaN(blockHeight) && !isNaN(ledgerVersion)) {
                        // Update measurements with new data
                        updateMeasurements(blockHeight, ledgerVersion, timestamp);
                    }
                }
            } catch (error) {
                console.error('Error getting ledger info:', error);
                blockTimeStore.error.set(error instanceof Error ? error.message : 'Unknown error');
            }
        };

        // Update ledger info
        updateLedgerInfo();

        // Set up polling interval for regular updates
        const intervalId = setInterval(updateLedgerInfo, 10000); // Update every 10 seconds

        // Clean up interval on unmount
        return () => clearInterval(intervalId);
    }, [sdk]);
}; 