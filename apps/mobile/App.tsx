import "react-native-gesture-handler";
import "./global.css";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ErrorBanner } from "./src/ErrorBanner";
import { ErrorBoundary } from "./src/ErrorBoundary";
import { AuthProvider } from "./src/auth";
import { CartProvider } from "./src/cart";
import { NotificationBootstrap } from "./src/NotificationBootstrap";
import { linking, navigationRef } from "./src/linking";
import type { RootStackParamList, TabsParamList } from "./src/navigation";
import HomeScreen from "./app/(tabs)/index";
import OrdersScreen from "./app/(tabs)/orders";
import ProfileScreen from "./app/(tabs)/profile";
import RunnerScreen from "./app/(tabs)/runner";
import MenuScreen from "./app/menu";
import CanteenMenuScreen from "./app/canteen-menu";
import CartScreen from "./app/cart";
import CheckoutScreen from "./app/checkout";
import CanteenCheckoutScreen from "./app/canteen-checkout";
import TrackScreen from "./app/track";
import SupportScreen from "./app/support";
import AdminScreen from "./app/admin";
import AdminSupportScreen from "./app/admin-support";
import AdminSupportThreadScreen from "./app/admin-support-thread";

const Tab = createBottomTabNavigator<TabsParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ED1C24",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#E5E7EB",
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen name="Shop" component={HomeScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Runner" component={RunnerScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <NotificationBootstrap />
          <SafeAreaView style={styles.shell} edges={["top", "bottom"]}>
            <ErrorBanner />
            <NavigationContainer ref={navigationRef} linking={linking}>
              <StatusBar style="dark" />
              <Stack.Navigator
                screenOptions={{
                  headerTintColor: "#ED1C24",
                  headerTitleStyle: { fontWeight: "700", color: "#111111" },
                  headerStyle: { backgroundColor: "#FFFFFF" },
                  contentStyle: { backgroundColor: "#F5F5F5" },
                }}
              >
                <Stack.Screen
                  name="Tabs"
                  component={Tabs}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Menu"
                  component={MenuScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="CanteenMenu"
                  component={CanteenMenuScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Cart"
                  component={CartScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Checkout"
                  component={CheckoutScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="CanteenCheckout"
                  component={CanteenCheckoutScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Track"
                  component={TrackScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Support"
                  component={SupportScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Admin"
                  component={AdminScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="AdminSupport"
                  component={AdminSupportScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="AdminSupportThread"
                  component={AdminSupportThreadScreen}
                  options={{ headerShown: false }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaView>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#F5F5F5" },
});
