import { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isChatActive } from "@fusion-express/shared";
import type { ChatMessage, Order } from "@fusion-express/shared/types";
import { useAuth } from "./auth";
import { notifyOrderEvent } from "./notify-push";
import {
  canAccessOrderChat,
  isOwnChatMessage,
  orderChatPeerLabel,
  sendChatMedia,
  sendChatMessage,
  subscribeChatMessages,
} from "./chat";
import { captureChatPhoto, uriToBlob } from "./takePhoto";

export function OrderChat({ order }: { order: Order }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  const uid = user?.uid;
  const active = isChatActive(order.status);
  const allowed =
    Boolean(uid) &&
    canAccessOrderChat(order, {
      uid,
      runnerId: profile?.runnerId,
    });

  useEffect(() => {
    if (!active || !allowed) return;
    return subscribeChatMessages(order.id, setMessages);
  }, [order.id, active, allowed]);

  if (!active || !allowed || !uid) return null;

  const peer = orderChatPeerLabel(order, uid);

  async function onPickMedia() {
    if (!uid) return;
    setBusy(true);
    setError("");
    try {
      const photo = await captureChatPhoto();
      if (!photo) return;
      const blob = await uriToBlob(photo.uri);
      await sendChatMedia({
        orderId: order.id,
        senderId: uid,
        senderName: profile?.fullName || user?.email || "You",
        file: blob,
        fileName: photo.fileName || "chat.jpg",
        contentType: photo.mimeType || "image/jpeg",
        mediaType: "image",
      });
      notifyOrderEvent(order.id, "chat", "Sent a photo");
      setOpen(true);
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
    if (!text.trim() || !uid) return;
    setBusy(true);
    setError("");
    try {
      await sendChatMessage(
        order.id,
        uid,
        profile?.fullName || user?.email || "You",
        text,
      );
      notifyOrderEvent(order.id, "chat", text);
      setText("");
      setOpen(true);
    } catch {
      setError("Could not send. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Pressable
        className="mt-3 items-center rounded-xl bg-gray-900 py-3"
        onPress={() => setOpen(true)}
      >
        <Text className="text-sm font-semibold text-white">
          Chat with {peer}
        </Text>
      </Pressable>
    );
  }

  const rows = Array.isArray(messages) ? messages : [];

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat with {peer}</Text>
        <Pressable onPress={() => setOpen(false)}>
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.thread}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {rows.length === 0 ? (
          <Text style={styles.empty}>
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
            const showText = body !== "" && body !== "Photo" && body !== "Video";
            return (
              <View
                key={item.id || `row-${index}`}
                style={[styles.bubble, mine ? styles.mine : styles.theirs]}
              >
                <Text style={[styles.who, mine ? styles.whoMine : styles.whoTheirs]}>
                  {mine ? "You" : item.senderName || peer}
                </Text>
                {imageUrl && item.mediaType !== "video" ? (
                  <Pressable onPress={() => setZoom(imageUrl)}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : null}
                {item.mediaType === "video" && imageUrl ? (
                  <Pressable onPress={() => void Linking.openURL(imageUrl)}>
                    <Text style={[styles.body, mine ? styles.bodyMine : styles.bodyTheirs, styles.link]}>
                      Play video
                    </Text>
                  </Pressable>
                ) : null}
                {showText ? (
                  <Text style={[styles.body, mine ? styles.bodyMine : styles.bodyTheirs]}>
                    {body}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.composer}>
        <Pressable
          accessibilityLabel="Send a photo"
          disabled={busy || !uid}
          onPress={() => void onPickMedia()}
          style={styles.camera}
        >
          <Ionicons name="camera-outline" size={22} color="#ED1C24" />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder={`Message the ${peer}…`}
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={setText}
          editable={!busy}
        />
        <Pressable
          style={[styles.send, busy ? styles.sendBusy : null]}
          disabled={busy || !uid}
          onPress={() => void onSend()}
        >
          <Text style={styles.sendLabel}>{busy ? "…" : "Send"}</Text>
        </Pressable>
      </View>
      <Modal
        visible={Boolean(zoom)}
        transparent
        animationType="fade"
        onRequestClose={() => setZoom(null)}
      >
        <Pressable style={styles.zoom} onPress={() => setZoom(null)}>
          {zoom ? (
            <Image source={{ uri: zoom }} style={styles.zoomImage} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 12,
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  close: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  thread: { maxHeight: 220, padding: 12 },
  empty: { fontSize: 14, color: "#6B7280" },
  bubble: {
    marginBottom: 8,
    maxWidth: "85%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mine: { alignSelf: "flex-end", backgroundColor: "#ED1C24" },
  theirs: { alignSelf: "flex-start", backgroundColor: "#F3F4F6" },
  who: { fontSize: 12, fontWeight: "600" },
  whoMine: { color: "rgba(255,255,255,0.8)" },
  whoTheirs: { color: "#6B7280" },
  body: { fontSize: 14 },
  bodyMine: { color: "#fff" },
  bodyTheirs: { color: "#111827" },
  link: { marginTop: 4, textDecorationLine: "underline" },
  photo: { width: 180, height: 140, borderRadius: 12, marginTop: 4 },
  error: { paddingHorizontal: 12, paddingBottom: 4, fontSize: 12, color: "#ED1C24" },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  camera: { height: 40, width: 40, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#111827",
  },
  send: { borderRadius: 12, backgroundColor: "#ED1C24", paddingHorizontal: 12, paddingVertical: 8 },
  sendBusy: { opacity: 0.6 },
  sendLabel: { fontSize: 14, fontWeight: "700", color: "#fff" },
  zoom: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  zoomImage: { width: "100%", height: "80%" },
});
