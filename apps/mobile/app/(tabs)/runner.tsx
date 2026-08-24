import { useCallback, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
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
import type { Order } from "@fusion-express/shared/types";

export default function RunnerScreen() {
  const [runnerId, setRunnerId] = useState("mobile-runner");
  const [runnerName, setRunnerName] = useState("Mobile Runner");
  const [pending, setPending] = useState<Order[]>([]);
  const [active, setActive] = useState<Order[]>([]);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [nextPending, nextActive] = await Promise.all([
        fetchPendingOrders(),
        fetchRunnerOrders(runnerId),
      ]);
      setPending(nextPending);
      setActive(nextActive);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders");
    }
  }, [runnerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onAccept(orderId: string) {
    try {
      await acceptOrder(orderId, runnerId, runnerName, "not-the-customer");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accept failed");
    }
  }

  async function onPicked(orderId: string) {
    await updateOrderStatus(orderId, "picked");
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

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-4">
      <Text className="text-xl font-bold">Runner dashboard</Text>
      <TextInput
        className="mt-3 rounded-xl border border-gray-200 px-4 py-2"
        value={runnerId}
        onChangeText={setRunnerId}
        placeholder="Runner id"
      />
      <TextInput
        className="mt-2 rounded-xl border border-gray-200 px-4 py-2"
        value={runnerName}
        onChangeText={setRunnerName}
        placeholder="Display name"
      />
      <Pressable className="mt-3 rounded-xl bg-fusion py-3" onPress={() => void refresh()}>
        <Text className="text-center font-semibold text-white">Refresh</Text>
      </Pressable>
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
          {order.status === "assigned" ? (
            <Pressable
              className="mt-2 rounded-xl border border-fusion py-2"
              onPress={() => void onPicked(order.id)}
            >
              <Text className="text-center font-semibold text-fusion">
                Mark picked up
              </Text>
            </Pressable>
          ) : null}
          {order.status === "picked" ? (
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
    </ScrollView>
  );
}
