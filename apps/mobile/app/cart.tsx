import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  calculateDeliveryFee,
  cartTotalWeightKg,
  WEIGHT_SURCHARGE_PER_KG,
} from "@fusion-express/shared/delivery";
import { formatMenuPrice } from "@fusion-express/shared/types";
import { resolveProductImageUrl } from "@fusion-express/shared/products";
import { isOverOrderLimit, MAX_ORDER_VALUE } from "@fusion-express/shared";
import { useCart } from "../src/cart";
import { ProductImage } from "../src/ProductImage";
import type { RootStackParamList } from "../src/navigation";
import {
  Card,
  EmptyState,
  Page,
  PrimaryButton,
  ScreenHeader,
} from "../src/ui";

export default function CartScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, subtotal, setQuantity } = useCart();
  const weightKg = cartTotalWeightKg(items);
  const fee = calculateDeliveryFee({ weightKg, college: "" });
  const overLimit = isOverOrderLimit(subtotal);

  return (
    <Page>
      <ScreenHeader title="Cart" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4 pb-28"
      >
        {items.length === 0 ? (
          <EmptyState
            title="Your cart is empty"
            body="Add groceries from the shop, then come back to check out."
            actionLabel="Browse shop"
            onAction={() => navigation.navigate("Tabs")}
          />
        ) : (
          items.map(({ item, quantity }) => {
            const uri = resolveProductImageUrl(item.image);
            return (
              <Card key={item.id} className="mb-3 flex-row gap-3 p-3">
                <ProductImage uri={uri || undefined} size={64} />
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-sm font-bold text-gray-900"
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  <Text className="mt-1 text-xs text-gray-500">
                    {formatMenuPrice(item)} · {item.weightKg} kg each
                  </Text>
                  <View className="mt-2 flex-row items-center gap-2">
                    <Pressable
                      className="h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white"
                      onPress={() => setQuantity(item.id, quantity - 1)}
                    >
                      <Text className="text-lg font-semibold text-gray-900">
                        −
                      </Text>
                    </Pressable>
                    <Text className="min-w-[20px] text-center text-sm font-bold text-gray-900">
                      {quantity}
                    </Text>
                    <Pressable
                      className="h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white"
                      onPress={() => setQuantity(item.id, quantity + 1)}
                    >
                      <Text className="text-lg font-semibold text-gray-900">
                        +
                      </Text>
                    </Pressable>
                    <Pressable
                      className="ml-auto px-2 py-1"
                      onPress={() => setQuantity(item.id, 0)}
                    >
                      <Text className="text-xs font-semibold text-fusion">
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })
        )}

        {items.length > 0 ? (
          <Card className="mt-1">
            <Text className="text-sm font-semibold text-gray-500">
              Delivery estimate
            </Text>
            <Text className="mt-2 text-sm text-gray-600">
              Base ${fee.baseFee} · weight {fee.weightKg} kg · extra kg{" "}
              {fee.extraKg} × ${WEIGHT_SURCHARGE_PER_KG}
            </Text>
            <Text className="mt-1 text-xs text-gray-500">
              Zone defaults to medium (+${fee.distanceSurcharge}) until college
              is set at checkout. Bags over 5 kg may get a runner heavy-bag
              surcharge.
            </Text>
            <Text className="mt-3 text-base font-extrabold text-fusion">
              Items ${subtotal} + delivery ${fee.deliveryFee}
            </Text>
            {overLimit ? (
              <Text className="mt-2 text-sm text-red-600">
                Cart is over the ${MAX_ORDER_VALUE} grocery limit — remove items
                to continue.
              </Text>
            ) : null}
          </Card>
        ) : null}
      </ScrollView>

      {items.length > 0 ? (
        <View className="border-t border-gray-200 bg-white px-4 py-3">
          <PrimaryButton
            label="Checkout"
            disabled={overLimit}
            onPress={() => navigation.navigate("Checkout")}
          />
        </View>
      ) : null}
    </Page>
  );
}
