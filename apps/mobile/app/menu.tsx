import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  loadMenuItems,
  resolveProductImageUrl,
} from "@fusion-express/shared/products";
import { formatMenuPrice } from "@fusion-express/shared/types";
import type { MenuItem } from "@fusion-express/shared/types";
import { useCart } from "../src/cart";
import type { RootStackParamList } from "../src/navigation";

export default function MenuScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addItem, itemCount } = useCart();
  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    void loadMenuItems().then(setItems);
  }, []);

  return (
    <View className="flex-1 bg-white">
      <Pressable
        className="mx-4 mt-3 rounded-xl bg-fusion py-3"
        onPress={() => navigation.navigate("Cart")}
      >
        <Text className="text-center font-semibold text-white">
          Cart ({itemCount})
        </Text>
      </Pressable>
      <ScrollView className="mt-3 px-4">
        {items.map((item) => {
          const uri = resolveProductImageUrl(item.image);
          return (
            <View
              key={item.id}
              className="mb-3 flex-row items-center rounded-2xl border border-gray-100 p-3"
            >
              {uri ? (
                <Image
                  source={{ uri }}
                  className="h-16 w-16 rounded-xl bg-gray-50"
                />
              ) : (
                <View className="h-16 w-16 rounded-xl bg-gray-100" />
              )}
              <View className="ml-3 flex-1">
                <Text className="font-semibold">{item.name}</Text>
                <Text className="text-sm text-fusion">{formatMenuPrice(item)}</Text>
                <Text className="text-xs text-gray-400">{item.weightKg} kg</Text>
              </View>
              <Pressable
                className="rounded-xl bg-fusion px-3 py-2"
                onPress={() => addItem(item)}
              >
                <Text className="font-semibold text-white">Add</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
