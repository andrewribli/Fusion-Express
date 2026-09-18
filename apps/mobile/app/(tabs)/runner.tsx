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

function lineImage(item: { itemId: string; name: string }): string {
  return resolveProductImageUrl(
    resolveProductImage({ id: item.itemId, name: item.name }) ?? "",
  );
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
      <View className="flex-1 bg-white px-4 pt-4">
        <Text className="text-gray-500">Loading…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-white px-4 pt-4">
        <Text className="text-xl font-bold">Runner dashboard</Text>
        <Text className="mt-3 text-gray-600">
          Sign in on the Profile tab. Firestore requires auth.uid (and
          isRunner on your user profile) to accept jobs.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-4">
      <Text className="text-xl font-bold">Runner dashboard</Text>
      <Text className="mt-1 text-sm text-gray-500">
        Signed in as {user.email ?? user.uid}
      </Text>
      {!profile?.isRunner ? (
        <Text className="mt-2 text-sm text-red-600">
          Profile is not flagged isRunner — accept will be denied by security
          rules until you enable runner on web.
        </Text>
      ) : null}
      <TextInput
        className="mt-3 rounded-xl border border-gray-200 px-4 py-2"
        value={runnerName}
        onChangeText={setRunnerName}
        placeholder="Display name"
      />
      <Text className="mt-2 text-xs text-gray-400">
        runnerUid: {runnerUid}
        {profile?.runnerId ? ` · runnerId: ${profile.runnerId}` : ""}
      </Text>
      <View className="mt-3 flex-row gap-2">
        <Pressable
          className="flex-1 rounded-xl bg-fusion py-3"
          onPress={() => void refresh()}
        >
          <Text className="text-center font-semibold text-white">Refresh</Text>
        </Pressable>
        <Pressable
          className="rounded-xl border border-gray-300 px-4 py-3"
          onPress={() => void refreshProfile()}
        >
          <Text className="text-center font-semibold">Reload profile</Text>
        </Pressable>
      </View>
      {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}

      <Text className="mb-2 mt-6 font-semibold">Available</Text>
      {pending.map((order) => (
        <View key={order.id} className="mb-3 rounded-2xl border border-gray-200 p-4">
          <Text className="font-bold">{order.id}</Text>
          <Text className="text-sm text-gray-600">
            {order.hall} · ${order.total}
          </Text>
          <Pressable
            className="mt-2 rounded-xl bg-fusion py-2"
            onPress={() => void onAccept(order.id)}
          >
            <Text className="text-center font-semibold text-white">Accept</Text>
          </Pressable>
        </View>
      ))}

      <Text className="mb-2 mt-4 font-semibold">My active</Text>
      {active.map((order) => (
        <View key={order.id} className="mb-3 rounded-2xl border border-gray-200 p-4">
          <Text className="font-bold">{order.id}</Text>
          <Text className="text-sm text-gray-600">{order.status}</Text>
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
                {uri ? (
                  <Image
                    source={{ uri }}
                    className="h-16 w-16 rounded-lg bg-white"
                    resizeMode="contain"
                    accessibilityLabel={item.name}
                  />
                ) : (
                  <View className="h-16 w-16 items-center justify-center rounded-lg bg-gray-100">
                    <Text className="text-[10px] text-gray-500">No photo</Text>
                  </View>
                )}
                <Text className="flex-1 text-sm text-gray-800">
                  {item.quantity}× {item.name}
                </Text>
              </Pressable>
            );
          })}
          {order.status === "accepted" ? (
            <Pressable
              className="mt-2 rounded-xl border border-fusion py-2"
              onPress={() => void onPicked(order.id)}
            >
              <Text className="text-center font-semibold text-fusion">
                Mark picked up
              </Text>
            </Pressable>
          ) : null}
          {order.status === "purchased" ? (
            <Pressable
              className="mt-2 rounded-xl bg-fusion py-2"
              onPress={() => void onDelivered(order.id)}
            >
              <Text className="text-center font-semibold text-white">
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
              className="h-4/5 w-full"
              resizeMode="contain"
              accessibilityLabel={zoom.alt}
            />
          ) : null}
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
