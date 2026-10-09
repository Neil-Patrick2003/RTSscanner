import { useRouter } from 'expo-router';
import { ChevronRight, Inbox, Search, SearchX, WifiOff } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getShops, type Shop } from '@/lib/api';

const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong. Please try again.';

function ShopRow({ shop, onPress }: { shop: Shop; onPress: () => void }) {
  const theme = useTheme();
  const initial = shop.name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Scan returns for ${shop.name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.divider },
        pressed && { backgroundColor: theme.rowHover },
      ]}>
      <View style={[styles.avatar, { backgroundColor: theme.badgeActive }]}>
        <ThemedText type="pageTitle" tone="primary">
          {initial}
        </ThemedText>
      </View>
      <View style={styles.rowText}>
        <ThemedText type="rowTitle" numberOfLines={1}>
          {shop.name}
        </ThemedText>
        <ThemedText tone="textSecondary" numberOfLines={1}>
          {shop.address?.trim() || 'Tap to start scanning returns'}
        </ThemedText>
      </View>
      <Icon as={ChevronRight} tone="chevron" />
    </Pressable>
  );
}

/** Same layout as ShopRow, pulsing while the list loads. */
function ShopRowSkeleton() {
  const theme = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const bone = { backgroundColor: theme.border };

  return (
    <View style={[styles.row, { borderBottomColor: theme.divider }]}>
      <Animated.View style={[styles.skeletonInner, pulse]}>
        <View style={[styles.avatar, bone]} />
        <View style={styles.skeletonText}>
          <View style={[styles.bone, bone, { width: '60%', height: 14 }]} />
          <View style={[styles.bone, bone, { width: '40%' }]} />
        </View>
      </Animated.View>
    </View>
  );
}

export default function ShopsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [shops, setShops] = useState<Shop[]>([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Retry / pull-to-refresh. The first fetch is handled by the effect below. */
  const load = useCallback(async (mode: 'retry' | 'refresh' = 'retry') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      setShops(await getShops());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch. State starts as `loading`, so nothing is set synchronously here.
  useEffect(() => {
    let cancelled = false;

    getShops()
      .then((data) => !cancelled && setShops(data))
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const openScanner = useCallback(
    (shop: Shop) => {
      router.push({
        pathname: '/scanner/[id]',
        params: { id: String(shop.id), name: shop.name },
      });
    },
    [router]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter((shop) =>
      `${shop.name ?? ''} ${shop.address ?? ''}`.toLowerCase().includes(q)
    );
  }, [query, shops]);

  function closeSearch() {
    setSearching(false);
    setQuery('');
  }

  function renderEmpty() {
    if (loading) {
      return (
        <View accessibilityLabel="Loading shops" accessibilityRole="progressbar">
          <View style={styles.sectionHeader}>
            <View style={[styles.bone, { width: 112, backgroundColor: theme.border }]} />
          </View>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ShopRowSkeleton key={i} />
          ))}
        </View>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon={WifiOff}
          tone="error"
          title="Couldn't load shops"
          description={error}
          action={{ label: 'Try again', onPress: () => load() }}
        />
      );
    }
    if (query.trim()) {
      return (
        <EmptyState
          icon={SearchX}
          title={`No results for "${query.trim()}"`}
          description="Try a different shop name or address."
          action={{ label: 'Clear search', onPress: () => setQuery('') }}
        />
      );
    }
    return (
      <EmptyState
        icon={Inbox}
        title="No shops yet"
        description="Once shops are added to Artemis they will appear here. Pull down to check again."
        action={{ label: 'Refresh', onPress: () => load() }}
      />
    );
  }

  const list = loading || error ? [] : visible;

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {searching ? (
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onCancel={closeSearch}
            placeholder="Search by shop name or address"
          />
        ) : (
          <TopBar
            title="Select a Shop"
            actions={
              shops.length > 0
                ? [{ icon: Search, label: 'Search shops', onPress: () => setSearching(true) }]
                : []
            }
          />
        )}

        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ShopRow shop={item} onPress={() => openScanner(item)} />}
          ListHeaderComponent={
            list.length > 0 ? (
              <View style={styles.sectionHeader}>
                <ThemedText type="sectionLabel" tone="textSecondary">
                  Shops
                </ThemedText>
                <ThemedText type="caption" tone="approved">
                  {list.length === shops.length
                    ? `${shops.length} total`
                    : `${list.length} of ${shops.length}`}
                </ThemedText>
              </View>
            ) : null
          }
          ListEmptyComponent={renderEmpty()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
              tintColor={theme.primary}
              colors={[theme.primary]}
              progressBackgroundColor={theme.surface}
            />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing[4] }}
        />
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  skeletonInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  skeletonText: {
    flex: 1,
    gap: Spacing[2],
  },
  bone: {
    height: 12,
    borderRadius: Radius.sm,
  },
});
