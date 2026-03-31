import React, { Component, ErrorInfo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';

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
        console.error('ErrorBoundary caught:', error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.emoji}>😮‍💨</Text>
                    <Text style={styles.title}>Oops, noe gikk galt</Text>
                    <Text style={styles.body}>
                        Appen opplevde en feil. Prøv igjen.
                    </Text>
                    <Pressable onPress={this.handleReset} style={styles.button}>
                        <Text style={styles.buttonText}>Prøv igjen</Text>
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
        backgroundColor: Colors.darkBase,
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
        marginBottom: 40,
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
    },
    buttonText: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: Typography.sizes.base,
        color: Colors.darkBase,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
});
