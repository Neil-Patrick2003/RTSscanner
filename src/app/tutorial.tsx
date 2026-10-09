import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowRight,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  QrCode,
  RotateCcw,
  Search,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { markTutorialSeen } from '@/lib/tutorial-storage';

type Step = {
  title: string;
  description: string;
  tips: { icon: LucideIcon; text: string }[];
  preview: () => ReactNode;
};

const STEPS: Step[] = [
  {
    title: 'Choose the shop',
    description: 'Tap the shop the returned items belong to. The list comes live from Artemis.',
    tips: [
      { icon: Search, text: 'Use the search icon to find a shop by name or address.' },
      { icon: RotateCcw, text: 'Pull down on the list to refresh it.' },
    ],
    preview: () => <ShopListPreview />,
  },
  {
    title: 'Scan the QR code',
    description: 'Hold the return label inside the frame. The app reads it on its own, no button needed.',
    tips: [
      { icon: Zap, text: 'Too dark? Turn on the torch with the lightning button.' },
      { icon: QrCode, text: 'Only QR codes are read. Keep the label flat and steady.' },
    ],
    preview: () => <ScannerPreview />,
  },
  {
    title: 'Confirm the return',
    description: 'After a scan, a popup asks you to confirm. Nothing is recorded until you tap "Mark as Returned".',
    tips: [
      { icon: CircleCheck, text: 'Check the code in the popup, then tap "Mark as Returned".' },
      { icon: X, text: 'Wrong label? Tap "Cancel" and the camera goes right back to scanning.' },
    ],
    preview: () => <ConfirmPreview />,
  },
  {
    title: 'Check the result',
    description: 'A green check means the return is logged in Artemis. The scanned code is shown below it.',
    tips: [
      { icon: CircleCheck, text: '"Return recorded" means you are done with that item.' },
      { icon: ArrowRight, text: 'Tap "Scan Another" to continue with the same shop.' },
    ],
    preview: () => <ResultPreview success />,
  },
  {
    title: 'If it isn’t recorded',
    description: 'A red alert means the return was not logged. The message tells you why.',
    tips: [
      { icon: RotateCcw, text: 'Tap "Scan Another" and try the same label again.' },
      { icon: CircleAlert, text: 'Still failing? Check the shop is correct and you are online.' },
    ],
    preview: () => <ResultPreview />,
  },
];

