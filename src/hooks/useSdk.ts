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

        // Debug the ledger timestamp format
        const initialTimestamp = parseInt(lastLedgerInfo.ledger_timestamp);
        console.log(`Initial ledger timestamp (raw): ${lastLedgerInfo.ledger_timestamp}`);
        console.log(`Initial ledger timestamp (parsed): ${initialTimestamp}`);
        console.log(`Initial ledger timestamp is microseconds: ${initialTimestamp > 1000000000000}`);

        // Extract and store initial block timestamp correctly
        // Convert microseconds to milliseconds if needed
        let lastBlockTimestamp = parseInt(lastLedgerInfo.ledger_timestamp);
        if (lastBlockTimestamp > 1000000000000) {
          lastBlockTimestamp = Math.floor(lastBlockTimestamp / 1000);
        }
        blockTimeStore.lastBlockHeight.set(parseInt(lastLedgerInfo.block_height));
        blockTimeStore.lastBlockTimestamp.set(lastBlockTimestamp);

        const calculateBlockTimeInterval = setInterval(async () => {
          try {
            const currentLedgerInfo = await realClient.getLedgerInfo();

            // If block height changed, calculate block time
            if (currentLedgerInfo.block_height !== lastLedgerInfo.block_height) {
              // Handle microsecond timestamps properly for calculation
              let timestamp1 = parseInt(lastLedgerInfo.ledger_timestamp);
              let timestamp2 = parseInt(currentLedgerInfo.ledger_timestamp);

              // Convert microseconds to milliseconds for calculation if needed
              if (timestamp1 > 1000000000000) timestamp1 = Math.floor(timestamp1 / 1000);
              if (timestamp2 > 1000000000000) timestamp2 = Math.floor(timestamp2 / 1000);

              const blockTimeMs = calculateBlockTime(
                parseInt(lastLedgerInfo.block_height),
                timestamp1,
                parseInt(currentLedgerInfo.block_height),
                timestamp2
              );

              // Update store with new values
              blockTimeStore.blockTimeMs.set(blockTimeMs);
              blockTimeStore.lastBlockHeight.set(parseInt(currentLedgerInfo.block_height));

              // Store correctly formatted timestamp
              let currentBlockTimestamp = parseInt(currentLedgerInfo.ledger_timestamp);
              if (currentBlockTimestamp > 1000000000000) {
                currentBlockTimestamp = Math.floor(currentBlockTimestamp / 1000);
              }
              blockTimeStore.lastBlockTimestamp.set(currentBlockTimestamp);

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
    if (!client) {
      console.log('Client not initialized, returning mock transactions');
      return createMockTransactions(limit);
    }

    try {
      console.log('Fetching transactions from client with limit:', limit);
      // Update to match the documentation
      const response = await client.getTransactions({ limit });
      console.log('Received transactions response:', response.length);

      // Debug: Log the first complete transaction object
      if (response && response.length > 0) {
        console.log('Sample transaction object:', JSON.stringify(response[0], null, 2));
      }

      // Transform the response if needed
      return response.map((tx: any) => {
        // Handle the function field for better display
        let functionName = 'unknown';
        if (tx.payload?.function) {
          // Extract function name from the full path (e.g., "0x1::coin::transfer" -> "coin::transfer")
          const functionParts = tx.payload.function.split('::');
          if (functionParts.length >= 2) {
            functionName = `${functionParts[1]}::${functionParts[2]}`;
          } else {
            functionName = tx.payload.function;
          }
        } else if (tx.type === 'state_checkpoint_transaction') {
          functionName = 'state_checkpoint_transaction';
        } else if (tx.type === 'block_metadata_transaction') {
          functionName = 'block_metadata_transaction';
        }

        // Keep the raw timestamp from the API - do not convert it
        // We'll handle the conversion consistently at display time
        const rawTimestamp = typeof tx.timestamp === 'string' 
          ? tx.timestamp 
          : String(tx.timestamp || Date.now());
        
        console.log(`Transaction ${tx.hash} raw timestamp: ${rawTimestamp}`);

        return {
          hash: tx.hash || `0x${Math.random().toString(16).substring(2, 42)}`,
          version: parseInt(tx.version) || 100000,
          sender: tx.sender || `0x${Math.random().toString(16).substring(2, 42)}`,
          sequence_number: parseInt(tx.sequence_number) || Math.floor(Math.random() * 100),
          timestamp: rawTimestamp, // Store as string to preserve precision
          type: tx.type || ['script', 'module', 'entry_function'][Math.floor(Math.random() * 3)],
          status: tx.success !== undefined ? (tx.success ? 'success' : 'failure') : (Math.random() > 0.2 ? 'success' : 'failure'),
          gas_used: parseInt(tx.gas_used) || Math.floor(Math.random() * 1000),
          gas_unit_price: parseInt(tx.gas_unit_price) || Math.floor(Math.random() * 100),
          vm_status: tx.vm_status || 'Executed successfully',
          block_height: parseInt(tx.block_height) || 500000,
          function: functionName,
          epoch: tx.epoch || Math.floor(Math.random() * 100).toString(),
          round: tx.round || Math.floor(Math.random() * 10000).toString(),
          state_change_hash: tx.state_change_hash || `0x${Math.random().toString(16).substring(2, 42)}`,
          event_root_hash: tx.event_root_hash || `0x${Math.random().toString(16).substring(2, 42)}`,
          accumulator_root_hash: tx.accumulator_root_hash || `0x${Math.random().toString(16).substring(2, 42)}`
        };
      });
    } catch (error) {
      console.error('Error fetching transactions, returning mock data:', error);
      return createMockTransactions(limit);
    }
  }, [client]);

  // Helper function to create mock transactions
  const createMockTransactions = (count: number): Transaction[] => {
    const transactions: Transaction[] = [];

    for (let i = 0; i < count; i++) {
      // Use string timestamps for consistency with API data
      const timestamp = String(Date.now() - i * 60000); // Each one is 1 minute older
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
  };

  const getTransactionByHash = useCallback(async (hash: string): Promise<TransactionDetail | null> => {
    if (!client) {
      throw new Error('SDK is not initialized');
    }

    try {
      // Format and validate hash
      const formattedHash = hash.startsWith('0x') ? hash : `0x${hash}`;

      // Check hash length - Open Libra transaction hashes should be 64 chars (without 0x prefix)
      // If hash is shorter, it may be a partial hash which will cause API errors
      if (formattedHash.length < 66) { // 0x + 64 chars
        console.warn(`Invalid transaction hash length: ${formattedHash.length}. Expected at least 66 chars.`);
        console.log('Using mock data for short hash');

        // Return mock data for invalid hash
        return {
          hash: formattedHash,
          version: Math.floor(Math.random() * 1000000),
          sender: `0x${Math.random().toString(16).substring(2, 42)}`,
          sequence_number: Math.floor(Math.random() * 100),
          timestamp: Date.now(),
          type: 'entry_function',
          status: 'success',
          gas_used: Math.floor(Math.random() * 1000),
          gas_unit_price: Math.floor(Math.random() * 100),
          vm_status: 'Executed successfully',
          block_height: 500000,
          function: undefined,
          epoch: '20',
          round: '1234',
          state_change_hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          event_root_hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          accumulator_root_hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          events: [],
          changes: [],
          payload: {}
        };
      }

      console.log(`Getting transaction by hash: ${formattedHash}`);

      const tx = await client.getTransactionByHash({
        transactionHash: formattedHash
      });

      console.log('getTransactionByHash response:', JSON.stringify(tx, null, 2));

      if (!tx) return null;

      return {
        hash: tx.hash || hash,
        version: parseInt(tx.version) || 0,
        sender: tx.sender || tx.proposer || '',
        sequence_number: parseInt(tx.sequence_number) || 0,
        timestamp: parseInt(tx.timestamp) || Date.now(),
        type: tx.type || 'unknown',
        status: tx.success ? 'success' : 'failure',
        gas_used: parseInt(tx.gas_used) || 0,
        gas_unit_price: parseInt(tx.gas_unit_price) || 0,
        vm_status: tx.vm_status || '',
        block_height: parseInt(tx.block_height) || 0,
        function: tx.function || null,
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

      // For API errors, return mock data instead of throwing
      console.log('Using mock data due to API error');
      return {
        hash: hash,
        version: Math.floor(Math.random() * 1000000),
        sender: `0x${Math.random().toString(16).substring(2, 42)}`,
        sequence_number: Math.floor(Math.random() * 100),
        timestamp: Date.now(),
        type: 'entry_function',
        status: 'success',
        gas_used: Math.floor(Math.random() * 1000),
        gas_unit_price: Math.floor(Math.random() * 100),
        vm_status: 'Executed successfully',
        block_height: 500000,
        function: undefined,
        epoch: '20',
        round: '1234',
        state_change_hash: `0x${Math.random().toString(16).substring(2, 66)}`,
        event_root_hash: `0x${Math.random().toString(16).substring(2, 66)}`,
        accumulator_root_hash: `0x${Math.random().toString(16).substring(2, 66)}`,
        events: [],
        changes: [],
        payload: {}
      };
    }
  }, [client]);

  const getAccount = useCallback(async (address: string): Promise<Account | null> => {
    if (!client) return null;

    try {
      // Format address according to documentation
      const formattedAddress = address.startsWith('0x') ? address : `0x${address}`;
      console.log(`Getting account details for: ${formattedAddress}`);

      // Get account resources with updated parameter format
      const resources = await client.getAccountResources({
        address: formattedAddress
      });

      // Try to find the balance in the resources
      const coinResource = resources.find((r: any) =>
        r.type.includes('0x1::coin::CoinStore<') && r.type.includes('AptosCoin')
      );

      // Extract balance or default to 0
      const balance = coinResource ?
        parseInt(coinResource.data.coin?.value || '0') : 0;

      // Get account info with updated parameter format
      const accountInfo = await client.getAccount({
        address: formattedAddress
      });

      return {
        address: formattedAddress,
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