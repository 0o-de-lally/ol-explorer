/**
 * PWA utility functions
 */

/**
 * Check if the app is running in standalone mode (PWA installed)
 */
export const isPwaMode = (): boolean => {
    if (typeof window !== 'undefined') {
        return window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
    }
    return false;
};

/**
 * Get the current display mode (browser, standalone, minimal-ui, etc.)
 */
export const getDisplayMode = (): string => {
    if (typeof window === 'undefined') return 'browser';

    const modes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];

    for (const mode of modes) {
        if (window.matchMedia(`(display-mode: ${mode})`).matches) {
            return mode;
        }
    }

    if ((window.navigator as any).standalone === true) {
        return 'standalone'; // iOS standalone mode
    }

    return 'browser';
};

/**
 * Check if the app can be installed
 * Note: This is a basic check, for accurate detection you need to
 * implement the beforeinstallprompt event handling in your app
 */
export const canInstallPwa = (): boolean => {
    if (typeof window === 'undefined') return false;

    // If already in standalone mode, can't install
    if (isPwaMode()) return false;

    // Basic check for PWA installability - not comprehensive
    // For actual implementation, you need to handle the beforeinstallprompt event
    const isHttps = window.location.protocol === 'https:';
    const hasManifest = !!document.querySelector('link[rel="manifest"]');

    return isHttps && hasManifest;
};

/**
 * Listen for display mode changes
 */
export const onDisplayModeChange = (callback: (mode: string) => void): (() => void) => {
    if (typeof window === 'undefined') return () => { };

    const modes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
    const mediaQueryLists: MediaQueryList[] = [];
    const listeners: ((event: MediaQueryListEvent) => void)[] = [];

    // Set up listeners for each mode
    modes.forEach(mode => {
        const mql = window.matchMedia(`(display-mode: ${mode})`);
        const listener = (event: MediaQueryListEvent) => {
            if (event.matches) {
                callback(mode);
            }
        };

        mql.addEventListener('change', listener);
        mediaQueryLists.push(mql);
        listeners.push(listener);
    });

    // Return cleanup function
    return () => {
        mediaQueryLists.forEach((mql, i) => {
            mql.removeEventListener('change', listeners[i]);
        });
    };
}; 