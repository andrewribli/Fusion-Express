import { useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  calculateDeliveryFee,
  cartTotalWeightKg,
  HEAVY_BAG_THRESHOLD_KG,
  WEIGHT_INCLUDED_KG,
  WEIGHT_SURCHARGE_PER_KG,
  ZONE_LABELS,
} from "@fusion-express/shared/delivery";
import {
  canteenCollegeForRestaurant,
  collegeLabel,
  computeCollegeDiscount,
} from "@fusion-express/shared/canteen-college";
import {
  closedBannerText,
  isCanteenOpenByConfig,
} from "@fusion-express/shared/canteen-hours";
import {
  CUHK_COLLEGES,
  formatDeliveryAddress,
  getHallsForCollege,
  getLobbyForHall,
  type CuhkCollege,
} from "@fusion-express/shared/locations";
import { createOrder } from "@fusion-express/shared/orders";
import {
  getEstimatedDeliveryTime,
  getUnitPrice,
  isOverOrderLimit,
  lineTotal,
  MAX_ORDER_VALUE,
  ORDER_LIMIT_MESSAGE,
} from "@fusion-express/shared";
import { useAuth } from "../src/auth";
import { useCart } from "../src/cart";
import {
  CANTEEN_DELIVERY_FEE,
  cartRestaurantId,
  isCanteenCart,
} from "../src/canteen/cart";
import { getRestaurant } from "../src/canteen/restaurants";
import { notifyOrderPlaced } from "../src/notify-email";
import { notifyOrderEvent } from "../src/notify-push";
import type { RootStackParamList } from "../src/navigation";
import {
  clampSchedule,
  defaultScheduleSlot,
  formatScheduled,
  scheduleBounds,
} from "../src/schedule";
import {
  Card,
  Page,
  PrimaryButton,
  ScreenHeader,
  SectionLabel,
} from "../src/ui";

const NOTES_ACCESSORY_ID = "checkout-notes-done";

