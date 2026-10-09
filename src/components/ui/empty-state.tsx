import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Emerald for good news, neutral for no results, red for errors. */
  tone?: 'positive' | 'neutral' | 'error';
  action?: { label: string; onPress: () => void };
};

/** Centered icon, title, description and an optional button, for empty lists and errors. */
export function EmptyState({ icon, title, description, tone = 'neutral', action }: EmptyStateProps) {
  const theme = useTheme();
  const circle = {
    positive: { backgroundColor: theme.badgeActive, borderColor: theme.approvedBorder, icon: 'primary' },
    neutral: { backgroundColor: theme.badge, borderColor: theme.border, icon: 'textSecondary' },
    error: { backgroundColor: theme.rejectedFill, borderColor: theme.rejectedBorder, icon: 'rejected' },
  } as const;
  const { icon: iconTone, ...circleColors } = circle[tone];

  return (
    <View style={styles.container}>
      <View style={[styles.circle, circleColors]}>
        <Icon as={icon} size={28} tone={iconTone} />
      </View>
      <ThemedText type="pageTitle" style={styles.center}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText tone="textSecondary" style={[styles.center, styles.description]}>
          {description}
        </ThemedText>
      ) : null}
      {action ? (
        <Button variant="secondary" label={action.label} onPress={action.onPress} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: Spacing[8],
    paddingTop: 80,
    paddingBottom: Spacing[10],
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  center: {
    textAlign: 'center',
  },
  description: {
    marginTop: 6,
    maxWidth: 280,
  },
  action: {
    marginTop: Spacing[6],
  },
});
