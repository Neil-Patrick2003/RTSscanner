import { useCameraPermissions } from 'expo-camera';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Camera,
  CircleAlert,
  CircleCheck,
  QrCode,
  ScanLine as ScanIcon,
  X,
  Zap,
  ZapOff,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
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
import { TopBar } from '@/components/top-bar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { scanReturn, type ScanReturnResult } from '@/lib/api';

const RETICLE = 260;
/** The camera feed is its own dark context, so the scrim is fixed, not themed. */
const SCRIM = 'rgba(0, 0, 0, 0.58)';
/** Emerald that reads on the camera feed in both themes. */
const ACCENT = '#34D399';

type Phase = 'scanning' | 'confirm' | 'submitting' | 'result';

/** Scales in from a still-visible 0.9 so it animates without ever being hidden. */
function Pop({ children }: PropsWithChildren) {
  const scale = useSharedValue(0.9);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 13, stiffness: 190 });
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Sweeping guide line — the one piece of motion that tells the user we're live. */
function ScanLine() {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(
      withTiming(RETICLE - 6, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[styles.scanLine, style]} />;
}

function Corner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  return <View style={[styles.corner, styles[position]]} />;
}

function RoundControl({
  icon,
  label,
  active,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      hitSlop={Spacing[2]}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundControl,
        { backgroundColor: active ? ACCENT : 'rgba(255,255,255,0.16)' },
        pressed && styles.pressed,
      ]}>
      <Icon as={icon} color={active ? '#04241A' : '#FFFFFF'} />
    </Pressable>
  );
}

/** "Mark as returned?" over the paused camera: a popup, not a screen of its own. */
function ConfirmReturnModal({
  visible,
  submitting,
  title,
  code,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  submitting: boolean;
  title: string;
  code: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      // Android back button: same as Cancel, but not mid-request.
      onRequestClose={() => !submitting && onCancel()}>
      <View style={styles.modalBackdrop}>
        <Pop>
          <View
            accessibilityViewIsModal
            style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalIcon, { backgroundColor: theme.badgeActive }]}>
              <Icon as={QrCode} size={26} tone="primary" />
            </View>
            <ThemedText type="eyebrow" tone="primary">
              Confirm return
            </ThemedText>
            <ThemedText type="pageTitle" style={styles.center}>
              Mark as returned?
            </ThemedText>
            <ThemedText tone="textSecondary" style={styles.center}>
              This order in {title} will be marked as returned.
            </ThemedText>

            {code ? (
              <View style={[styles.codeChip, { backgroundColor: theme.badge }]}>
                <Icon as={QrCode} size={14} tone="textSecondary" />
                <ThemedText type="code" tone="textSecondary" numberOfLines={1} selectable>
                  {code}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Button
                label={submitting ? 'Recording…' : 'Mark as Returned'}
                trailingIcon={CircleCheck}
                loading={submitting}
                onPress={onConfirm}
              />
              <Button label="Cancel" variant="secondary" style={styles.tall} disabled={submitting} onPress={onCancel} />
            </View>
          </View>
        </Pop>
      </View>
    </Modal>
  );
}

