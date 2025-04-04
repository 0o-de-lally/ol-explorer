/**
 * Utility functions for transactions
 */

/**
 * Determine the status of a transaction from either status string or success boolean
 * @param transaction The transaction object
 * @returns 'success', 'failure', or 'unknown'
 */
export const getTransactionStatus = (transaction: any): string => {
    // Check for direct status field first
    if (transaction.status) return transaction.status;

    // Check for success boolean field (common in account transactions)
    if (transaction.success !== undefined) {
        return transaction.success ? 'success' : 'failure';
    }

    // Check for nested transaction status
    if (transaction.transaction?.status) return transaction.transaction.status;

    // Check for nested transaction success boolean
    if (transaction.transaction?.success !== undefined) {
        return transaction.transaction.success ? 'success' : 'failure';
    }

    // Default fallback
    return 'unknown';
};

/**
 * Determines CSS classes for status pill based on transaction status
 * @param status The transaction status string
 * @returns CSS class names for the status pill
 */
export const getStatusPillStyle = (status: string): string => {
    switch (status.toLowerCase()) {
        case 'success':
            return 'bg-green-900';
        case 'failure':
            return 'bg-red-900';
        default:
            return 'bg-gray-700';
    }
}; 