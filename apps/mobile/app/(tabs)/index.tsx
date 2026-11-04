import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-page px-6 pt-10">
      <Text className="font-sans-bold text-4xl text-fusion">GraceRun</Text>
      <Text className="mt-2 font-sans text-base text-gray-600">
        Groceries. Delivered with grace.
      </Text>

      <Link href="/menu" asChild>
        <Pressable className="mt-10 rounded-2xl bg-fusion py-4 shadow-sm">
          <Text className="text-center font-sans-semibold text-lg text-white">
            Order
          </Text>
        </Pressable>
      </Link>

      <Link href="/(tabs)/runner" asChild>
        <Pressable className="mt-3 rounded-2xl border-2 border-fusion bg-white py-4">
          <Text className="text-center font-sans-semibold text-lg text-fusion">
            Runner
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
