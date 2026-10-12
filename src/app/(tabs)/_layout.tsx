import { Tabs } from 'expo-router/js-tabs';
import { LayoutGrid, ScanBarcode, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Active tab gets its icon on an emerald-tint pill. */
function tabIcon(icon: LucideIcon) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    const theme = useTheme();
    return (
      <View style={[styles.pill, focused && { backgroundColor: theme.badgeActive }]}>
        {/* The tint colors set below are plain theme strings. */}
        <Icon as={icon} size={22} color={color as string} />
      </View>
    );
  };
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, height: 76, paddingTop: 10 },
        tabBarLabelStyle: { fontFamily: FontFamily.medium, fontSize: 12, marginTop: 4 },
      }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: tabIcon(LayoutGrid) }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: tabIcon(ScanBarcode) }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 64,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
