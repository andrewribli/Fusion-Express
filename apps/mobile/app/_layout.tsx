import { StyleSheet, Text, View } from "react-native";
// NativeWind expects class-based dark mode; set before CSS/interop boots.
(
  StyleSheet as typeof StyleSheet & {
    setFlag?: (key: string, value: string) => void;
  }
).setFlag?.("darkMode", "class");

import "../global.css";
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  useFonts,
} from "@expo-google-fonts/montserrat";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "../src/ErrorBoundary";
import { AuthProvider } from "../src/auth";
import { CartProvider } from "../src/cart";
import { ensureNativeFirebaseAuth } from "../src/firebase";

// Install RN Auth persistence before any child calls getAuthClient().
ensureNativeFirebaseAuth();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-page">
        <Text className="font-sans text-muted">Loading…</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerTintColor: "#ED1C24",
              headerTitleStyle: { fontFamily: "Montserrat_600SemiBold" },
              contentStyle: { backgroundColor: "#f3f4f6" },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="menu" options={{ title: "Menu" }} />
            <Stack.Screen name="cart" options={{ title: "Cart" }} />
            <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
            <Stack.Screen name="track" options={{ title: "Track order" }} />
          </Stack>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
