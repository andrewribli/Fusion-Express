import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#ED1C24",
        tabBarInactiveTintColor: "#9ca3af",
        headerTintColor: "#ED1C24",
        headerTitleStyle: { fontFamily: "Montserrat_600SemiBold" },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Montserrat_500Medium",
        },
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#f3f4f6",
        },
        headerStyle: { backgroundColor: "#ffffff" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Shop Now" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="runner" options={{ title: "Runner" }} />
    </Tabs>
  );
}
