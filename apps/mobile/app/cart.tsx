import { useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  calculateDeliveryFee,
  cartTotalWeightKg,
  WEIGHT_SURCHARGE_PER_KG,
} from "@fusion-express/shared/delivery";
import {
  canteenCollegeForRestaurant,
  collegeLabel,
  computeCollegeDiscount,
} from "@fusion-express/shared/canteen-college";
import { formatMenuPrice } from "@fusion-express/shared/types";
import { resolveProductImageUrl } from "@fusion-express/shared/products";
import { isOverOrderLimit, MAX_ORDER_VALUE } from "@fusion-express/shared";
import { useAuth } from "../src/auth";
import { useCart } from "../src/cart";
import {
  closedBannerText,
  isCanteenOpenByConfig,
} from "@fusion-express/shared/canteen-hours";
import {
  CANTEEN_DELIVERY_FEE,
  cartRestaurantId,
  isCanteenCart,
} from "../src/canteen/cart";
import { getRestaurant } from "../src/canteen/restaurants";
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
  const { profile } = useAuth();
  const canteen = isCanteenCart(items);
  const restaurantId = cartRestaurantId(items);
  const restaurant = restaurantId ? getRestaurant(restaurantId) : undefined;
  const canteenOpen =
    !canteen || !restaurantId || isCanteenOpenByConfig(restaurantId);
  const closedMessage =
    canteen && restaurant
      ? closedBannerText(restaurant.name, restaurant.id)
      : "";
  const weightKg = cartTotalWeightKg(items);
  const fee = canteen
    ? {
        baseFee: CANTEEN_DELIVERY_FEE,
        weightKg,
        extraKg: 0,
        weightSurcharge: 0,
        distanceSurcharge: 0,
        deliveryFee: CANTEEN_DELIVERY_FEE,
      }
    : calculateDeliveryFee({ weightKg, college: "" });
  const overLimit = !canteen && isOverOrderLimit(subtotal);

  const discountPreview = useMemo(() => {
    if (!canteen || !restaurantId) {
      return { eligible: false, discountAmount: 0, collegeId: null as string | null };
    }
    const canteenCollege = canteenCollegeForRestaurant(restaurantId);
    const { discountApplied, discountAmount } = computeCollegeDiscount(
      subtotal,
      profile?.college,
      canteenCollege,
    );
    return {
      eligible: discountApplied,
      discountAmount,
      collegeId: canteenCollege,
    };
  }, [canteen, restaurantId, subtotal, profile?.college]);

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
            body="Add groceries or canteen dishes from the shop, then come back to check out."
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
                    {formatMenuPrice(item)}
                    {canteen ? "" : ` · ${item.weightKg} kg each`}
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
            {canteen && restaurant ? (
              <Text className="mb-2 text-sm font-bold text-gray-900">
                {restaurant.shortName}
              </Text>
            ) : null}
            <Text className="text-sm font-semibold text-gray-500">
              Delivery estimate
            </Text>
            {canteen ? (
              <Text className="mt-2 text-sm text-gray-600">
                Flat canteen delivery HK${CANTEEN_DELIVERY_FEE}
              </Text>
            ) : (
              <>
                <Text className="mt-2 text-sm text-gray-600">
                  Base ${fee.baseFee} · weight {fee.weightKg} kg · extra kg{" "}
                  {fee.extraKg} × ${WEIGHT_SURCHARGE_PER_KG}
                </Text>
                <Text className="mt-1 text-xs text-gray-500">
                  Zone defaults to medium (+${fee.distanceSurcharge}) until
                  college is set at checkout. Bags over 5 kg may get a runner
                  heavy-bag surcharge.
                </Text>
              </>
            )}
            {canteen && discountPreview.collegeId ? (
              <Text className="mt-2 text-xs text-gray-600">
                {discountPreview.eligible
                  ? `College discount preview (−HK$${discountPreview.discountAmount}): applied when a ${collegeLabel(discountPreview.collegeId)} runner accepts.`
                  : `10% off food if a ${collegeLabel(discountPreview.collegeId)} runner accepts (delivery not discounted).`}
              </Text>
            ) : null}
            <Text className="mt-3 text-base font-extrabold text-fusion">
              Items ${subtotal} + delivery ${fee.deliveryFee}
            </Text>
            {overLimit ? (
              <Text className="mt-2 text-sm text-red-600">
                Cart is over the ${MAX_ORDER_VALUE} grocery limit — remove items
                to continue.
              </Text>
            ) : null}
            {!canteenOpen ? (
              <Text className="mt-2 text-sm text-orange-700">
                {closedMessage} Checkout is paused until it opens.
              </Text>
            ) : null}
          </Card>
        ) : null}
      </ScrollView>

      {items.length > 0 ? (
        <View className="border-t border-gray-200 bg-white px-4 py-3">
          <PrimaryButton
            label={
              canteenOpen ? "Checkout" : "Canteen closed — checkout paused"
            }
            disabled={overLimit || !canteenOpen}
            onPress={() => navigation.navigate("Checkout")}
          />
        </View>
      ) : null}
    </Page>
  );
}
