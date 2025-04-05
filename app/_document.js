import {Head} from 'expo-router';
import React from 'react';

// Set base URL for assets
const BASE_URL = 'https://explorer.openlibra.space';

export default function CustomDocument() {
    return (
        <Head>
            {/* Standard favicon */}
            <link rel="icon" href={`${BASE_URL}/favicon.svg`} type="image/svg+xml" />
            <link rel="icon" href={`${BASE_URL}/favicon.ico`} sizes="any" />

            {/* iOS icons */}
            <link rel="apple-touch-icon" href={`${BASE_URL}/logo192.png`} />

            {/* PWA manifest and metadata */}
            <link rel="manifest" href={`${BASE_URL}/manifest.json`} />
            <meta name="theme-color" content="#0B1221" />

            {/* Mobile app meta tags */}
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <meta name="apple-mobile-web-app-title" content="OL Explorer" />

            {/* Windows meta tags */}
            <meta name="msapplication-TileImage" content={`${BASE_URL}/logo192.png`} />
            <meta name="msapplication-TileColor" content="#0B1221" />

            {/* Open Graph meta tags for better sharing */}
            <meta property="og:title" content="Open Libra Explorer" />
            <meta property="og:description" content="Explore the Open Libra blockchain" />
            <meta property="og:image" content={`${BASE_URL}/logo192.png`} />
            <meta property="og:url" content={BASE_URL} />

            {/* Force favicon reload for direct URLs */}
            <meta http-equiv="pragma" content="no-cache" />
        </Head>
    );
} 