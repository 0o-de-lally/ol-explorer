import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

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
        <View style={styles.container}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          
          {this.state.error && (
            <View style={styles.errorDetailsContainer}>
              <Text style={styles.errorMessage}>{this.state.error.toString()}</Text>
              
              {this.state.error.message.includes('Buffer is not defined') && (
                <View style={styles.additionalInfoContainer}>
                  <Text style={styles.additionalInfoText}>
                    This error is related to Node.js compatibility in the browser.
                    The application is trying to use the Buffer API which is not available in browsers.
                  </Text>
                </View>
              )}
            </View>
          )}
          
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1221',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: '#E75A5C',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorDetailsContainer: {
    backgroundColor: '#172234',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 600,
    marginBottom: 24,
  },
  errorMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  additionalInfoContainer: {
    padding: 12,
    backgroundColor: '#0D1626',
    borderRadius: 4,
    marginTop: 16,
  },
  additionalInfoText: {
    color: '#ADBAC7',
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#E75A5C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary; 