import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  useFonts,
} from '@expo-google-fonts/geist';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

function navigationTheme(scheme: 'light' | 'dark'): typeof DefaultTheme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = Colors[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
    fonts: {
      regular: { fontFamily: FontFamily.regular, fontWeight: '400' },
      medium: { fontFamily: FontFamily.medium, fontWeight: '500' },
      bold: { fontFamily: FontFamily.semibold, fontWeight: '600' },
      heavy: { fontFamily: FontFamily.bold, fontWeight: '700' },
    },
  };
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

  // Keep the native splash up until Geist is ready (AnimatedSplashOverlay hides it).
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme(scheme)}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Every screen draws its own TopBar, like the Creatives Tracker. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors[scheme].background } }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="tutorial" />
        <Stack.Screen name="shops" />
        <Stack.Screen name="scanner/[id]" />
      </Stack>
      <AnimatedSplashOverlay />
    </ThemeProvider>
  );
}
