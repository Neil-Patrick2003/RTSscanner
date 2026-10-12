import { useFocusEffect } from 'expo-router';
import { Inbox, WifiOff } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
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

/** "2:14 PM" */
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** Up to three letters for the badge: the product code, else the name's initials. */
function badgeText(product: ProductCount) {
  if (product.code) return product.code.slice(0, 3).toUpperCase();
  const words = product.name.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words.map((w) => w.charAt(0)).join('') : product.name;
  return (letters || '?').slice(0, 3).toUpperCase();
}

function ProductRow({ product, latest }: { product: ProductCount; latest: boolean }) {
  const theme = useTheme();
  const unassigned = product.id === null;

  return (
    <View
      accessibilityLabel={`${product.name}: ${plural(product.count, 'parcel')}${latest ? ', latest scan' : ''}`}
      style={[styles.row, { borderBottomColor: theme.divider }]}>
      <View style={[styles.badge, { backgroundColor: unassigned ? theme.badge : theme.badgeActive }]}>
        <ThemedText type="caption" tone={unassigned ? 'textSecondary' : 'primary'}>
          {badgeText(product)}
        </ThemedText>
      </View>
      <View style={styles.flex}>
        <ThemedText type="rowTitle" numberOfLines={1}>
          {product.name}
        </ThemedText>
        <ThemedText type="meta" tone="textSecondary" numberOfLines={1}>
          {unassigned ? 'Shops with no product in Artemis' : `From ${plural(product.shop_count, 'shop')}`}
        </ThemedText>
      </View>
      {latest ? (
        <View style={[styles.latest, { backgroundColor: theme.approvedFill, borderColor: theme.approvedBorder }]}>
          <ThemedText type="caption" tone="approved">
            Latest
          </ThemedText>
        </View>
      ) : null}
      <ThemedText type="pageTitle" style={styles.count}>
        {product.count}
      </ThemedText>
    </View>
  );
}

/** Pulsing stand-in for the hero card and list while today loads. */
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
    <Animated.View accessibilityLabel="Loading summary" accessibilityRole="progressbar" style={[styles.body, pulse]}>
      <View style={[styles.hero, bone]} />
      <View style={[styles.list, { borderColor: theme.border }]}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.row, { borderBottomColor: theme.divider }]}>
            <View style={[styles.badge, bone]} />
            <View style={[styles.textBone, bone]} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export default function SummaryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(todayKey);
  // Drops a response for a day the user has moved away from, or after leaving the tab.
  const latest = useRef<string | null>(date);

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

  // Reload whenever the tab is opened, so a scan made on the Scan tab shows up right away.
  useFocusEffect(
    useCallback(() => {
      load(date);
      return () => {
        latest.current = null;
      };
    }, [date, load])
  );

  const today = todayKey();
  const isToday = date === today;

  function renderBody() {
    if (loading && !summary) return <LoadingSkeleton />;
    if (error) {
      return (
        <EmptyState
          icon={WifiOff}
          tone="error"
          title="Couldn't load the summary"
          description={error}
          action={{ label: 'Try again', onPress: () => load(date) }}
        />
      );
    }
    if (!summary) return null;

    const last = summary.last_scan;
    const onHero = { color: theme.onButton };

    return (
      <View style={[styles.body, loading && styles.stale]}>
        <View style={[styles.hero, { backgroundColor: theme.button }]}>
          <View style={styles.flex}>
            <ThemedText type="label" style={[styles.heroSub, onHero]}>
              {isToday ? 'Total scanned parcels' : 'Scanned parcels'}
            </ThemedText>
            <ThemedText style={[styles.heroValue, onHero]}>{summary.total}</ThemedText>
          </View>
          <View style={styles.heroMeta}>
            <ThemedText type="meta" style={[styles.heroSub, styles.right, onHero]}>
              {plural(summary.product_count, 'product')}
            </ThemedText>
            <ThemedText type="meta" style={[styles.heroSub, styles.right, onHero]}>
              Last scan {summary.last_scan ? formatTime(summary.last_scan.scanned_at) : '—'}
            </ThemedText>
          </View>
        </View>

        {summary.products.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={isToday ? 'No returns yet today' : 'No returns this day'}
            description={
              isToday
                ? 'Scan a parcel on the Scan tab and it will be counted here by product.'
                : 'Pick another day from the calendar.'
            }
            action={isToday ? undefined : { label: 'Go to today', onPress: () => setDate(today) }}
          />
        ) : (
          <View>
            <View style={styles.sectionHeader}>
              <ThemedText type="sectionLabel" tone="textSecondary" style={styles.flex}>
                By product
              </ThemedText>
              <ThemedText type="caption" tone="textSecondary">
                Parcels
              </ThemedText>
            </View>
            <View style={[styles.list, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              {summary.products.map((product) => (
                <ProductRow
                  key={product.id ?? 'unassigned'}
                  product={product}
                  latest={!!last && product.id === last.product_id}
                />
              ))}
              <View style={[styles.totalRow, { backgroundColor: theme.badgeActive }]}>
                <ThemedText type="labelActive" tone="primary" style={styles.flex}>
                  Total
                </ThemedText>
                <ThemedText type="pageTitle" tone="primary" style={styles.count}>
                  {summary.total}
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        <ThemedText type="meta" tone="textSecondary" style={styles.footnote}>
          Only parcels scanned on this day are counted. Duplicate and failed scans are not added.
        </ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <TopBar title="Summary" />
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
          contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <ThemedText type="eyebrow" tone="primary">
              Returns parcel scanner
            </ThemedText>
            <ThemedText type="pageTitle" style={styles.title}>
              Scan Summary
            </ThemedText>
            <ThemedText type="meta" tone="textSecondary">
              Updates after every successful scan
            </ThemedText>
            <View style={styles.dateSwitcher}>
              <DateSwitcher value={date} onChange={setDate} />
            </View>
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
    gap: Spacing[1],
    paddingTop: Spacing[2],
  },
  dateSwitcher: {
    marginTop: Spacing[2],
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    paddingTop: Spacing[4],
    gap: Spacing[4],
  },
  stale: {
    opacity: 0.6,
  },
  hero: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing[4],
    padding: 20,
    borderRadius: Radius.lg,
  },
  heroSub: {
    opacity: 0.85,
  },
  heroValue: {
    fontFamily: FontFamily.semibold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
    marginTop: Spacing[2],
  },
  heroMeta: {
    gap: Spacing[1],
  },
  right: {
    textAlign: 'right',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[1],
    paddingTop: Spacing[2],
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
    borderBottomWidth: 1,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  latest: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: Radius.sm,
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
  footnote: {
    textAlign: 'center',
    paddingHorizontal: Spacing[3],
  },
  textBone: {
    flex: 1,
    height: 14,
    borderRadius: Radius.sm,
  },
});
