import React, { Component, ErrorInfo } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { saveCrashReport } from '@/utils/crashReport';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('ErrorBoundary caught:', error, info);
    }
    void saveCrashReport(error, info.componentStack ?? undefined);
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  handleSupport = () => {
    const subject = encodeURIComponent('Biohead app-feil');
    const body = encodeURIComponent(
      'Beskriv hva du gjorde da feilen oppstod.\n\n(Teknisk info kan legges ved fra logger.)'
    );
    void Linking.openURL(`mailto:admin@biohead.no?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>😮‍💨</Text>
          <Text style={styles.title}>Oops, noe gikk galt</Text>
          <Text style={styles.body}>
            Appen opplevde en feil. Prøv igjen, eller kontakt oss om det fortsetter.
          </Text>
          <Pressable
            onPress={this.handleReset}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel="Pr\u00f8v \u00e5 starte appen p\u00e5 nytt"
          >
            <Text style={styles.buttonText}>Prøv igjen</Text>
          </Pressable>
          <Pressable
            onPress={this.handleSupport}
            style={styles.link}
            accessibilityRole="link"
            accessibilityLabel="Send e-post til support"
          >
            <Text style={styles.linkText}>Kontakt support</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 24,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes['2xl'],
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    backgroundColor: Colors.greenAccent,
    borderRadius: 20,
    shadowColor: Colors.greenAccent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  buttonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.base,
    color: Colors.background,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  link: {
    paddingVertical: 12,
  },
  linkText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.greenAccent,
    textDecorationLine: 'underline',
  },
});