export default function CheckoutScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, subtotal, sessionId, clearCart } = useCart();
  const { profile, user, ensureCheckoutAuth } = useAuth();
  const canteen = isCanteenCart(items);
  const restaurantId = cartRestaurantId(items);
  const restaurant = restaurantId ? getRestaurant(restaurantId) : undefined;
  const canteenCollege = canteenCollegeForRestaurant(restaurantId);
  const canteenOpen =
    !canteen || !restaurantId || isCanteenOpenByConfig(restaurantId);
  const closedMessage =
    canteen && restaurant
      ? closedBannerText(restaurant.name, restaurant.id)
      : "";
  const initialCollege: CuhkCollege =
    profile?.college && CUHK_COLLEGES.includes(profile.college as CuhkCollege)
      ? (profile.college as CuhkCollege)
      : CUHK_COLLEGES[0];
  const [college, setCollege] = useState<CuhkCollege>(initialCollege);
  const [hall, setHall] = useState(() => {
    const halls = getHallsForCollege(initialCollege);
    if (profile?.hall && halls.includes(profile.hall)) return profile.hall;
    return halls[0];
  });
  const [customerName, setCustomerName] = useState(profile?.fullName ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timing, setTiming] = useState<"asap" | "schedule">("asap");
  const [scheduledFor, setScheduledFor] = useState(() =>
    clampSchedule(defaultScheduleSlot()),
  );
  const [showPicker, setShowPicker] = useState(false);

  const weightKg = cartTotalWeightKg(items);
  const fee = useMemo(() => {
    if (canteen) {
      return {
        baseFee: CANTEEN_DELIVERY_FEE,
        weightKg,
        extraKg: 0,
        weightSurcharge: 0,
        zone: 1 as const,
        distanceSurcharge: 0,
        deliveryFee: CANTEEN_DELIVERY_FEE,
        heavyBagEligible: false,
      };
    }
    return calculateDeliveryFee({ weightKg, college });
  }, [canteen, weightKg, college]);
  const total = subtotal + fee.deliveryFee;
  const overLimit = !canteen && isOverOrderLimit(subtotal);
  const bounds = scheduleBounds();
  const discountPreview = useMemo(
    () => computeCollegeDiscount(subtotal, college, canteenCollege),
    [subtotal, college, canteenCollege],
  );

  function pickCollege(next: CuhkCollege) {
    setCollege(next);
    setHall(getHallsForCollege(next)[0]);
  }

  async function place() {
    if (items.length === 0) return;
    Keyboard.dismiss();
    setLoading(true);
    setError("");
    try {
      if (overLimit) throw new Error(ORDER_LIMIT_MESSAGE);
      if (!canteenOpen) {
        throw new Error(closedMessage || "This canteen is currently closed.");
      }
      if (!customerName.trim()) throw new Error("Enter your full name");
      if (!college || !hall) throw new Error("Choose your college and hall");
      const when =
        timing === "schedule" ? clampSchedule(scheduledFor) : undefined;
      if (timing === "schedule" && !when) {
        throw new Error("Pick a delivery time within the next 7 days.");
      }

      const auth = await ensureCheckoutAuth();
      const name = customerName.trim();

      const foodSubtotal = items.reduce(
        (sum, line) => sum + lineTotal(line.item, line.quantity),
        0,
      );
      const orderId = await createOrder({
        sessionId,
        customerId: auth.uid,
        customerName: name,
        customerEmail: auth.email || user?.email || undefined,
        campus: "cuhk",
        orderChannel: canteen ? "canteen" : "fusion",
        canteenRestaurantId: canteen ? restaurantId ?? undefined : undefined,
        canteenCollege: canteen
          ? canteenCollege ?? undefined
          : undefined,
        items: items.map(({ item, quantity }) => ({
          itemId: item.id,
          name: item.name,
          price: getUnitPrice(item),
          quantity,
          weightKg: item.weightKg,
          isCustom:
            item.id.startsWith("custom-") || item.subcategory === "custom"
              ? true
              : undefined,
        })),
        status: "pending",
        college,
        hall,
        lobbyPoint: getLobbyForHall(hall),
        zone: fee.zone,
        totalWeight: fee.weightKg,
        customerNote: note.trim() || "None for now",
        subtotal: foodSubtotal,
        deliveryFee: fee.deliveryFee,
        total,
        paymentReceived: false,
        estimatedDeliveryAt: when ?? getEstimatedDeliveryTime(),
        isScheduled: timing === "schedule",
        scheduledFor: when,
      });
      clearCart();
      notifyOrderPlaced(orderId);
      notifyOrderEvent(orderId, "created");
      navigation.replace("Track", { orderId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <ScreenHeader title="Checkout" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-4 pb-28"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <Pressable onPress={Keyboard.dismiss} accessible={false}>
            {items.length === 0 ? (
              <Text className="text-gray-500">
                Cart is empty. Add items from Shop first.
              </Text>
            ) : (
              <>
                <Card>
                  <SectionLabel>Your name</SectionLabel>
                  <TextInput
                    className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
                    value={customerName}
                    onChangeText={setCustomerName}
                    placeholder="Name for the runner"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </Card>

                <Card className="mt-3">
                  <SectionLabel>When</SectionLabel>
                  <View className="mt-2 flex-row gap-2">
                    <Pressable
                      className={`flex-1 rounded-xl border px-3 py-3 ${
                        timing === "asap"
                          ? "border-fusion bg-red-50"
                          : "border-gray-200 bg-white"
                      }`}
                      onPress={() => {
                        setTiming("asap");
                        setShowPicker(false);
                      }}
                    >
                      <Text className="text-center text-sm font-semibold text-gray-900">
                        ASAP
                      </Text>
                    </Pressable>
                    <Pressable
                      className={`flex-1 rounded-xl border px-3 py-3 ${
                        timing === "schedule"
                          ? "border-fusion bg-red-50"
                          : "border-gray-200 bg-white"
                      }`}
                      onPress={() => setTiming("schedule")}
                    >
                      <Text className="text-center text-sm font-semibold text-gray-900">
                        Schedule
                      </Text>
                    </Pressable>
                  </View>
                  {timing === "schedule" ? (
                    <View className="mt-3">
                      <Text className="text-sm font-semibold text-gray-900">
                        Deliver by {formatScheduled(scheduledFor)}
                      </Text>
                      <Text className="mt-1 text-xs text-gray-500">
                        Exact arrival time (next 7 days). Runners can accept now;
                        shopping unlocks 30 minutes before.
                      </Text>
                      <Pressable
                        className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-3"
                        onPress={() => setShowPicker((v) => !v)}
                      >
                        <Text className="text-center text-sm font-semibold text-gray-900">
                          {showPicker ? "Hide calendar" : "Pick date & time"}
                        </Text>
                      </Pressable>
                      {showPicker ? (
                        <View className="mt-2 overflow-hidden rounded-xl bg-white">
                          <DateTimePicker
                            value={scheduledFor}
                            mode="datetime"
                            display={
                              Platform.OS === "ios" ? "inline" : "default"
                            }
                            minimumDate={bounds.min}
                            maximumDate={bounds.max}
                            minuteInterval={5}
                            themeVariant="light"
                            onChange={(_, date) => {
                              if (!date) return;
                              setScheduledFor(clampSchedule(date));
                              if (Platform.OS !== "ios") setShowPicker(false);
                            }}
                          />
                          {Platform.OS === "ios" ? (
                            <Pressable
                              className="mx-3 mb-3 items-center rounded-xl bg-gray-900 py-2.5"
                              onPress={() => setShowPicker(false)}
                            >
                              <Text className="text-sm font-semibold text-white">
                                Done
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <Text className="mt-3 text-xs text-gray-500">
                      A runner will pick this up as soon as they accept.
                    </Text>
                  )}
                </Card>

                <Card className="mt-3">
                  <SectionLabel>College / zone</SectionLabel>
                  {CUHK_COLLEGES.map((name) => (
                    <Pressable
                      key={name}
                      className={`mt-2 rounded-xl border px-3 py-2 ${
                        college === name
                          ? "border-fusion bg-red-50"
                          : "border-gray-200 bg-white"
                      }`}
                      onPress={() => pickCollege(name)}
                    >
                      <Text className="text-sm text-gray-900">{name}</Text>
                    </Pressable>
                  ))}
                </Card>

                <Card className="mt-3">
                  <SectionLabel>Hall / lobby</SectionLabel>
                  {getHallsForCollege(college).map((name) => (
                    <Pressable
                      key={name}
                      className={`mt-2 rounded-xl border px-3 py-2 ${
                        hall === name
                          ? "border-fusion bg-red-50"
                          : "border-gray-200 bg-white"
                      }`}
                      onPress={() => setHall(name)}
                    >
                      <Text className="text-sm text-gray-900">
                        {name} · {getLobbyForHall(name)}
                      </Text>
                    </Pressable>
                  ))}
                </Card>

                <Card className="mt-3">
                  <SectionLabel>Notes for the courier (optional)</SectionLabel>
                  <TextInput
                    className="mt-2 min-h-[88px] rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
                    value={note}
                    onChangeText={setNote}
                    placeholder="e.g. Room 301, leave at the lobby desk"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    textAlignVertical="top"
                    blurOnSubmit={false}
                    inputAccessoryViewID={
                      Platform.OS === "ios" ? NOTES_ACCESSORY_ID : undefined
                    }
                  />
                  {Platform.OS !== "ios" ? (
                    <Pressable
                      className="mt-2 self-end"
                      onPress={Keyboard.dismiss}
                    >
                      <Text className="text-sm font-semibold text-fusion">
                        Done
                      </Text>
                    </Pressable>
                  ) : null}
                </Card>

                <Card className="mt-3">
                  {canteen && restaurant ? (
                    <Text className="mb-2 text-sm font-bold text-gray-900">
                      {restaurant.shortName} · canteen
                    </Text>
                  ) : null}
                  <Text className="text-sm text-gray-600">
                    {formatDeliveryAddress(college, hall)}
                  </Text>
                  {canteen ? (
                    <Text className="mt-1 text-sm text-gray-600">
                      Flat canteen delivery HK${CANTEEN_DELIVERY_FEE}
                    </Text>
                  ) : (
                    <>
                      <Text className="mt-1 text-sm text-gray-600">
                        {ZONE_LABELS[fee.zone]} · Zone {fee.zone} (+$
                        {fee.distanceSurcharge})
                      </Text>
                      <Text className="mt-1 text-sm text-gray-600">
                        Base ${fee.baseFee}
                        {fee.extraKg > 0
                          ? ` · weight over ${WEIGHT_INCLUDED_KG} kg (+$${fee.weightSurcharge})`
                          : ` · up to ${WEIGHT_INCLUDED_KG} kg`}
                        {fee.heavyBagEligible
                          ? ` · over ${HEAVY_BAG_THRESHOLD_KG} kg (runner may add heavy-bag fee)`
                          : ""}
                      </Text>
                    </>
                  )}
                  <Text className="mt-1 text-sm text-gray-600">
                    Items ${subtotal} · delivery ${fee.deliveryFee}
                    {!canteen && fee.extraKg > 0
                      ? ` (incl. $${WEIGHT_SURCHARGE_PER_KG}/extra kg)`
                      : ""}
                  </Text>
                  {canteen && canteenCollege ? (
                    <Text className="mt-2 text-xs text-gray-600">
                      {discountPreview.discountApplied
                        ? `College discount preview (−HK$${discountPreview.discountAmount}) applies when a ${collegeLabel(canteenCollege)} runner accepts.`
                        : `10% off food if a ${collegeLabel(canteenCollege)} runner accepts (not applied until accept).`}
                    </Text>
                  ) : null}
                  <Text className="mt-2 text-base font-extrabold text-fusion">
                    Total ${total}
                  </Text>
                  {overLimit ? (
                    <Text className="mt-2 text-sm text-red-600">
                      {ORDER_LIMIT_MESSAGE} (max ${MAX_ORDER_VALUE})
                    </Text>
                  ) : null}
                  {user ? (
                    <Text className="mt-2 text-xs text-gray-500">
                      Signed in as {user.email ?? user.uid}
                    </Text>
                  ) : (
                    <Text className="mt-2 text-xs text-gray-500">
                      Guest checkout — no account required. Pay after delivery.
                    </Text>
                  )}
                </Card>

                {!canteenOpen ? (
                  <Text className="mt-3 text-sm text-orange-700">
                    {closedMessage}
                  </Text>
                ) : null}

                {error ? (
                  <Text className="mt-3 text-sm text-red-600">{error}</Text>
                ) : null}

                <PrimaryButton
                  label={
                    loading
                      ? "Placing…"
                      : canteenOpen
                        ? "Place order"
                        : "Canteen closed — checkout paused"
                  }
                  busy={loading}
                  className="mt-4"
                  disabled={
                    loading ||
                    items.length === 0 ||
                    overLimit ||
                    !canteenOpen
                  }
                  onPress={() => void place()}
                />
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={NOTES_ACCESSORY_ID}>
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
    </Page>
  );
}
