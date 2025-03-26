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
  function?: string;
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

export interface BlockchainSDK {
  getLatestBlockHeight: () => Promise<number>;
  getLatestEpoch: () => Promise<number>;
  getChainId: () => Promise<string>;
  getTransactions: (limit: number) => Promise<Transaction[]>;
  getTransactionByHash: (hash: string) => Promise<TransactionDetail | null>;
  getAccount: (address: string) => Promise<Account | null>;
  isInitialized: boolean;
  error: Error | null;
} 