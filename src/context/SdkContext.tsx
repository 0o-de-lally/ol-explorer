import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BlockchainSDK } from '../types/blockchain';
import { createMockLibraClient } from '../services/mockSdk';
import { normalizeAddress, normalizeTransactionHash } from '../utils/addressUtils';
import sdkConfig from '../config/sdkConfig';
// Import Buffer polyfill to ensure it's available
import '../utils/bufferPolyfill';
// Import the SDK directly to avoid dynamic imports
import * as LibraSDK from 'open-libra-sdk';

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
                    // Convert chain_id to string to match interface
                    return String(info.chain_id);
                },
                getTransactions: async (limit) => {
                    console.log(`Fetching up to ${limit} transactions from blockchain`);
                    // Use the correct parameter format
                    const txs = await client.getTransactions({ options: { limit } });

                    // Transform the results - using any type to avoid type mismatches
                    return txs.map((tx: any) => ({
                        hash: tx.hash || '',
                        version: parseInt(tx.version as string) || 0,
                        sender: tx.sender || '',
                        sequence_number: parseInt(tx.sequence_number as string) || 0,
                        timestamp: typeof tx.timestamp === 'string' ? tx.timestamp : String(tx.timestamp || Date.now()),
                        type: tx.type || 'unknown',
                        status: (tx.success ? 'success' : 'failure') as 'success' | 'failure',
                        gas_used: parseInt(tx.gas_used as string) || 0,
                        gas_unit_price: parseInt(tx.gas_unit_price as string) || 0,
                        vm_status: tx.vm_status || '',
                        // Use transaction version as block height if block_height is not available or zero
                        block_height: parseInt(tx.block_height as string) || parseInt(tx.version as string) || 0,
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

                        // Transform the transaction data - using type assertion to handle property access
                        const txAny = tx as any;

                        return {
                            hash: txAny.hash || '',
                            version: parseInt(txAny.version as string) || 0,
                            sender: txAny.sender || '',
                            sequence_number: parseInt(txAny.sequence_number as string) || 0,
                            timestamp: typeof txAny.timestamp === 'string' ? txAny.timestamp : String(txAny.timestamp || Date.now()),
                            type: txAny.type || 'unknown',
                            status: (txAny.success ? 'success' : 'failure') as 'success' | 'failure' | 'pending',
                            gas_used: parseInt(txAny.gas_used as string) || 0,
                            gas_unit_price: parseInt(txAny.gas_unit_price as string) || 0,
                            vm_status: txAny.vm_status || '',
                            // Use transaction version for block_height if not available
                            block_height: parseInt(txAny.block_height as string) || parseInt(txAny.version as string) || 0,
                            function: txAny.function || null,
                            events: (txAny.events || []).map((event: any) => ({
                                type: event.type || '',
                                data: event.data || {}
                            })),
                            changes: (txAny.changes || []).map((change: any) => ({
                                type: change.type || '',
                                address: change.address || '',
                                path: change.path || '',
                                data: change.data || {}
                            })),
                            payload: txAny.payload || {}
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
                        // The SDK client doesn't have a getAccount method, so we need to use getAccountResources
                        // and build the account data from the resources

                        // Use type assertion for resources as well
                        const resourcesParams = {
                            accountAddress: normalizedAddress.startsWith('0x') ? normalizedAddress : `0x${normalizedAddress}`
                        };

                        // Get resources first, as the SDK client doesn't have a direct getAccount method
                        const resources = await client.getAccountResources(resourcesParams);

                        // Find coin resource for balance - cast resource data to any to avoid errors
                        let balance = 0;
                        let sequenceNumber = 0;

                        // Find the coin resource to get the balance
                        const coinResource = resources.find((r: any) =>
                            r && r.type &&
                            typeof r.type === 'string' &&
                            (r.type.includes('0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>') ||
                                r.type.includes('CoinStore<AptosCoin>'))
                        );

                        // Extract balance with safe navigation - using as any to avoid property access errors
                        if (coinResource) {
                            const resourceData = coinResource.data as any;
                            if (resourceData && resourceData.coin &&
                                typeof resourceData.coin.value === 'string') {
                                balance = parseInt(resourceData.coin.value);
                                if (isNaN(balance)) balance = 0;
                            }
                        }

                        // Try to get sequence number from account info
                        try {
                            // Since the SDK type definitions might not match actual implementation,
                            // use type assertion as a workaround
                            const sdkClient = client as any;
                            if (sdkClient && typeof sdkClient.account === 'function') {
                                const accountInfo = await sdkClient.account({
                                    address: normalizedAddress.startsWith('0x') ? normalizedAddress : `0x${normalizedAddress}`
                                });
                                sequenceNumber = parseInt(accountInfo?.sequence_number as string) || 0;
                            }
                        } catch (seqErr) {
                            console.warn('Could not get sequence number:', seqErr);
                            // Default to 0 if we can't get it
                        }

                        // Transform and create account object
                        return {
                            address: normalizedAddress,
                            balance,
                            sequence_number: sequenceNumber,
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
                isUsingMockData: false,

                // Add ledger info method to get timestamps and current block height
                getLedgerInfo: async (forceFresh?: boolean) => {
                    try {
                        // Use direct ledger info method with proper parameter structure
                        const ledgerInfo = await client.getLedgerInfo();

                        if (!ledgerInfo) {
                            throw new Error('Failed to retrieve ledger info');
                        }

                        return {
                            chain_id: ledgerInfo.chain_id?.toString() || '',
                            epoch: ledgerInfo.epoch || '0',
                            ledger_version: ledgerInfo.ledger_version || '0',
                            oldest_ledger_version: ledgerInfo.oldest_ledger_version || '0',
                            ledger_timestamp: ledgerInfo.ledger_timestamp || Date.now().toString(),
                            node_role: ledgerInfo.node_role || 'unknown',
                            oldest_block_height: ledgerInfo.oldest_block_height || '0',
                            block_height: ledgerInfo.block_height || '0',
                            git_hash: ledgerInfo.git_hash || ''
                        };
                    } catch (error) {
                        console.error('Error fetching ledger info:', error);
                        // Return mock data as fallback
                        return {
                            chain_id: '1',
                            epoch: '0',
                            ledger_version: '0',
                            oldest_ledger_version: '0',
                            ledger_timestamp: Date.now().toString(),
                            node_role: 'unknown',
                            oldest_block_height: '0',
                            block_height: '0',
                            git_hash: ''
                        };
                    }
                }
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
                        getTransactions: async (limit = 10) => {
                            const transactions = await mockClient.getTransactions({ limit });
                            return transactions.map((tx: any) => ({
                                hash: tx.hash || '',
                                version: typeof tx.version === 'string' ? parseInt(tx.version) : (tx.version || 0),
                                sender: '',
                                sequence_number: 0,
                                timestamp: String(Date.now()),
                                type: 'unknown',
                                status: 'success' as 'success',
                                gas_used: 0,
                                gas_unit_price: 0,
                                vm_status: '',
                                // Use version number as block height
                                block_height: typeof tx.version === 'string' ? parseInt(tx.version) : (tx.version || 0),
                                function: ''
                            }));
                        },
                        getTransactionByHash: async (hash) => {
                            if (!hash) return null;
                            const tx = await mockClient.getTransactionByHash(hash);
                            if (!tx) return null;

                            return {
                                hash: tx.hash || '',
                                version: typeof tx.version === 'string' ? parseInt(tx.version) : (tx.version || 0),
                                sender: '',
                                sequence_number: 0,
                                timestamp: String(Date.now()),
                                type: 'unknown',
                                status: 'success' as 'success',
                                gas_used: 0,
                                gas_unit_price: 0,
                                vm_status: '',
                                // Use version number as block height
                                block_height: typeof tx.version === 'string' ? parseInt(tx.version) : (tx.version || 0),
                                function: '',
                                events: [],
                                changes: [],
                                payload: {}
                            };
                        },
                        getAccount: async (address) => {
                            if (!address) return null;

                            // Normalize address for consistency in mock data as well
                            const normalizedAddress = normalizeAddress(address);
                            console.log(`Using normalized address in mock SDK: ${normalizedAddress}`);

                            try {
                                // Use direct mock client methods with correct names
                                // For consistency with the real implementation
                                const mockClientAny = mockClient as any;
                                let resources = [];
                                let sequenceNumber = 0;

                                // Get resources using the mockClient
                                if (mockClientAny && typeof mockClientAny.getAccountResources === 'function') {
                                    resources = await mockClientAny.getAccountResources(normalizedAddress);
                                }

                                // Try to get sequence number if the method exists
                                if (mockClientAny && typeof mockClientAny.getAccount === 'function') {
                                    const accountInfo = await mockClientAny.getAccount(normalizedAddress);
                                    sequenceNumber = parseInt(accountInfo?.sequence_number as string) || 0;
                                }

                                return {
                                    address: normalizedAddress,
                                    balance: 1000000,
                                    sequence_number: sequenceNumber,
                                    resources: resources || []
                                };
                            } catch (err: any) {
                                console.error(`Error in mock getAccount: ${err.message}`);
                                return null;
                            }
                        },
                        getLedgerInfo: async () => {
                            // Mock ledger info
                            return {
                                chain_id: 'mock-chain-1',
                                epoch: '20',
                                ledger_version: '1000000',
                                oldest_ledger_version: '1',
                                ledger_timestamp: Date.now().toString(),
                                node_role: 'full_node',
                                oldest_block_height: '1',
                                block_height: '500000',
                                git_hash: 'mock-git-hash'
                            };
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