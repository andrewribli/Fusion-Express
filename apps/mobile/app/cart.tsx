import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  calculateDeliveryFee,
  cartTotalWeightKg,
} from "@fusion-express/shared/delivery";
import { formatMenuPrice } from "@fusion-express/shared/types";
import { useCart } from "../src/cart";

export default function CartScreen() {
  const { items, subtotal, setQuantity } = useCart();
  const weightKg = cartTotalWeightKg(items);
  const fee = calculateDeliveryFee({ weightKg, college: "" });

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-4">
      {items.length === 0 ? (
        <Text className="text-gray-500">Cart is empty.</Text>
      ) : (
        items.map(({ item, quantity }) => (
          <View key={item.id} className="mb-3 rounded-2xl border border-gray-100 p-3">
            <Text className="font-semibold">{item.name}</Text>
            <Text className="text-sm text-gray-500">
              {formatMenuPrice(item)} · {quantity} × {item.weightKg} kg
            </Text>
            <View className="mt-2 flex-row">
              <Pressable
                className="mr-2 rounded-lg border border-gray-200 px-3 py-1"
                onPress={() => setQuantity(item.id, quantity - 1)}
              >
                <Text>-</Text>
              </Pressable>
              <Pressable
                className="rounded-lg border border-gray-200 px-3 py-1"
                onPress={() => setQuantity(item.id, quantity + 1)}
              >
                <Text>+</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <View className="mt-4 rounded-2xl bg-gray-50 p-4">
        <Text className="font-semibold">Delivery fee (select college at checkout)</Text>
        <Text className="mt-1 text-sm text-gray-600">
          Base ${fee.baseFee} · weight {fee.weightKg} kg · extra kg {fee.extraKg} × $3
        </Text>
        <Text className="mt-1 text-sm text-gray-600">
          Zone defaults to medium (+${fee.distanceSurcharge}) until college is set.
        </Text>
        <Text className="mt-2 font-bold">
          Items ${subtotal} + delivery ${fee.deliveryFee}
        </Text>
      </View>

      {items.length > 0 ? (
        <Link href="/checkout" asChild>
          <Pressable className="mt-6 rounded-2xl bg-fusion py-4">
            <Text className="text-center text-lg font-semibold text-white">
              Checkout
            </Text>
          </Pressable>
        </Link>
      ) : null}
    </ScrollView>
  );
}
