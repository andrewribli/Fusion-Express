import { useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  calculateDeliveryFee,
  cartTotalWeightKg,
  PLATFORM_FEE_HKD,
  WEIGHT_SURCHARGE_PER_KG,
} from "@fusion-express/shared/delivery";
import {
  canteenCollegeForRestaurant,
  collegeLabel,
  computeCollegeDiscount,
} from "@fusion-express/shared/canteen-college";
import { createCustomMenuItem } from "@fusion-express/shared";
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
  SecondaryButton,
} from "../src/ui";

const CUSTOM_ITEM_ACCESSORY_ID = "cart-custom-item-done";

export default function CartScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { items, subtotal, setQuantity, addItem } = useCart();
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

  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customError, setCustomError] = useState("");

  function closeCustomModal() {
    Keyboard.dismiss();
    setCustomOpen(false);
  }

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

  function submitCustomItem() {
    setCustomError("");
    const name = customName.trim();
    if (!name) {
      setCustomError("Enter an item name");
      return;
    }
    const parsed = Number.parseFloat(customPrice);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setCustomError("Enter an estimated price (HK$)");
      return;
    }
    addItem(
      createCustomMenuItem(name, {
        estimatedPrice: parsed,
        campus: profile?.campus ?? "cuhk",
      }),
    );
    setCustomName("");
    setCustomPrice("");
    Keyboard.dismiss();
    setCustomOpen(false);
  }

  return (
    <Page>
      <ScreenHeader title="Cart" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4 pb-28"
        keyboardShouldPersistTaps="handled"
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
            const isCustom =
              item.id.startsWith("custom-") || item.subcategory === "custom";
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
                  {isCustom ? (
                    <Text className="mt-0.5 text-xs font-semibold text-amber-700">
                      Custom item · runner confirms price
                    </Text>
                  ) : null}
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

        <Card className="mt-1 mb-3">
          <Pressable
            className="flex-row items-center justify-between"
            onPress={() => {
              setCustomError("");
              setCustomOpen(true);
            }}
          >
            <View className="mr-3 flex-1">
              <Text className="text-sm font-bold text-gray-900">
                + Add Custom Item
              </Text>
              <Text className="mt-0.5 text-xs text-gray-500">
                Can&apos;t find it? Type the name + estimated price — runner
                confirms at checkout.
              </Text>
            </View>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-fusion">
              <Text className="text-xl font-bold text-white">+</Text>
            </View>
          </Pressable>
        </Card>

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
              Items ${subtotal} + delivery ${fee.deliveryFee} + GraceRun $
              {PLATFORM_FEE_HKD}
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
              !canteenOpen
                ? "Canteen closed — checkout paused"
                : canteen
                  ? "Canteen checkout"
                  : "Fusion checkout"
            }
            disabled={overLimit || !canteenOpen}
            onPress={() =>
              navigation.navigate(canteen ? "CanteenCheckout" : "Checkout")
            }
          />
        </View>
      ) : null}

      <Modal
        visible={customOpen}
        transparent
        animationType="slide"
        onRequestClose={closeCustomModal}
      >
        {/*
          Full-screen KAV so the bottom sheet rides above the keyboard.
          Offset 0: modal is its own window (no stack header inside it).
        */}
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <Pressable
            className="flex-1 justify-end bg-black/40"
            onPress={closeCustomModal}
          >
            <Pressable
              className="max-h-[90%] rounded-t-3xl bg-white px-4 pt-4"
              style={{
                paddingBottom: Math.max(insets.bottom, 16),
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                <Text className="text-base font-extrabold text-gray-900">
                  Add custom item
                </Text>
                <Text className="mt-1 text-xs text-gray-500">
                  Runner buys this for you and confirms the real price.
                </Text>
                <Text className="mt-4 text-xs font-medium text-gray-600">
                  Item name
                </Text>
                <TextInput
                  className="mt-1 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
                  placeholder='e.g. "Optimum Nutrition whey 2lb"'
                  placeholderTextColor="#9CA3AF"
                  value={customName}
                  onChangeText={setCustomName}
                  autoFocus
                  returnKeyType="next"
                  blurOnSubmit={false}
                  inputAccessoryViewID={
                    Platform.OS === "ios" ? CUSTOM_ITEM_ACCESSORY_ID : undefined
                  }
                />
                <Text className="mt-3 text-xs font-medium text-gray-600">
                  Estimated price (HK$)
                </Text>
                <TextInput
                  className="mt-1 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
                  placeholder="e.g. 280"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={customPrice}
                  onChangeText={setCustomPrice}
                  inputAccessoryViewID={
                    Platform.OS === "ios" ? CUSTOM_ITEM_ACCESSORY_ID : undefined
                  }
                />
                {customError ? (
                  <Text className="mt-2 text-sm text-fusion">{customError}</Text>
                ) : null}
                <PrimaryButton
                  label="Add to cart"
                  className="mt-4"
                  onPress={submitCustomItem}
                />
                <SecondaryButton
                  label="Cancel"
                  className="mt-2"
                  onPress={closeCustomModal}
                />
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
        {Platform.OS === "ios" ? (
          <InputAccessoryView nativeID={CUSTOM_ITEM_ACCESSORY_ID}>
            <View className="flex-row items-center justify-end border-t border-gray-200 bg-[#F2F2F7] px-3 py-2">
              <Pressable
                onPress={Keyboard.dismiss}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Dismiss keyboard"
              >
                <Text className="text-base font-semibold text-fusion">Done</Text>
              </Pressable>
            </View>
          </InputAccessoryView>
        ) : null}
      </Modal>
    </Page>
  );
}
