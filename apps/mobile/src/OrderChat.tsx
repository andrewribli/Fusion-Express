import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { isChatActive } from "@fusion-express/shared";
import type { ChatMessage, Order } from "@fusion-express/shared/types";
import { useAuth } from "./auth";
import {
  canAccessOrderChat,
  countUnreadChatMessages,
  getChatLastReadAt,
  orderChatButtonLabel,
  subscribeChatMessages,
} from "./chat";
import type { RootStackParamList } from "./navigation";

/** Entry button on Runner / Track — opens the full-screen OrderChat screen. */
export function OrderChat({ order }: { order: Order }) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastReadAt, setLastReadAt] = useState(0);

  const uid = user?.uid;
  const active = isChatActive(order);
  const allowed =
    Boolean(uid) &&
    canAccessOrderChat(order, {
      uid,
      runnerId: profile?.runnerId,
    });

  useEffect(() => {
    if (!active || !allowed || !uid) return;
    return subscribeChatMessages(order.id, setMessages);
  }, [order.id, active, allowed, uid]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    void getChatLastReadAt(order.id, uid).then((at) => {
      if (!cancelled) setLastReadAt(at);
    });
    return () => {
      cancelled = true;
    };
  }, [order.id, uid, messages.length]);

  const unread = useMemo(
    () => countUnreadChatMessages(messages, uid, lastReadAt),
    [messages, uid, lastReadAt],
  );

  if (!active || !allowed || !uid) return null;

  const label = orderChatButtonLabel(order, uid);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0 ? `${label}, ${unread} unread` : label
      }
      className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl py-3 ${
        unread > 0 ? "bg-fusion" : "bg-gray-900"
      }`}
      onPress={() => navigation.navigate("OrderChat", { orderId: order.id })}
    >
      <Text className="text-sm font-semibold text-white">{label}</Text>
      {unread > 0 ? (
        <View className="min-w-[22px] items-center rounded-full bg-white px-1.5 py-0.5">
          <Text className="text-[11px] font-extrabold text-fusion">
            {unread > 9 ? "9+" : unread}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
