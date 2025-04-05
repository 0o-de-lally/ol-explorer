import React, { Component, ErrorInfo, ReactNode } from 'react';
import {View, Text, TouchableOpacity} from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    // Reset error state and try again
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Reload the page if in a browser environment
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <View className="flex-1 bg-background justify-center items-center p-5">
          <Text className="text-primary text-2xl font-bold mb-4">Something went wrong</Text>

          {this.state.error && (
            <View className="bg-secondary p-4 rounded-lg w-full max-w-[600px] mb-6">
              <Text className="text-white text-base text-center mb-4">{this.state.error.toString()}</Text>

              {this.state.error.message.includes('Buffer is not defined') && (
                <View className="p-3 bg-background rounded mt-4">
                  <Text className="text-text-muted text-sm leading-5">
                    This error is related to Node.js compatibility in the browser.
                    The application is trying to use the Buffer API which is not available in browsers.
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            className="bg-primary py-3 px-6 rounded"
            onPress={this.handleRetry}
          >
            <Text className="text-white text-base font-bold">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 