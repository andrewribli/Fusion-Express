import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  fetchOrdersByIds,
  getOrderHistoryIds,
  ORDER_STATUS_LABELS,
} from "@fusion-express/shared";
import type { Order } from "@fusion-express/shared/types";

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    void fetchOrdersByIds(getOrderHistoryIds()).then(setOrders);
  }, []);

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-4">
      <Text className="mb-3 text-xl font-bold">Your orders</Text>
      {orders.length === 0 ? (
        <Text className="text-gray-500">No orders on this device yet.</Text>
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
