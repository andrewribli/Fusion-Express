import { useCallback, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  acceptOrder,
  fetchPendingOrders,
  fetchRunnerOrders,
  updateOrderStatus,
  uploadDeliveryPhoto,
} from "@fusion-express/shared/orders";
import { resolveProductImageUrl } from "@fusion-express/shared/products";
import { resolveProductImage } from "@fusion-express/shared/resolve-image";
import type { Order } from "@fusion-express/shared/types";
import { useAuth } from "../../src/auth";
import { ProductImage } from "../../src/ProductImage";

function lineImage(item: { itemId: string; name: string }): string {
  return (
    resolveProductImage({ id: item.itemId, name: item.name }) ??
    ""
  );
}

function lineImageUri(item: { itemId: string; name: string }): string {
  return resolveProductImageUrl(lineImage(item));
}

export default function RunnerScreen() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [runnerName, setRunnerName] = useState(
    profile?.fullName ?? "Mobile Runner",
  );
  const [pending, setPending] = useState<Order[]>([]);
  const [active, setActive] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState<{ uri: string; alt: string } | null>(null);

  useEffect(() => {
    if (profile?.fullName) setRunnerName(profile.fullName);
  }, [profile?.fullName]);

  const runnerUid = user?.uid ?? "";
  const runnerId = profile?.runnerId || runnerUid;

  const refresh = useCallback(async () => {
    if (!runnerUid) {
      setPending([]);
      setActive([]);
      return;
    }
    setError("");
    try {
      const [nextPending, nextActive] = await Promise.all([
        fetchPendingOrders(),
        fetchRunnerOrders(runnerUid),
      ]);
      setPending(nextPending);
      setActive(nextActive);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders");
    }
  }, [runnerUid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    try {
      await acceptOrder(
        orderId,
        runnerId,
        runnerName.trim() || "Mobile Runner",
        runnerUid,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accept failed");
    }
  }

  async function onPicked(orderId: string) {
    await updateOrderStatus(orderId, "purchased");
    await refresh();
  }

  async function onDelivered(orderId: string) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const url = await uploadDeliveryPhoto(orderId, blob, "proof.jpg");
    await updateOrderStatus(orderId, "delivered", { deliveryPhotoUrl: url });
    await refresh();
  }

  if (authLoading) {
    return (
      <View className="flex-1 bg-page px-4 pt-6">
        <Text className="font-sans text-muted">Loading…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-page px-4 pt-6">
        <Text className="font-sans-bold text-xl text-ink">Runner dashboard</Text>
        <Text className="mt-3 font-sans text-gray-600">
          Sign in on the Profile tab. Firestore requires auth.uid (and
          isRunner on your user profile) to accept jobs.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-page px-4 pt-6">
      <Text className="font-sans-bold text-xl text-ink">Runner dashboard</Text>
      <Text className="mt-1 font-sans text-sm text-muted">
        Signed in as {user.email ?? user.uid}
      </Text>
      {!profile?.isRunner ? (
        <Text className="mt-2 font-sans text-sm text-red-600">
          Profile is not flagged isRunner — accept will be denied by security
          rules until you enable runner on web.
        </Text>
      ) : null}
      <TextInput
        className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-2 font-sans"
        value={runnerName}
        onChangeText={setRunnerName}
        placeholder="Display name"
        placeholderTextColor="#9ca3af"
      />
      <Text className="mt-2 font-sans text-xs text-muted">
        runnerUid: {runnerUid}
        {profile?.runnerId ? ` · runnerId: ${profile.runnerId}` : ""}
      </Text>
      <View className="mt-3 flex-row gap-2">
        <Pressable
          className="flex-1 rounded-xl bg-fusion py-3"
          onPress={() => void refresh()}
        >
          <Text className="text-center font-sans-semibold text-white">
            Refresh
          </Text>
        </Pressable>
        <Pressable
          className="rounded-xl border border-gray-300 bg-white px-4 py-3"
          onPress={() => void refreshProfile()}
        >
          <Text className="text-center font-sans-semibold text-ink">
            Reload profile
          </Text>
        </Pressable>
      </View>
      {error ? (
        <Text className="mt-2 font-sans text-sm text-red-600">{error}</Text>
      ) : null}

      <Text className="mb-2 mt-6 font-sans-semibold text-ink">Available</Text>
      {pending.map((order) => (
        <View
          key={order.id}
          className="mb-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <Text className="font-sans-bold text-ink">{order.id}</Text>
          <Text className="font-sans text-sm text-gray-600">
            {order.hall} · ${order.total}
          </Text>
          <Pressable
            className="mt-2 rounded-xl bg-fusion py-2"
            onPress={() => void onAccept(order.id)}
          >
            <Text className="text-center font-sans-semibold text-white">
              Accept
            </Text>
          </Pressable>
        </View>
      ))}

      <Text className="mb-2 mt-4 font-sans-semibold text-ink">My active</Text>
      {active.map((order) => (
        <View
          key={order.id}
          className="mb-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <Text className="font-sans-bold text-ink">{order.id}</Text>
          <Text className="font-sans text-sm text-gray-600">{order.status}</Text>
          {order.items.map((item) => {
            const uri = lineImageUri(item);
            return (
              <Pressable
                key={`${item.itemId}-${item.name}`}
                className="mt-2 flex-row items-center gap-3"
                onPress={() => {
                  if (uri) setZoom({ uri, alt: item.name });
                }}
              >
                <ProductImage image={lineImage(item)} size={64} roundedClassName="rounded-lg" />
                <Text className="flex-1 font-sans text-sm text-gray-800">
                  {item.quantity}× {item.name}
                </Text>
              </Pressable>
            );
          })}
          {order.status === "accepted" ? (
            <Pressable
              className="mt-2 rounded-xl border-2 border-fusion py-2"
              onPress={() => void onPicked(order.id)}
            >
              <Text className="text-center font-sans-semibold text-fusion">
                Mark picked up
              </Text>
            </Pressable>
          ) : null}
          {order.status === "purchased" ? (
            <Pressable
              className="mt-2 rounded-xl bg-fusion py-2"
              onPress={() => void onDelivered(order.id)}
            >
              <Text className="text-center font-sans-semibold text-white">
                Mark delivered + photo
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}
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
    </ScrollView>
  );
}
