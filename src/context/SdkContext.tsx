import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BlockchainSDK } from '../types/blockchain';
import { createMockLibraClient } from '../services/mockSdk';

// Constants
const OPENLIBRA_RPC_URL = 'https://rpc.openlibra.space:8080/v1';

// Create a context for the SDK
interface SdkContextType {
    sdk: BlockchainSDK | null;
    isInitialized: boolean;
    isInitializing: boolean;
    error: Error | null;
    reinitialize: () => Promise<void>;
}

const SdkContext = createContext<SdkContextType>({
    sdk: null,
    isInitialized: false,
    isInitializing: false,
    error: null,
    reinitialize: async () => { }
});

// Hook to use the SDK context
export const useSdkContext = () => useContext(SdkContext);

interface SdkProviderProps {
    children: ReactNode;
}

export const SdkProvider: React.FC<SdkProviderProps> = ({ children }) => {
    const [sdk, setSdk] = useState<BlockchainSDK | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Initialize SDK function
    const initializeSdk = async () => {
        if (isInitializing || isInitialized) return;

        setIsInitializing(true);
        setError(null);

        try {
            console.log('Initializing OpenLibra SDK...');

            // Dynamically import the SDK to handle browser/server compatibility issues
            const LibraSDK = await import('open-libra-sdk');

            // Create client with proper network settings
            const client = new LibraSDK.LibraClient(LibraSDK.Network.MAINNET, OPENLIBRA_RPC_URL);

            // Test connection with a simple call
            await client.getLedgerInfo();

            // Create SDK interface
            const newSdk: BlockchainSDK = {
                getLatestBlockHeight: async () => {
                    const info = await client.getLedgerInfo();
                    return parseInt(info.block_height, 10);
                },
                getLatestEpoch: async () => {
                    const info = await client.getLedgerInfo();
                    return parseInt(info.epoch, 10);
                },
                getChainId: async () => {
                    const info = await client.getLedgerInfo();
                    return info.chain_id;
                },
                getTransactions: async (limit) => {
                    const txs = await client.getTransactions({ limit });
                    return txs.map((tx: any) => ({
                        hash: tx.hash,
                        version: parseInt(tx.version) || 0,
                        sender: tx.sender || '',
                        sequence_number: parseInt(tx.sequence_number) || 0,
                        timestamp: typeof tx.timestamp === 'string' ? tx.timestamp : String(tx.timestamp || Date.now()),
                        type: tx.type || 'unknown',
                        status: tx.success ? 'success' : 'failure',
                        gas_used: parseInt(tx.gas_used) || 0,
                        gas_unit_price: parseInt(tx.gas_unit_price) || 0,
                        vm_status: tx.vm_status || '',
                        block_height: parseInt(tx.block_height) || 0,
                        function: tx.function || null
                    }));
                },
                getTransactionByHash: async (hash) => {
                    const tx = await client.getTransactionByHash(hash);
                    if (!tx) return null;

                    return {
                        hash: tx.hash,
                        version: parseInt(tx.version) || 0,
                        sender: tx.sender || '',
                        sequence_number: parseInt(tx.sequence_number) || 0,
                        timestamp: typeof tx.timestamp === 'string' ? tx.timestamp : String(tx.timestamp || Date.now()),
                        type: tx.type || 'unknown',
                        status: tx.success ? 'success' : 'failure',
                        gas_used: parseInt(tx.gas_used) || 0,
                        gas_unit_price: parseInt(tx.gas_unit_price) || 0,
                        vm_status: tx.vm_status || '',
                        block_height: parseInt(tx.block_height) || 0,
                        function: tx.function || null,
                        events: (tx.events || []).map((event: any) => ({
                            type: event.type || '',
                            data: event.data || {}
                        })),
                        changes: (tx.changes || []).map((change: any) => ({
                            type: change.type || '',
                            address: change.address || '',
                            path: change.path || '',
                            data: change.data || {}
                        })),
                        payload: tx.payload || {}
                    };
                },
                getAccount: async (address) => {
                    try {
                        const accountInfo = await client.getAccount({ address });
                        const resources = await client.getAccountResources({ address });

                        // Find coin resource for balance
                        const coinResource = resources.find((r: any) =>
                            r && r.type &&
                            typeof r.type === 'string' &&
                            (r.type.includes('0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>') ||
                                r.type.includes('CoinStore<AptosCoin>'))
                        );

                        // Extract balance with safe navigation
                        let balance = 0;
                        if (coinResource && coinResource.data && coinResource.data.coin &&
                            typeof coinResource.data.coin.value === 'string') {
                            balance = parseInt(coinResource.data.coin.value);
                            if (isNaN(balance)) balance = 0;
                        }

                        return {
                            address,
                            balance,
                            sequence_number: parseInt(accountInfo.sequence_number) || 0,
                            resources: resources.map((resource: any) => ({
                                type: resource?.type || '',
                                data: resource?.data || {}
                            }))
                        };
                    } catch (err) {
                        console.error('Error fetching account:', err);
                        return null;
                    }
                },
                isInitialized: true,
                error: null
            };

            console.log('SDK initialized successfully!');
            setSdk(newSdk);
            setIsInitialized(true);
        } catch (err) {
            console.error('Failed to initialize SDK:', err);

            // Create a fallback mock SDK
            try {
                console.log('Falling back to mock SDK...');
                const mockSdk = createMockLibraClient();
                setSdk(mockSdk);
                setError(err instanceof Error ? err : new Error('Unknown SDK initialization error'));
            } catch (mockErr) {
                console.error('Failed to create mock SDK:', mockErr);
                setError(mockErr instanceof Error ? mockErr : new Error('Failed to create mock SDK'));
            }
        } finally {
            setIsInitializing(false);
        }
    };

    // Initialize on mount
    useEffect(() => {
        initializeSdk();

        // Cleanup function
        return () => {
            // Any cleanup needed for SDK
        };
    }, []);

    // Function to reinitialize the SDK if needed
    const reinitialize = async () => {
        setIsInitialized(false);
        setSdk(null);
        await initializeSdk();
    };

    const contextValue: SdkContextType = {
        sdk,
        isInitialized,
        isInitializing,
        error,
        reinitialize
    };

    return (
        <SdkContext.Provider value={contextValue}>
            {children}
        </SdkContext.Provider>
    );
}; 