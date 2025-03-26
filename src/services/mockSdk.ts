import { Transaction, TransactionDetail, Account, TransactionEvent, StateChange } from '../types/blockchain';

// Mock transaction data
const generateMockTransactions = (count: number): Transaction[] => {
  const transactions: Transaction[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const tx: Transaction = {
      hash: `0x${Math.random().toString(16).substring(2, 42)}`,
      version: 100000 - i,
      sender: `0x${Math.random().toString(16).substring(2, 42)}`,
      sequence_number: Math.floor(Math.random() * 100),
      timestamp: now - i * 60000, // Each tx is 1 minute apart
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
    };
    transactions.push(tx);
  }
  
  return transactions;
};

// Mock transaction events
const generateMockEvents = (count: number): TransactionEvent[] => {
  const events: TransactionEvent[] = [];
  
  for (let i = 0; i < count; i++) {
    events.push({
      type: `0x1::coin::DepositEvent`,
      data: {
        amount: Math.floor(Math.random() * 1000000),
        timestamp: Date.now()
      }
    });
  }
  
  return events;
};

// Mock state changes
const generateMockStateChanges = (count: number): StateChange[] => {
  const changes: StateChange[] = [];
  
  for (let i = 0; i < count; i++) {
    changes.push({
      type: 'write_resource',
      address: `0x${Math.random().toString(16).substring(2, 42)}`,
      path: '',
      data: {
        balance: Math.floor(Math.random() * 1000000),
        updated_at: Date.now()
      }
    });
  }
  
  return changes;
};

// Mock resource data for accounts
const generateMockResources = () => {
  return [
    {
      type: '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>',
      data: {
        coin: {
          value: `${Math.floor(Math.random() * 100000000000)}`
        },
        deposit_events: {
          counter: Math.floor(Math.random() * 100),
          guid: {
            id: {
              addr: `0x${Math.random().toString(16).substring(2, 42)}`,
              creation_num: Math.floor(Math.random() * 10)
            }
          }
        },
        withdraw_events: {
          counter: Math.floor(Math.random() * 50),
          guid: {
            id: {
              addr: `0x${Math.random().toString(16).substring(2, 42)}`,
              creation_num: Math.floor(Math.random() * 10)
            }
          }
        }
      }
    },
    {
      type: '0x1::account::Account',
      data: {
        sequence_number: Math.floor(Math.random() * 100),
        authentication_key: `0x${Math.random().toString(16).substring(2, 66)}`
      }
    }
  ];
};

// Create a mock LibraClient class
export class MockLibraClient {
  private _transactions: Transaction[];
  private _blockHeight: number;
  private _epoch: number;
  private _chainId: string;
  private _nodeUrl: string;
  private _network: string;
  
  // Match the real SDK's constructor pattern
  constructor(network = 'mainnet', nodeUrl?: string) {
    this._network = network;
    this._nodeUrl = nodeUrl || 'https://rpc.openlibra.space:8080/v1';
    this._transactions = generateMockTransactions(50);
    this._blockHeight = 500000;
    this._epoch = 20;
    this._chainId = network === 'mainnet' ? '1' : 'testnet';
    
    console.log(`Mock client initialized with network: ${network}, endpoint: ${this._nodeUrl}`);
  }
  
  // API methods that mimic the real SDK
  async getLedgerInfo() {
    return {
      chain_id: this._chainId,
      epoch: this._epoch.toString(),
      ledger_version: (this._blockHeight * 2).toString(),
      oldest_ledger_version: "3276409",
      ledger_timestamp: Date.now().toString() + "647",
      node_role: "full_node",
      oldest_block_height: (this._blockHeight - 1000000).toString(),
      block_height: this._blockHeight.toString(),
      git_hash: "416d1ca75fa07ca82e75ffe02ef276e066e3f14a"
    };
  }
  
  async getTransactions({ limit = 10 }) {
    // Return the transactions directly in the format expected by our SDK wrapper
    return this._transactions.slice(0, limit);
  }
  
  async getTransactionByHash(hash: string) {
    const tx = this._transactions.find(t => t.hash === hash);
    
    if (!tx) return null;
    
    // Return a detailed version of the transaction
    return {
      ...tx,
      events: Array.from({ length: Math.floor(Math.random() * 5) + 1 }).map(() => ({
        type: 'mock_event',
        data: { value: Math.floor(Math.random() * 1000) }
      })),
      changes: Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map(() => ({
        type: 'mock_change',
        address: `0x${Math.random().toString(16).substring(2, 42)}`,
        path: 'mock/path',
        data: { value: Math.floor(Math.random() * 1000) }
      })),
      payload: {
        function: '0x1::coin::transfer',
        arguments: [
          `0x${Math.random().toString(16).substring(2, 42)}`,
          Math.floor(Math.random() * 1000000).toString()
        ],
        type_arguments: ['0x1::aptos_coin::AptosCoin']
      }
    };
  }
  
  async getAccount(address: string) {
    // Basic account info
    return {
      sequence_number: Math.floor(Math.random() * 100).toString(),
      authentication_key: address
    };
  }
  
  async getAccountResources(address: string) {
    return generateMockResources();
  }
}

// Factory function to create a mock client
export const createMockLibraClient = () => {
  const NETWORK = 'mainnet';
  const OPENLIBRA_RPC_URL = 'https://rpc.openlibra.space:8080/v1';
  return new MockLibraClient(NETWORK, OPENLIBRA_RPC_URL);
}; 