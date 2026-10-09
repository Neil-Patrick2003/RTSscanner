import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ArrowRight, QrCode, Store, CircleCheck, type LucideIcon } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GridBackdrop } from '@/components/grid-backdrop';
import { LogoMark } from '@/components/logo-mark';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hasSeenTutorial } from '@/lib/tutorial-storage';

const STEPS: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: Store, title: 'Choose a shop', detail: 'Pull the live shop list from Artemis.' },
  { icon: QrCode, title: 'Scan the QR', detail: 'Hold the return label inside the frame.' },
  { icon: CircleCheck, title: 'Get confirmation', detail: 'The return is logged the moment it reads.' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version;

  return (
    <ThemedView style={styles.flex}>
      <GridBackdrop />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing[8], paddingBottom: insets.bottom + Spacing[8] },
        ]}>
        <View style={styles.column}>
          <View style={styles.hero}>
            <LogoMark size={120} />
            <View style={styles.wordmark}>
              <ThemedText type="wordmark">ARTEMIS</ThemedText>
              <ThemedText type="eyebrow" tone="primary">
                RTS Scanner
              </ThemedText>
            </View>
            <ThemedText tone="textSecondary" style={styles.tagline}>
              Scan return-to-shop items and log them to Artemis in seconds.
            </ThemedText>
          </View>

          <View style={[styles.steps, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            {STEPS.map((step, index) => (
              <View
                key={step.title}
                style={[
                  styles.step,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                ]}>
                <View style={[styles.stepIcon, { backgroundColor: theme.badgeActive }]}>
                  <Icon as={step.icon} size={18} tone="primary" />
                </View>
                <View style={styles.flex}>
                  <ThemedText type="rowTitle">{step.title}</ThemedText>
                  <ThemedText type="meta" tone="textSecondary">
                    {step.detail}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Button
              label="Get Started"
              trailingIcon={ArrowRight}
              // First run walks through the tutorial; after that, straight to the shops.
              onPress={() => router.push(hasSeenTutorial() ? '/shops' : '/tutorial')}
            />
            <Pressable
              accessibilityRole="button"
              hitSlop={Spacing[2]}
              onPress={() => router.push('/tutorial')}
              style={styles.howItWorks}>
              <ThemedText type="label" tone="primary">
                How it works
              </ThemedText>
            </Pressable>
            <ThemedText type="meta" tone="placeholder" style={styles.center}>
              Camera access is required to read return codes{version ? ` · v${version}` : ''}
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
  },
  column: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: Spacing[8],
  },
  hero: {
    alignItems: 'center',
    gap: Spacing[3],
  },
  wordmark: {
    alignItems: 'center',
    gap: Spacing[1],
  },
  tagline: {
    maxWidth: 280,
    textAlign: 'center',
  },
  steps: {
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    gap: Spacing[3],
  },
  center: {
    textAlign: 'center',
  },
  howItWorks: {
    alignSelf: 'center',
  },
});
