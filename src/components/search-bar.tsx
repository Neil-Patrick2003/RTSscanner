import { Search, X } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
};

/** Replaces the top bar while searching. */
export function SearchBar({ value, onChangeText, onCancel, placeholder = 'Search' }: SearchBarProps) {
  const theme = useTheme();

  return (
    <View style={styles.bar}>
      <View style={[styles.field, { borderColor: theme.inputBorder, backgroundColor: theme.surface }]}>
        <Icon as={Search} tone="placeholder" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          selectionColor={theme.primary}
          cursorColor={theme.primary}
          accessibilityLabel={placeholder}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, { color: theme.text }]}
        />
        {value.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={Spacing[1]}
            onPress={() => onChangeText('')}
            style={styles.clear}>
            <Icon as={X} size={18} tone="chevron" />
          </Pressable>
        )}
      </View>
      <Pressable accessibilityRole="button" hitSlop={Spacing[2]} onPress={onCancel}>
        <ThemedText type="label" tone="primary">
          Cancel
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  field: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingLeft: Spacing[3],
    paddingRight: Spacing[1],
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: FontFamily.regular,
    fontSize: 15,
    padding: 0,
  },
  clear: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
