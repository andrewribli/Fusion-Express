import { useCallback, useEffect, useState } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  fetchOrdersByCustomer,
  ORDER_STATUS_LABELS,
} from "@fusion-express/shared";
import type { Order } from "@fusion-express/shared/types";
import { useAuth } from "../../src/auth";

export default function OrdersScreen() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setOrders(await fetchOrdersByCustomer(user.uid));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

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
        <Text className="mb-3 text-xl font-bold">Your orders</Text>
        <Text className="text-gray-500">
          Sign in on the Profile tab to see orders tied to your account.
        </Text>
        <Text className="mt-2 text-sm text-gray-400">
          Guest checkout orders stay on this device after you place them.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xl font-bold">Your orders</Text>
        <Pressable onPress={() => void load()}>
          <Text className="text-sm font-semibold text-fusion">Refresh</Text>
        </Pressable>
      </View>
      {error ? <Text className="mb-2 text-sm text-red-600">{error}</Text> : null}
      {loading ? (
        <Text className="text-gray-500">Loading…</Text>
      ) : orders.length === 0 ? (
        <Text className="text-gray-500">No orders for this account yet.</Text>
      ) : (
        orders.map((order) => (
          <Link key={order.id} href={`/track?orderId=${order.id}`} asChild>
            <Pressable className="mb-3 rounded-2xl border border-gray-200 p-4">
              <Text className="font-bold text-fusion">{order.id}</Text>
              <Text className="text-sm text-gray-600">
                {ORDER_STATUS_LABELS[order.status]} · ${order.total}
              </Text>
            </Pressable>
          </Link>
        ))
      )}
    </ScrollView>
  );
}
