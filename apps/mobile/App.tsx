import "./global.css";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ErrorBanner } from "./src/ErrorBanner";
import { ErrorBoundary } from "./src/ErrorBoundary";
import { AuthProvider } from "./src/auth";
import { CartProvider } from "./src/cart";
import type { RootStackParamList, TabsParamList } from "./src/navigation";
import HomeScreen from "./app/(tabs)/index";
import OrdersScreen from "./app/(tabs)/orders";
import ProfileScreen from "./app/(tabs)/profile";
import RunnerScreen from "./app/(tabs)/runner";
import MenuScreen from "./app/menu";
import CartScreen from "./app/cart";
import CheckoutScreen from "./app/checkout";
import TrackScreen from "./app/track";

const Tab = createBottomTabNavigator<TabsParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ED1C24",
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
          <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
          <ErrorBanner />
          <NavigationContainer>
            <StatusBar style="dark" />
            <Stack.Navigator>
              <Stack.Screen
                name="Tabs"
                component={Tabs}
                options={{ headerShown: false }}
              />
              <Stack.Screen name="Menu" component={MenuScreen} />
              <Stack.Screen name="Cart" component={CartScreen} />
              <Stack.Screen name="Checkout" component={CheckoutScreen} />
              <Stack.Screen name="Track" component={TrackScreen} />
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
