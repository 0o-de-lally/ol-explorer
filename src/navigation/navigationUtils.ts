import {Platform} from 'react-native';
import {router} from 'expo-router';
import {RootStackParamList} from './types';
import {stripLeadingZeros} from '../utils/addressUtils';

/**
 * Navigate to a screen in the app using Expo Router
 * 
 * @param routeName The name of the route to navigate to
 * @param params The parameters to pass to the route
 */
export function navigate<RouteName extends keyof RootStackParamList>(
    routeName: RouteName,
    params?: RootStackParamList[RouteName]
) {
    // Construct the URL based on the route and params
    let path = '';

    switch (routeName) {
        case 'Home':
            path = '/';
            break;
        case 'TransactionDetails':
            if (params && 'hash' in params) {
                path = `/tx/${params.hash}`;
            }
            break;
        case 'AccountDetails':
            if (params && 'address' in params) {
                // Strip leading zeros from the address for cleaner URLs
                const cleanAddress = stripLeadingZeros(params.address);
                path = `/account/${cleanAddress}`;
            }
            break;
        default:
            path = `/${routeName}`;
    }

    console.log(`Navigating to path: ${path}`);
    router.push(path);
}

// Default export for the navigation utilities
export default { navigate }; 