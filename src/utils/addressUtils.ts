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
 * Strips 32 leading zeros from an address while preserving the 0x prefix
 * This is useful for display and URL purposes where we don't want padded zeros
 * 
 * @param address The address to strip leading zeros from
 * @returns Address with 0x prefix but without 32 leading zeros if present
 */
export function stripLeadingZeros(address: string): string {
    // If address is empty or null, return as is
    if (!address) return address;

    // Check if address has 0x prefix
    const hasPrefix = address.startsWith('0x');

    // Remove prefix temporarily
    const withoutPrefix = hasPrefix ? address.slice(2) : address;

    // Check if there are exactly 32 leading zeros
    const hasThirtyTwoLeadingZeros = /^0{32}[^0]/.test(withoutPrefix);

    // Only strip zeros if there are exactly 32 of them
    const stripped = hasThirtyTwoLeadingZeros
        ? withoutPrefix.substring(32)
        : withoutPrefix;

    // Always add 0x prefix back, regardless of whether it was there originally
    return '0x' + stripped;
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

    // First, strip leading zeros but keep the 0x prefix
    const strippedAddress = stripLeadingZeros(address);

    // Keep 0x prefix if present plus the specified start and end characters
    const prefix = strippedAddress.startsWith('0x') ? '0x' : '';
    const start = strippedAddress.startsWith('0x') ?
        strippedAddress.slice(2, 2 + startChars) :
        strippedAddress.slice(0, startChars);

    const end = strippedAddress.startsWith('0x') ?
        strippedAddress.slice(strippedAddress.length - endChars) :
        strippedAddress.slice(strippedAddress.length - endChars);

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