export interface Transaction {
  hash: string;
  version: number;
  sender: string;
  sequence_number: number;
  timestamp: string | number;
  type: string;
  status: 'success' | 'failure' | 'pending';
  gas_used?: number;
  gas_unit_price?: number;
  vm_status?: string;
  block_height?: number;
  function?: string | null;
  epoch?: string;
  round?: string;
  state_change_hash?: string;
  event_root_hash?: string;
  accumulator_root_hash?: string;
}

export interface Account {
  address: string;
  balance: number;
  sequence_number: number;
  resources: AccountResource[];
}

export interface AccountResource {
  type: string;
  data: Record<string, any>;
}

export interface TransactionDetail extends Transaction {
  events?: TransactionEvent[];
  changes?: StateChange[];
  payload?: any;
  epoch?: string;
  round?: string;
  state_change_hash?: string;
  event_root_hash?: string;
  accumulator_root_hash?: string;
}

export interface TransactionEvent {
  type: string;
  data: Record<string, any>;
}

export interface StateChange {
  type: string;
  address: string;
  path: string;
  data: Record<string, any>;
}

export interface LedgerInfo {
  chain_id: string;
  epoch: string;
  ledger_version: string;
  oldest_ledger_version: string;
  ledger_timestamp: string;
  node_role: string;
  oldest_block_height: string;
  block_height: string;
  git_hash?: string;
}

export type NetworkType = 'mainnet' | 'testnet' | 'devnet';

export interface BlockchainSDK {
  getLatestBlockHeight: (forceFresh?: boolean) => Promise<number>;
  getLatestEpoch: (forceFresh?: boolean) => Promise<number>;
  getChainId: (forceFresh?: boolean) => Promise<string>;
  getTransactions: (limit: number, forceFresh?: boolean) => Promise<Transaction[]>;
  getTransactionByHash: (hash: string, forceFresh?: boolean) => Promise<TransactionDetail | null>;
  getAccount: (address: string, forceFresh?: boolean) => Promise<Account | null>;
  getLedgerInfo: (forceFresh?: boolean) => Promise<LedgerInfo>;
  isInitialized: boolean;
  error: Error | null;
  isUsingMockData?: boolean;
} 