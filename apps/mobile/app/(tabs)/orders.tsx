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
      <View className="flex-1 bg-page px-4 pt-6">
        <Text className="font-sans text-muted">Loading…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-page px-4 pt-6">
        <Text className="mb-3 font-sans-bold text-xl text-ink">Your orders</Text>
        <View className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Text className="font-sans text-gray-600">
            Sign in on the Profile tab to see orders tied to your account.
          </Text>
          <Text className="mt-2 font-sans text-sm text-muted">
            Guest checkout orders appear after you place them with the same
            phone on this device (you stay signed in as the guest account).
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-page px-4 pt-6">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-sans-bold text-xl text-ink">Your orders</Text>
        <Pressable onPress={() => void load()}>
          <Text className="font-sans-semibold text-sm text-fusion">Refresh</Text>
        </Pressable>
      </View>
      {error ? (
        <Text className="mb-2 font-sans text-sm text-red-600">{error}</Text>
      ) : null}
      {loading ? (
        <Text className="font-sans text-muted">Loading…</Text>
      ) : orders.length === 0 ? (
        <Text className="font-sans text-muted">
          No orders for this account yet.
        </Text>
      ) : (
        orders.map((order) => (
          <Link key={order.id} href={`/track?orderId=${order.id}`} asChild>
            <Pressable className="mb-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <Text className="font-sans-bold text-fusion">{order.id}</Text>
              <Text className="mt-1 font-sans text-sm text-gray-600">
                {ORDER_STATUS_LABELS[order.status]} · ${order.total}
              </Text>
            </Pressable>
          </Link>
        ))
      )}
    </ScrollView>
  );
}
