import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import { doc, getDoc } from "firebase/firestore";
import {
  cancelOrder,
  customerAmountDue,
  fetchOrder,
  getStepIndex,
  hasConfirmedGroceryTotal,
  isChatActive,
  ORDER_STATUS_LABELS,
  subscribeOrder,
  TRACKING_STEPS,
} from "@fusion-express/shared";
import { collectionName } from "@fusion-express/shared/app-env";
import {
  canteenNameForRestaurant,
  restaurantIdFromOrderItems,
} from "@fusion-express/shared/canteen-college";
import {
  getDb,
  isFirebaseConfigured,
} from "@fusion-express/shared/firebase";
import { webAssetOrigin } from "@fusion-express/shared/products";
import type { Order } from "@fusion-express/shared/types";
import { useAuth } from "../src/auth";
import { FPS_ID, submitFpsScreenshot } from "../src/fps-payment";
import { DeliveryRating } from "../src/DeliveryRating";
import { OrderChat } from "../src/OrderChat";
import { formatScheduled } from "../src/schedule";
import { takePhoto, uriToBlob } from "../src/takePhoto";
import type { RootStackParamList } from "../src/navigation";

const GENERIC_RUNNER_NAMES = new Set([
  "",
  "runner",
  "mobile runner",
  "your runner",
]);

function looksGenericRunnerName(name: string | undefined): boolean {
  return GENERIC_RUNNER_NAMES.has((name ?? "").trim().toLowerCase());
}

type RunnerIdentity = { name: string | null; studentId: string | null };

async function resolveRunnerIdentity(order: Order): Promise<RunnerIdentity> {
  const stampedName = order.runnerName?.trim() || null;
  let name =
    stampedName && !looksGenericRunnerName(stampedName) ? stampedName : null;
  let studentId = order.runnerStudentId?.trim() || null;

  const uid = order.runnerUid?.trim();
  if ((!name || !studentId) && uid && isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(getDb(), collectionName("users"), uid));
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>;
        const pseudonym = data.pseudonym ? String(data.pseudonym).trim() : "";
        const fullName = data.fullName ? String(data.fullName).trim() : "";
        const displayName = data.displayName
          ? String(data.displayName).trim()
          : "";
        if (!name) {
          if (data.isAnonymous === true && pseudonym) name = pseudonym;
          else if (fullName && !looksGenericRunnerName(fullName)) name = fullName;
          else if (pseudonym) name = pseudonym;
          else if (displayName && !looksGenericRunnerName(displayName)) {
            name = displayName;
          }
        }
        if (!studentId) {
          studentId = data.studentId
            ? String(data.studentId).trim()
            : data.cuhkEmail
              ? String(data.cuhkEmail).split("@")[0].trim()
              : data.email
                ? String(data.email).split("@")[0].trim()
                : null;
        }
      }
    } catch {
      /* keep stamped fallback */
    }
  }

  if (!name && stampedName) name = stampedName;
  return { name, studentId };
}

function orderChannelLabel(order: Order): string {
  const channel =
    order.orderChannel ??
    (order.items.some((i) => i.itemId.startsWith("canteen:"))
      ? "canteen"
      : "fusion");
  if (channel === "canteen") {
    const id =
      order.canteenRestaurantId || restaurantIdFromOrderItems(order.items);
    return canteenNameForRestaurant(id);
  }
  if (channel === "taste") return "Taste";
  return "Fusion";
}
import {
  Card,
  LoadingBlock,
  Page,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  OutlineDangerButton,
} from "../src/ui";

function isOrderPaid(order: Order | null | undefined): boolean {
  if (!order) return false;
  return Boolean(
    order.paymentReceived ||
      order.status === "paid" ||
      order.status === "customer_paid" ||
      order.status === "completed",
  );
}

