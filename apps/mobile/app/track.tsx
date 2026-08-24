import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  fetchOrder,
  ORDER_STATUS_LABELS,
  TRACKING_STEPS,
  getStepIndex,
} from "@fusion-express/shared";
import type { Order } from "@fusion-express/shared/types";

export default function TrackScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    const found = await fetchOrder(orderId);
    setOrder(found);
    setMissing(!found);
  }, [orderId]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [load]);

  const step = order ? getStepIndex(order.status) : 0;

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-4">
      {!orderId ? (
        <Text>No order id.</Text>
      ) : missing ? (
        <Text>Order {orderId} not found.</Text>
      ) : order ? (
        <>
          <Text className="text-2xl font-bold text-fusion">{order.id}</Text>
          <Text className="mt-1 text-gray-600">
            {ORDER_STATUS_LABELS[order.status]}
          </Text>
          <View className="mt-6">
            {TRACKING_STEPS.map((item, index) => (
              <View key={item.status} className="mb-3 flex-row items-center">
                <View
                  className={`mr-3 h-3 w-3 rounded-full ${
                    index <= step ? "bg-fusion" : "bg-gray-300"
                  }`}
                />
                <Text
                  className={index <= step ? "font-semibold" : "text-gray-400"}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
          <Pressable className="mt-4 rounded-xl border border-gray-200 py-3" onPress={() => void load()}>
            <Text className="text-center">Refresh</Text>
          </Pressable>
        </>
      ) : (
        <Text>Loading…</Text>
      )}
    </ScrollView>
  );
}
