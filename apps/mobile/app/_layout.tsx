import "../global.css";
import { Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

console.error("[GRACERUN_BOOT] minimal layout loaded");

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>GRACERUN BOOT TEST — step 1</Text>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 40, backgroundColor: "#fff" },
  text: { fontSize: 18, fontWeight: "bold" },
});
