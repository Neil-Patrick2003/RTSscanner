import { useRouter } from 'expo-router';
import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/logo-mark';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TopBarAction = { icon: LucideIcon; label: string; onPress?: () => void };

type TopBarProps = {
  title: string;
  /** Shows a back chevron in place of the logo. */
  back?: boolean;
  actions?: TopBarAction[];
  /** Extra content at the right edge, e.g. a code badge. */
  trailing?: ReactNode;
};

/** 56px app bar: Artemis logo (or back), page title, and 44×44 icon buttons. */
export function TopBar({ title, back, actions = [], trailing }: TopBarProps) {
  const router = useRouter();

  return (
    <View style={[styles.bar, back ? styles.withBack : styles.withLogo]}>
      {back ? (
        <IconButton
          icon={ChevronLeft}
          size={24}
          label="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      ) : (
        <LogoMark size={32} />
      )}
      <ThemedText type="pageTitle" numberOfLines={1} style={styles.title}>
        {title}
      </ThemedText>
      {trailing}
      {actions.map((action) => (
        <IconButton key={action.label} {...action} />
      ))}
    </View>
  );
}

function IconButton({ icon, label, onPress, size }: TopBarAction & { size?: number }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: theme.rowHover }]}>
      <Icon as={icon} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  withLogo: {
    gap: Spacing[3],
    paddingLeft: Spacing[4],
    paddingRight: 6,
  },
  withBack: {
    gap: Spacing[1],
    paddingLeft: 6,
    paddingRight: Spacing[4],
  },
  title: {
    flex: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
});
