import { CameraView } from 'expo-camera';
import type { StyleProp, ViewStyle } from 'react-native';

export type QrCameraProps = {
  style?: StyleProp<ViewStyle>;
  enableTorch?: boolean;
  /** Pass `undefined` to pause scanning (e.g. while a confirmation is open). */
  onBarcodeScanned?: (result: { data: string }) => void;
};

/** Back camera that reports QR codes. The web build has its own implementation (qr-camera.web.tsx). */
export function QrCamera({ style, enableTorch, onBarcodeScanned }: QrCameraProps) {
  return (
    <CameraView
      style={style}
      facing="back"
      enableTorch={enableTorch}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={onBarcodeScanned}
    />
  );
}
