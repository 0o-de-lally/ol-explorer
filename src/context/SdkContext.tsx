import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BlockchainSDK } from '../types/blockchain';
import { createMockLibraClient } from '../services/mockSdk';
import { normalizeAddress, normalizeTransactionHash } from '../utils/addressUtils';
import sdkConfig from '../config/sdkConfig';

// Constants
const OPENLIBRA_RPC_URL = 'https://rpc.openlibra.space:8080/v1';

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

export const SdkProvider: React.FC<SdkProviderProps> = ({ children }) => {
    const [sdk, setSdk] = useState<BlockchainSDK | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isUsingMockData, setIsUsingMockData] = useState(false);
    const [sdkClient, setSdkClient] = useState<any>(null);

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

            // Create client with proper network settings using config
            const client = new LibraSDK.LibraClient(
                sdkConfig.network === 'mainnet' ? LibraSDK.Network.MAINNET :
                    sdkConfig.network === 'testnet' ? LibraSDK.Network.TESTNET :
                        LibraSDK.Network.DEVNET,
                sdkConfig.rpcUrl
            );

            // Store the SDK client for direct access
            setSdkClient(client);

            // Test connection with a simple call
            await client.getLedgerInfo();

            // Create SDK interface that directly uses the client
            const newSdk: BlockchainSDK = {
                getLatestBlockHeight: async () => {
                    console.log('Fetching latest block height from blockchain');
                    const info = await client.getLedgerInfo();
                    return parseInt(info.block_height, 10);
                },
                getLatestEpoch: async () => {
                    console.log('Fetching latest epoch from blockchain');
                    const info = await client.getLedgerInfo();
                    return parseInt(info.epoch, 10);
                },
                getChainId: async () => {
                    console.log('Fetching chain ID from blockchain');
                    const info = await client.getLedgerInfo();
                    return info.chain_id;
                },
                getTransactions: async (limit) => {
                    console.log(`Fetching up to ${limit} transactions from blockchain`);
                    const txs = await client.getTransactions({ limit });

                    // Transform the results
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

                    console.log('Fetching transaction details for hash:', normalizedHash);

                    try {
                        // Construct proper transaction hash parameter object
                        const txParams = { transactionHash: normalizedHash };
                        const tx = await client.getTransactionByHash(txParams);

                        if (!tx) return null;

                        // Transform the transaction data
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
                    // Validate and normalize the address first
                    if (!address || typeof address !== 'string') {
                        console.error('Invalid address provided to getAccount:', address);
                        return null;
                    }

                    // Normalize the address to ensure proper format
                    const normalizedAddress = normalizeAddress(address);
                    console.log(`Using normalized address: ${normalizedAddress} (original: ${address})`);

                    try {
                        // Construct proper account parameters with normalized address
                        const accountParams = {
                            address: normalizedAddress.startsWith('0x') ? normalizedAddress : `0x${normalizedAddress}`
                        };

                        // Get account info 
                        const accountInfo = await client.account(accountParams);

                        // Get account resources
                        const resourcesParams = {
                            accountAddress: normalizedAddress.startsWith('0x') ? normalizedAddress : `0x${normalizedAddress}`
                        };
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

                        // Transform and create account object
                        return {
                            address: normalizedAddress,
                            balance,
                            sequence_number: parseInt(accountInfo.sequence_number) || 0,
                            resources: resources.map((resource: any) => ({
                                type: resource?.type || '',
                                data: resource?.data || {}
                            }))
                        };
                    } catch (err) {
                        console.error(`Error fetching account ${normalizedAddress}:`, err);
                        return null;
                    }
                },
                isInitialized: true,
                error: null,
                isUsingMockData: false
            };

            console.log('SDK initialized successfully!');
            setSdk(newSdk);
            setIsInitialized(true);
        } catch (err) {
            console.error('Failed to initialize SDK:', err);

            // Only create a fallback mock SDK if in debug mode
            if (sdkConfig.debugMode) {
                try {
                    console.log('Falling back to mock SDK due to debug mode...');
                    const mockClient = createMockLibraClient();
                    setSdkClient(mockClient);

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

                            // Normalize address for consistency in mock data as well
                            const normalizedAddress = normalizeAddress(address);
                            console.log(`Using normalized address in mock SDK: ${normalizedAddress}`);

                            try {
                                // Use direct mock client methods
                                const accountInfo = await mockClient.getAccount(normalizedAddress);
                                const resources = await mockClient.getResources(normalizedAddress);

                                return {
                                    address: normalizedAddress,
                                    balance: 1000000,
                                    sequence_number: 0,
                                    resources: resources
                                };
                            } catch (err: any) {
                                console.error(`Error in mock getAccount: ${err.message}`);
                                return null;
                            }
                        },
                        isInitialized: true,
                        error: new Error('Using mock data in debug mode'),
                        isUsingMockData: true
                    };

                    setSdk(mockSdk);
                    setIsInitialized(true);
                    setIsUsingMockData(true);
                    setError(err instanceof Error ? err : new Error('Using mock data in debug mode'));
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
        if (!isInitializing && !isInitialized && error && sdkConfig.retryOnFailure) {
            console.log('SDK initialization failed, scheduling auto-retry...');
            const retryTimer = setTimeout(() => {
                console.log('Auto-retrying SDK initialization...');
                initializeSdk();
            }, sdkConfig.retryDelay);

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