import { useCallback, useEffect, useState } from "react";
import {
  useNavigation,
  type CompositeNavigationProp,
} from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  fetchOrdersByCustomer,
  ORDER_STATUS_LABELS,
} from "@fusion-express/shared";
import type { Order } from "@fusion-express/shared/types";
import { useAuth } from "../../src/auth";
import type { RootStackParamList, TabsParamList } from "../../src/navigation";
import {
  canRateOrder,
  DeliveryRating,
  orderHasRating,
} from "../../src/DeliveryRating";
import {
  Card,
  EmptyState,
  LoadingBlock,
  Page,
  PrimaryButton,
  ScreenHeader,
} from "../../src/ui";

type OrdersNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabsParamList, "Orders">,
  NativeStackNavigationProp<RootStackParamList>
>;

function statusTone(status: Order["status"]): string {
  if (status === "delivered" || status === "completed" || status === "paid") {
    return "text-emerald-700";
  }
  if (status === "pending") return "text-amber-600";
  return "text-fusion";
}

export default function OrdersScreen() {
  const navigation = useNavigation<OrdersNav>();
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
      <Page includeBottomInset={false}>
        <ScreenHeader title="Your orders" />
        <LoadingBlock />
      </Page>
    );
  }

  if (!user) {
    return (
      <Page includeBottomInset={false}>
        <ScreenHeader title="Your orders" />
        <EmptyState
          title="Sign in to see your orders"
          body="Open the Profile tab with your university email. Orders are tied to your signed-in account."
          actionLabel="Go to Profile"
          onAction={() => navigation.navigate("Profile")}
        />
      </Page>
    );
  }

  return (
    <Page includeBottomInset={false}>
      <ScreenHeader
        title="Your orders"
        right={
          <Pressable onPress={() => void load()}>
            <Text className="text-sm font-semibold text-fusion">Refresh</Text>
          </Pressable>
        }
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4 pb-10"
      >
        {error ? (
          <Card className="mb-3 border-red-100 bg-red-50">
            <Text className="text-sm text-red-700">{error}</Text>
            <PrimaryButton
              label="Retry"
              className="mt-3"
              onPress={() => void load()}
            />
          </Card>
        ) : null}

        {loading ? (
          <LoadingBlock label="Loading orders…" />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            body="Browse the shop and place your first delivery to your hall lobby."
            actionLabel="Shop now"
            onAction={() => navigation.navigate("Shop")}
          />
        ) : (
          orders.map((order) => (
            <View key={order.id} className="mb-3">
              <Pressable
                onPress={() =>
                  navigation.navigate("Track", { orderId: order.id })
                }
              >
                <Card>
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Order
                      </Text>
                      <Text className="mt-0.5 font-bold text-gray-900">
                        {order.id}
                      </Text>
                    </View>
                    <Text
                      className={`text-sm font-bold ${statusTone(order.status)}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </Text>
                  </View>
                  <Text className="mt-3 text-sm text-gray-600">
                    Total ${order.total}
                  </Text>
                  {orderHasRating(order) ? (
                    <Text className="mt-1 text-xs text-emerald-700">
                      Rated {order.rating ?? order.runnerRating}★
                      {(order.tipAmount ?? 0) > 0
                        ? ` · tip HK$${order.tipAmount}`
                        : ""}
                    </Text>
                  ) : canRateOrder(order) ? (
                    <Text className="mt-1 text-xs font-semibold text-amber-700">
                      Rate this delivery below
                    </Text>
                  ) : null}
                  <Text className="mt-2 text-xs font-semibold text-fusion">
                    Track order ›
                  </Text>
                </Card>
              </Pressable>
              {canRateOrder(order) || orderHasRating(order) ? (
                <DeliveryRating order={order} onDone={() => void load()} />
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </Page>
  );
}
