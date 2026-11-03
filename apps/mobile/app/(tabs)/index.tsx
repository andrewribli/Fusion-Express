import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList, TabsParamList } from "../../src/navigation";

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabsParamList, "Shop">,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNav>();

  return (
    <View style={styles.root}>
      <Text style={styles.title}>GraceRun</Text>
      <Text style={styles.sub}>Groceries. Delivered with grace.</Text>

      <Pressable
        style={styles.primaryBtn}
        onPress={() => navigation.navigate("Menu")}
      >
        <Text style={styles.primaryLabel}>Order</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate("Runner")}
      >
        <Text style={styles.secondaryLabel}>Runner</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#ED1C24",
  },
  sub: {
    marginTop: 8,
    fontSize: 16,
    color: "#4B5563",
  },
  primaryBtn: {
    marginTop: 40,
    borderRadius: 16,
    backgroundColor: "#ED1C24",
    paddingVertical: 16,
  },
  primaryLabel: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ED1C24",
    paddingVertical: 16,
  },
  secondaryLabel: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#ED1C24",
  },
});
