import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fromDateKey, toDateKey, todayKey } from '@/lib/dates';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CELL = 40;

type DatePickerModalProps = {
  visible: boolean;
  /** Selected day, YYYY-MM-DD. */
  value: string;
  onSelect: (date: string) => void;
  onClose: () => void;
};

/** Month calendar in a popup. Plain views so it works the same on iOS, Android and the web build. */
export function DatePickerModal({ visible, value, onSelect, onClose }: DatePickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close calendar" style={styles.backdrop} onPress={onClose}>
        {/* Remounts on every open, so the month starts at the selected day. */}
        {visible ? <Calendar value={value} onSelect={onSelect} onClose={onClose} /> : null}
      </Pressable>
    </Modal>
  );
}

function Calendar({ value, onSelect, onClose }: Omit<DatePickerModalProps, 'visible'>) {
  const theme = useTheme();
  const today = todayKey();
  const selected = fromDateKey(value);
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));

  const now = new Date();
  const atCurrentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(month.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(month.getFullYear(), month.getMonth(), i + 1))),
  ];
  while (cells.length % 7) cells.push(null);

  const shiftMonth = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));
  const pick = (key: string) => {
    onSelect(key);
    onClose();
  };

  return (
    // Swallow taps so only the backdrop closes the popup.
    <Pressable
      accessibilityViewIsModal
      onPress={() => {}}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <NavButton icon={ChevronLeft} label="Previous month" onPress={() => shiftMonth(-1)} />
        <ThemedText type="rowTitle" style={styles.monthLabel}>
          {month.toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric',
          })}
        </ThemedText>
        <NavButton icon={ChevronRight} label="Next month" disabled={atCurrentMonth} onPress={() => shiftMonth(1)} />
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((day, i) => (
          <View key={`${day}${i}`} style={styles.cell}>
            <ThemedText type="caption" tone="placeholder">
              {day}
            </ThemedText>
          </View>
        ))}
        {cells.map((key, i) => {
          if (!key) return <View key={`blank${i}`} style={styles.cell} />;
          const isSelected = key === value;
          const isToday = key === today;
          // Nothing can be scanned in the future.
          const future = key > today;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={fromDateKey(key).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
              })}
              accessibilityState={{ selected: isSelected, disabled: future }}
              disabled={future}
              onPress={() => pick(key)}
              style={({ pressed }) => [
                styles.cell,
                styles.day,
                isSelected && { backgroundColor: theme.button },
                !isSelected && isToday && { borderWidth: 1, borderColor: theme.primary },
                pressed && !isSelected && { backgroundColor: theme.rowHover },
              ]}>
              <ThemedText
                type={isSelected || isToday ? 'labelActive' : 'label'}
                tone={future ? 'placeholder' : isToday && !isSelected ? 'primary' : 'text'}
                style={[isSelected && { color: theme.onButton }, future && styles.future]}>
                {Number(key.slice(8))}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Button label="Today" variant="secondary" style={styles.footerButton} onPress={() => pick(today)} />
        <Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={onClose} />
      </View>
    </Pressable>
  );
}

function NavButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: typeof ChevronLeft;
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
      style={({ pressed }) => [styles.nav, pressed && { backgroundColor: theme.rowHover }, disabled && styles.future]}>
      <Icon as={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  card: {
    width: CELL * 7 + Spacing[4] * 2 + 2,
    maxWidth: '100%',
    padding: Spacing[4],
    gap: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
  },
  nav: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    borderRadius: CELL / 2,
  },
  future: {
    opacity: 0.4,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  footerButton: {
    flex: 1,
  },
});
