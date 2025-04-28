// Import the Buffer class directly
import {Buffer} from 'buffer';

// Make Buffer available globally
if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
    console.log('Added Buffer polyfill to window');
}

// Also make it available in global scope for Node.js if needed
if (typeof global !== 'undefined' && typeof (global as any).Buffer === 'undefined') {
    (global as any).Buffer = Buffer;
    console.log('Added Buffer polyfill to global scope');
}

export default Buffer;
