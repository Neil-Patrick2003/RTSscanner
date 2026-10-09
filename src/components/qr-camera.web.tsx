import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import type { QrCameraProps } from './qr-camera';

/**
 * Web QR camera. expo-camera's web CameraView opens the stream without a resolution (browsers
 * fall back to ~640x480) and never applies continuous autofocus, so QR codes come out blurry.
 * This opens the back camera in HD with continuous focus and scans with BarcodeDetector.
 */

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

const SCAN_INTERVAL_MS = 150;

async function createDetector(): Promise<Detector> {
  const Native = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  if (Native) return new Native({ formats: ['qr_code'] });
  // Safari/Firefox have no BarcodeDetector; the ponyfill decodes with ZXing (WebAssembly).
  const { BarcodeDetector } = await import('barcode-detector/ponyfill');
  return new BarcodeDetector({ formats: ['qr_code'] });
}

/** Best effort: browsers that don't support a constraint just ignore it. */
async function applyAdvanced(track: MediaStreamTrack, constraint: Record<string, unknown>) {
  try {
    await track.applyConstraints({ advanced: [constraint as MediaTrackConstraintSet] });
  } catch {
    // Unsupported on this device.
  }
}

export function QrCamera({ style, enableTorch, onBarcodeScanned }: QrCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  // The scan loop reads the latest callback without restarting the camera.
  const onScanRef = useRef(onBarcodeScanned);
  useEffect(() => {
    onScanRef.current = onBarcodeScanned;
  }, [onBarcodeScanned]);

  // Open the camera once per mount.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch (e) {
        console.warn('Could not open camera:', e);
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      const caps = (track.getCapabilities?.() ?? {}) as { focusMode?: string[] };
      if (caps.focusMode?.includes('continuous')) {
        await applyAdvanced(track, { focusMode: 'continuous' });
      }

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play().catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
      trackRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Torch (Android Chrome only; iOS Safari doesn't expose it).
  useEffect(() => {
    const track = trackRef.current;
    const caps = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
    if (track && caps.torch) applyAdvanced(track, { torch: !!enableTorch });
  }, [enableTorch]);

  // Scan loop: runs only while a callback is attached.
  const scanning = !!onBarcodeScanned;
  useEffect(() => {
    if (!scanning) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    (async () => {
      const detector = await createDetector();
      const tick = async () => {
        if (stopped) return;
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          try {
            const [code] = await detector.detect(video);
            if (code?.rawValue && !stopped) onScanRef.current?.({ data: code.rawValue });
          } catch {
            // Frame not ready; try the next one.
          }
        }
        timer = setTimeout(tick, SCAN_INTERVAL_MS);
      };
      tick();
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [scanning]);

  return (
    <View style={style}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000' }}
      />
    </View>
  );
}
