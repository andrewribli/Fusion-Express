import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useAuth } from "../src/auth";
import { RequireAdmin } from "../src/RequireAdmin";
import type { RootStackParamList } from "../src/navigation";
import {
  markSupportRead,
  sendSupportMessage,
  subscribeSupportMessages,
  type SupportMessage,
} from "../src/support-messages";
import { Page, ScreenHeader } from "../src/ui";

export default function AdminSupportThreadScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, "AdminSupportThread">>();
  const { user } = useAuth();
  const userId = route.params.userId;
  const title = route.params.title || "Support chat";
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const adminUid = user?.uid;

  useEffect(() => {
    if (!userId) return;
    return subscribeSupportMessages(userId, setMessages);
  }, [userId]);

  useEffect(() => {
    if (!userId || !adminUid) return;
    void markSupportRead({ userId, readerId: adminUid });
  }, [userId, adminUid, messages.length]);

  useEffect(() => {
    const t = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      100,
    );
    return () => clearTimeout(t);
  }, [messages.length]);

  async function onSend() {
    if (!adminUid || !userId || !text.trim()) return;
    setBusy(true);
    setError("");
    try {
      await sendSupportMessage({
        userId,
        senderId: adminUid,
        message: text,
      });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAdmin title={title}>
      <Page>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={8}
        >
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerClassName="px-4 py-4 pb-4"
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <Text className="mb-3 text-center text-sm text-gray-500">
                No messages in this thread yet.
              </Text>
            ) : (
              messages.map((msg) => {
                const mine = msg.senderId === adminUid;
                return (
                  <View
                    key={msg.id}
                    className={`mb-2 max-w-[85%] rounded-2xl px-3 py-2 ${
                      mine
                        ? "ml-auto bg-fusion"
                        : "mr-auto border border-gray-100 bg-white"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        mine ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {msg.message}
                    </Text>
                  </View>
                );
              })
            )}
            {error ? (
              <Text className="mt-2 text-sm text-fusion">{error}</Text>
            ) : null}
          </ScrollView>

          <View className="flex-row items-end gap-2 border-t border-gray-200 bg-white px-3 py-2">
            <TextInput
              className="max-h-28 min-h-[44px] flex-1 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              placeholder="Reply as admin…"
              placeholderTextColor="#9CA3AF"
              value={text}
              onChangeText={setText}
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
        </KeyboardAvoidingView>
      </Page>
    </RequireAdmin>
  );
}
