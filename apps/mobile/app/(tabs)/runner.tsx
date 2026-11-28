import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenKeyboardAvoid } from "../../src/keyboard-ui";
import {
  acceptOrder,
  fetchDeliveredOrdersByRunner,
  fetchPendingOrders,
  fetchRunnerOrders,
  subscribePendingOrders,
  subscribeRunnerOrders,
  isLobbyArrivalActive,
  markDeliveredWithTotal,
  markPurchased,
  pingLobbyArrival,
  saveRunnerDeliveryProgress,
  uploadDeliveryPhoto,
  uploadReceiptPhoto,
} from "@fusion-express/shared/orders";
import {
  sharedCustomerPhone,
  telUrl,
  whatsAppMeUrl,
} from "@fusion-express/shared/contact";
import {
  ORDER_STATUS_LABELS,
  isServiceOpen,
  orderTipTotal,
  runnerEarningsFromOrder,
  runnerPayoutPaid,
  runnerPayoutPending,
  summarizeRunnerPayouts,
  SERVICE_HOURS,
} from "@fusion-express/shared";
import {
  cartTotalWeightKg,
  HEAVY_BAG_SURCHARGE,
  HEAVY_BAG_THRESHOLD_KG,
} from "@fusion-express/shared/delivery";
import { resolveProductImageUrl } from "@fusion-express/shared/products";
import { resolveProductImage } from "@fusion-express/shared/resolve-image";
import {
  canteenNameForRestaurant,
  restaurantIdFromOrderItems,
} from "@fusion-express/shared/canteen-college";
import type { Order } from "@fusion-express/shared/types";
import { useAuth } from "../../src/auth";
import { becomeRunner } from "../../src/become-runner";
import { buildAcceptDiscount } from "../../src/canteen/discount";
import { notifyOrderEvent } from "../../src/notify-push";
import { OrderChat } from "../../src/OrderChat";
import { ProductImage } from "../../src/ProductImage";
import { formatScheduled } from "../../src/schedule";
import { takePhoto, uriToBlob } from "../../src/takePhoto";

function isCanteenOrder(order: Order): boolean {
  return (
    order.orderChannel === "canteen" ||
    order.items.some((i) => i.itemId.startsWith("canteen:"))
  );
}

function orderShopLabel(order: Order): string {
  if (!isCanteenOrder(order)) return "Fusion";
  const id =
    order.canteenRestaurantId || restaurantIdFromOrderItems(order.items);
  return canteenNameForRestaurant(id);
}
import {
  Card,
  EmptyState,
  LoadingBlock,
  Page,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
} from "../../src/ui";

function lineImage(item: { itemId: string; name: string }): string {
  return resolveProductImageUrl(
    resolveProductImage({ id: item.itemId, name: item.name }) ?? "",
  );
}

function patchLocal(
  setActive: Dispatch<SetStateAction<Order[]>>,
  orderId: string,
  patch: Partial<Order>,
) {
  setActive((prev) =>
    prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)),
  );
}

