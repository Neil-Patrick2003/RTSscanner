import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  /** `primary` is the filled emerald button; `secondary` the outlined one. */
  variant?: 'primary' | 'secondary';
  /** Icon pinned to the right edge, e.g. an arrow. */
  trailingIcon?: LucideIcon;
  loading?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  trailingIcon,
  loading,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const inactive = !!disabled || !!loading;
  const primary = variant === 'primary';
  const fg = primary ? theme.onButton : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      disabled={inactive}
      style={(state) => [
        styles.base,
        primary
          ? { backgroundColor: state.pressed ? theme.buttonPressed : theme.button }
          : {
              height: 40,
              borderWidth: 1,
              borderColor: theme.inputBorder,
              backgroundColor: state.pressed ? theme.rowHover : theme.surface,
            },
        inactive && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <ThemedText type={primary ? 'button' : 'labelActive'} style={{ color: fg }}>
          {label}
        </ThemedText>
      )}
      {trailingIcon && !loading && (
        <View pointerEvents="none" style={styles.trailing}>
          <Icon as={trailingIcon} color={fg} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
  },
  trailing: {
    position: 'absolute',
    right: Spacing[4],
  },
  disabled: {
    opacity: 0.6,
  },
});
