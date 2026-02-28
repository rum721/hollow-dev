import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { HollowText } from './HollowText';
import { colors, spacing } from '../../theme';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Feather name="alert-circle" size={48} color={colors.amber} />
          <HollowText variant="subheading" style={styles.title}>
            {this.props.fallbackMessage || 'Something went wrong'}
          </HollowText>
          <HollowText variant="body" color={colors.textSecondary} style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </HollowText>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Feather name="refresh-cw" size={16} color={colors.background} />
            <HollowText variant="body" color={colors.background} style={styles.buttonText}>
              Try Again
            </HollowText>
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
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: { marginTop: spacing.lg, marginBottom: spacing.sm },
  message: { textAlign: 'center', marginBottom: spacing.xl },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.amber,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  buttonText: { fontWeight: '600' },
});
