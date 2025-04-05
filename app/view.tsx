import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useSdk } from '../src/hooks/useSdk';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Clipboard from '@react-native-clipboard/clipboard';
import appConfig from '../src/config/appConfig';

export default function ViewFunction() {
    const sdk = useSdk();
    const params = useLocalSearchParams();
    const autoExecutedRef = useRef(false);

    // Get initial values from URL params if available
    const initialPath = params?.initialPath as string | undefined;
    const initialArgs = params?.initialArgs as string | undefined;

    const [functionPath, setFunctionPath] = useState<string>(initialPath || `${appConfig.network.OL_FRAMEWORK}::stake::get_current_validators`);
    const [typeArguments, setTypeArguments] = useState<string>('');
    const [arguments_, setArguments] = useState<string>(initialArgs || '');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [sdkReady, setSdkReady] = useState<boolean>(false);

    // Check when SDK is ready
    useEffect(() => {
        if (sdk.isInitialized) {
            console.log('SDK is now initialized and ready for use');
            setSdkReady(true);
        } else {
            console.log('SDK is not yet initialized');
            setSdkReady(false);
        }
    }, [sdk.isInitialized]);

    // Parse the input arguments and type arguments
    const parseArguments = useCallback((input: string): any[] => {
        if (!input.trim()) return [];
        try {
            return JSON.parse(`[${input}]`);
        } catch (e) {
            console.error('Error parsing arguments:', e);
            throw new Error('Invalid arguments format. Please use comma-separated values.');
        }
    }, []);

    const parseTypeArguments = useCallback((input: string): string[] => {
        if (!input.trim()) return [];
        return input.split(',').map(arg => arg.trim());
    }, []);

    // Execute the view function
    const executeViewFunction = useCallback(async () => {
        if (!sdk.isInitialized) {
            setError("SDK is not initialized yet. Please wait or try again.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            // Validate function path
            if (!functionPath.includes('::')) {
                throw new Error('Invalid function path. Format should be "module_address::module_name::function_name"');
            }

            // Parse arguments
            let parsedArgs: any[] = [];
            try {
                parsedArgs = parseArguments(arguments_);
            } catch (e) {
                throw new Error(`Error parsing arguments: ${e instanceof Error ? e.message : String(e)}`);
            }

            // Parse type arguments
            const parsedTypeArgs = parseTypeArguments(typeArguments);

            console.log(`Executing view function with:`, {
                function: functionPath,
                typeArguments: parsedTypeArgs,
                arguments: parsedArgs
            });

            // Call the view function
            const response = await sdk.view({
                function: functionPath,
                typeArguments: parsedTypeArgs,
                arguments: parsedArgs
            });

            console.log('View function response:', response);
            setResult(response);
        } catch (e) {
            console.error('Error executing view function:', e);
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsLoading(false);
        }
    }, [functionPath, typeArguments, arguments_, sdk, parseArguments, parseTypeArguments]);

    // Attempt auto-execution only when SDK is ready and it hasn't been attempted before
    useEffect(() => {
        if (sdkReady && initialPath && initialArgs && !autoExecutedRef.current && !isLoading) {
            console.log('Auto-executing view function with:', {
                initialPath,
                initialArgs,
                sdkReady
            });

            // Mark that we've attempted execution
            autoExecutedRef.current = true;

            // Delay execution slightly to ensure everything is properly set up
            const timer = setTimeout(() => {
                executeViewFunction();
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [initialPath, initialArgs, executeViewFunction, sdkReady, isLoading]);

    const copyToClipboard = () => {
        const resultStr = JSON.stringify(result, null, 2);
        Clipboard.setString(resultStr);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleBackPress = () => {
        router.back();
    };

    // Set page title for web
    useEffect(() => {
        if (Platform.OS === 'web') {
            document.title = 'View Function | Open Libra Explorer';
        }
    }, []);

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{
                title: 'View Function',
                headerTitle: 'View Function'
            }} />

            <ScrollView className="flex-1">
                <View className="mx-auto w-full max-w-screen-lg px-4 py-4">
                    <View className="flex-row items-center mb-5">
                        <Text className="text-white text-2xl font-bold">View Function</Text>
                    </View>

                    {!sdkReady && (
                        <View className="bg-blue-900/30 rounded-lg p-4 mb-4">
                            <Text className="text-blue-300">Initializing SDK, please wait...</Text>
                        </View>
                    )}

                    <View className="bg-secondary rounded-lg p-4 mb-4">
                        <Text className="text-white text-lg font-bold mb-4">Function Parameters</Text>

                        {/* Function Path Input */}
                        <View className="mb-4">
                            <Text className="text-text-light text-base mb-2">Function Path:</Text>
                            <TextInput
                                className="bg-background rounded px-3 py-2 text-white"
                                placeholder={`e.g. ${appConfig.network.OL_FRAMEWORK}::stake::get_current_validators`}
                                placeholderTextColor="#666"
                                value={functionPath}
                                onChangeText={setFunctionPath}
                            />
                        </View>

                        {/* Type Arguments Input */}
                        <View className="mb-4">
                            <Text className="text-text-light text-base mb-2">Type Arguments (comma-separated):</Text>
                            <TextInput
                                className="bg-background rounded px-3 py-2 text-white"
                                placeholder={`e.g. ${appConfig.network.OL_FRAMEWORK}::aptos_coin::AptosCoin`}
                                placeholderTextColor="#666"
                                value={typeArguments}
                                onChangeText={setTypeArguments}
                            />
                        </View>

                        {/* Function Arguments Input */}
                        <View className="mb-4">
                            <Text className="text-text-light text-base mb-2">Arguments (comma-separated JSON):</Text>
                            <TextInput
                                className="bg-background rounded px-3 py-2 text-white"
                                placeholder={`e.g. "${appConfig.network.OL_FRAMEWORK}", 100`}
                                placeholderTextColor="#666"
                                value={arguments_}
                                onChangeText={setArguments}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        {/* Execute Button */}
                        <TouchableOpacity
                            className={`rounded-lg py-3 items-center mb-4 ${sdkReady ? 'bg-primary' : 'bg-gray-600'}`}
                            onPress={executeViewFunction}
                            disabled={isLoading || !sdkReady}
                        >
                            <Text className="text-white font-bold">
                                {isLoading ? 'Executing...' : 'Execute View Function'}
                            </Text>
                        </TouchableOpacity>

                        {/* Error Message */}
                        {error && (
                            <View className="bg-red-900/50 p-3 rounded-lg mb-4">
                                <Text className="text-red-300 font-mono">{error}</Text>
                            </View>
                        )}

                        {/* Loading Indicator */}
                        {isLoading && (
                            <View className="items-center justify-center py-8">
                                <ActivityIndicator size="large" color="#E75A5C" />
                                <Text className="text-white mt-4">Executing view function...</Text>
                            </View>
                        )}

                        {/* Result */}
                        {result !== null && !isLoading && (
                            <View className="bg-background rounded-lg p-3 border border-border">
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-text-light font-bold">Result:</Text>
                                    <TouchableOpacity
                                        onPress={copyToClipboard}
                                        className="p-1.5 bg-primary rounded-md flex items-center justify-center w-8 h-8"
                                    >
                                        <MaterialIcons name="content-copy" size={14} color="white" />
                                    </TouchableOpacity>
                                </View>

                                {copySuccess && (
                                    <View className="absolute right-8 top-2 bg-green-800/80 px-2 py-1 rounded z-10">
                                        <Text className="text-white text-xs">Copied!</Text>
                                    </View>
                                )}

                                <ScrollView className="max-h-96">
                                    <Text className="text-white font-mono text-sm">
                                        {JSON.stringify(result, null, 2)}
                                    </Text>
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* Examples Section */}
                    <View className="bg-secondary rounded-lg p-4 mb-4">
                        <Text className="text-white text-lg font-bold mb-4">Example Functions</Text>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => {
                                setFunctionPath(`${appConfig.network.OL_FRAMEWORK}::stake::get_current_validators`);
                                setTypeArguments('');
                                setArguments('');
                            }}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::stake::get_current_validators`}</Text>
                            <Text className="text-gray-400 text-sm">Get current validators</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => {
                                setFunctionPath(`${appConfig.network.OL_FRAMEWORK}::donor_voice::is_donor_voice`);
                                setTypeArguments('');
                                setArguments('"0x87515d94a244235a1433d7117bc0cb154c613c2f4b1e67ca8d98a542ee3f59f5"');
                            }}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::donor_voice::is_donor_voice`}</Text>
                            <Text className="text-gray-400 text-sm">Check if account is a community wallet</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => {
                                setFunctionPath(`${appConfig.network.OL_FRAMEWORK}::founder::is_founder`);
                                setTypeArguments('');
                                setArguments('"0x87515d94a244235a1433d7117bc0cb154c613c2f4b1e67ca8d98a542ee3f59f5"');
                            }}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::founder::is_founder`}</Text>
                            <Text className="text-gray-400 text-sm">Check if account is a founder</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3"
                            onPress={() => {
                                setFunctionPath(`${appConfig.network.OL_FRAMEWORK}::vouch_score::evaluate_users_vouchers`);
                                setTypeArguments('');
                                setArguments(`["${appConfig.network.OL_FRAMEWORK}"], "0x87515d94a244235a1433d7117bc0cb154c613c2f4b1e67ca8d98a542ee3f59f5"`);
                            }}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::vouch_score::evaluate_users_vouchers`}</Text>
                            <Text className="text-gray-400 text-sm">Get vouch score for an account</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
} 