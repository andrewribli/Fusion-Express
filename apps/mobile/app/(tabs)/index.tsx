import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-white px-6 pt-8">
      <Text className="text-3xl font-bold text-fusion">Fusion Express</Text>
      <Text className="mt-2 text-base text-gray-600">
        Groceries from Fusion to your CUHK lobby.
      </Text>

      <Link href="/menu" asChild>
        <Pressable className="mt-10 rounded-2xl bg-fusion py-4">
          <Text className="text-center text-lg font-semibold text-white">
            Order
          </Text>
        </Pressable>
      </Link>

      <Link href="/(tabs)/runner" asChild>
        <Pressable className="mt-3 rounded-2xl border border-fusion py-4">
          <Text className="text-center text-lg font-semibold text-fusion">
            Runner
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
