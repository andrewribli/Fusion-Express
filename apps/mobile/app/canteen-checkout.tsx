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
import { customerAvatarStamp } from "@fusion-express/shared/avatars";
import { createOrder } from "@fusion-express/shared/orders";
import {
  getEstimatedDeliveryTime,
  getUnitPrice,
  lineTotal,
} from "@fusion-express/shared";
import { useAuth } from "../src/auth";
import { useCart } from "../src/cart";
import {
  CANTEEN_DELIVERY_FEE,
  cartRestaurantId,
  isMixedCart,
  isPureCanteenCart,
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
  SecondaryButton,
} from "../src/ui";

const NOTES_ACCESSORY_ID = "canteen-checkout-notes-done";

export default function CanteenCheckoutScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, subtotal, sessionId, clearCart } = useCart();
  const { profile, user, ensureCheckoutAuth } = useAuth();
  const pureCanteen = isPureCanteenCart(items);
  const mixed = isMixedCart(items);
  const restaurantId = cartRestaurantId(items);
  const restaurant = restaurantId ? getRestaurant(restaurantId) : undefined;
  const canteenCollege = canteenCollegeForRestaurant(restaurantId);
  const canteenOpen =
    !restaurantId || isCanteenOpenByConfig(restaurantId);
  const closedMessage =
    restaurant
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
  const bounds = scheduleBounds();

  const deliveryFee = CANTEEN_DELIVERY_FEE;
  // College discount is applied when a matching runner accepts — not at place time.
  const discountPreview = useMemo(
    () => computeCollegeDiscount(subtotal, college, canteenCollege),
    [subtotal, college, canteenCollege],
  );
  const total = subtotal + deliveryFee;

  function pickCollege(name: CuhkCollege) {
    setCollege(name);
    const halls = getHallsForCollege(name);
    setHall((prev) => (halls.includes(prev) ? prev : halls[0]));
  }

  const signedIn = Boolean(user && !user.isAnonymous);

  async function place() {
    Keyboard.dismiss();
    if (!signedIn) {
      setError("Sign in to place an order.");
      navigation.navigate("Profile");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (!pureCanteen || !restaurantId) {
        throw new Error("This checkout is for canteen food only.");
      }
      if (mixed) {
        throw new Error(
          "Remove Fusion grocery items first — canteen and Fusion are separate checkouts.",
        );
      }
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
      const avatarStamp = customerAvatarStamp({
        avatarId: profile?.avatarId,
        photoURL: profile?.photoURL,
        showRealPhotoToRunners: profile?.showRealPhotoToRunners,
        uid: auth.uid,
        email: auth.email || user?.email,
      });
      const foodSubtotal = items.reduce(
        (sum, line) => sum + lineTotal(line.item, line.quantity),
        0,
      );
      const orderId = await createOrder({
        sessionId,
        customerId: auth.uid,
        customerName: customerName.trim(),
        customerEmail: auth.email || user?.email || undefined,
        ...avatarStamp,
        campus: "cuhk",
        orderChannel: "canteen",
        canteenRestaurantId: restaurantId,
        canteenCollege: canteenCollege ?? undefined,
        items: items.map(({ item, quantity }) => {
          const isCustom =
            item.id.startsWith("custom-") || item.subcategory === "custom";
          return {
            itemId: item.id,
            name: item.name,
            price: getUnitPrice(item),
            quantity,
            ...(item.weightKg != null ? { weightKg: item.weightKg } : {}),
            ...(isCustom ? { isCustom: true as const } : {}),
          };
        }),
        status: "pending",
        college,
        hall,
        lobbyPoint: getLobbyForHall(hall),
        zone: 1,
        totalWeight: 0,
        customerNote: note.trim() || "None for now",
        subtotal: foodSubtotal,
        deliveryFee,
        total: foodSubtotal + deliveryFee,
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

  if (!pureCanteen) {
    return (
      <Page>
        <ScreenHeader
          title="Canteen checkout"
          onBack={() => navigation.goBack()}
        />
        <View className="px-4 py-6">
          <Card>
            <Text className="text-base font-bold text-gray-900">
              {mixed
                ? "Mixed cart — Fusion + canteen"
                : "No canteen items in this cart"}
            </Text>
            <Text className="mt-2 text-sm text-gray-600">
              {mixed
                ? "Clear grocery items or check out Fusion separately. One order = one channel."
                : "Canteen checkout is only for campus food. Shop Canteens, then come back here."}
            </Text>
            <PrimaryButton
              label={mixed ? "Open Fusion checkout" : "Browse canteens"}
              className="mt-4"
              onPress={() =>
                mixed
                  ? navigation.navigate("Checkout")
                  : navigation.navigate("Tabs", { screen: "Shop" })
              }
            />
            <SecondaryButton
              label="Back to cart"
              className="mt-2"
              onPress={() => navigation.navigate("Cart")}
            />
          </Card>
        </View>
      </Page>
    );
  }

  return (
    <Page>
      <ScreenHeader
        title="Canteen checkout"
        onBack={() => navigation.goBack()}
      />
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
          <Card className="mb-3 border-emerald-200 bg-emerald-50">
            <Text className="text-sm font-bold text-emerald-950">
              {restaurant?.name ?? "Canteen"} order
            </Text>
            <Text className="mt-1 text-xs text-emerald-900">
              Flat lobby delivery HK${CANTEEN_DELIVERY_FEE}. Fusion groceries use
              a separate checkout.
            </Text>
          </Card>

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
                      display={Platform.OS === "ios" ? "inline" : "default"}
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
                A runner will collect from the canteen after they accept.
              </Text>
            )}
          </Card>

          <Card className="mt-3">
            <SectionLabel>College / hall lobby</SectionLabel>
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
            <SectionLabel>Notes (optional)</SectionLabel>
            <TextInput
              className="mt-2 min-h-[88px] rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
              value={note}
              onChangeText={setNote}
              placeholder="e.g. no chili, leave at lobby desk"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              inputAccessoryViewID={
                Platform.OS === "ios" ? NOTES_ACCESSORY_ID : undefined
              }
            />
          </Card>

          <Card className="mt-3">
            <Text className="text-sm font-bold text-gray-900">
              {restaurant?.shortName ?? "Canteen"}
            </Text>
            <Text className="mt-1 text-sm text-gray-600">
              {formatDeliveryAddress(college, hall)}
            </Text>
            <Text className="mt-1 text-sm text-gray-600">
              Flat canteen delivery HK${deliveryFee}
            </Text>
            <Text className="mt-1 text-sm text-gray-600">
              Food ${subtotal} · delivery ${deliveryFee}
            </Text>
            {canteenCollege ? (
              <Text className="mt-2 text-xs text-gray-600">
                {discountPreview.discountApplied
                  ? `College discount preview (−HK$${discountPreview.discountAmount}) when a ${collegeLabel(canteenCollege)} runner accepts.`
                  : `10% off food if a ${collegeLabel(canteenCollege)} runner accepts (not applied until accept).`}
              </Text>
            ) : null}
            <Text className="mt-2 text-base font-extrabold text-fusion">
              Total ${total}
            </Text>
            {signedIn ? (
              <Text className="mt-2 text-xs text-gray-500">
                Signed in as {user?.email ?? user?.uid}
              </Text>
            ) : (
              <Text className="mt-2 text-xs text-amber-700">
                Sign in required to place an order. Guest checkout is closed.
              </Text>
            )}
          </Card>

          {!canteenOpen ? (
            <Text className="mt-3 text-sm text-orange-700">{closedMessage}</Text>
          ) : null}
          {error ? (
            <Text className="mt-3 text-sm text-red-600">{error}</Text>
          ) : null}

          {!signedIn ? (
            <PrimaryButton
              label="Sign in to place order"
              className="mt-4"
              onPress={() => navigation.navigate("Profile")}
            />
          ) : (
            <PrimaryButton
              label={
                loading
                  ? "Placing…"
                  : canteenOpen
                    ? "Place canteen order"
                    : "Canteen closed — paused"
              }
              busy={loading}
              className="mt-4"
              disabled={loading || items.length === 0 || !canteenOpen}
              onPress={() => void place()}
            />
          )}
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
