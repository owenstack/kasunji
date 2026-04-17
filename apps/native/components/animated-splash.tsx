import { Ionicons } from "@expo/vector-icons";
import { useConvexAuth } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Button, useThemeColor } from "heroui-native";
import { useToast } from "heroui-native";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { signIn } from "@/lib/auth-client";

SplashScreen.preventAutoHideAsync().catch(() => {});

const SPLASH_BG = "#ebebd3";
const SPLASH_ICON = require("@/assets/images/splash-icon.png");

type Props = {
  children: React.ReactNode;
};

export function AnimatedSplashScreen({ children }: Props) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const { toast } = useToast();

  const insets = useSafeAreaInsets();
  const foregroundColor = useThemeColor("foreground");
  const backgroundColor = useThemeColor("background");

  // Shared values for splash overlay
  const overlayOpacity = useSharedValue(1);
  const overlayTranslateY = useSharedValue(0);

  // Shared values for logo (unauthenticated flow)
  const logoTranslateY = useSharedValue(0);
  const logoScale = useSharedValue(1);

  // Shared values for sign-in UI
  const signInOpacity = useSharedValue(0);

  // Track when auth state is known
  useEffect(() => {
    if (!isLoading) {
      setAuthChecked(true);
    }
  }, [isLoading]);

  const finishSplash = useCallback(() => {
    setSplashDone(true);
  }, []);

  // Once auth is checked, hide native splash and animate
  useEffect(() => {
    if (!authChecked) return;

    SplashScreen.hideAsync();

    if (isAuthenticated) {
      // Authenticated: fade out + slide down
      overlayOpacity.value = withTiming(0, { duration: 600 });
      overlayTranslateY.value = withTiming(80, { duration: 600 }, (finished) => {
        if (finished) scheduleOnRN(finishSplash);
      });
    } else {
      // Unauthenticated: fade out background, lift logo, show sign-in
      overlayOpacity.value = withTiming(0, { duration: 500 });
      logoTranslateY.value = withTiming(-120, { duration: 600 });
      logoScale.value = withTiming(0.8, { duration: 600 });
      signInOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    }
  }, [authChecked, isAuthenticated]);

  // When user signs in successfully, dismiss the sign-in overlay
  useEffect(() => {
    if (authChecked && isAuthenticated && !splashDone) {
      signInOpacity.value = withTiming(0, { duration: 300 });
      logoTranslateY.value = withTiming(0, { duration: 400 });
      logoScale.value = withTiming(1, { duration: 400 });
      overlayOpacity.value = withTiming(0, { duration: 400 }, (finished) => {
        if (finished) scheduleOnRN(finishSplash);
      });
    }
  }, [isAuthenticated, authChecked, splashDone]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ translateY: overlayTranslateY.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoTranslateY.value }, { scale: logoScale.value }],
  }));

  const signInStyle = useAnimatedStyle(() => ({
    opacity: signInOpacity.value,
  }));

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    const { error } = await signIn.social({
      provider: "google",
    });
    router.replace("/");
    if (error) {
      setSigningIn(false);
      toast.show({
        variant: "danger",
        label: "Sign in error",
        description: error.message,
        icon: <Ionicons name="alert-circle" size={24} className="text-danger" />,
      });
    }
  };

  // After splash is done and user is authenticated, render only children
  if (splashDone && isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <View className="flex-1">
      {children}

      {/* Full-screen splash overlay (for authenticated fade-out) */}
      {!splashDone && (
        <Animated.View
          className="absolute inset-0 justify-center items-center"
          style={[{ backgroundColor: SPLASH_BG }, overlayStyle]}
          pointerEvents="none"
        />
      )}

      {/* Logo + sign-in layer (stays for unauthenticated) */}
      {!splashDone || !isAuthenticated ? (
        <View
          className="absolute inset-0 justify-start items-center pt-[40%]"
          style={{ backgroundColor }}
          pointerEvents="box-none"
        >
          <Animated.View className="items-center" style={logoStyle}>
            <Image source={SPLASH_ICON} style={{ width: 200, height: 200 }} contentFit="contain" />
          </Animated.View>

          {!isAuthenticated && (
            <Animated.View
              className="absolute left-0 right-0 items-center px-8"
              style={[{ bottom: insets.bottom + 40 }, signInStyle]}
              pointerEvents={authChecked && !isAuthenticated ? "auto" : "none"}
            >
              <Text className="text-2xl font-bold mb-1" style={{ color: foregroundColor }}>
                Welcome to Kasunji
              </Text>
              <Text className="text-base opacity-60" style={{ color: foregroundColor }}>
                Sign in to get started
              </Text>
              <Button
                onPress={handleGoogleSignIn}
                className="w-full max-w-xs mt-6"
                isDisabled={signingIn}
              >
                <Ionicons name="logo-google" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Button.Label>{signingIn ? "Signing in..." : "Continue with Google"}</Button.Label>
              </Button>
            </Animated.View>
          )}
        </View>
      ) : null}
    </View>
  );
}
