import React from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HollowText } from '../../components/common/HollowText';
import { colors, spacing } from '../../theme';

export function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <HollowText variant="subheading" serif style={styles.headerTitle}>
          Privacy Policy
        </HollowText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HollowText variant="label" color={colors.textMuted} style={styles.updated}>
          Last updated: February 2026
        </HollowText>

        <HollowText variant="body" color={colors.textSecondary} style={styles.paragraph}>
          Hollow ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application.
        </HollowText>

        <HollowText variant="subheading" serif color={colors.amber} style={styles.sectionTitle}>
          1. Data Collection & Local Storage
        </HollowText>
        <HollowText variant="body" color={colors.textSecondary} style={styles.paragraph}>
          Hollow is designed with a privacy-first architecture. All your conversation data, memories, and personal settings are stored locally on your device using encrypted SQLite databases and the device's secure keychain/keystore. We do not operate backend servers that store your personal data.
        </HollowText>

        <HollowText variant="subheading" serif color={colors.amber} style={styles.sectionTitle}>
          2. Free & Lite Users
        </HollowText>
        <HollowText variant="body" color={colors.textSecondary} style={styles.paragraph}>
          If you are using Hollow on a Free or Lite plan, anonymized and aggregated usage data may be used to improve our AI models and overall service quality. This data is stripped of all personally identifiable information before processing. We never associate this data back to individual users.
        </HollowText>

        <HollowText variant="subheading" serif color={colors.amber} style={styles.sectionTitle}>
          3. VIP & Premium Users
        </HollowText>
        <HollowText variant="body" color={colors.textSecondary} style={styles.paragraph}>
          VIP and Premium subscribers enjoy a zero data collection policy. No conversation content, usage patterns, or behavioral data is collected, transmitted, or analyzed. Your experience is entirely private.
        </HollowText>

        <HollowText variant="subheading" serif color={colors.amber} style={styles.sectionTitle}>
          4. Encryption at Rest
        </HollowText>
        <HollowText variant="body" color={colors.textSecondary} style={styles.paragraph}>
          All data stored on your device is encrypted at rest. API keys and sensitive credentials are stored in the device's native secure storage (iOS Keychain / Android Keystore), which provides hardware-backed encryption where available.
        </HollowText>

        <HollowText variant="subheading" serif color={colors.amber} style={styles.sectionTitle}>
          5. Third-Party Sharing
        </HollowText>
        <HollowText variant="body" color={colors.textSecondary} style={styles.paragraph}>
          We do not sell, trade, or otherwise transfer your personal information to third parties. When you use third-party AI providers (e.g., OpenAI, Anthropic, DeepSeek), your messages are sent directly from your device to those services using your own API keys. Please refer to each provider's privacy policy for their data handling practices.
        </HollowText>

        <HollowText variant="subheading" serif color={colors.amber} style={styles.sectionTitle}>
          6. Data Deletion
        </HollowText>
        <HollowText variant="body" color={colors.textSecondary} style={styles.paragraph}>
          You have full control over your data. You can delete individual conversations, memories, or use the "Erase All Data" feature in Settings to permanently remove all data from your device. Since data is stored locally, uninstalling the app will also remove all data.
        </HollowText>

        <HollowText variant="subheading" serif color={colors.amber} style={styles.sectionTitle}>
          7. Contact Us
        </HollowText>
        <HollowText variant="body" color={colors.textSecondary} style={styles.paragraph}>
          If you have questions or concerns about this Privacy Policy, please contact us at:
        </HollowText>
        <HollowText variant="body" color={colors.amber} style={styles.paragraph}>
          privacy@hollow-app.com
        </HollowText>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  updated: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  paragraph: {
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  bottomSpacer: {
    height: spacing['3xl'],
  },
});
