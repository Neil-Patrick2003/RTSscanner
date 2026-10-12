import { useFocusEffect, useRouter } from 'expo-router';
import { CircleHelp, Inbox, Search, SearchX, WifiOff } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateSwitcher } from '@/components/date-switcher';
import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getScanSummary, type ProductCount, type ScanSummary } from '@/lib/api';
import { todayKey } from '@/lib/dates';

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Up to three letters for the badge: the product code, else the name's initials. */
function badgeText(product: ProductCount) {
  if (product.code) return product.code.slice(0, 3).toUpperCase();
  const letters = product.name
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join('');
  return (letters || '?').slice(0, 3).toUpperCase();
}

function ProductRow({ product, last }: { product: ProductCount; last: boolean }) {
  const theme = useTheme();
  const unassigned = product.id === null;

  return (
    <View
      accessibilityLabel={`${product.name}: ${plural(product.count, 'parcel')}`}
      style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.divider }]}>
      <View style={[styles.badge, { backgroundColor: unassigned ? theme.badge : theme.badgeActive }]}>
        <ThemedText type="caption" tone={unassigned ? 'textSecondary' : 'primary'}>
          {badgeText(product)}
        </ThemedText>
      </View>
      <View style={styles.rowText}>
        <ThemedText type="rowTitle" numberOfLines={1}>
          {product.name}
        </ThemedText>
        <ThemedText type="meta" tone="textSecondary" numberOfLines={1}>
          {unassigned ? 'Shops with no product in Artemis' : `From ${plural(product.shop_count, 'shop')}`}
        </ThemedText>
      </View>
      <ThemedText type="pageTitle" style={styles.count}>
        {product.count}
      </ThemedText>
    </View>
  );
}

function StatTile({
  label,
  value,
  detail,
  filled,
}: {
  label: string;
  value: string | number;
  detail: string;
  filled?: boolean;
}) {
  const theme = useTheme();
  const fg = filled ? theme.onButton : theme.text;
  const sub = filled ? theme.onButton : theme.textSecondary;

  return (
    <View
      style={[
        styles.tile,
        filled
          ? { backgroundColor: theme.button, borderColor: theme.button }
          : { backgroundColor: theme.surface, borderColor: theme.border },
      ]}>
      <ThemedText type="label" style={{ color: sub }}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.tileValue, { color: fg }]}>{value}</ThemedText>
      <ThemedText type="meta" style={{ color: sub, opacity: filled ? 0.85 : 1 }}>
        {detail}
      </ThemedText>
    </View>
  );
}

