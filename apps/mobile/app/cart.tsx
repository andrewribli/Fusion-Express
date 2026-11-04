import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  calculateDeliveryFee,
  cartTotalWeightKg,
} from "@fusion-express/shared/delivery";
import { formatMenuPrice } from "@fusion-express/shared/types";
import { useCart } from "../src/cart";
import { ProductImage } from "../src/ProductImage";

export default function CartScreen() {
  const { items, subtotal, setQuantity } = useCart();
  const weightKg = cartTotalWeightKg(items);
  const fee = calculateDeliveryFee({ weightKg, college: "" });

  return (
    <ScrollView className="flex-1 bg-page px-4 pt-4">
      {items.length === 0 ? (
        <Text className="font-sans text-muted">Cart is empty.</Text>
      ) : (
        items.map(({ item, quantity }) => (
          <View
            key={item.id}
            className="mb-3 flex-row items-center rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
          >
            <ProductImage image={item.image} size={56} />
            <View className="ml-3 flex-1">
              <Text
                className="font-sans-semibold text-sm text-ink"
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <Text className="mt-0.5 font-sans text-xs text-muted">
                {formatMenuPrice(item)} · {item.weightKg} kg
              </Text>
              <View className="mt-2 flex-row items-center self-start overflow-hidden rounded-full border border-red-200 bg-white">
                <Pressable
                  className="px-3 py-1"
                  onPress={() => setQuantity(item.id, quantity - 1)}
                >
                  <Text className="font-sans-bold text-fusion">−</Text>
                </Pressable>
                <Text className="min-w-[28px] text-center font-sans-semibold text-sm text-ink">
                  {quantity}
                </Text>
                <Pressable
                  className="px-3 py-1"
                  onPress={() => setQuantity(item.id, quantity + 1)}
                >
                  <Text className="font-sans-bold text-fusion">+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}

      <View className="mt-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <Text className="font-sans-semibold text-ink">
          Delivery fee (select college at checkout)
        </Text>
        <Text className="mt-1 font-sans text-sm text-gray-600">
          Base ${fee.baseFee} · weight {fee.weightKg} kg · extra kg {fee.extraKg}{" "}
          × $3
        </Text>
        <Text className="mt-1 font-sans text-sm text-gray-600">
          Zone defaults to medium (+${fee.distanceSurcharge}) until college is
          set.
        </Text>
        <Text className="mt-2 font-sans-bold text-base text-ink">
          Items ${subtotal} + delivery ${fee.deliveryFee}
        </Text>
      </View>

      {items.length > 0 ? (
        <Link href="/checkout" asChild>
          <Pressable className="mb-10 mt-6 rounded-2xl bg-fusion py-4 shadow-sm">
            <Text className="text-center font-sans-semibold text-lg text-white">
              Checkout
            </Text>
          </Pressable>
        </Link>
      ) : null}
    </ScrollView>
  );
}
