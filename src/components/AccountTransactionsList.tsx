import React, { useEffect, useRef } from 'react';
import { observer } from '@legendapp/state/react';
import { observable } from '@legendapp/state';
import { useSdk } from '../hooks/useSdk';
import { useSdkContext } from '../context/SdkContext';
import { TransactionsList } from './TransactionsList';

// Local observable state for this component
const accountTransactionsStore = observable({
  transactions: [] as any[],
  isLoading: false,
  error: null as string | null,
  currentLimit: 25,
  lastUpdated: Date.now()
});

type AccountTransactionsListProps = {
  accountAddress: string;
  initialLimit?: number;
  testID?: string;
  onRefresh?: () => void;
  onLimitChange?: (newLimit: number) => void;
  isVisible?: boolean; // Add prop to indicate if component is visible
};

// Use the observer pattern to automatically react to changes in the observable state
export const AccountTransactionsList = observer(({
  accountAddress,
  initialLimit = 25,
  testID = 'account-transactions-list',
  onRefresh,
  onLimitChange,
  isVisible = true
}: AccountTransactionsListProps) => {
  // Get SDK instance
  const sdk = useSdk();
  const { isInitialized } = useSdkContext();

  // References for component state
  const isMounted = useRef(true);

  // Effect to set up and clean up
  useEffect(() => {
    isMounted.current = true;
    console.log(`AccountTransactionsList mounted for address: ${accountAddress}`);

    // Initialize with the provided limit
    if (initialLimit !== accountTransactionsStore.currentLimit.get()) {
      accountTransactionsStore.currentLimit.set(initialLimit);
    }

    // Initial fetch when component mounts
    if (isInitialized && accountAddress) {
      fetchTransactions(false, false, true);
    }

    return () => {
      console.log(`AccountTransactionsList unmounting for address: ${accountAddress}`);
      isMounted.current = false;
    };
  }, [accountAddress, isInitialized]);

  // Fetch transactions
  const fetchTransactions = async (isLoadMore = false, isAutoRefresh = false, isInitialFetch = false, overrideLimit?: number) => {
    // Only proceed if we have an account address and SDK is initialized
    if (!accountAddress || !isInitialized) {
      console.error('Cannot fetch transactions: Missing account address or SDK not initialized');
      if (!isInitialized) {
        accountTransactionsStore.error.set('SDK not initialized');
      } else {
        accountTransactionsStore.error.set('Invalid account address');
      }
      return;
    }

    // Set loading state
    if (isInitialFetch) {
      accountTransactionsStore.isLoading.set(true);
    }

    try {
      // Determine the limit to use
      const limitToUse = overrideLimit || accountTransactionsStore.currentLimit.get();
      console.log(`Fetching up to ${limitToUse} transactions for account: ${accountAddress}`);

      // Call the SDK to get account transactions
      const accountTransactions = await sdk.ext_getAccountTransactions(accountAddress, limitToUse);
      const count = accountTransactions?.length || 0;
      console.log(`Fetched ${count} transactions for account: ${accountAddress}`);

      // Only update the store if the component is still mounted
      if (isMounted.current) {
        // Store the raw transactions without any transformation to preserve all fields
        accountTransactionsStore.transactions.set(accountTransactions || []);
        accountTransactionsStore.error.set(null);
        accountTransactionsStore.lastUpdated.set(Date.now());

        // If this was a load more operation, update the limit
        if (isLoadMore && overrideLimit) {
          accountTransactionsStore.currentLimit.set(overrideLimit);
        }
      }
    } catch (error) {
      console.error(`Error fetching account transactions for ${accountAddress}:`, error);
      if (isMounted.current) {
        accountTransactionsStore.error.set(error instanceof Error ? error.message : String(error));
      }
    } finally {
      // Reset loading states
      if (isMounted.current && isInitialFetch) {
        accountTransactionsStore.isLoading.set(false);
      }
    }
  };

  // Trigger fetch transactions and optionally notify parent
  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh();
    }
    await fetchTransactions();
  };

  // Get state from the store
  const transactions = accountTransactionsStore.transactions.get();
  const isLoading = accountTransactionsStore.isLoading.get();
  const error = accountTransactionsStore.error.get();

  // Render the reusable TransactionsList component with account transactions
  return (
    <TransactionsList
      testID={testID}
      onRefresh={handleRefresh}
      initialLimit={initialLimit}
      onLimitChange={(newLimit) => {
        // Update local store
        accountTransactionsStore.currentLimit.set(newLimit);

        // Notify parent if needed
        if (onLimitChange) {
          onLimitChange(newLimit);
        }

        // Fetch with new limit
        fetchTransactions(true, false, false, newLimit);
      }}
      isVisible={isVisible}
      externalTransactions={transactions}
      fetchExternalTransactions={handleRefresh}
      title="Account Transactions"
    />
  );
}); 