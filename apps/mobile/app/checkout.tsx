import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  calculateDeliveryFee,
  cartTotalWeightKg,
} from "@fusion-express/shared/delivery";
import {
  CUHK_COLLEGES,
  formatDeliveryAddress,
  getHallsForCollege,
  getLobbyForHall,
  type CuhkCollege,
} from "@fusion-express/shared/locations";
import { createOrder } from "@fusion-express/shared/orders";
import { getEstimatedDeliveryTime } from "@fusion-express/shared";
import { getUnitPrice, lineTotal } from "@fusion-express/shared";
import { useCart } from "../src/cart";

export default function CheckoutScreen() {
  const { items, subtotal, sessionId, clearCart } = useCart();
  const [college, setCollege] = useState<CuhkCollege>(CUHK_COLLEGES[0]);
  const [hall, setHall] = useState(getHallsForCollege(CUHK_COLLEGES[0])[0]);
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const weightKg = cartTotalWeightKg(items);
  const fee = useMemo(
    () => calculateDeliveryFee({ weightKg, college }),
    [weightKg, college],
  );
  const total = subtotal + fee.deliveryFee;

  function pickCollege(next: CuhkCollege) {
    setCollege(next);
    setHall(getHallsForCollege(next)[0]);
  }

  async function place() {
    if (items.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const orderId = await createOrder({
        sessionId,
        customerId: sessionId,
        customerName: "Mobile customer",
        items: items.map(({ item, quantity }) => ({
          itemId: item.id,
          name: item.name,
          price: getUnitPrice(item),
          quantity,
          weightKg: item.weightKg,
        })),
        status: "pending",
        college,
        hall,
        roomNumber: room.trim() || undefined,
        lobbyPoint: getLobbyForHall(hall),
        zone: fee.zone,
        totalWeight: fee.weightKg,
        subtotal: items.reduce(
          (sum, line) => sum + lineTotal(line.item, line.quantity),
          0,
        ),
        deliveryFee: fee.deliveryFee,
        total,
        paymentReceived: false,
        estimatedDeliveryAt: getEstimatedDeliveryTime(),
      });
      clearCart();
      router.replace(`/track?orderId=${orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-4">
      <Text className="font-semibold">College / zone</Text>
      {CUHK_COLLEGES.map((name) => (
        <Pressable
          key={name}
          className={`mt-2 rounded-xl border px-3 py-2 ${
            college === name ? "border-fusion bg-red-50" : "border-gray-200"
          }`}
          onPress={() => pickCollege(name)}
        >
          <Text>{name}</Text>
        </Pressable>
      ))}

      <Text className="mt-4 font-semibold">Hall / lobby</Text>
      {getHallsForCollege(college).map((name) => (
        <Pressable
          key={name}
          className={`mt-2 rounded-xl border px-3 py-2 ${
            hall === name ? "border-fusion bg-red-50" : "border-gray-200"
          }`}
          onPress={() => setHall(name)}
        >
          <Text>
            {name} · {getLobbyForHall(name)}
          </Text>
        </Pressable>
      ))}

      <Text className="mt-4 font-semibold">Room (optional)</Text>
      <TextInput
        className="mt-2 rounded-xl border border-gray-200 px-4 py-3"
        value={room}
        onChangeText={setRoom}
        placeholder="e.g. 301"
      />

      <Text className="mt-4 text-sm text-gray-600">
        {formatDeliveryAddress(college, hall, room || undefined)}
      </Text>
      <Text className="mt-1 text-sm text-gray-600">
        Zone {fee.zone} · delivery ${fee.deliveryFee} · total ${total}
      </Text>
      {error ? <Text className="mt-2 text-red-600">{error}</Text> : null}

      <Pressable
        className="mb-10 mt-6 rounded-2xl bg-fusion py-4"
        disabled={loading || items.length === 0}
        onPress={() => void place()}
      >
        <Text className="text-center text-lg font-semibold text-white">
          {loading ? "Placing…" : "Place order"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
