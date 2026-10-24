import { useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { Camera, CircleAlert, CircleCheck, ScanBarcode, Store, Zap, ZapOff } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QrCamera } from '@/components/qr-camera';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { scanReturn, type ScanReturnResult } from '@/lib/api';

/** The camera card is its own dark context, so its colors are fixed, not themed. */
const CARD = '#12201A';
/** Emerald that reads on the camera card in both themes. */
const ACCENT = '#6EE7B7';
const CARD_RADIUS = 16;

/**
 * idle: camera preview is live but not reading. armed: the next code in the frame is read.
 * submitting/result: the popup over the card.
 */
type Phase = 'idle' | 'armed' | 'submitting' | 'result';

/** Scales in from a still-visible 0.9 so it animates without ever being hidden. */
function Pop({ children }: PropsWithChildren) {
  const scale = useSharedValue(0.9);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 13, stiffness: 190 });
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Sweeping guide line, shown only while armed so it's clear the camera is reading. */
function ScanLine({ height }: { height: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = 0;
    y.value = withRepeat(withTiming(Math.max(height - 2, 0), { duration: 1800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [y, height]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[styles.scanLine, style]} />;
}

function Corner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  return <View style={[styles.corner, styles[position]]} />;
}

/** Sending and result, all in one popup over the camera card. */
function ScanModal({
  phase,
  code,
  result,
  error,
  onScanAnother,
  onClose,
}: {
  phase: Phase;
  code: string | null;
  result: ScanReturnResult | null;
  error: string | null;
  onScanAnother: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const visible = phase === 'submitting' || phase === 'result';
  const submitting = phase === 'submitting';
  const isResult = phase === 'result';
  const isSuccess = isResult && !error;

  const tone = !isResult
    ? { bg: theme.badgeActive, border: theme.badgeActive, fg: theme.primary }
    : isSuccess
      ? { bg: theme.approvedFill, border: theme.approvedBorder, fg: theme.approved }
      : { bg: theme.rejectedFill, border: theme.rejectedBorder, fg: theme.rejected };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      // Android back button: same as Done, but not mid-request.
      onRequestClose={() => !submitting && onClose()}>
      <View style={styles.modalBackdrop}>
        <Pop key={phase === 'result' ? 'result' : 'submitting'}>
          <View
            accessibilityViewIsModal
            style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalIcon, { backgroundColor: tone.bg, borderColor: tone.border }]}>
              <Icon
                as={!isResult ? ScanBarcode : isSuccess ? CircleCheck : CircleAlert}
                size={26}
                color={tone.fg}
              />
            </View>
            <ThemedText type="eyebrow" style={{ color: tone.fg }}>
              {!isResult ? 'Recording return' : isSuccess ? 'Return recorded' : 'Not recorded'}
            </ThemedText>
            <ThemedText type="pageTitle" style={styles.center}>
              {!isResult ? 'Marking as returned…' : isSuccess ? 'All done' : "Couldn't record"}
            </ThemedText>
            <ThemedText tone="textSecondary" style={styles.center}>
              {!isResult
                ? 'Artemis finds the shop from the tracking code and marks the order as returned.'
                : isSuccess
                  ? result?.message
                  : error}
            </ThemedText>

            {isSuccess && result?.shop ? (
              <View style={[styles.chip, { backgroundColor: theme.badgeActive }]}>
                <Icon as={Store} size={14} tone="primary" />
                <ThemedText type="labelActive" tone="primary" numberOfLines={1}>
                  {result.shop.name}
                </ThemedText>
              </View>
            ) : null}

            {code ? (
              <View style={[styles.chip, { backgroundColor: theme.badge }]}>
                <Icon as={ScanBarcode} size={14} tone="textSecondary" />
                <ThemedText type="code" tone="textSecondary" numberOfLines={1} selectable>
                  {code}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              {isResult ? (
                <>
                  <Button label="Scan Another" icon={ScanBarcode} onPress={onScanAnother} />
                  <Button label="Done" variant="secondary" style={styles.tall} onPress={onClose} />
                </>
              ) : (
                <Button label="Recording…" loading />
              )}
            </View>
          </View>
        </Pop>
      </View>
    </Modal>
  );
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  // Tabs stay mounted, so release the camera whenever another tab is showing.
  const focused = useIsFocused();

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('idle');
  const [torch, setTorch] = useState(false);
  const [frameHeight, setFrameHeight] = useState(0);
  const [result, setResult] = useState<ScanReturnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  // Guards against the camera firing onBarcodeScanned multiple times for one code.
  const handledRef = useRef(false);

  // Ask for camera access automatically the first time the tab opens.
  useEffect(() => {
    if (focused && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [focused, permission, requestPermission]);

  // Leaving the tab stops any scan in progress and turns the torch off.
  useFocusEffect(
    useCallback(
      () => () => {
        setTorch(false);
        setPhase((p) => (p === 'armed' ? 'idle' : p));
      },
      []
    )
  );

  const arm = useCallback(() => {
    handledRef.current = false;
    setResult(null);
    setError(null);
    setCode(null);
    setPhase('armed');
  }, []);

  // A scan is sent right away; the popup shows progress and then the result.
  const handleScanned = useCallback(async ({ data }: { data: string }) => {
    if (handledRef.current) return;
    handledRef.current = true;
    const scanned = data.trim();
    setCode(scanned);
    setPhase('submitting');
    try {
      const res = await scanReturn({ tracking_code: scanned });
      setResult(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed.');
      setResult(null);
    } finally {
      setPhase('result');
    }
  }, []);

  const close = useCallback(() => {
    setTorch(false);
    setPhase('idle');
  }, []);

  const granted = !!permission?.granted;
  const armed = phase === 'armed';
  // Browsers can't open their own settings page, so a blocked camera needs a reload instead.
  const blockedOnWeb = Platform.OS === 'web' && !!permission && !permission.granted && !permission.canAskAgain;

  let hint = 'Align the barcode on the return label inside the frame';
  if (!permission) hint = 'Starting camera…';
  else if (!granted)
    hint = blockedOnWeb
      ? "Camera access is blocked. Allow it in your browser's site settings, then reload."
      : 'Allow camera access to scan return labels';
  else if (armed) hint = 'Reading… hold the label steady';

  let button = <Button label="Scan parcel" icon={ScanBarcode} onPress={arm} />;
  if (permission && !granted) {
    button = blockedOnWeb ? (
      <Button label="Reload" onPress={() => window.location.reload()} />
    ) : (
      <Button
        label={permission.canAskAgain ? 'Allow Camera' : 'Open Settings'}
        icon={Camera}
        onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
      />
    );
  } else if (armed) {
    button = <Button label="Cancel scan" variant="secondary" style={styles.tall} onPress={close} />;
  }

  return (
    <ThemedView style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing[8] }]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="eyebrow" tone="primary">
              Returns parcel scanner
            </ThemedText>
            <ThemedText type="pageTitle" style={styles.title}>
              Scan Parcel
            </ThemedText>
            <ThemedText tone="textSecondary">The shop is detected automatically from the barcode.</ThemedText>
          </View>

          <View style={styles.card}>
            {granted && focused ? (
              <QrCamera
                style={StyleSheet.absoluteFill}
                enableTorch={torch}
                onBarcodeScanned={armed ? handleScanned : undefined}
              />
            ) : null}
            {/* Dims the feed so the frame and hint stay readable. */}
            {granted ? <View style={[StyleSheet.absoluteFill, styles.scrim, armed && styles.scrimArmed]} /> : null}

            <View style={styles.frame} onLayout={(e) => setFrameHeight(e.nativeEvent.layout.height)}>
              <Corner position="tl" />
              <Corner position="tr" />
              <Corner position="bl" />
              <Corner position="br" />
              {armed && frameHeight > 0 ? <ScanLine height={frameHeight} /> : null}
              <View style={styles.hintWrap}>
                {permission && !granted ? <Icon as={Camera} size={22} color={ACCENT} /> : null}
                <ThemedText style={styles.hint}>{hint}</ThemedText>
              </View>
            </View>

            {granted ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'}
                accessibilityState={{ selected: torch }}
                hitSlop={Spacing[2]}
                onPress={() => setTorch((on) => !on)}
                style={({ pressed }) => [
                  styles.torch,
                  { backgroundColor: torch ? ACCENT : 'rgba(255,255,255,0.14)' },
                  pressed && styles.pressed,
                ]}>
                <Icon as={torch ? Zap : ZapOff} size={18} color={torch ? CARD : '#FFFFFF'} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.footer}>
            {button}
            <ThemedText type="meta" tone="textSecondary" style={styles.center}>
              {armed ? 'The next barcode or QR code in the frame is read.' : 'Tap Scan parcel for each return label.'}
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      <ScanModal
        phase={phase}
        code={code}
        result={result}
        error={error}
        onScanAnother={arm}
        onClose={close}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing[8],
    paddingBottom: Spacing[8],
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing[6],
  },
  header: {
    gap: Spacing[1],
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  center: {
    textAlign: 'center',
  },
  tall: {
    height: 48,
  },
  pressed: {
    opacity: 0.7,
  },

  // Camera card (fixed dark colors)
  // Square, so the frame fits a QR code; capped so it stays phone-sized on tablets and the web.
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    aspectRatio: 1,
    borderRadius: CARD_RADIUS,
    backgroundColor: CARD,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    backgroundColor: 'rgba(10, 20, 16, 0.45)',
  },
  scrimArmed: {
    backgroundColor: 'rgba(10, 20, 16, 0.2)',
  },
  frame: {
    width: '72%',
    aspectRatio: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintWrap: {
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[6],
  },
  hint: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: ACCENT,
  },
  tl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: Radius.md },
  tr: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: Radius.md },
  bl: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: Radius.md },
  br: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: Radius.md },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: Spacing[2],
    right: Spacing[2],
    height: 2,
    borderRadius: 1,
    backgroundColor: ACCENT,
    opacity: 0.9,
  },
  torch: {
    position: 'absolute',
    right: Spacing[3],
    bottom: Spacing[3],
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: {
    gap: Spacing[3],
  },

  // Popup
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[6],
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[1],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Radius.sm,
    marginTop: Spacing[1],
  },
  modalActions: {
    alignSelf: 'stretch',
    gap: Spacing[2],
    marginTop: Spacing[4],
  },
});
