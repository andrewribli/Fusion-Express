import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CartProvider } from "../src/cart";

export default function RootLayout() {
  return (
    <CartProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerTintColor: "#ED1C24" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="menu" options={{ title: "Menu" }} />
        <Stack.Screen name="cart" options={{ title: "Cart" }} />
        <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
        <Stack.Screen name="track" options={{ title: "Track order" }} />
      </Stack>
    </CartProvider>
  );
}
