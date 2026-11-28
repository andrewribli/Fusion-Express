import { useEffect, useRef, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchOrder, subscribeOrder } from "@fusion-express/shared/orders";
import { isChatActive } from "@fusion-express/shared";
import type { ChatMessage, Order } from "@fusion-express/shared/types";
import { useAuth } from "../src/auth";
import {
  canAccessOrderChat,
  isOwnChatMessage,
  markChatRead,
  orderChatPeerName,
  orderChatSubtitle,
  sendChatMedia,
  sendChatMessage,
  subscribeChatMessages,
} from "../src/chat";
import { ComposerDock, ScreenKeyboardAvoid } from "../src/keyboard-ui";
import type { RootStackParamList } from "../src/navigation";
import { notifyOrderEvent } from "../src/notify-push";
import { captureChatPhoto, uriToBlob } from "../src/takePhoto";
import { Page, ScreenHeader } from "../src/ui";

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString("en-HK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderChatScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "OrderChat">>();
  const orderId = route.params?.orderId ?? "";
  const { user, profile } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const uid = user?.uid;

  useEffect(() => {
    if (!orderId) {
      setMissing(true);
      return;
    }
    void fetchOrder(orderId).then((found) => {
      setOrder(found);
      setMissing(!found);
    });
    return subscribeOrder(orderId, (found) => {
      setOrder(found);
      setMissing(!found);
    });
  }, [orderId]);

  const active = order ? isChatActive(order) : false;
  const allowed =
    Boolean(order && uid) &&
    canAccessOrderChat(order!, {
      uid,
      runnerId: profile?.runnerId,
    });

  useEffect(() => {
    if (!orderId || !active || !allowed) return;
    return subscribeChatMessages(orderId, setMessages);
  }, [orderId, active, allowed]);

  useEffect(() => {
    if (!uid || !orderId || messages.length === 0) return;
    const latest = messages.reduce(
      (max, msg) => Math.max(max, msg.timestamp.getTime()),
      0,
    );
    void markChatRead(orderId, uid, Math.max(latest, Date.now()));
  }, [uid, orderId, messages]);

  useEffect(() => {
    const t = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      80,
    );
    return () => clearTimeout(t);
  }, [messages.length]);

  const peerName = order ? orderChatPeerName(order, uid) : "Chat";
  const subtitle = order ? orderChatSubtitle(order) : "";

  async function onPickMedia() {
    if (!uid || !orderId) return;
    setBusy(true);
    setError("");
    try {
      const photo = await captureChatPhoto();
      if (!photo) return;
      const blob = await uriToBlob(photo.uri);
      await sendChatMedia({
        orderId,
        senderId: uid,
        senderName: profile?.fullName || user?.email || "You",
        file: blob,
        fileName: photo.fileName || "chat.jpg",
        contentType: photo.mimeType || "image/jpeg",
        mediaType: "image",
      });
      notifyOrderEvent(orderId, "chat", "Sent a photo");
    } catch (err) {
      console.warn("[chat] photo upload failed", err);
      const detail = err instanceof Error ? err.message : "";
      setError(
        detail
          ? `Could not send that photo. ${detail}`
          : "Could not send that photo. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSend() {
    if (!text.trim() || !uid || !orderId) return;
    setBusy(true);
    setError("");
    try {
      await sendChatMessage(
        orderId,
        uid,
        profile?.fullName || user?.email || "You",
        text,
      );
      notifyOrderEvent(orderId, "chat", text);
      setText("");
    } catch {
      setError("Could not send. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!orderId || missing) {
    return (
      <Page>
        <ScreenHeader title="Chat" onBack={() => navigation.goBack()} />
        <View className="px-4 py-6">
          <Text className="text-sm text-gray-600">
            This chat is unavailable.
          </Text>
        </View>
      </Page>
    );
  }

  if (!order) {
    return (
      <Page>
        <ScreenHeader title="Chat" onBack={() => navigation.goBack()} />
        <View className="px-4 py-6">
          <Text className="text-sm text-gray-500">Loading…</Text>
        </View>
      </Page>
    );
  }

  if (!uid || !allowed) {
    return (
      <Page>
        <ScreenHeader title="Chat" onBack={() => navigation.goBack()} />
        <View className="px-4 py-6">
          <Text className="text-sm text-gray-600">
            Sign in as the customer or assigned runner to open this chat.
          </Text>
        </View>
      </Page>
    );
  }

  if (!active) {
    return (
      <Page>
        <ScreenHeader title={peerName} onBack={() => navigation.goBack()} />
        <View className="px-4 py-6">
          <Text className="text-sm text-gray-600">
            Chat closed 8 hours after delivery.
          </Text>
        </View>
      </Page>
    );
  }

  const rows = Array.isArray(messages) ? messages : [];

  return (
    <Page includeBottomInset={false}>
      <ScreenHeader
        title={peerName}
        onBack={() => navigation.goBack()}
        right={
          subtitle ? (
            <Text
              className="max-w-[140px] text-right text-xs text-gray-500"
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null
        }
      />
      <ScreenKeyboardAvoid className="flex-1">
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="grow justify-end px-4 py-4"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {rows.length === 0 ? (
            <Text className="mb-4 text-center text-sm text-gray-500">
              Say hi — coordinate pickup or lobby details here.
            </Text>
          ) : (
            rows.map((item, index) => {
              const mine = isOwnChatMessage(item, uid);
              const body = typeof item.message === "string" ? item.message : "";
              const imageUrl =
                typeof item.imageUrl === "string" &&
                /^https?:\/\//i.test(item.imageUrl)
                  ? item.imageUrl
                  : "";
              const showText =
                body !== "" && body !== "Photo" && body !== "Video";
              return (
                <View
                  key={item.id || `row-${index}`}
                  className={`mb-2 max-w-[85%] rounded-2xl px-3 py-2 ${
                    mine ? "ml-auto bg-fusion" : "mr-auto bg-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[11px] font-semibold ${
                      mine ? "text-white/80" : "text-gray-500"
                    }`}
                  >
                    {mine ? "You" : item.senderName || peerName}
                    {" · "}
                    {formatMessageTime(item.timestamp)}
                  </Text>
                  {imageUrl && item.mediaType !== "video" ? (
                    <Pressable
                      className="mt-1"
                      onPress={() => setZoom(imageUrl)}
                    >
                      <Image
                        source={{ uri: imageUrl }}
                        className="h-40 w-44 rounded-xl"
                        resizeMode="cover"
                      />
                    </Pressable>
                  ) : null}
                  {item.mediaType === "video" && imageUrl ? (
                    <Pressable onPress={() => void Linking.openURL(imageUrl)}>
                      <Text
                        className={`mt-1 text-sm underline ${
                          mine ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Play video
                      </Text>
                    </Pressable>
                  ) : null}
                  {showText ? (
                    <Text
                      className={`mt-0.5 text-[15px] leading-5 ${
                        mine ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {body}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
          {error ? (
            <Text className="mt-2 text-sm text-fusion">{error}</Text>
          ) : null}
        </ScrollView>

        <ComposerDock className="border-t border-gray-200 bg-white">
          <View className="flex-row items-end gap-2 px-3 py-2">
            <Pressable
              accessibilityLabel="Send a photo from camera or library"
              disabled={busy}
              onPress={() => void onPickMedia()}
              className="h-11 w-11 items-center justify-center"
            >
              <Ionicons name="image-outline" size={24} color="#ED1C24" />
            </Pressable>
            <TextInput
              className="max-h-28 min-h-[44px] flex-1 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              placeholder={`Message ${peerName}…`}
              placeholderTextColor="#9CA3AF"
              value={text}
              onChangeText={setText}
              editable={!busy}
              multiline
            />
            <Pressable
              className={`h-11 items-center justify-center rounded-full px-4 ${
                busy || !text.trim() ? "bg-gray-300" : "bg-fusion"
              }`}
              disabled={busy || !text.trim()}
              onPress={() => void onSend()}
            >
              <Text className="text-sm font-bold text-white">
                {busy ? "…" : "Send"}
              </Text>
            </Pressable>
          </View>
        </ComposerDock>
      </ScreenKeyboardAvoid>

      <Modal
        visible={Boolean(zoom)}
        transparent
        animationType="fade"
        onRequestClose={() => setZoom(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/90"
          onPress={() => setZoom(null)}
        >
          {zoom ? (
            <Image
              source={{ uri: zoom }}
              className="h-4/5 w-full"
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </Page>
  );
}