export default function RunnerScreen() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [runnerName, setRunnerName] = useState(
    profile?.fullName ?? "Mobile Runner",
  );
  const [pending, setPending] = useState<Order[]>([]);
  const [active, setActive] = useState<Order[]>([]);
  const [delivered, setDelivered] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState("");
  const [totals, setTotals] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<{ uri: string; alt: string } | null>(null);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [signingUp, setSigningUp] = useState(false);

  useEffect(() => {
    if (profile?.fullName) setRunnerName(profile.fullName);
  }, [profile?.fullName]);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
  }, [profile?.phone]);

  const runnerUid = user?.uid ?? "";
  const runnerId = profile?.runnerId || runnerUid;

  const refresh = useCallback(async () => {
    if (!runnerUid) {
      setPending([]);
      setActive([]);
      setDelivered([]);
      return;
    }
    setLoadingList(true);
    setError("");
    try {
      const [nextPending, nextActive, nextDelivered] = await Promise.all([
        fetchPendingOrders(),
        fetchRunnerOrders(runnerUid),
        fetchDeliveredOrdersByRunner(runnerUid),
      ]);
      setPending(nextPending);
      setActive(nextActive);
      setDelivered(nextDelivered);
      setTotals((prev) => {
        const next = { ...prev };
        for (const o of nextActive) {
          if (o.finalTotal != null && next[o.id] == null) {
            next[o.id] = String(o.finalTotal);
          }
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders");
    } finally {
      setLoadingList(false);
    }
  }, [runnerUid]);

  useEffect(() => {
    if (!runnerUid || !profile?.isRunner) {
      setPending([]);
      setActive([]);
      setDelivered([]);
      return;
    }
    void fetchDeliveredOrdersByRunner(runnerUid)
      .then(setDelivered)
      .catch(() => undefined);
    setError("");
    const unsubPending = subscribePendingOrders(
      (orders) => {
        setPending(orders);
        setLoadingList(false);
      },
      {
        excludeCustomerId: runnerUid,
        onError: (err) => {
          setLoadingList(false);
          setError(err.message || "Could not load orders");
        },
      },
    );
    const unsubActive = subscribeRunnerOrders(
      runnerUid,
      (orders) => {
        setActive(orders);
        setTotals((prev) => {
          const next = { ...prev };
          for (const o of orders) {
            if (o.finalTotal != null && next[o.id] == null) {
              next[o.id] = String(o.finalTotal);
            }
          }
          return next;
        });
      },
      (err) => setError(err.message || "Could not load your deliveries"),
    );
    return () => {
      unsubPending();
      unsubActive();
    };
  }, [runnerUid, profile?.isRunner]);

  function onBecomeRunner() {
    if (!profile) return;
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) {
      setError("Enter a phone number (at least 8 digits) so customers can reach you.");
      return;
    }
    Alert.alert(
      "Sign up to be a Runner?",
      "You’ll deliver campus orders and get paid after each drop-off. You can keep ordering as a customer too.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Sign up",
          onPress: () => {
            setSigningUp(true);
            setError("");
            void becomeRunner(profile, phone, runnerName)
              .then(() => refreshProfile())
              .catch((err: unknown) => {
                setError(
                  err instanceof Error ? err.message : "Could not turn on runner mode",
                );
              })
              .finally(() => setSigningUp(false));
          },
        },
      ],
    );
  }

  async function onAccept(orderId: string) {
    if (!runnerUid) {
      setError("Sign in to accept orders");
      return;
    }
    if (!profile?.isRunner) {
      setError(
        "Your account is not marked as a runner. Enable runner mode on the website first.",
      );
      return;
    }
    setBusyId(orderId);
    setBusyKind("accept");
    setError("");
    try {
      const target =
        pending.find((o) => o.id === orderId) ||
        active.find((o) => o.id === orderId);
      const discount = target
        ? buildAcceptDiscount(target, profile.college)
        : undefined;
      const studentId =
        profile.email?.split("@")[0]?.trim() ||
        profile.uid.slice(0, 8);
      await acceptOrder(
        orderId,
        runnerId,
        runnerName.trim() || "Mobile Runner",
        runnerUid,
        undefined,
        discount,
        profile.campus,
        studentId,
      );
      notifyOrderEvent(orderId, "accepted");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setBusyId(null);
      setBusyKind("");
    }
  }

  function shoppingUnlocked(order: Order): { ok: boolean; message?: string } {
    if (!order.isScheduled || !order.scheduledFor) return { ok: true };
    const start = order.scheduledFor.getTime() - 30 * 60 * 1000;
    if (Date.now() >= start) return { ok: true };
    return {
      ok: false,
      message: `This order is scheduled for ${formatScheduled(order.scheduledFor)}. You can start shopping 30 minutes before.`,
    };
  }

  async function maybePurchased(order: Order) {
    if (order.status !== "accepted") return;
    if (!order.receiptUrl) return;
    const gate = shoppingUnlocked(order);
    if (!gate.ok) return;
    await markPurchased(order.id, {
      receiptUrl: order.receiptUrl,
    });
  }

  async function onReceipt(order: Order) {
    const gate = shoppingUnlocked(order);
    if (!gate.ok) {
      Alert.alert("Too early", gate.message ?? "Wait until closer to the scheduled time.");
      return;
    }
    setBusyId(order.id);
    setBusyKind("receipt");
    setError("");
    try {
      const photo = await takePhoto({
        purpose: `${orderShopLabel(order)} receipt photos`,
        quality: 0.65,
      });
      if (!photo) return;
      const blob = await uriToBlob(photo.uri);
      const receiptUrl = await uploadReceiptPhoto(
        order.id,
        blob,
        photo.fileName || "receipt.jpg",
      );
      await saveRunnerDeliveryProgress(order.id, { receiptUrl });
      const next = { ...order, receiptUrl };
      patchLocal(setActive, order.id, { receiptUrl });
      await maybePurchased(next);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Receipt upload failed");
    } finally {
      setBusyId(null);
      setBusyKind("");
    }
  }

  async function onLobbyPing(order: Order) {
    setBusyId(order.id);
    setBusyKind("lobby-ping");
    setError("");
    try {
      await pingLobbyArrival(order.id);
      notifyOrderEvent(order.id, "lobby");
      patchLocal(setActive, order.id, { lobbyArrivedAt: new Date() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lobby ping failed");
    } finally {
      setBusyId(null);
      setBusyKind("");
    }
  }

  function openCustomerCall(order: Order) {
    const url = telUrl(sharedCustomerPhone(order));
    if (!url) {
      Alert.alert(
        "No phone shared",
        "This customer did not opt in to share a phone number.",
      );
      return;
    }
    void Linking.openURL(url);
  }

  function openCustomerWhatsApp(order: Order) {
    const url = whatsAppMeUrl(sharedCustomerPhone(order));
    if (!url) {
      Alert.alert(
        "No phone shared",
        "This customer did not opt in to share a phone number.",
      );
      return;
    }
    void Linking.openURL(url);
  }

  async function onLobby(order: Order) {
    const gate = shoppingUnlocked(order);
    if (!gate.ok) {
      Alert.alert("Too early", gate.message ?? "Wait until closer to the scheduled time.");
      return;
    }
    setBusyId(order.id);
    setBusyKind("lobby");
    setError("");
    try {
      const photo = await takePhoto({
        purpose: "lobby delivery proof",
        quality: 0.65,
      });
      if (!photo) return;
      const blob = await uriToBlob(photo.uri);
      const deliveryPhotoUrl = await uploadDeliveryPhoto(
        order.id,
        blob,
        photo.fileName || "proof.jpg",
      );
      await saveRunnerDeliveryProgress(order.id, { deliveryPhotoUrl });
      patchLocal(setActive, order.id, { deliveryPhotoUrl });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lobby photo failed");
    } finally {
      setBusyId(null);
      setBusyKind("");
    }
  }

  async function onSaveTotal(order: Order) {
    const amount = Number(totals[order.id]);
    if (!(amount > 0)) {
      setError(`Enter the ${orderShopLabel(order)} receipt total (HKD).`);
      return;
    }
    setBusyId(order.id);
    setBusyKind("total");
    setError("");
    try {
      await saveRunnerDeliveryProgress(order.id, { finalTotal: amount });
      patchLocal(setActive, order.id, {
        finalTotal: amount,
        amountPaidByRunner: amount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save total");
    } finally {
      setBusyId(null);
      setBusyKind("");
    }
  }

  async function onToggleVerified(order: Order) {
    const next = !order.runnerVerified;
    setBusyId(order.id);
    setBusyKind("verify");
    setError("");
    try {
      await saveRunnerDeliveryProgress(order.id, { runnerVerified: next });
      patchLocal(setActive, order.id, { runnerVerified: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save confirmation");
    } finally {
      setBusyId(null);
      setBusyKind("");
    }
  }

  async function onToggleHeavyBag(order: Order) {
    const bagKg = cartTotalWeightKg(
      order.items.map((item) => ({
        item: { weightKg: item.weightKg },
        quantity: item.quantity,
      })),
    );
    const currentlyOn = (order.heavyBagSurcharge ?? 0) > 0;
    if (!currentlyOn && bagKg <= HEAVY_BAG_THRESHOLD_KG) {
      Alert.alert(
        "Heavy bag?",
        `Catalog weight is about ${bagKg} kg (under ${HEAVY_BAG_THRESHOLD_KG} kg). Add the $${HEAVY_BAG_SURCHARGE} surcharge only if the real bag is heavier.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: `Add $${HEAVY_BAG_SURCHARGE}`,
            onPress: () => void applyHeavyBag(order, true),
          },
        ],
      );
      return;
    }
    await applyHeavyBag(order, !currentlyOn);
  }

  async function applyHeavyBag(order: Order, on: boolean) {
    setBusyId(order.id);
    setBusyKind("heavy");
    setError("");
    try {
      const heavyBagSurcharge = on ? HEAVY_BAG_SURCHARGE : 0;
      await saveRunnerDeliveryProgress(order.id, { heavyBagSurcharge });
      patchLocal(setActive, order.id, { heavyBagSurcharge });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update heavy-bag fee",
      );
    } finally {
      setBusyId(null);
      setBusyKind("");
    }
  }

  async function onDeliver(order: Order) {
    const gate = shoppingUnlocked(order);
    if (!gate.ok) {
      Alert.alert(
        "Too early",
        gate.message ?? "Wait until closer to the scheduled time.",
      );
      return;
    }
    const finalTotal = Number(totals[order.id] || order.finalTotal);
    setBusyId(order.id);
    setBusyKind("deliver");
    setError("");
    try {
      if (!order.receiptUrl) {
        throw new Error(`Upload the ${orderShopLabel(order)} receipt photo.`);
      }
      if (!order.deliveryPhotoUrl) {
        throw new Error("Take a lobby photo before marking delivered.");
      }
      if (!(finalTotal > 0)) {
        throw new Error(
          `Enter the final ${orderShopLabel(order)} receipt total.`,
        );
      }
      if (!order.runnerVerified) {
        throw new Error(
          "Confirm you wrote the customer's full name on the receipt and attached it to the bag.",
        );
      }
      await markDeliveredWithTotal(order.id, {
        finalTotal,
        receiptUrl: order.receiptUrl,
        deliveryPhotoUrl: order.deliveryPhotoUrl,
        runnerVerified: true,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark delivered");
    } finally {
      setBusyId(null);
      setBusyKind("");
    }
  }

  if (authLoading) {
    return (
      <Page includeBottomInset={false}>
        <ScreenHeader title="Runner" />
        <LoadingBlock />
      </Page>
    );
  }

  if (!user) {
    return (
      <Page includeBottomInset={false}>
        <ScreenHeader title="Runner" />
        <EmptyState
          title="Sign in to run deliveries"
          body="Use the Profile tab, then come back here to sign up as a runner."
        />
      </Page>
    );
  }

  return (
    <Page includeBottomInset={false}>
      <ScreenHeader
        title="Runner"
        right={
          <Pressable onPress={() => void refresh()} disabled={loadingList}>
            <Text className="text-sm font-semibold text-fusion">
              {loadingList ? "…" : "Refresh"}
            </Text>
          </Pressable>
        }
      />
      <ScreenKeyboardAvoid className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-4 pb-10"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Card>
            <Text className="text-sm text-gray-600">
              Signed in as {user.email ?? user.uid}
            </Text>
            {!profile?.isRunner ? (
              <View className="mt-3">
                <Text className="text-sm text-gray-700">
                  Deliver orders and get paid after each drop-off. You’ll still
                  be able to order as a customer.
                </Text>
                <TextInput
                  className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
                <PrimaryButton
                  label="Sign up to be a Runner"
                  className="mt-3"
                  busy={signingUp}
                  onPress={onBecomeRunner}
                />
              </View>
            ) : (
              <Text className="mt-2 text-xs text-emerald-700">
                New pending orders show up here live, and buzz while this app is open.
              </Text>
            )}
            <TextInput
              className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              value={runnerName}
              onChangeText={setRunnerName}
              placeholder="Display name"
              placeholderTextColor="#9CA3AF"
            />
            <SecondaryButton
              label="Reload profile"
              className="mt-3"
              onPress={() => void refreshProfile()}
            />
          </Card>

          {error ? (
            <Card className="mt-3 border-red-100 bg-red-50">
              <Text className="text-sm text-red-700">{error}</Text>
              <PrimaryButton
                label="Retry load"
                className="mt-3"
                onPress={() => void refresh()}
              />
            </Card>
          ) : null}

          <Text className="mb-2 mt-5 text-base font-extrabold text-gray-900">
            Available
          </Text>
          {loadingList && pending.length === 0 && active.length === 0 ? (
            <LoadingBlock label="Loading jobs…" />
          ) : pending.length === 0 ? (
            <EmptyState
              title={
                isServiceOpen()
                  ? "No orders right now"
                  : "GraceRun is closed right now"
              }
              body={
                isServiceOpen()
                  ? "When a student places an order, this phone will buzz."
                  : `Fusion delivery is ${SERVICE_HOURS.label}. Check back at 8:30 AM.`
              }
            />
          ) : (
            pending.map((order) => (
              <Card key={order.id} className="mb-3">
                <Text className="font-bold text-gray-900">{order.id}</Text>
                {order.isScheduled && order.scheduledFor ? (
                  <Text className="mt-1 text-sm font-semibold text-amber-800">
                    Deliver by {formatScheduled(order.scheduledFor)}
                  </Text>
                ) : null}
                <Text className="mt-1 text-sm font-semibold text-gray-800">
                  {orderShopLabel(order)}
                </Text>
                <Text className="mt-1 text-sm text-gray-600">
                  {order.hall} · ${order.total} · {order.customerName}
                </Text>
                <Text className="mt-1 text-xs text-gray-500">
                  {order.items.length} item
                  {order.items.length === 1 ? "" : "s"}
                  {order.canteenCollege
                    ? ` · college discount if you match ${order.canteenCollege}`
                    : ""}
                </Text>
                <PrimaryButton
                  label={
                    busyId === order.id && busyKind === "accept"
                      ? "Accepting…"
                      : "Accept"
                  }
                  className="mt-3"
                  busy={busyId === order.id && busyKind === "accept"}
                  onPress={() => void onAccept(order.id)}
                />
              </Card>
            ))
          )}

          <Text className="mb-2 mt-4 text-base font-extrabold text-gray-900">
            My active
          </Text>
          {active.length === 0 ? (
            <Text className="text-sm text-gray-500">No active jobs.</Text>
          ) : (
            active.map((order) => {
              const busy = busyId === order.id;
              const shopGate = shoppingUnlocked(order);
              const shopLocked = !shopGate.ok;
              return (
                <Card key={order.id} className="mb-3">
                  <Text className="font-bold text-gray-900">{order.id}</Text>
                  <Text className="mt-1 text-sm text-fusion">
                    {ORDER_STATUS_LABELS[order.status]}
                  </Text>
                  {order.isScheduled && order.scheduledFor ? (
                    <Text className="mt-1 text-sm font-semibold text-amber-800">
                      Deliver by {formatScheduled(order.scheduledFor)}
                    </Text>
                  ) : null}
                  {shopLocked ? (
                    <Text className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      {shopGate.message} Receipt / shop steps stay locked until
                      then.
                    </Text>
                  ) : null}
                  <Text className="mt-1 text-sm font-semibold text-gray-800">
                    {orderShopLabel(order)}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-600">
                    {order.hall} · {order.customerName}
                  </Text>
                  <Text className="mt-1 text-sm font-semibold text-emerald-700">
                    You earn $
                    {runnerEarningsFromOrder(order)}
                    {orderTipTotal(order) > 0
                      ? ` (incl. $${orderTipTotal(order)} tip)`
                      : ""}
                  </Text>
                  {order.discountApplied && (order.discountAmount ?? 0) > 0 ? (
                    <Text className="mt-1 text-xs font-semibold text-emerald-700">
                      College discount −HK${order.discountAmount}
                    </Text>
                  ) : null}

                  {(order.status === "accepted" ||
                    order.status === "assigned" ||
                    order.status === "purchased") && (
                    <View className="mt-3 gap-2">
                      <SecondaryButton
                        label={
                          busy && busyKind === "lobby-ping"
                            ? "Sending lobby ping…"
                            : isLobbyArrivalActive(order)
                              ? "Ping again — I’m at lobby"
                              : "I’m at lobby"
                        }
                        onPress={() => void onLobbyPing(order)}
                        disabled={busy}
                      />
                      {sharedCustomerPhone(order) ? (
                        <View className="flex-row gap-2">
                          <Pressable
                            className="flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-3"
                            onPress={() => openCustomerCall(order)}
                          >
                            <Text className="text-sm font-semibold text-gray-900">
                              Call
                            </Text>
                          </Pressable>
                          <Pressable
                            className="flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-3"
                            onPress={() => openCustomerWhatsApp(order)}
                          >
                            <Text className="text-sm font-semibold text-gray-900">
                              WhatsApp
                            </Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Text className="text-xs text-gray-500">
                          Customer did not opt in to share a phone number —
                          use chat.
                        </Text>
                      )}
                    </View>
                  )}

                  {order.items.some((i) => i.isCustom) ? (
                    <Text className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                      This order contains custom items. Confirm actual prices.
                    </Text>
                  ) : null}

                  {order.items.map((item) => {
                    const uri = lineImage(item);
                    return (
                      <Pressable
                        key={`${item.itemId}-${item.name}`}
                        className="mt-2 flex-row items-center gap-3"
                        onPress={() => {
                          if (uri) setZoom({ uri, alt: item.name });
                        }}
                      >
                        <ProductImage uri={uri || undefined} size={56} />
                        <View className="flex-1">
                          <Text className="text-sm text-gray-800">
                            {item.quantity}× {item.name}
                          </Text>
                          {item.isCustom ? (
                            <Text className="text-xs font-semibold text-amber-700">
                              Custom · est. ${item.price}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}

                  <View className="mt-3 gap-2">
                    <SecondaryButton
                      label={
                        shopLocked
                          ? "1. Shopping locked until closer to delivery"
                          : order.receiptUrl
                            ? "✓ Receipt uploaded (retake)"
                            : busy && busyKind === "receipt"
                              ? "Uploading receipt…"
                              : "1. Receipt photo (camera or library)"
                      }
                      onPress={() => void onReceipt(order)}
                      disabled={busy || shopLocked}
                    />

                    <Text className="mt-1 text-xs font-semibold text-gray-500">
                      2. {orderShopLabel(order)} receipt total (HKD)
                    </Text>
                    <View className="flex-row gap-2">
                      <TextInput
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                        keyboardType="decimal-pad"
                        placeholder="e.g. 86.5"
                        placeholderTextColor="#9CA3AF"
                        value={totals[order.id] ?? ""}
                        onChangeText={(v) =>
                          setTotals((prev) => ({ ...prev, [order.id]: v }))
                        }
                      />
                      <Pressable
                        className="items-center justify-center rounded-xl bg-fusion px-3"
                        disabled={busy || shopLocked}
                        onPress={() => void onSaveTotal(order)}
                      >
                        <Text className="text-sm font-bold text-white">
                          {busy && busyKind === "total" ? "…" : "Save"}
                        </Text>
                      </Pressable>
                    </View>

                    <Pressable
                      className="mt-1 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3"
                      onPress={() => void onToggleVerified(order)}
                      disabled={busy || shopLocked}
                    >
                      <View
                        className={`h-5 w-5 items-center justify-center rounded border ${
                          order.runnerVerified
                            ? "border-fusion bg-fusion"
                            : "border-gray-300"
                        }`}
                      >
                        {order.runnerVerified ? (
                          <Text className="text-xs font-bold text-white">✓</Text>
                        ) : null}
                      </View>
                      <Text className="flex-1 text-xs text-gray-700">
                        3. I wrote the customer's full name on the receipt and
                        attached it to the bag
                      </Text>
                    </Pressable>

                    <Pressable
                      className="mt-1 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3"
                      onPress={() => void onToggleHeavyBag(order)}
                      disabled={busy || shopLocked}
                    >
                      <View
                        className={`h-5 w-5 items-center justify-center rounded border ${
                          (order.heavyBagSurcharge ?? 0) > 0
                            ? "border-fusion bg-fusion"
                            : "border-gray-300"
                        }`}
                      >
                        {(order.heavyBagSurcharge ?? 0) > 0 ? (
                          <Text className="text-xs font-bold text-white">✓</Text>
                        ) : null}
                      </View>
                      <Text className="flex-1 text-xs text-gray-700">
                        Heavy bag (over ~{HEAVY_BAG_THRESHOLD_KG} kg) — add $
                        {HEAVY_BAG_SURCHARGE} surcharge
                        {busy && busyKind === "heavy" ? "…" : ""}
                      </Text>
                    </Pressable>

                    <SecondaryButton
                      label={
                        order.deliveryPhotoUrl
                          ? "✓ Lobby photo uploaded (retake)"
                          : busy && busyKind === "lobby"
                            ? "Uploading lobby…"
                            : "4. Lobby photo (camera or library)"
                      }
                      onPress={() => void onLobby(order)}
                      disabled={busy || shopLocked}
                    />

                    {(order.status === "accepted" ||
                      order.status === "purchased") && (
                      <PrimaryButton
                        label={
                          busy && busyKind === "deliver"
                            ? "Marking delivered…"
                            : "5. Mark delivered"
                        }
                        className="mt-1"
                        busy={busy && busyKind === "deliver"}
                        disabled={shopLocked}
                        onPress={() => void onDeliver(order)}
                      />
                    )}
                  </View>

                  <OrderChat order={order} />
                </Card>
              );
            })
          )}

          <Text className="mb-2 mt-6 text-base font-extrabold text-gray-900">
            Your payouts
          </Text>
          {(() => {
            const summary = summarizeRunnerPayouts(delivered);
            const sample = delivered.find((o) => o.runnerPaymentId);
            const payMethod =
              profile?.runnerPaymentMethod ??
              sample?.runnerPaymentMethod ??
              "PayMe / FPS";
            const payId = (
              profile?.runnerPaymentId ??
              sample?.runnerPaymentId ??
              profile?.phone ??
              ""
            ).trim();
            return (
              <Card className="mb-3">
                <Text className="text-sm text-gray-600">
                  Admin pays to {payMethod}
                  {payId ? `: ${payId}` : ""}.
                </Text>
                <View className="mt-3 flex-row gap-3">
                  <View className="flex-1 rounded-xl bg-amber-50 px-3 py-3">
                    <Text className="text-xs font-semibold text-amber-800">
                      Pending
                    </Text>
                    <Text className="mt-1 text-xl font-extrabold text-amber-900">
                      ${summary.pendingAmount}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-amber-800">
                      {summary.pendingCount} order
                      {summary.pendingCount === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-emerald-50 px-3 py-3">
                    <Text className="text-xs font-semibold text-emerald-800">
                      Paid
                    </Text>
                    <Text className="mt-1 text-xl font-extrabold text-emerald-900">
                      ${summary.paidAmount}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-emerald-800">
                      {summary.paidCount} order
                      {summary.paidCount === 1 ? "" : "s"}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })()}
          {delivered.length === 0 ? (
            <Text className="mb-4 text-sm text-gray-500">
              Completed deliveries show here with earnings and payment proof.
            </Text>
          ) : (
            delivered.slice(0, 20).map((order) => {
              const earn = runnerEarningsFromOrder(order);
              const paid = runnerPayoutPaid(order.status);
              const pendingPay = runnerPayoutPending(order.status);
              const when = order.runnerPaidAt ?? order.deliveredAt ?? order.updatedAt;
              return (
                <Card key={`pay-${order.id}`} className="mb-3">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <Text className="font-bold text-gray-900">{order.id}</Text>
                      <Text className="mt-1 text-xs text-gray-500">
                        {when
                          ? when.toLocaleString("en-HK", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </Text>
                    </View>
                    <Text className="text-sm font-extrabold text-emerald-700">
                      +${earn}
                    </Text>
                  </View>
                  <Text
                    className={`mt-2 text-xs font-semibold ${
                      paid
                        ? "text-emerald-700"
                        : pendingPay
                          ? "text-amber-700"
                          : "text-gray-500"
                    }`}
                  >
                    {paid
                      ? "Paid by GraceRun"
                      : pendingPay
                        ? "Pending payout"
                        : ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </Text>
                  {order.runnerPayoutProofUrl ? (
                    <Pressable
                      className="mt-2"
                      onPress={() =>
                        void Linking.openURL(order.runnerPayoutProofUrl!)
                      }
                    >
                      <Text className="text-sm font-semibold text-fusion underline">
                        View payment proof
                      </Text>
                    </Pressable>
                  ) : null}
                </Card>
              );
            })
          )}
        </ScrollView>
      </ScreenKeyboardAvoid>

      <Modal visible={Boolean(zoom)} transparent animationType="fade">
        <Pressable
          className="flex-1 items-center justify-center bg-black/80 px-4"
          onPress={() => setZoom(null)}
        >
          {zoom ? (
            <Image
              source={{ uri: zoom.uri }}
              style={{ width: "100%", height: "80%" }}
              resizeMode="contain"
              accessibilityLabel={zoom.alt}
            />
          ) : null}
        </Pressable>
      </Modal>
    </Page>
  );
}
