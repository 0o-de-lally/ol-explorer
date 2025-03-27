/**
 * Polyfills for browser compatibility
 */

// Import Buffer polyfill to ensure it's available
import './bufferPolyfill';

/**
 * Type definition for crypto
 */
declare global {
    interface Window {
        crypto: Crypto;
    }
}

/**
 * Generate a random UUID
 * This is a fallback for browsers that don't support crypto.randomUUID
 */
export function generateUUID(): string {
    // Use crypto.randomUUID if available
    if (typeof window !== 'undefined' && window.crypto &&
        typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }

    // Fallback implementation
    const getCryptoValue = () => {
        if (typeof window !== 'undefined' && window.crypto &&
            typeof window.crypto.getRandomValues === 'function') {
            const buffer = new Uint8Array(16);
            window.crypto.getRandomValues(buffer);
            return buffer;
        }

        // Pure JS fallback if crypto API is not available
        const buffer = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            buffer[i] = Math.floor(Math.random() * 256);
        }
        return buffer;
    };

    const buffer = getCryptoValue();

    // Set version (4) and variant (RFC4122)
    buffer[6] = (buffer[6] & 0x0f) | 0x40;
    buffer[8] = (buffer[8] & 0x3f) | 0x80;

    // Convert to hex and format as UUID
    const hexDigits = [];
    for (let i = 0; i < buffer.length; i++) {
        hexDigits.push(buffer[i].toString(16).padStart(2, '0'));
    }

    // Format as standard UUID
    return `${hexDigits.slice(0, 4).join('')}-${hexDigits.slice(4, 6).join('')}-${hexDigits.slice(6, 8).join('')}-${hexDigits.slice(8, 10).join('')}-${hexDigits.slice(10).join('')}`;
}

/**
 * Set up necessary polyfills
 */
export function setupPolyfills(): void {
    // Buffer polyfill is imported at the top of the file

    // Set up crypto polyfills
    setupCryptoPolyfill();
}

/**
 * Set up crypto polyfills
 */
function setupCryptoPolyfill(): void {
    if (typeof window !== 'undefined' && (window as any).crypto) {
        try {
            const originalGetRandomValues = (window as any).crypto.getRandomValues;

            // Add a getRandomValues fallback if needed
            if (!originalGetRandomValues) {
                console.log('Adding fallback for crypto.getRandomValues');
                (window as any).crypto.getRandomValues = function (buffer: Uint8Array) {
                    for (let i = 0; i < buffer.length; i++) {
                        buffer[i] = Math.floor(Math.random() * 256);
                    }
                    return buffer;
                };
            }
        } catch (error) {
            console.warn('Failed to patch crypto methods:', error);
        }
    }
}

// Other polyfills can be added here

// Set up Buffer polyfill if needed
export function setupBufferPolyfill(): void {
    if (typeof window !== 'undefined' && !(window as any).Buffer) {
        try {
            (window as any).Buffer = require('buffer/').Buffer;
            console.log('Added Buffer polyfill');
        } catch (error) {
            console.warn('Failed to polyfill Buffer:', error);
        }
    }
} 