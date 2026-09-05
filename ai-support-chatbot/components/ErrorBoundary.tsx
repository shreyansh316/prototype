import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../constants/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('Uncaught Native/React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong.</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.errorText}>
              {this.state.error && this.state.error.toString()}
            </Text>
            <Text style={styles.errorTrace}>
              {this.state.errorInfo?.componentStack}
            </Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
    justifyContent: 'center',
    paddingTop: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 16,
  },
  scroll: {
    flex: 1,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  errorTrace: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
