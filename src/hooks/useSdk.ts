import { useCallback, useState, useEffect } from 'react';
import { BlockchainSDK, Transaction, TransactionDetail, Account } from '../types/blockchain';
import { createMockLibraClient } from '../services/mockSdk';
import { blockTimeStore, calculateBlockTime } from '../store/blockTimeStore';

// Constants
const OPENLIBRA_RPC_URL = 'https://rpc.openlibra.space:8080/v1';
const BLOCK_TIME_CALCULATION_INTERVAL = 500; // 500ms
const BLOCK_TIME_CALCULATION_TIMEOUT = 30000; // 30 seconds

// We're going to initialize the client inside the hook to prevent issues with SSR
export const useSdk = (): BlockchainSDK => {
  const [client, setClient] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize the client and calculate block time
  useEffect(() => {
    const initClient = async () => {
      try {
        setIsInitialized(false); // Reset initialization state
        setError(null);
        
        // First try to set up the real SDK client
        let realClient = null;
        
        try {
          // Try to polyfill Buffer if needed
          if (typeof window !== 'undefined' && !window.Buffer) {
            window.Buffer = require('buffer/').Buffer;
          }
          
          // Try loading the real SDK
          try {
            // Import SDK properly with Network enum
            const { LibraClient, Network } = require('open-libra-sdk');
            
            // Initialize the client with the correct pattern, without any custom fetch or headers
            realClient = new LibraClient(Network.MAINNET, OPENLIBRA_RPC_URL);
            
            // Test connection
            const ledgerInfo = await realClient.getLedgerInfo();
            console.log('Successfully connected to Open Libra RPC at', OPENLIBRA_RPC_URL);
            console.log('Ledger Info:', JSON.stringify(ledgerInfo, null, 2));
          } catch (e) {
            console.warn('Failed to connect to Open Libra RPC:', e);
            throw e;
          }
        } catch (realSdkError) {
          // If real SDK fails, use mock implementation
          console.log('Using mock LibraClient due to connection issues');
          realClient = createMockLibraClient();
          
          // Test mock client
          await realClient.getLedgerInfo();
        }
        
        // Set the client (real or mock)
        setClient(realClient);
        setIsInitialized(true);

        // Start block time calculation
        blockTimeStore.isCalculating.set(true);
        let startTime = Date.now();
        let lastLedgerInfo = await realClient.getLedgerInfo();
        
        const calculateBlockTimeInterval = setInterval(async () => {
          try {
            const currentLedgerInfo = await realClient.getLedgerInfo();
            
            // If block height changed, calculate block time
            if (currentLedgerInfo.block_height !== lastLedgerInfo.block_height) {
              const blockTimeMs = calculateBlockTime(
                parseInt(lastLedgerInfo.block_height),
                parseInt(lastLedgerInfo.ledger_timestamp),
                parseInt(currentLedgerInfo.block_height),
                parseInt(currentLedgerInfo.ledger_timestamp)
              );
              
              blockTimeStore.blockTimeMs.set(blockTimeMs);
              blockTimeStore.lastBlockHeight.set(parseInt(currentLedgerInfo.block_height));
              blockTimeStore.lastBlockTimestamp.set(parseInt(currentLedgerInfo.ledger_timestamp));
              blockTimeStore.isCalculating.set(false);
              
              clearInterval(calculateBlockTimeInterval);
              console.log('Block time calculated:', blockTimeMs, 'ms');
            }
            
            // Update last ledger info
            lastLedgerInfo = currentLedgerInfo;
            
            // Check if we've been calculating for too long
            if (Date.now() - startTime > BLOCK_TIME_CALCULATION_TIMEOUT) {
              blockTimeStore.error.set('Block time calculation timed out');
              blockTimeStore.isCalculating.set(false);
              clearInterval(calculateBlockTimeInterval);
            }
          } catch (err) {
            console.error('Error calculating block time:', err);
            blockTimeStore.error.set(err instanceof Error ? err.message : 'Unknown error');
            blockTimeStore.isCalculating.set(false);
            clearInterval(calculateBlockTimeInterval);
          }
        }, BLOCK_TIME_CALCULATION_INTERVAL);
        
      } catch (err) {
        console.error('Error initializing SDK client:', err);
        
        // Even if everything fails, use mock client as fallback
        try {
          const mockClient = createMockLibraClient();
          setClient(mockClient);
          setIsInitialized(true);
        } catch (mockError) {
          setError(new Error('Failed to initialize both real and mock SDK'));
          setIsInitialized(true); // Mark as initialized even on error
        }
      }
    };

    initClient();
  }, []);

  const getLatestBlockHeight = useCallback(async (): Promise<number> => {
    if (!client) return 0;
    
    try {
      const ledgerInfo = await client.getLedgerInfo();
      console.log('getLedgerInfo response:', JSON.stringify(ledgerInfo, null, 2));
      return parseInt(ledgerInfo.block_height);
    } catch (error) {
      console.error('Error fetching block height:', error);
      return 0; // Return 0 as a fallback
    }
  }, [client]);

  const getLatestEpoch = useCallback(async (): Promise<number> => {
    if (!client) return 0;
    
    try {
      const ledgerInfo = await client.getLedgerInfo();
      return parseInt(ledgerInfo.epoch);
    } catch (error) {
      console.error('Error fetching epoch:', error);
      return 0; // Return 0 as a fallback
    }
  }, [client]);

  const getChainId = useCallback(async (): Promise<string> => {
    if (!client) return 'unknown';
    
    try {
      const ledgerInfo = await client.getLedgerInfo();
      return ledgerInfo.chain_id.toString();
    } catch (error) {
      console.error('Error fetching chain ID:', error);
      return 'unknown'; // Return unknown as a fallback
    }
  }, [client]);

  const getTransactions = useCallback(async (limit: number): Promise<Transaction[]> => {
    // Simulating API call
    const transactions: Transaction[] = [];
    
    for (let i = 0; i < limit; i++) {
      const timestamp = Date.now() - i * 60000; // Each one is 1 minute older
      transactions.push({
        hash: `0x${Math.random().toString(16).substring(2, 42)}`,
        version: 100000 - i,
        sender: `0x${Math.random().toString(16).substring(2, 42)}`,
        sequence_number: Math.floor(Math.random() * 100),
        timestamp,
        type: ['script', 'module', 'entry_function'][Math.floor(Math.random() * 3)],
        status: Math.random() > 0.2 ? 'success' : 'failure',
        gas_used: Math.floor(Math.random() * 1000),
        gas_unit_price: Math.floor(Math.random() * 100),
        vm_status: 'Executed successfully',
        block_height: 500000 - i,
        epoch: Math.floor(Math.random() * 100).toString(),
        round: Math.floor(Math.random() * 10000).toString(),
        state_change_hash: `0x${Math.random().toString(16).substring(2, 42)}`,
        event_root_hash: `0x${Math.random().toString(16).substring(2, 42)}`,
        accumulator_root_hash: `0x${Math.random().toString(16).substring(2, 42)}`
      });
    }
    
    return transactions;
  }, []);

  const getTransactionByHash = useCallback(async (hash: string): Promise<TransactionDetail | null> => {
    if (!client) {
      throw new Error('SDK is not initialized');
    }
    
    try {
      const tx = await client.getTransactionByHash(hash);
      console.log('getTransactionByHash response:', JSON.stringify(tx, null, 2));
      
      if (!tx) return null;

      return {
        hash: tx.hash || hash,
        version: parseInt(tx.version) || 0,
        sender: tx.sender || tx.proposer || '',
        sequence_number: parseInt(tx.sequence_number) || 0,
        timestamp: (parseInt(tx.timestamp) || Date.now()) * 1000, // Convert to milliseconds
        type: tx.type || 'unknown',
        status: tx.success ? 'success' : 'failure',
        gas_used: parseInt(tx.gas_used) || 0,
        gas_unit_price: parseInt(tx.gas_unit_price) || 0,
        vm_status: tx.vm_status || '',
        block_height: parseInt(tx.block_height) || 0,
        epoch: tx.epoch || '',
        round: tx.round || '',
        state_change_hash: tx.state_change_hash || '',
        event_root_hash: tx.event_root_hash || '',
        accumulator_root_hash: tx.accumulator_root_hash || '',
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
      console.error('Error fetching transaction details:', error);
      throw error;
    }
  }, [client]);

  const getAccount = useCallback(async (address: string): Promise<Account | null> => {
    if (!client) return null;
    
    try {
      // Get account resources
      const resources = await client.getAccountResources(address);
      
      // Try to find the balance in the resources
      const coinResource = resources.find((r: any) => 
        r.type.includes('0x1::coin::CoinStore<') && r.type.includes('AptosCoin')
      );
      
      // Extract balance or default to 0
      const balance = coinResource ? 
        parseInt(coinResource.data.coin?.value || '0') : 0;
        
      // Get account info
      const accountInfo = await client.getAccount(address);
      
      return {
        address,
        balance,
        sequence_number: parseInt(accountInfo.sequence_number) || 0,
        resources: resources.map((resource: any) => ({
          type: resource.type || '',
          data: resource.data || {}
        }))
      };
    } catch (error) {
      console.error('Error fetching account:', error);
      return null; // Return null for non-existent accounts
    }
  }, [client]);
  
  return {
    getLatestBlockHeight,
    getLatestEpoch,
    getChainId,
    getTransactions,
    getTransactionByHash,
    getAccount,
    isInitialized,
    error
  };
}; 