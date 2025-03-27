import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BlockchainSDK } from '../types/blockchain';
import { createMockLibraClient } from '../services/mockSdk';
import { normalizeTransactionHash } from '../utils/addressUtils';
import { blockchainActions } from '../store/blockchainStore';

// Constants
const OPENLIBRA_RPC_URL = 'https://rpc.openlibra.space:8080/v1';
// Set to false for production, true only for development
const DEBUG_MODE = false;

// Create a context for the SDK
interface SdkContextType {
    sdk: BlockchainSDK | null;
    isInitialized: boolean;
    isInitializing: boolean;
    error: Error | null;
    reinitialize: () => Promise<void>;
    isUsingMockData: boolean;
}

const SdkContext = createContext<SdkContextType>({
    sdk: null,
    isInitialized: false,
    isInitializing: false,
    error: null,
    reinitialize: async () => { },
    isUsingMockData: false
});

// Hook to use the SDK context
export const useSdkContext = () => useContext(SdkContext);

interface SdkProviderProps {
    children: ReactNode;
}

// Add a global event dispatcher for SDK initialization
const dispatchSdkInitializedEvent = () => {
    console.log('Dispatching SDK initialized event');
    if (typeof window !== 'undefined') {
        // Create and dispatch a custom event that components can listen for
        const event = new CustomEvent('sdkinitialized', { detail: { timestamp: Date.now() } });
        window.dispatchEvent(event);

        // Also trigger a forceUpdate on blockchainStore to ensure components update
        blockchainActions.forceUpdate();
    }
};

export const SdkProvider: React.FC<SdkProviderProps> = ({ children }) => {
    const [sdk, setSdk] = useState<BlockchainSDK | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isUsingMockData, setIsUsingMockData] = useState(false);

    // Initialize SDK function
    const initializeSdk = async () => {
        if (isInitializing || isInitialized) return;

        setIsInitializing(true);
        setError(null);
        setIsUsingMockData(false);

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
                    // Use the normalizeTransactionHash utility for consistent handling
                    const normalizedHash = normalizeTransactionHash(hash);

                    // If normalization failed, return null
                    if (!normalizedHash) {
                        console.error('Hash normalization failed for:', hash);
                        return null;
                    }

                    // DEBUG: Log normalized hash
                    console.log('SDK.getTransactionByHash - Normalized hash:', normalizedHash);

                    try {
                        // Construct proper transaction hash parameter object
                        const txParams = { transactionHash: normalizedHash };
                        const tx = await client.getTransactionByHash(txParams);

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
                    } catch (error) {
                        console.error(`Error fetching transaction ${normalizedHash}:`, error);
                        return null;
                    }
                },
                getAccount: async (address) => {
                    try {
                        // Construct proper account parameters
                        const accountParams = { address };
                        const accountInfo = await client.account(accountParams);

                        // Construct proper resources parameters
                        const resourcesParams = { accountAddress: address };
                        const resources = await client.accountResources(resourcesParams);

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

            // Dispatch event after a small delay to ensure state has updated
            setTimeout(() => {
                dispatchSdkInitializedEvent();
            }, 50);
        } catch (err) {
            console.error('Failed to initialize SDK:', err);

            // Only create a fallback mock SDK if in debug mode
            if (DEBUG_MODE) {
                try {
                    console.log('Falling back to mock SDK due to debug mode...');
                    const mockClient = createMockLibraClient();

                    // Create a mock SDK with the same interface
                    const mockSdk: BlockchainSDK = {
                        getLatestBlockHeight: async () => 500000,
                        getLatestEpoch: async () => 20,
                        getChainId: async () => 'mock-chain-1',
                        getTransactions: async (limit = 10) => mockClient.getTransactions({ limit }),
                        getTransactionByHash: async (hash) => {
                            if (!hash) return null;
                            return mockClient.getTransactionByHash(hash);
                        },
                        getAccount: async (address) => {
                            if (!address) return null;
                            const accountInfo = await mockClient.getAccount(address);
                            const resources = await mockClient.getAccountResources(address);
                            return {
                                address,
                                balance: 1000000,
                                sequence_number: 0,
                                resources: resources
                            };
                        },
                        isInitialized: true,
                        error: new Error('Using mock data in debug mode')
                    };

                    setSdk(mockSdk);
                    setIsInitialized(true);
                    setIsUsingMockData(true);
                    setError(err instanceof Error ? err : new Error('Using mock data in debug mode'));

                    // Dispatch event for mock data as well after a small delay
                    setTimeout(() => {
                        dispatchSdkInitializedEvent();
                    }, 50);
                } catch (mockErr) {
                    console.error('Failed to create mock SDK:', mockErr);
                    setError(mockErr instanceof Error ? mockErr : new Error('Failed to create mock SDK'));
                }
            } else {
                // In production, just set the error
                setError(err instanceof Error ? err : new Error('Failed to initialize SDK'));
            }
        } finally {
            setIsInitializing(false);
        }
    };

    // Initialize on mount
    useEffect(() => {
        // Ensure SDK initialization happens immediately on mount
        console.log('SdkContext mounted, initializing SDK...');

        // Set a short timeout to ensure React has completed rendering the component
        // This helps avoid initialization issues in some web environments
        const initTimer = setTimeout(() => {
            initializeSdk();
        }, 100);

        // Cleanup function
        return () => {
            clearTimeout(initTimer);
        };
    }, []);

    // Add automatic retry if initialization fails
    useEffect(() => {
        // If initialization finished but the SDK is not initialized and has an error
        // Try to reinitialize after a delay (but only once)
        if (!isInitializing && !isInitialized && error) {
            console.log('SDK initialization failed, scheduling auto-retry...');
            const retryTimer = setTimeout(() => {
                console.log('Auto-retrying SDK initialization...');
                initializeSdk();
            }, 3000);

            return () => {
                clearTimeout(retryTimer);
            };
        }
    }, [isInitializing, isInitialized, error]);

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
        reinitialize,
        isUsingMockData
    };

    return (
        <SdkContext.Provider value={contextValue}>
            {children}
        </SdkContext.Provider>
    );
}; 