export default function TrackScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Track">>();
  const orderId = route.params?.orderId;
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [payError, setPayError] = useState("");
  const [payMode, setPayMode] = useState<"choose" | "fps">("choose");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [zoom, setZoom] = useState<{ uri: string; label: string } | null>(null);
  const [runnerLabel, setRunnerLabel] = useState<string | null>(null);
  const [runnerStudentId, setRunnerStudentId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const focusChat = route.params?.focusChat === true;

  const applyOrder = useCallback((found: Order | null) => {
    setOrder(found);
    setMissing(!found);
    if (isOrderPaid(found)) setPaying(false);
  }, []);

  const load = useCallback(async () => {
    if (!orderId) return;
    const found = await fetchOrder(orderId);
    applyOrder(found);
  }, [orderId, applyOrder]);

  /** One-shot check after Airwallex — never starts a blocking spinner loop. */
  const confirmOnce = useCallback(async (): Promise<boolean> => {
    if (!orderId || !user) return false;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${webAssetOrigin()}/api/payments/confirm`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        paid?: boolean;
        alreadyPaid?: boolean;
      };
      if (data.paid || data.alreadyPaid) {
        await load();
        return true;
      }
    } catch (err) {
      console.error("[pay] confirm failed", err);
    }
    return false;
  }, [orderId, user, load]);

  useEffect(() => {
    if (!orderId) return;
    const unsub = subscribeOrder(
      orderId,
      (found) => applyOrder(found),
      () => {
        void load();
      },
    );
    return unsub;
  }, [orderId, applyOrder, load]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => sub.remove();
  }, [load]);

  useEffect(() => {
    if (!focusChat || !order || !isChatActive(order)) return;
    navigation.navigate("OrderChat", { orderId: order.id });
  }, [focusChat, order, navigation]);

  useEffect(() => {
    if (!order || order.status === "pending" || order.status === "cancelled") {
      setRunnerLabel(null);
      setRunnerStudentId(null);
      return;
    }
    let cancelled = false;
    void resolveRunnerIdentity(order).then(({ name, studentId }) => {
      if (!cancelled) {
        setRunnerLabel(name);
        setRunnerStudentId(studentId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    order?.id,
    order?.status,
    order?.runnerUid,
    order?.runnerName,
    order?.runnerStudentId,
  ]);

  const step = order ? getStepIndex(order.status) : 0;
  const paid = isOrderPaid(order);
  const fpsPending = Boolean(order?.fpsReceiptUrl) && !paid;
  const needsPay =
    order &&
    !paid &&
    (order.status === "delivered" || order.status === "runner_paid") &&
    !order.paymentReceived;
  const due = order ? customerAmountDue(order) : 0;
  const receiptReady = order ? hasConfirmedGroceryTotal(order) : false;

  async function onRefresh() {
    setRefreshing(true);
    setPayError("");
    setPaying(false);
    try {
      await load();
      await confirmOnce();
    } finally {
      setRefreshing(false);
    }
  }

  function confirmCancel() {
    if (!order || !user || order.status !== "pending") return;
    Alert.alert(
      "Cancel this order?",
      "A runner has not accepted it yet.",
      [
        { text: "Keep order", style: "cancel" },
        {
          text: "Cancel Order",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setCancelling(true);
              setCancelError("");
              try {
                await cancelOrder(order.id, user.uid);
                const { notifyOrderCancelled } = await import(
                  "../src/notify-email"
                );
                notifyOrderCancelled(order.id);
                navigation.navigate("Tabs", { screen: "Shop" });
              } catch (err) {
                setCancelError(
                  err instanceof Error ? err.message : "Could not cancel order.",
                );
              } finally {
                setCancelling(false);
              }
            })();
          },
        },
      ],
    );
  }

  async function startAirwallex() {
    if (!order || !user) {
      const msg = "Sign in on Profile to pay online.";
      setPayError(msg);
      Alert.alert("Payment Error", msg);
      return;
    }
    if (paid || fpsPending) return;
    setPaying(true);
    setPayError("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${webAssetOrigin()}/api/payments/create-intent`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        alreadyPaid?: boolean;
        checkoutUrl?: string;
        url?: string;
        intentId?: string;
        clientSecret?: string;
        currency?: string;
        env?: string;
      };
      if (data.alreadyPaid) {
        await load();
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || `Could not start payment (${res.status}).`);
      }
      const checkoutUrl =
        data.checkoutUrl ||
        data.url ||
        (data.intentId && data.clientSecret
          ? `${
              data.env === "demo"
                ? "https://checkout-demo.airwallex.com"
                : "https://checkout.airwallex.com"
            }/#/standalone/checkout?${new URLSearchParams({
              intent_id: data.intentId,
              client_secret: data.clientSecret,
              currency: data.currency || "HKD",
              country_code: "HK",
              mode: "payment",
              methods: "card",
            }).toString()}`
          : "");
      if (!checkoutUrl.startsWith("https://checkout")) {
        throw new Error("No checkout URL returned from server.");
      }
      // Clear spinner before the sheet — openBrowserAsync only resolves on dismiss.
      setPaying(false);
      await WebBrowser.openBrowserAsync(checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: "#ED1C24",
      });
      // Soft check once. If they didn't pay, stay on payment options (no loop).
      const ok = await confirmOnce();
      if (!ok) {
        const latest = orderId ? await fetchOrder(orderId) : null;
        applyOrder(latest);
        if (!isOrderPaid(latest)) {
          setPayError(
            "No payment detected. Finish card checkout, or pay by FPS instead.",
          );
        }
      }
    } catch (err) {
      console.error("[pay] Airwallex start failed", err);
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Payment request timed out. Check your connection and try again."
          : err instanceof Error
            ? err.message
            : "Payment failed";
      setPayError(message);
      Alert.alert("Payment Error", message);
    } finally {
      clearTimeout(timeout);
      setPaying(false);
    }
  }

  async function uploadFps() {
    if (!order || !user) {
      setPayError("Sign in on Profile to submit an FPS receipt.");
      return;
    }
    setPaying(true);
    setPayError("");
    try {
      const photo = await takePhoto({ purpose: "your FPS transfer screenshot" });
      if (!photo) return;
      const blob = await uriToBlob(photo.uri);
      await submitFpsScreenshot({
        uid: user.uid,
        orderId: order.id,
        file: blob,
        fileName: photo.fileName || "fps.jpg",
      });
      await load();
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Could not upload the screenshot",
      );
    } finally {
      setPaying(false);
    }
  }

  return (
    <Page>
      <ScreenHeader
        title={payMode === "fps" ? "Submit Payment" : "Track order"}
        onBack={
          payMode === "fps"
            ? () => {
                setPayMode("choose");
                setPayError("");
              }
            : () => navigation.goBack()
        }
        right={
          payMode === "choose" ? (
            <Pressable onPress={() => void onRefresh()} disabled={refreshing}>
              <Text className="text-sm font-semibold text-fusion">
                {refreshing ? "…" : "Refresh"}
              </Text>
            </Pressable>
          ) : null
        }
      />
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="px-4 py-4 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        {!orderId ? (
          <Text className="text-gray-600">No order id.</Text>
        ) : missing ? (
          <Text className="text-gray-600">Order {orderId} not found.</Text>
        ) : !order ? (
          <LoadingBlock label="Loading order…" />
        ) : (
          <>
            <Card>
              <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {orderChannelLabel(order)}
              </Text>
              <Text className="mt-1 text-xl font-extrabold text-fusion">
                {order.id}
              </Text>
              <Text className="mt-1 text-sm text-gray-600">
                {ORDER_STATUS_LABELS[order.status]}
                {order.hall ? ` · ${order.hall}` : ""}
              </Text>
              {order.status === "pending" ? (
                <Text className="mt-3 text-sm font-semibold text-amber-800">
                  Waiting for a runner to accept…
                </Text>
              ) : runnerLabel || runnerStudentId ? (
                <View className="mt-3 rounded-xl border border-fusion/20 bg-red-50 px-3 py-2.5">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-fusion">
                    Your runner
                  </Text>
                  {runnerLabel ? (
                    <Text className="mt-0.5 text-base font-extrabold text-gray-900">
                      {runnerLabel}
                    </Text>
                  ) : null}
                  {runnerStudentId ? (
                    <Text className="mt-1 text-sm font-semibold text-gray-800">
                      Student ID: {runnerStudentId}
                    </Text>
                  ) : null}
                  <Text className="mt-1 text-xs text-gray-600">
                    Check this ID when they pick up / drop off your order.
                  </Text>
                </View>
              ) : order.runnerUid || order.runnerId ? (
                <Text className="mt-3 text-sm font-semibold text-gray-700">
                  Runner: assigned
                </Text>
              ) : null}
              <Text className="mt-2 text-sm text-gray-700">
                Total ${order.total}
                {order.deliveryFee != null
                  ? ` (delivery $${order.deliveryFee}${
                      (order.heavyBagSurcharge ?? 0) > 0
                        ? ` + heavy bag $${order.heavyBagSurcharge}`
                        : ""
                    }${
                      (order.tip ?? 0) > 0 ? ` + tip $${order.tip}` : ""
                    })`
                  : (order.tip ?? 0) > 0
                    ? ` (incl. tip $${order.tip})`
                    : ""}
              </Text>
              {order.discountApplied && (order.discountAmount ?? 0) > 0 ? (
                <Text className="mt-1 text-sm text-emerald-700">
                  College discount (−HK${order.discountAmount})
                </Text>
              ) : null}
            </Card>

            {order.isScheduled && order.scheduledFor ? (
              <Card className="mt-3 border-amber-200 bg-amber-50">
                <Text className="text-sm font-bold text-amber-950">
                  Scheduled delivery
                </Text>
                <Text className="mt-1 text-sm text-amber-900">
                  Arrive by {formatScheduled(order.scheduledFor)}
                </Text>
                <Text className="mt-1 text-xs text-amber-800">
                  A runner can accept now. Shopping unlocks 30 minutes before
                  this time.
                </Text>
              </Card>
            ) : null}

            {order.status === "pending" ? (
              <View className="mt-3">
                <OutlineDangerButton
                  label={cancelling ? "Cancelling…" : "Cancel Order"}
                  disabled={cancelling}
                  onPress={confirmCancel}
                />
                {cancelError ? (
                  <Text className="mt-2 text-sm text-fusion">{cancelError}</Text>
                ) : null}
              </View>
            ) : null}

            <Card className="mt-3">
              <Text className="mb-3 text-sm font-semibold text-gray-500">
                Progress
              </Text>
              {TRACKING_STEPS.map((item, index) => (
                <View key={item.status} className="mb-3 flex-row items-center">
                  <View
                    className={`mr-3 h-3 w-3 rounded-full ${
                      index <= step ? "bg-fusion" : "bg-gray-300"
                    }`}
                  />
                  <Text
                    className={
                      index <= step
                        ? "font-semibold text-gray-900"
                        : "text-gray-400"
                    }
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </Card>

            {order.receiptUrl || order.deliveryPhotoUrl ? (
              <Card className="mt-3">
                <Text className="mb-3 text-sm font-semibold text-gray-500">
                  Delivery proof
                </Text>
                <View className="flex-row gap-3">
                  {order.receiptUrl ? (
                    <Pressable
                      className="flex-1"
                      onPress={() =>
                        setZoom({
                          uri: order.receiptUrl!,
                          label: `${orderChannelLabel(order)} receipt`,
                        })
                      }
                    >
                      <Image
                        source={{ uri: order.receiptUrl }}
                        style={{ width: "100%", height: 120, borderRadius: 12 }}
                        resizeMode="cover"
                      />
                      <Text className="mt-2 text-xs font-semibold text-gray-700">
                        {orderChannelLabel(order)} receipt
                      </Text>
                    </Pressable>
                  ) : null}
                  {order.deliveryPhotoUrl ? (
                    <Pressable
                      className="flex-1"
                      onPress={() =>
                        setZoom({
                          uri: order.deliveryPhotoUrl!,
                          label: "Drop-off Photo",
                        })
                      }
                    >
                      <Image
                        source={{ uri: order.deliveryPhotoUrl }}
                        style={{ width: "100%", height: 120, borderRadius: 12 }}
                        resizeMode="cover"
                      />
                      <Text className="mt-2 text-xs font-semibold text-gray-700">
                        Drop-off Photo
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </Card>
            ) : null}

            {needsPay && fpsPending ? (
              <Card className="mt-3 border-emerald-200 bg-emerald-50">
                <Text className="text-sm font-bold text-emerald-900">
                  FPS receipt uploaded
                </Text>
                <Text className="mt-1 text-sm text-emerald-800">
                  Waiting for GraceRun to confirm the transfer. You do not need
                  to upload again.
                </Text>
                {order.fpsReceiptUrl ? (
                  <Pressable
                    className="mt-3"
                    onPress={() =>
                      setZoom({
                        uri: order.fpsReceiptUrl!,
                        label: "FPS receipt",
                      })
                    }
                  >
                    <Image
                      source={{ uri: order.fpsReceiptUrl }}
                      style={{ width: "100%", height: 140, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : null}
              </Card>
            ) : null}

            {needsPay && !fpsPending && payMode === "choose" ? (
              <Card className="mt-3 border-[#ED1C24]/30 bg-red-50">
                <Text className="text-sm font-bold text-gray-900">
                  Pay GraceRun
                </Text>
                <Text className="mt-1 text-2xl font-extrabold text-fusion">
                  ${due}
                </Text>
                <Text className="mt-1 text-xs text-gray-600">
                  Receipt total plus delivery. Choose card or FPS.
                </Text>
                {!receiptReady ? (
                  <Text className="mt-2 text-sm text-amber-800">
                    Waiting for the runner to confirm the{" "}
                    {orderChannelLabel(order)} receipt total.
                  </Text>
                ) : (
                  <>
                    <PrimaryButton
                      label={
                        paying
                          ? "Opening card checkout…"
                          : "Pay by Credit Card (Airwallex)"
                      }
                      busy={paying}
                      disabled={paying}
                      className="mt-3"
                      onPress={() => void startAirwallex()}
                    />
                    <SecondaryButton
                      label={`Pay by FPS (${FPS_ID})`}
                      className="mt-2"
                      disabled={paying}
                      onPress={() => {
                        if (paying) return;
                        setPayError("");
                        setPayMode("fps");
                      }}
                    />
                  </>
                )}
                {payError ? (
                  <Text className="mt-2 text-sm text-fusion">{payError}</Text>
                ) : null}
                {paying ? (
                  <View className="mt-2 items-center">
                    <ActivityIndicator color="#ED1C24" />
                  </View>
                ) : null}
              </Card>
            ) : null}

            {needsPay && !fpsPending && payMode === "fps" ? (
              <Card className="mt-3">
                <Text className="text-sm font-bold text-gray-900">
                  Pay by FPS
                </Text>
                <Text className="mt-2 text-sm text-gray-600">
                  Transfer ${due} to this FPS ID, then upload a screenshot of the
                  receipt.
                </Text>
                <Text className="mt-3 text-3xl font-extrabold tracking-wide text-gray-900">
                  {FPS_ID}
                </Text>
                <PrimaryButton
                  label={paying ? "Uploading…" : "Upload FPS screenshot"}
                  busy={paying}
                  className="mt-4"
                  onPress={() => void uploadFps()}
                />
                {payError ? (
                  <Text className="mt-2 text-sm text-fusion">{payError}</Text>
                ) : null}
              </Card>
            ) : null}

            {paid ? (
              <Card className="mt-3 bg-emerald-50">
                <Text className="text-sm font-bold text-emerald-800">
                  Payment received — thank you.
                </Text>
              </Card>
            ) : null}

            <DeliveryRating order={order} />

            {isChatActive(order) ? <OrderChat order={order} /> : null}
          </>
        )}
      </ScrollView>
      <Modal
        visible={Boolean(zoom)}
        transparent
        animationType="fade"
        onRequestClose={() => setZoom(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/90 px-4"
          onPress={() => setZoom(null)}
        >
          {zoom ? (
            <>
              <Text className="mb-3 text-sm font-semibold text-white">
                {zoom.label}
              </Text>
              <Image
                source={{ uri: zoom.uri }}
                style={{ width: "100%", height: "75%" }}
                resizeMode="contain"
              />
            </>
          ) : null}
        </Pressable>
      </Modal>
    </Page>
  );
}
