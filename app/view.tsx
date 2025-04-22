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
    const manualExecutionRef = useRef(false);

    // Get initial values from URL params if available
    const initialPath = params?.initialPath as string | undefined;
    const initialArgs = params?.initialArgs as string | undefined;
    const initialTypeArgs = params?.initialTypeArgs as string | undefined;
    const source = params?.source as string | undefined;

    const [functionPath, setFunctionPath] = useState<string>(initialPath || `${appConfig.network.OL_FRAMEWORK}::stake::get_current_validators`);
    const [typeArguments, setTypeArguments] = useState<string>(initialTypeArgs || '');
    const [arguments_, setArguments] = useState<string>(initialArgs || '');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [shareSuccess, setShareSuccess] = useState<boolean>(false);
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

            // Only update URL if this was a manual execution (button click)
            if (manualExecutionRef.current) {
                // Update URL without causing a navigation, but don't add source parameter
                router.replace({
                    pathname: '/view',
                    params: {
                        initialPath: functionPath,
                        initialTypeArgs: typeArguments,
                        initialArgs: arguments_
                    }
                });
                manualExecutionRef.current = false;
            }
        } catch (e) {
            console.error('Error executing view function:', e);
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsLoading(false);
        }
    }, [functionPath, typeArguments, arguments_, sdk, parseArguments, parseTypeArguments]);

    // Handle button click - modify the TouchableOpacity in the render section
    const handleExecuteButtonClick = useCallback(() => {
        // Always reset autoExecutedRef when manually clicking to ensure
        // manual execution always works regardless of previous auto-execution
        autoExecutedRef.current = false;
        manualExecutionRef.current = true;
        executeViewFunction();
    }, [executeViewFunction]);

    // Add a new effect to handle direct page visits with no URL parameters
    useEffect(() => {
        // If SDK is ready and there are no URL params, but we haven't executed yet
        if (sdkReady && !initialPath && !initialArgs && !autoExecutedRef.current && !isLoading) {
            console.log('Direct page visit detected with no URL parameters, executing default function');

            // Mark that we've attempted execution to prevent multiple runs
            autoExecutedRef.current = true;

            // Small delay to ensure everything is ready
            const timer = setTimeout(() => {
                executeViewFunction();
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [sdkReady, initialPath, initialArgs, isLoading, executeViewFunction]);

    // Function to update state and URL without refreshing
    const updateExampleSelection = useCallback((newPath: string, newTypeArgs: string, newArgs: string) => {
        // Update state
        setFunctionPath(newPath);
        setTypeArguments(newTypeArgs);
        setArguments(newArgs);

        // Update URL without causing a navigation, without source parameter
        router.replace({
            pathname: '/view',
            params: {
                initialPath: newPath,
                initialTypeArgs: newTypeArgs,
                initialArgs: newArgs
            }
        });
    }, []);

    // Existing auto-execution effect for when URL parameters are present
    useEffect(() => {
        if (sdkReady && initialPath && !autoExecutedRef.current && !isLoading) {
            // Remove the check for source !== 'manual'
            console.log('Auto-executing view function with:', {
                initialPath,
                initialArgs,
                initialTypeArgs,
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
    }, [initialPath, initialArgs, initialTypeArgs, executeViewFunction, sdkReady, isLoading]);

    const copyToClipboard = () => {
        const resultStr = JSON.stringify(result, null, 2);
        Clipboard.setString(resultStr);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const shareUrl = () => {
        // Get the current URL from the window object (works on web)
        const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
        Clipboard.setString(currentUrl);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
    };

    const handleBackPress = () => {
        router.back();
    };

    // Set page title for web
    useEffect(() => {
        if (Platform.OS === 'web') {
            document.title = 'View Function | Twin Open Libra Explorer';
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
                            onPress={handleExecuteButtonClick}
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

                                {/* Add Share Button at the bottom right of results */}
                                <View className="flex-row justify-end mt-3">
                                    <TouchableOpacity
                                        onPress={shareUrl}
                                        className="p-2 bg-primary rounded-md flex items-center justify-center"
                                    >
                                        <View className="flex-row items-center">
                                            <MaterialIcons name="share" size={14} color="white" />
                                            <Text className="text-white ml-1 text-sm font-medium">Share URL</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {shareSuccess && (
                                        <View className="absolute right-0 bottom-10 bg-green-800/80 px-2 py-1 rounded z-10">
                                            <Text className="text-white text-xs">URL copied!</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Examples Section */}
                    <View className="bg-secondary rounded-lg p-4 mb-4">
                        <Text className="text-white text-lg font-bold mb-4">Example Functions</Text>

                        {/* General/Network Examples */}
                        <Text className="text-white text-base font-semibold mb-2">Network Information</Text>
                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::supply::get_stats`,
                                '',
                                ''
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::supply::get_stats`}</Text>
                            <Text className="text-gray-400 text-sm">Get supply statistics</Text>
                        </TouchableOpacity>

                        {/* New example for slow wallet supply */}
                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-4"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::slow_wallet::get_slow_supply`,
                                '',
                                ''
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::slow_wallet::get_slow_supply`}</Text>
                            <Text className="text-gray-400 text-sm">Get slow wallet total supply</Text>
                        </TouchableOpacity>

                        {/* Proof of Fee Examples */}
                        <Text className="text-white text-base font-semibold mb-2">Proof of Fee</Text>
                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::stake::get_current_validators`,
                                '',
                                ''
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::stake::get_current_validators`}</Text>
                            <Text className="text-gray-400 text-sm">Get current validators</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::proof_of_fee::get_bidders_and_bids`,
                                '',
                                'true'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::proof_of_fee::get_bidders_and_bids`}</Text>
                            <Text className="text-gray-400 text-sm">Get qualified bidders and their bids</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::proof_of_fee::get_bidders_and_bids`,
                                '',
                                'false'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::proof_of_fee::get_bidders_and_bids`}</Text>
                            <Text className="text-gray-400 text-sm">Get all bidders and their bids (including unqualified)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-4"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::epoch_boundary::get_max_seats_offered`,
                                '',
                                ''
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::epoch_boundary::get_max_seats_offered`}</Text>
                            <Text className="text-gray-400 text-sm">Get maximum validator seats available</Text>
                        </TouchableOpacity>

                        {/* Account Information Examples */}
                        <Text className="text-white text-base font-semibold mb-2">Account Information</Text>
                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::ol_account::balance`,
                                '',
                                '"0x9A990A584D7BAD8C6155FA62E3B87D3AD9BE782CF4D4EC96BB690ECE78116027"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::ol_account::balance`}</Text>
                            <Text className="text-gray-400 text-sm">Get account balance</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::reauthorization::is_v8_authorized`,
                                '',
                                '"0x9A990A584D7BAD8C6155FA62E3B87D3AD9BE782CF4D4EC96BB690ECE78116027"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::reauthorization::is_v8_authorized`}</Text>
                            <Text className="text-gray-400 text-sm">Check if account is V8 authorized</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-4"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::activity::has_ever_been_touched`,
                                '',
                                '"0x9A990A584D7BAD8C6155FA62E3B87D3AD9BE782CF4D4EC96BB690ECE78116027"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::activity::has_ever_been_touched`}</Text>
                            <Text className="text-gray-400 text-sm">Check if account has been touched</Text>
                        </TouchableOpacity>

                        {/* Slow Wallet Examples */}
                        <Text className="text-white text-base font-semibold mb-2">Slow Wallet</Text>
                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::slow_wallet::is_slow`,
                                '',
                                '"0xD3F6B48DE139E02DF101658D5FCF5EFBA5DC4C47ADC7CED6748D97B42FAF5F41"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::slow_wallet::is_slow`}</Text>
                            <Text className="text-gray-400 text-sm">Check if account is a slow wallet</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::slow_wallet::unlocked_amount`,
                                '',
                                '"0xD3F6B48DE139E02DF101658D5FCF5EFBA5DC4C47ADC7CED6748D97B42FAF5F41"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::slow_wallet::unlocked_amount`}</Text>
                            <Text className="text-gray-400 text-sm">Get slow wallet unlocked amount</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-4"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::slow_wallet::transferred_amount`,
                                '',
                                '"0xd67f3ff22bd719eb5be2df6577c9b42d"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::slow_wallet::transferred_amount`}</Text>
                            <Text className="text-gray-400 text-sm">Get slow wallet transferred amount</Text>
                        </TouchableOpacity>

                        {/* Validator Examples */}
                        <Text className="text-white text-base font-semibold mb-2">Validator</Text>
                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::validator_universe::is_in_universe`,
                                '',
                                '"0x9A710919B1A1E67EDA335269C0085C91"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::validator_universe::is_in_universe`}</Text>
                            <Text className="text-gray-400 text-sm">Check if account is in validator universe</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::proof_of_fee::current_bid`,
                                '',
                                '"0x9A710919B1A1E67EDA335269C0085C91"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::proof_of_fee::current_bid`}</Text>
                            <Text className="text-gray-400 text-sm">Get validator's current bid</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::jail::is_jailed`,
                                '',
                                '"0x9A710919B1A1E67EDA335269C0085C91"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::jail::is_jailed`}</Text>
                            <Text className="text-gray-400 text-sm">Check if validator is jailed</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-4"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::grade::get_validator_grade`,
                                '',
                                '"0x9A710919B1A1E67EDA335269C0085C91"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::grade::get_validator_grade`}</Text>
                            <Text className="text-gray-400 text-sm">Get validator grade</Text>
                        </TouchableOpacity>

                        {/* Community Wallet Examples */}
                        <Text className="text-white text-base font-semibold mb-2">Community Wallet</Text>
                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::donor_voice::is_donor_voice`,
                                '',
                                '"0xC906F67F626683B77145D1F20C1A753B"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::donor_voice::is_donor_voice`}</Text>
                            <Text className="text-gray-400 text-sm">Check if account is a community wallet</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::donor_voice_reauth::is_authorized`,
                                '',
                                '"0xC906F67F626683B77145D1F20C1A753B"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::donor_voice_reauth::is_authorized`}</Text>
                            <Text className="text-gray-400 text-sm">Check if community wallet is authorized</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::donor_voice_governance::get_veto_tally`,
                                '',
                                '"0xC906F67F626683B77145D1F20C1A753B"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::donor_voice_governance::get_veto_tally`}</Text>
                            <Text className="text-gray-400 text-sm">Get veto tally for community wallet</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-4"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::donor_voice_governance::is_reauth_proposed`,
                                '',
                                '"0xC906F67F626683B77145D1F20C1A753B"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::donor_voice_governance::is_reauth_proposed`}</Text>
                            <Text className="text-gray-400 text-sm">Check if reauth is proposed</Text>
                        </TouchableOpacity>

                        {/* Vouching Examples */}
                        <Text className="text-white text-base font-semibold mb-2">Vouching</Text>
                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::vouch::get_given_vouches`,
                                '',
                                '"0xD3F6B48DE139E02DF101658D5FCF5EFBA5DC4C47ADC7CED6748D97B42FAF5F41"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::vouch::get_given_vouches`}</Text>
                            <Text className="text-gray-400 text-sm">Get outbound vouches for an account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::vouch::get_received_vouches`,
                                '',
                                '"0xD3F6B48DE139E02DF101658D5FCF5EFBA5DC4C47ADC7CED6748D97B42FAF5F41"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::vouch::get_received_vouches`}</Text>
                            <Text className="text-gray-400 text-sm">Get inbound vouches for an account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3 mb-2"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::page_rank_lazy::get_cached_score`,
                                '',
                                '"0xD3F6B48DE139E02DF101658D5FCF5EFBA5DC4C47ADC7CED6748D97B42FAF5F41"'
                            )}
                        >
                            <Text className="text-primary font-medium">{`${appConfig.network.OL_FRAMEWORK}::page_rank_lazy::get_cached_score`}</Text>
                            <Text className="text-gray-400 text-sm">Get page rank score</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-background rounded-lg p-3"
                            onPress={() => updateExampleSelection(
                                `${appConfig.network.OL_FRAMEWORK}::vouch_score::evaluate_users_vouchers`,
                                '',
                                `["${appConfig.network.OL_FRAMEWORK}"], "0xD3F6B48DE139E02DF101658D5FCF5EFBA5DC4C47ADC7CED6748D97B42FAF5F41"`
                            )}
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