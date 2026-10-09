import type { LucideIcon } from 'lucide-react-native';

import { IconSize, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconProps = {
  as: LucideIcon;
  tone?: ThemeColor;
  /** Raw color, for icons on the camera feed where theme colors don't apply. */
  color?: string;
  size?: number;
};

/** Lucide icon at the Artemis 1.75px stroke. */
export function Icon({ as: Component, tone = 'text', color, size = IconSize.topBar }: IconProps) {
  const theme = useTheme();
  return (
    <Component
      size={size}
      strokeWidth={IconSize.strokeWidth}
      absoluteStrokeWidth
      color={color ?? theme[tone]}
    />
  );
}
