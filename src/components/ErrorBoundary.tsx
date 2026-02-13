import React, { Component, ErrorInfo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SPACING, FONT_SIZE } from '../constants/spacing';
import { logger } from '../utils/logger';

interface Props {
  children: React.ReactNode;
  screenName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary', `Crash in ${this.props.screenName ?? 'unknown'}`, {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.setState({ errorInfo });
  }

  handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    const text = [
      `Error: ${error?.message}`,
      `Screen: ${this.props.screenName ?? 'unknown'}`,
      `Time: ${new Date().toISOString()}`,
      `Stack: ${error?.stack}`,
      `Component: ${errorInfo?.componentStack}`,
    ].join('\n\n');
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Error details copied to clipboard');
    } catch {
      Alert.alert('Error', 'Could not copy to clipboard');
    }
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.emoji}>💥</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.screen}>
            Screen: {this.props.screenName ?? 'unknown'}
          </Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <Text style={styles.timestamp}>{new Date().toISOString()}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btn} onPress={this.handleRetry}>
              <Text style={styles.btnText}>🔄 Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={this.handleCopyError}>
              <Text style={styles.btnText}>📋 Copy Error</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.stackTitle}>Stack Trace:</Text>
          <Text style={styles.stack}>{this.state.error?.stack}</Text>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF3F3' },
  content: { padding: SPACING.xl, alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: '#D32F2F', marginBottom: SPACING.sm },
  screen: { fontSize: FONT_SIZE.sm, color: '#666', marginBottom: SPACING.xs },
  message: { fontSize: FONT_SIZE.md, color: '#333', textAlign: 'center', marginBottom: SPACING.sm },
  timestamp: { fontSize: FONT_SIZE.xs, color: '#999', marginBottom: SPACING.lg },
  actions: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  btn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  btnText: { fontSize: FONT_SIZE.md, fontWeight: '600' },
  stackTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: '#666', alignSelf: 'flex-start', marginBottom: SPACING.xs },
  stack: { fontSize: FONT_SIZE.xs, color: '#888', fontFamily: 'monospace' },
});