/** Pulsing stand-in for the tiles and list while the day loads. */
function LoadingSkeleton() {
  const theme = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const bone = { backgroundColor: theme.border };

  return (
    <Animated.View
      accessibilityLabel="Loading dashboard"
      accessibilityRole="progressbar"
      style={[styles.skeleton, pulse]}>
      <View style={styles.tiles}>
        <View style={[styles.tile, styles.tileBone, bone]} />
        <View style={[styles.tile, styles.tileBone, bone]} />
      </View>
      <View style={[styles.list, { borderColor: theme.border }]}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.row,
              i < 3 && {
                borderBottomWidth: 1,
                borderBottomColor: theme.divider,
              },
            ]}>
            <View style={[styles.badge, bone]} />
            <View style={styles.rowText}>
              <View style={[styles.textBone, bone, { width: '55%', height: 14 }]} />
              <View style={[styles.textBone, bone, { width: '35%' }]} />
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [date, setDate] = useState(todayKey);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  // Drops a slow response for a day the user has already moved away from.
  const latest = useRef(date);

  const load = useCallback(async (day: string, mode: 'load' | 'refresh' = 'load') => {
    latest.current = day;
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getScanSummary(day);
      if (latest.current === day) setSummary(data);
    } catch (e) {
      if (latest.current === day) setError(errorMessage(e));
    } finally {
      if (latest.current === day) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Reload on focus too, so the counts are current after coming back from the scanner.
  useFocusEffect(
    useCallback(() => {
      load(date);
    }, [date, load])
  );

  const today = todayKey();
  const isToday = date === today;

  const visible = useMemo(() => {
    const products = summary?.products ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => `${p.name} ${p.code ?? ''}`.toLowerCase().includes(q));
  }, [query, summary]);

  function closeSearch() {
    setSearching(false);
    setQuery('');
  }

  function renderBody() {
    if (loading && !summary) return <LoadingSkeleton />;
    if (error) {
      return (
        <EmptyState
          icon={WifiOff}
          tone="error"
          title="Couldn't load the dashboard"
          description={error}
          action={{ label: 'Try again', onPress: () => load(date) }}
        />
      );
    }
    if (!summary) return null;

    const products = summary.products;
    // A filtered list would not add up to the day's total, so only show it unfiltered.
    const showTotal = !query.trim();
    return (
      <View style={[styles.body, loading && styles.stale]}>
        <View style={styles.tiles}>
          <StatTile filled label="Parcels scanned" value={summary.total} detail={isToday ? 'today' : 'on this day'} />
          <StatTile label="Products" value={summary.product_count} detail="with returned parcels" />
        </View>

        {products.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={isToday ? 'No returns yet today' : 'No returns this day'}
            description={
              isToday ? 'Scanned parcels will be counted here by product.' : 'Pick another day from the calendar.'
            }
            action={isToday ? undefined : { label: 'Go to today', onPress: () => setDate(today) }}
          />
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText type="sectionLabel" tone="textSecondary" style={styles.flex}>
                By product
              </ThemedText>
              <ThemedText type="caption" tone="textSecondary">
                Parcels
              </ThemedText>
            </View>
            {visible.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title={`No results for "${query.trim()}"`}
                description="Try a different product name or code."
                action={{ label: 'Clear search', onPress: () => setQuery('') }}
              />
            ) : (
              <View style={[styles.list, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                {visible.map((product, i) => (
                  <ProductRow
                    key={product.id ?? 'unassigned'}
                    product={product}
                    last={!showTotal && i === visible.length - 1}
                  />
                ))}
                {showTotal && (
                  <View style={[styles.totalRow, { backgroundColor: theme.badgeActive }]}>
                    <ThemedText type="labelActive" tone="primary" style={styles.flex}>
                      Total
                    </ThemedText>
                    <ThemedText type="pageTitle" tone="primary" style={styles.count}>
                      {summary.total}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </View>
    );
  }

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {searching ? (
          <SearchBar value={query} onChangeText={setQuery} onCancel={closeSearch} placeholder="Search products" />
        ) : (
          <TopBar
            title="Dashboard"
            actions={[
              ...((summary?.products.length ?? 0) > 0
                ? [
                    {
                      icon: Search,
                      label: 'Search products',
                      onPress: () => setSearching(true),
                    },
                  ]
                : []),
              {
                icon: CircleHelp,
                label: 'How it works',
                onPress: () =>
                  router.push({
                    pathname: '/tutorial',
                    params: { replay: '1' },
                  }),
              },
            ]}
          />
        )}

        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(date, 'refresh')}
              tintColor={theme.primary}
              colors={[theme.primary]}
              progressBackgroundColor={theme.surface}
            />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <ThemedText type="eyebrow" tone="primary">
              Returns parcel scanner
            </ThemedText>
            <DateSwitcher
              value={date}
              onChange={(day) => {
                setDate(day);
                closeSearch();
              }}
            />
          </View>
          {renderBody()}
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[6],
  },
  header: {
    gap: Spacing[3],
    paddingTop: Spacing[2],
  },
  body: {
    paddingTop: Spacing[4],
  },
  stale: {
    opacity: 0.6,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  tile: {
    flex: 1,
    minHeight: 120,
    gap: Spacing[1],
    padding: Spacing[4],
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  tileBone: {
    borderWidth: 0,
  },
  tileValue: {
    fontFamily: FontFamily.semibold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[1],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[2],
  },
  list: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  count: {
    minWidth: 28,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: 14,
  },
  skeleton: {
    paddingTop: Spacing[4],
    gap: Spacing[6],
  },
  textBone: {
    height: 12,
    borderRadius: Radius.sm,
  },
});
