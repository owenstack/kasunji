import { useAuth } from "@clerk/expo";
import * as SplashScreen from "expo-splash-screen";
import { useThemeColor } from "heroui-native";
import { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthForm } from "@/components/auth-form";

SplashScreen.preventAutoHideAsync().catch(() => {});

const SPLASH_BG = "#ebebd3";
const SPLASH_ICON = require("@/assets/images/splash-icon.png");

type Props = {
  children: React.ReactNode;
};

export function AnimatedSplashScreen({ children }: Props) {
  const { isSignedIn, isLoaded } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor("background");
  const overlayOpacity = useSharedValue(1);
  const overlayTranslateY = useSharedValue(0);
  const logoTranslateY = useSharedValue(0);
  const logoScale = useSharedValue(1);
  const signInOpacity = useSharedValue(0);

  useEffect(() => {
    if (isLoaded) {
      setAuthChecked(true);
    }
  }, [isLoaded]);

  const finishSplash = useCallback(() => {
    setSplashDone(true);
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    SplashScreen.hideAsync();

    if (isSignedIn) {
      overlayOpacity.value = withTiming(0, { duration: 600 });
      overlayTranslateY.value = withTiming(80, { duration: 600 }, (finished) => {
        if (finished) scheduleOnRN(finishSplash);
      });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 500 });
      logoTranslateY.value = withTiming(-120, { duration: 600 });
      logoScale.value = withTiming(0.8, { duration: 600 });
      signInOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    }
  }, [authChecked, isSignedIn]);

  useEffect(() => {
    if (authChecked && isSignedIn && !splashDone) {
      signInOpacity.value = withTiming(0, { duration: 300 });
      logoTranslateY.value = withTiming(0, { duration: 400 });
      logoScale.value = withTiming(1, { duration: 400 });
      overlayOpacity.value = withTiming(0, { duration: 400 }, (finished) => {
        if (finished) scheduleOnRN(finishSplash);
      });
    }
  }, [isSignedIn, authChecked, splashDone]);

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

  if (splashDone && isSignedIn) {
    return <>{children}</>;
  }

  return (
    <View className="flex-1">
      {children}
      {!splashDone && (
        <Animated.View
          className="absolute inset-0 justify-center items-center"
          style={[{ backgroundColor: SPLASH_BG }, overlayStyle]}
          pointerEvents="none"
        />
      )}
      {!splashDone || !isSignedIn ? (
        <View className="absolute inset-0" style={{ backgroundColor }} pointerEvents="box-none">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, alignItems: "center", paddingTop: "30%" }}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View className="items-center" style={logoStyle}>
              <Image
                source={SPLASH_ICON}
                style={{ width: 200, height: 200 }}
                resizeMode="contain"
              />
            </Animated.View>

            {!isSignedIn && (
              <Animated.View
                className="w-full px-8 mt-4"
                style={signInStyle}
                pointerEvents={authChecked && !isSignedIn ? "auto" : "none"}
              >
                <AuthForm />
                <View style={{ height: insets.bottom + 20 }} />
              </Animated.View>
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