export default function TutorialScreen() {
  const router = useRouter();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth, MaxContentWidth);
  const listRef = useRef<FlatList<Step>>(null);
  const [index, setIndex] = useState(0);
  const last = index === STEPS.length - 1;

  function finish() {
    markTutorialSeen();
    if (replay && router.canGoBack()) {
      // Opened from the shop list's help button: go back to where the user was.
      router.back();
    } else {
      // Replace so Back from the shop list returns to the welcome screen, not the tutorial.
      router.replace('/shops');
    }
  }

  function next() {
    if (last) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    setIndex(index + 1);
  }

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  }

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={[styles.content, { width }]}>
        <View style={styles.bar}>
          <ThemedText type="pageTitle" style={styles.flex}>
            How it works
          </ThemedText>
          {!last && (
            <Pressable accessibilityRole="button" hitSlop={Spacing[3]} onPress={finish}>
              <ThemedText type="label" tone="primary">
                Skip
              </ThemedText>
            </Pressable>
          )}
        </View>

        <FlatList
          ref={listRef}
          data={STEPS}
          keyExtractor={(step) => step.title}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item, index: i }) => (
            <View style={[styles.page, { width }]}>
              <View style={[styles.previewFrame, { backgroundColor: theme.badge, borderColor: theme.border }]}>
                {item.preview()}
              </View>
              <View style={styles.copy}>
                <ThemedText type="eyebrow" tone="primary">
                  Step {i + 1} of {STEPS.length}
                </ThemedText>
                <ThemedText type="pageTitle" style={styles.title}>
                  {item.title}
                </ThemedText>
                <ThemedText tone="textSecondary">{item.description}</ThemedText>
              </View>
              <View style={styles.tips}>
                {item.tips.map((tip) => (
                  <View key={tip.text} style={styles.tip}>
                    <View style={[styles.tipIcon, { backgroundColor: theme.badgeActive }]}>
                      <Icon as={tip.icon} size={16} tone="primary" />
                    </View>
                    <ThemedText type="meta" tone="textSecondary" style={styles.flex}>
                      {tip.text}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing[4] }]}>
          <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${STEPS.length}`}>
            {STEPS.map((step, i) => (
              <View
                key={step.title}
                style={[
                  styles.dot,
                  i === index
                    ? { width: 20, backgroundColor: theme.primary }
                    : { backgroundColor: theme.border },
                ]}
              />
            ))}
          </View>
          <Button label={last ? (replay ? 'Done' : 'Start Scanning') : 'Next'} trailingIcon={ArrowRight} onPress={next} />
        </View>
      </View>
    </ThemedView>
  );
}

/* ---------- Mini previews of the real screens ---------- */

function ShopListPreview() {
  const theme = useTheme();
  const shops = ['Artemis Makati', 'Artemis Cebu', 'Artemis Davao'];

  return (
    <View style={[styles.mock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {shops.map((shop, i) => (
        <View
          key={shop}
          style={[
            styles.mockRow,
            { borderBottomColor: theme.divider },
            i === 0 && { backgroundColor: theme.badgeActive },
          ]}>
          <View style={[styles.mockAvatar, { backgroundColor: i === 0 ? theme.surface : theme.badgeActive }]}>
            <ThemedText type="labelActive" tone="primary">
              {shop.split(' ')[1].charAt(0)}
            </ThemedText>
          </View>
          <ThemedText type="rowTitle" style={styles.flex} numberOfLines={1}>
            {shop}
          </ThemedText>
          <Icon as={ChevronRight} size={16} tone={i === 0 ? 'primary' : 'chevron'} />
        </View>
      ))}
    </View>
  );
}

function ScannerPreview() {
  const corner = { borderColor: '#34D399' };
  return (
    <View style={styles.camera}>
      <View style={styles.reticle}>
        <View style={[styles.corner, styles.tl, corner]} />
        <View style={[styles.corner, styles.tr, corner]} />
        <View style={[styles.corner, styles.bl, corner]} />
        <View style={[styles.corner, styles.br, corner]} />
        <Icon as={QrCode} size={56} color="rgba(255,255,255,0.9)" />
        <View style={styles.scanLine} />
      </View>
      <View style={styles.cameraControls}>
        <View style={styles.cameraButton} />
        <View style={[styles.cameraButton, { backgroundColor: '#34D399' }]}>
          <Icon as={Zap} size={14} color="#04241A" />
        </View>
      </View>
    </View>
  );
}

/** The confirmation popup over the paused camera. */
function ConfirmPreview() {
  const theme = useTheme();

  return (
    <View style={styles.camera}>
      <View style={[styles.reticle, styles.dimmed]}>
        <Icon as={QrCode} size={56} color="rgba(255,255,255,0.9)" />
      </View>
      <View style={styles.popupScrim}>
        <View style={[styles.popup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ThemedText type="eyebrow" tone="primary">
            Confirm return
          </ThemedText>
          <ThemedText type="labelActive">Mark as returned?</ThemedText>
          <ThemedText type="code" tone="textSecondary" numberOfLines={1}>
            RTS-2026-00418
          </ThemedText>
          <View style={[styles.popupButton, { backgroundColor: theme.button }]}>
            <ThemedText type="meta" style={{ color: theme.onButton }}>
              Mark as Returned
            </ThemedText>
          </View>
          <View style={[styles.popupButton, styles.popupCancel, { borderColor: theme.inputBorder }]}>
            <ThemedText type="meta">Cancel</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

function ResultPreview({ success }: { success?: boolean }) {
  const theme = useTheme();
  const tone = success
    ? { bg: theme.approvedFill, border: theme.approvedBorder, fg: theme.approved }
    : { bg: theme.rejectedFill, border: theme.rejectedBorder, fg: theme.rejected };

  return (
    <View style={styles.result}>
      <View style={[styles.resultCircle, { backgroundColor: tone.bg, borderColor: tone.border }]}>
        <Icon as={success ? CircleCheck : CircleAlert} size={28} color={tone.fg} />
      </View>
      <ThemedText type="eyebrow" style={{ color: tone.fg }}>
        {success ? 'Return recorded' : 'Not recorded'}
      </ThemedText>
      <ThemedText type="rowTitle">{success ? 'All done' : 'Couldn’t record'}</ThemedText>
      <View style={[styles.codeChip, { backgroundColor: theme.surface }]}>
        <Icon as={QrCode} size={12} tone="textSecondary" />
        <ThemedText type="code" tone="textSecondary">
          RTS-2026-00418
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
  },
  page: {
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[2],
    gap: Spacing[6],
  },
  previewFrame: {
    height: 220,
    borderWidth: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: Spacing[4],
  },
  copy: {
    gap: Spacing[2],
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  tips: {
    gap: Spacing[3],
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    gap: Spacing[4],
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[4],
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Shop list preview
  mock: {
    width: '100%',
    maxWidth: 300,
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  mockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
  },
  mockAvatar: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scanner preview (camera context: fixed dark colors)
  camera: {
    width: 180,
    height: 188,
    borderRadius: Radius.lg,
    backgroundColor: '#15191A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
  },
  reticle: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: Radius.lg },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: Radius.lg },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: Radius.lg },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: Radius.lg },
  scanLine: {
    position: 'absolute',
    top: 70,
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#34D399',
  },
  cameraControls: {
    width: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cameraButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Confirm preview
  dimmed: {
    opacity: 0.5,
  },
  popupScrim: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[3],
  },
  popup: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
    padding: Spacing[3],
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  popupButton: {
    alignSelf: 'stretch',
    height: 26,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  popupCancel: {
    borderWidth: 1,
  },

  // Result preview
  result: {
    alignItems: 'center',
    gap: Spacing[1],
  },
  resultCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Radius.sm,
    marginTop: Spacing[2],
  },
});
