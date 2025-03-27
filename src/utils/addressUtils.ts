/**
 * Normalizes an account address to the standard format
 * - Removes 0x prefix if present
 * - Pads to 64 characters with leading zeros
 * - Adds 0x prefix back
 * 
 * @param address The account address to normalize
 * @returns Normalized address with 0x prefix and 64 character length (without prefix)
 */
export function normalizeAddress(address: string): string {
    // Remove 0x prefix if present
    const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;

    // Pad address to 64 characters with leading zeros
    const paddedAddress = cleanAddress.padStart(64, '0');

    // Return with 0x prefix
    return '0x' + paddedAddress;
}

/**
 * Validates if a string looks like an address
 * 
 * @param value String to validate
 * @returns boolean True if the value looks like an address
 */
export function isValidAddressFormat(value: string): boolean {
    // Check if it's a hex string with or without 0x prefix
    return /^(0x)?[a-fA-F0-9]{10,128}$/.test(value);
}

/**
 * Formats an address for display with truncation in the middle
 * 
 * @param address The full address
 * @param startChars Number of characters to show at the beginning
 * @param endChars Number of characters to show at the end
 * @returns Truncated address string
 */
export function formatAddressForDisplay(address: string, startChars = 6, endChars = 4): string {
    if (!address) return '';

    // Keep 0x prefix if present plus the specified start and end characters
    const prefix = address.startsWith('0x') ? '0x' : '';
    const start = address.startsWith('0x') ?
        address.slice(2, 2 + startChars) :
        address.slice(0, startChars);

    const end = address.startsWith('0x') ?
        address.slice(address.length - endChars) :
        address.slice(address.length - endChars);

    return `${prefix}${start}...${end}`;
}

/**
 * Normalizes a transaction hash for consistency
 * - Validates that it's a non-empty string
 * - Adds 0x prefix if missing
 * - Doesn't pad transaction hashes (unlike account addresses)
 * 
 * @param hash The transaction hash to normalize
 * @returns Normalized hash with 0x prefix or null if invalid
 */
export function normalizeTransactionHash(hash: string | undefined | null): string | null {
    // Handle null/undefined cases
    if (!hash) {
        console.error('Null or undefined hash provided to normalizeTransactionHash');
        return null;
    }

    // Handle empty strings
    if (hash.trim() === '' || hash === 'undefined') {
        console.error('Empty or "undefined" string provided to normalizeTransactionHash');
        return null;
    }

    // Remove 0x prefix if present, then add it back
    const cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash;

    // Validate it's a hex string
    if (!/^[a-fA-F0-9]+$/.test(cleanHash)) {
        console.error('Invalid hash format (non-hex characters):', hash);
        return null;
    }

    // Return with 0x prefix
    return '0x' + cleanHash;
} 