export default function ScannerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [torch, setTorch] = useState(false);
  const [result, setResult] = useState<ScanReturnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  // Guards against the camera firing onBarcodeScanned multiple times for one code.
  const handledRef = useRef(false);

  // Ask for camera access automatically when we land on the screen.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // A scan only stages the code; nothing is sent until the user confirms.
  const handleScanned = useCallback(({ data }: { data: string }) => {
    if (handledRef.current) return;
    handledRef.current = true;
    setTorch(false);
    setCode(data.trim());
    setPhase('confirm');
  }, []);

  const confirmReturn = useCallback(async () => {
    if (!code) return;
    setPhase('submitting');
    try {
      const res = await scanReturn({ shop_id: id, tracking_code: code });
      setResult(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed.');
      setResult(null);
    } finally {
      setPhase('result');
    }
  }, [id, code]);

  const scanAgain = useCallback(() => {
    handledRef.current = false;
    setResult(null);
    setError(null);
    setCode(null);
    setPhase('scanning');
  }, []);

  const title = name ?? `Shop #${id}`;

  // --- Live scanning: the camera feed fills the screen, no top bar. It stays behind the
  // confirmation popup, so cancelling drops straight back into scanning. ---
  if (permission?.granted && (phase === 'scanning' || phase === 'confirm' || phase === 'submitting')) {
    return (
      <View style={styles.cameraWrapper}>
        <Stack.Screen options={{ title }} />
        <QrCamera
          style={StyleSheet.absoluteFill}
          enableTorch={torch}
          onBarcodeScanned={phase === 'scanning' ? handleScanned : undefined}
        />

        {/* Scrim mask: dims everything except the reticle. */}
        <View style={styles.mask} pointerEvents="box-none">
          <View style={[styles.maskBlock, { paddingTop: insets.top + Spacing[4] }]}>
            <View style={styles.banner}>
              <ThemedText type="eyebrow" style={styles.bannerLabel}>
                Scanning for
              </ThemedText>
              <ThemedText type="pageTitle" style={styles.white} numberOfLines={1}>
                {title}
              </ThemedText>
            </View>
          </View>

          <View style={styles.maskMiddle}>
            <View style={styles.maskSide} />
            <View style={styles.reticle}>
              <Corner position="tl" />
              <Corner position="tr" />
              <Corner position="bl" />
              <Corner position="br" />
              <ScanLine />
            </View>
            <View style={styles.maskSide} />
          </View>

          <View style={[styles.maskBlock, styles.maskBottom]}>
            <ThemedText style={styles.hint}>Align the QR code inside the frame</ThemedText>
          </View>
        </View>

        {/* Controls */}
        <View style={[styles.controls, { bottom: insets.bottom + Spacing[6] }]}>
          <RoundControl icon={X} label="Cancel scanning" onPress={() => router.back()} />
          <View style={styles.controlSpacer}>
            <ThemedText type="sectionLabel" style={styles.controlsHint}>
              QR only
            </ThemedText>
          </View>
          <RoundControl
            icon={torch ? Zap : ZapOff}
            label={torch ? 'Turn torch off' : 'Turn torch on'}
            active={torch}
            onPress={() => setTorch((on) => !on)}
          />
        </View>

        <ConfirmReturnModal
          visible={phase !== 'scanning'}
          submitting={phase === 'submitting'}
          title={title}
          code={code}
          onConfirm={confirmReturn}
          onCancel={scanAgain}
        />
      </View>
    );
  }

  let body;
  if (!permission) {
    // Permission still loading
    body = (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  } else if (!permission.granted) {
    // Browsers can't open their own settings page, so a blocked camera needs instructions instead.
    const blockedOnWeb = Platform.OS === 'web' && !permission.canAskAgain;
    body = (
      <View style={styles.flex}>
        <EmptyState
          icon={Camera}
          title="Camera access required"
          description={
            blockedOnWeb
              ? "Camera access is blocked for this site. Allow it from your browser's site settings, then reload."
              : 'RTS Scanner reads return QR codes through the camera. Nothing is recorded or stored.'
          }
        />
        <View style={[styles.actions, { paddingBottom: insets.bottom + Spacing[4] }]}>
          {blockedOnWeb ? (
            <Button label="Reload" onPress={() => window.location.reload()} />
          ) : (
            <Button
              label={permission.canAskAgain ? 'Allow Camera' : 'Open Settings'}
              onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
            />
          )}
        </View>
      </View>
    );
  } else {
    // Result (success or error)
    const isSuccess = !error;
    const tone = isSuccess
      ? { bg: theme.approvedFill, border: theme.approvedBorder, fg: theme.approved }
      : { bg: theme.rejectedFill, border: theme.rejectedBorder, fg: theme.rejected };

    body = (
      <View style={styles.flex}>
        <View style={styles.resultBody}>
          <Pop>
            <View style={[styles.resultCircle, { backgroundColor: tone.bg, borderColor: tone.border }]}>
              <Icon as={isSuccess ? CircleCheck : CircleAlert} size={36} color={tone.fg} />
            </View>
          </Pop>
          <ThemedText type="eyebrow" style={{ color: tone.fg }}>
            {isSuccess ? 'Return recorded' : 'Not recorded'}
          </ThemedText>
          <ThemedText type="pageTitle" style={styles.center}>
            {isSuccess ? 'All done' : "Couldn't record"}
          </ThemedText>
          <ThemedText tone="textSecondary" style={[styles.center, styles.message]}>
            {isSuccess ? result?.message : error}
          </ThemedText>

          {code ? (
            <View style={[styles.codeChip, { backgroundColor: theme.badge }]}>
              <Icon as={QrCode} size={14} tone="textSecondary" />
              <ThemedText type="code" tone="textSecondary" numberOfLines={1} selectable>
                {code}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={[styles.actions, { paddingBottom: insets.bottom + Spacing[4] }]}>
          <Button label="Scan Another" trailingIcon={ScanIcon} onPress={scanAgain} />
          <Button label="Back to Shops" variant="secondary" style={styles.tall} onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <ThemedView style={[styles.flex, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title }} />
      <View style={styles.content}>
        <TopBar title={title} back />
        {body}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    padding: Spacing[6],
  },
  center: {
    textAlign: 'center',
  },
  white: {
    color: '#FFFFFF',
  },

  // Result screen
  resultBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[8],
  },
  resultCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
  },
  message: {
    maxWidth: 300,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Radius.sm,
    marginTop: Spacing[3],
  },
  actions: {
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
  },
  tall: {
    height: 48,
  },

  // Confirmation popup
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[1],
  },
  modalActions: {
    alignSelf: 'stretch',
    gap: Spacing[2],
    marginTop: Spacing[4],
  },

  // Camera
  cameraWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  mask: {
    ...StyleSheet.absoluteFill,
  },
  maskBlock: {
    flex: 1,
    backgroundColor: SCRIM,
    alignItems: 'center',
  },
  maskMiddle: {
    flexDirection: 'row',
    height: RETICLE,
  },
  maskSide: {
    flex: 1,
    backgroundColor: SCRIM,
  },
  maskBottom: {
    paddingTop: Spacing[6],
  },
  banner: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing[6],
  },
  bannerLabel: {
    color: ACCENT,
  },
  hint: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    paddingHorizontal: Spacing[6],
  },
  reticle: {
    width: RETICLE,
    height: RETICLE,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: ACCENT,
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: Radius.lg },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: Radius.lg },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: Radius.lg,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: Radius.lg,
  },
  scanLine: {
    position: 'absolute',
    left: Spacing[2],
    right: Spacing[2],
    height: 2,
    borderRadius: 1,
    backgroundColor: ACCENT,
    opacity: 0.9,
  },
  controls: {
    position: 'absolute',
    left: Spacing[6],
    right: Spacing[6],
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlSpacer: {
    flex: 1,
    alignItems: 'center',
  },
  controlsHint: {
    color: 'rgba(255,255,255,0.55)',
  },
  roundControl: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
