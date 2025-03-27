// formatters.ts - Utility functions for formatting data consistently

/**
 * Format a timestamp (string or number) into a human-readable date/time
 * 
 * @param timestamp Timestamp in string or number format
 * @returns Formatted date time string
 */
export const formatTimestamp = (timestamp: string | number): string => {
    if (timestamp === undefined || timestamp === null) {
        console.warn('Timestamp is undefined or null');
        return 'Invalid date';
    }

    try {
        // Convert string timestamps to numbers if needed
        let numericTimestamp: number;

        if (typeof timestamp === 'string') {
            numericTimestamp = parseInt(timestamp, 10);
            if (isNaN(numericTimestamp)) {
                console.warn(`Invalid timestamp string: ${timestamp}`);
                return 'Invalid date';
            }
        } else {
            numericTimestamp = timestamp;
        }

        // Handle microsecond timestamps (convert to milliseconds)
        if (numericTimestamp > 1000000000000) {
            numericTimestamp = Math.floor(numericTimestamp / 1000);
        }

        // Format the date
        const date = new Date(numericTimestamp);

        // Check if the date is valid
        if (isNaN(date.getTime())) {
            console.warn(`Invalid date from timestamp: ${timestamp} -> ${numericTimestamp}`);
            return 'Invalid date';
        }

        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return 'Invalid date';
    }
}; 