import { CalendarDays, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DatePickerModal } from '@/components/date-picker-modal';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatLong, todayKey } from '@/lib/dates';

type DateSwitcherProps = {
  /** Selected day, YYYY-MM-DD. */
  value: string;
  onChange: (date: string) => void;
};

/** Previous day, the date (tap for the calendar), next day. Stops at today. */
export function DateSwitcher({ value, onChange }: DateSwitcherProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const isToday = value === todayKey();

  return (
    <View style={styles.row}>
      <DayButton icon={ChevronLeft} label="Previous day" onPress={() => onChange(addDays(value, -1))} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Pick a date. Showing ${formatLong(value)}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          { borderColor: theme.inputBorder, backgroundColor: pressed ? theme.rowHover : theme.surface },
        ]}>
        <Icon as={CalendarDays} size={18} tone="primary" />
        <View style={styles.flex}>
          <ThemedText type="rowTitle" numberOfLines={1}>
            {isToday ? 'Today' : formatLong(value).split(',')[0]}
          </ThemedText>
          <ThemedText type="meta" tone="textSecondary" numberOfLines={1}>
            {formatLong(value)}
          </ThemedText>
        </View>
      </Pressable>
      <DayButton
        icon={ChevronRight}
        label="Next day"
        disabled={isToday}
        onPress={() => onChange(addDays(value, 1))}
      />

      <DatePickerModal visible={open} value={value} onSelect={onChange} onClose={() => setOpen(false)} />
    </View>
  );
}

function DayButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dayButton,
        { borderColor: theme.inputBorder, backgroundColor: pressed ? theme.rowHover : theme.surface },
        disabled && styles.disabled,
      ]}>
      <Icon as={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  field: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[3],
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  dayButton: {
    width: 44,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  disabled: {
    opacity: 0.4,
  },
});
