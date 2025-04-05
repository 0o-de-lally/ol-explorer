import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BlockchainSDK, LedgerInfo, ViewFunctionParams } from '../types/blockchain';
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
                    const info = await client.getLedgerInfo();
                    return parseInt(info.block_height, 10);
                },
                getLatestEpoch: async () => {
                    const info = await client.getLedgerInfo();
                    return parseInt(info.epoch, 10);
                },
                getChainId: async () => {
                    const info = await client.getLedgerInfo();
                    // Convert chain_id to string to match interface
                    return String(info.chain_id);
                },
                getTransactions: async (limit) => {
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

                    try {
                        // Get resources using the SDK client
                        const resourcesParams = {
                            accountAddress: normalizedAddress.startsWith('0x') ? normalizedAddress : `0x${normalizedAddress}`
                        };
                        const resources = await client.getAccountResources(resourcesParams);

                        // Extract balance from resources
                        let balance = 0;
                        let sequenceNumber = 0;

                        // Find the coin resource to get the balance
                        const coinResource = resources.find((r: any) =>
                            r && r.type &&
                            typeof r.type === 'string' &&
                            (r.type.includes('0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>') ||
                                r.type.includes('CoinStore<AptosCoin>'))
                        );

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

                        // Create and return the account object with unmodified resources
                        return {
                            address: normalizedAddress,
                            balance,
                            sequence_number: sequenceNumber,
                            resources: resources // Pass resources directly without any transformation
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
                },
                view: async (params) => {
                    try {
                        // Try the direct API call first
                        const directPayload = {
                            function: params.function,
                            type_arguments: params.typeArguments || [],
                            arguments: params.arguments || []
                        };

                        // Make a direct API call
                        const apiUrl = `${sdkConfig.rpcUrl}/view`;
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(directPayload)
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(`API error: ${errorData.message || 'Unknown error'}`);
                        }

                        return await response.json();
                    } catch (error) {
                        console.error('Error calling view function:', error);

                        // Return default values based on function name to avoid breaking the UI
                        if (params.function.includes('is_donor_voice') ||
                            params.function.includes('is_authorized') ||
                            params.function.includes('is_reauth_proposed') ||
                            params.function.includes('is_founder') ||
                            params.function.includes('has_friends') ||
                            params.function.includes('is_voucher_score_valid')) {
                            return false;
                        } else if (params.function.includes('get_current_roots_at_registry')) {
                            return ['0x1'];
                        } else if (params.function.includes('evaluate_users_vouchers')) {
                            return 0;
                        } else if (params.function.includes('get_root_registry')) {
                            return [];
                        }

                        throw error;
                    }
                },
                ext_getAccountTransactions: async (address, limit = 25, start) => {
                    try {
                        // Normalize the address for consistency
                        const normalizedAddress = normalizeAddress(address);

                        // Build the REST API endpoint URL with pagination parameters
                        let restUrl = `${sdkConfig.rpcUrl}/accounts/${normalizedAddress}/transactions?limit=${limit}`;
                        if (start) {
                            restUrl += `&start=${start}`;
                        }

                        const response = await fetch(restUrl);

                        if (!response.ok) {
                            throw new Error(`REST API responded with status: ${response.status}`);
                        }

                        const data = await response.json();

                        // Check if we got valid transactions data
                        if (Array.isArray(data)) {
                            return data;
                        }

                        console.warn('Unexpected response format from REST API');
                        return [];
                    } catch (error) {
                        console.error('Error fetching account transactions:', error);

                        // Fall back to SDK filtering method if REST API fails
                        try {
                            // Fallback method for getting transactions
                            const txsParams = { options: { limit: limit * 2 } };
                            const allTxs = await client.getTransactions(txsParams);

                            // Filter transactions where the sender matches our address
                            const normalizedAddress = normalizeAddress(address);
                            const filteredTxs = allTxs.filter((tx: any) => {
                                return tx.sender &&
                                    tx.sender.toLowerCase() === normalizedAddress.toLowerCase();
                            }).slice(0, limit);

                            return filteredTxs;
                        } catch (sdkError) {
                            console.error('Error with fallback method:', sdkError);
                            return [];
                        }
                    }
                },
                viewJson: async (params) => {
                    try {
                        // Format the parameters according to what the SDK expects
                        const viewArgs = {
                            payload: {
                                function: params.function,
                                typeArguments: params.typeArguments || [],
                                arguments: params.arguments || []
                            }
                        };

                        return await client.general.viewJson(viewArgs as any);
                    } catch (error) {
                        console.error('Error calling viewJson function:', error);
                        throw error;
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
                                    // Use resources directly without transformation to preserve structure
                                    resources: resources
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
                        isUsingMockData: true,
                        view: async (params) => {
                            console.log('Calling view function (MOCK):', params.function);

                            try {
                                // Log the arguments for debugging
                                console.log('Mock view function arguments:',
                                    Array.isArray(params.arguments) ? JSON.stringify(params.arguments) : 'None');

                                // Parse the function name to determine what to return
                                const functionStr = params.function.toString();

                                // In mock mode, we always return appropriate default values
                                console.log(`Mock mode: Returning default value for ${functionStr}`);

                                if (functionStr.includes('is_donor_voice')) {
                                    return false;
                                } else if (functionStr.includes('is_authorized')) {
                                    return false;
                                } else if (functionStr.includes('is_reauth_proposed')) {
                                    return false;
                                } else if (functionStr.includes('is_founder')) {
                                    return false;
                                } else if (functionStr.includes('has_friends')) {
                                    return false;
                                } else if (functionStr.includes('is_voucher_score_valid')) {
                                    return false;
                                } else if (functionStr.includes('get_current_roots_at_registry')) {
                                    return ['0x1'];
                                } else if (functionStr.includes('evaluate_users_vouchers')) {
                                    return 0;
                                } else if (functionStr.includes('get_root_registry')) {
                                    return [];
                                } else if (functionStr.includes('get_current_validators')) {
                                    return [
                                        {
                                            "addr": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                                            "voting_power": "100"
                                        },
                                        {
                                            "addr": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
                                            "voting_power": "200"
                                        }
                                    ];
                                } else {
                                    return null;
                                }
                            } catch (error) {
                                console.error('Error in mock view function:', error);
                                return null;
                            }
                        },
                        ext_getAccountTransactions: async (address, limit = 25) => {
                            console.log(`Mock ext_getAccountTransactions called for address: ${address}, limit: ${limit}`);
                            // Return empty array for mock
                            return [];
                        },
                        viewJson: async (params: ViewFunctionParams) => {
                            console.log('Calling viewJson function (MOCK):', params.function);
                            try {
                                // Return a mock response based on the function being called
                                if (params.function.includes('stake::get_current_validators')) {
                                    return [
                                        {
                                            "addr": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                                            "voting_power": "100"
                                        },
                                        {
                                            "addr": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
                                            "voting_power": "200"
                                        }
                                    ];
                                } else if (params.function.includes('donor_voice::is_donor_voice')) {
                                    return false;
                                } else if (params.function.includes('donor_voice_reauth::is_authorized')) {
                                    return false;
                                } else if (params.function.includes('donor_voice_governance::is_reauth_proposed')) {
                                    return false;
                                } else if (params.function.includes('founder::is_founder')) {
                                    return false;
                                } else if (params.function.includes('founder::has_friends')) {
                                    return false;
                                } else if (params.function.includes('founder::is_voucher_score_valid')) {
                                    return false;
                                } else if (params.function.includes('root_of_trust::get_current_roots_at_registry')) {
                                    return ['0x1'];
                                } else if (params.function.includes('vouch_score::evaluate_users_vouchers')) {
                                    return 0;
                                } else if (params.function.includes('donor_voice::get_root_registry')) {
                                    return [];
                                } else {
                                    return null;
                                }
                            } catch (error) {
                                console.error('Error in mock viewJson function:', error);
                                return null;
                            }
                        }
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