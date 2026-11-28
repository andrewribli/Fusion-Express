import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { TIP_PRESETS, submitOrderRating } from "@fusion-express/shared";
import type { Order } from "@fusion-express/shared/types";
import { Card, PrimaryButton } from "./ui";

export function orderHasRating(order: Order): boolean {
  return Boolean(order.ratedAt || order.rating || order.runnerRating);
}

export function canRateOrder(order: Order): boolean {
  return (
    !orderHasRating(order) &&
    (order.status === "delivered" ||
      order.status === "runner_paid" ||
      order.status === "customer_paid" ||
      order.status === "completed" ||
      order.status === "paid")
  );
}

export function DeliveryRatingThanks({ order }: { order: Order }) {
  const stars = order.rating ?? order.runnerRating;
  return (
    <Card className="mt-3 bg-emerald-50">
      <Text className="text-sm font-bold text-emerald-900">Thank you!</Text>
      <Text className="mt-1 text-sm text-emerald-800">
        {stars ? `You rated this delivery ${stars}★` : "Feedback received"}
        {(order.tipAmount ?? 0) > 0 ? ` · tip HK$${order.tipAmount}` : ""}.
      </Text>
      {order.feedback ? (
        <Text className="mt-1 text-xs text-emerald-800">“{order.feedback}”</Text>
      ) : null}
    </Card>
  );
}

/** Post-delivery stars + optional feedback/tip. Hidden once submitted. */
export function DeliveryRatingForm({
  order,
  onDone,
}: {
  order: Order;
  onDone?: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState(false);

  const tipAmount = Math.max(
    0,
    customTip.trim() ? Number(customTip) || 0 : tip,
  );

  async function submit() {
    if (rating < 1) return;
    setBusy(true);
    setError("");
    try {
      await submitOrderRating(order.id, {
        rating,
        feedback: feedback.trim() || undefined,
        tipAmount: tipAmount > 0 ? tipAmount : undefined,
      });
      setThanks(true);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save rating.");
    } finally {
      setBusy(false);
    }
  }

  if (thanks) {
    return (
      <Card className="mt-3 bg-emerald-50">
        <Text className="text-sm font-bold text-emerald-900">Thank you!</Text>
        <Text className="mt-1 text-sm text-emerald-800">
          Your feedback helps runners improve
          {tipAmount > 0
            ? `. A HK$${tipAmount} tip was recorded for your runner`
            : ""}
          .
        </Text>
      </Card>
    );
  }

  return (
    <Card className="mt-3">
      <Text className="text-sm font-bold text-gray-900">Rate your delivery</Text>
      <Text className="mt-1 text-xs text-gray-500">
        How was {order.runnerName?.trim() || "your runner"}?
      </Text>
      <View className="mt-3 flex-row justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => setRating(star)} hitSlop={8}>
            <Text
              className={`text-3xl ${
                star <= rating ? "text-amber-400" : "text-gray-300"
              }`}
            >
              ★
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="mt-4 text-xs font-semibold text-gray-600">
        Feedback (optional)
      </Text>
      <TextInput
        value={feedback}
        onChangeText={(t) => setFeedback(t.slice(0, 1000))}
        placeholder="Anything we should know?"
        multiline
        className="mt-1 min-h-[72px] rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
        textAlignVertical="top"
      />

      <Text className="mt-4 text-xs font-semibold text-gray-600">
        Tip your runner (optional, HK$)
      </Text>
      <Text className="mt-0.5 text-[11px] text-gray-500">
        Tips are paid out with the runner’s weekly payout.
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {TIP_PRESETS.map((amount) => (
          <Pressable
            key={amount}
            onPress={() => {
              setTip(amount);
              setCustomTip("");
            }}
            className={`rounded-xl px-3 py-1.5 ${
              !customTip && tip === amount ? "bg-fusion" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                !customTip && tip === amount ? "text-white" : "text-gray-700"
              }`}
            >
              {amount === 0 ? "No tip" : `$${amount}`}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={customTip}
        onChangeText={setCustomTip}
        keyboardType="decimal-pad"
        placeholder="Custom amount"
        className="mt-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
      />

      {error ? <Text className="mt-2 text-sm text-fusion">{error}</Text> : null}

      <PrimaryButton
        label={busy ? "Submitting…" : "Submit rating"}
        busy={busy}
        disabled={rating < 1}
        className="mt-4"
        onPress={() => void submit()}
      />
    </Card>
  );
}

export function DeliveryRating({
  order,
  onDone,
}: {
  order: Order;
  onDone?: () => void;
}) {
  if (orderHasRating(order)) return <DeliveryRatingThanks order={order} />;
  if (!canRateOrder(order)) return null;
  return <DeliveryRatingForm order={order} onDone={onDone} />;
}
