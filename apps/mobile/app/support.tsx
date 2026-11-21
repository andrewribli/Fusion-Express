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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../src/auth";
import {
  markSupportRead,
  sendSupportMessage,
  subscribeSupportMessages,
  type SupportMessage,
} from "../src/support-messages";
import type { RootStackParamList } from "../src/navigation";
import {
  Card,
  Page,
  PrimaryButton,
  ScreenHeader,
} from "../src/ui";

export default function SupportScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    return subscribeSupportMessages(uid, setMessages);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    void markSupportRead({ userId: uid, readerId: uid });
  }, [uid, messages.length]);

  useEffect(() => {
    const t = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      100,
    );
    return () => clearTimeout(t);
  }, [messages.length]);

  async function onSend() {
    if (!uid || !text.trim()) return;
    setBusy(true);
    setError("");
    try {
      await sendSupportMessage({
        userId: uid,
        senderId: uid,
        message: text,
      });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  if (!uid) {
    return (
      <Page>
        <ScreenHeader title="Help" onBack={() => navigation.goBack()} />
        <View className="px-4 py-6">
          <Card>
            <Text className="text-sm text-gray-700">
              Sign in on Profile to message GraceRun support.
            </Text>
            <PrimaryButton
              label="Go to Profile"
              className="mt-3"
              onPress={() => navigation.navigate("Tabs", { screen: "Profile" })}
            />
          </Card>
        </View>
      </Page>
    );
  }

  return (
    <Page>
      <ScreenHeader title="Contact Support" onBack={() => navigation.goBack()} />
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
          <Card className="mb-3">
            <Text className="text-sm font-bold text-gray-900">
              Chat with GraceRun admin
            </Text>
            <Text className="mt-1 text-xs text-gray-500">
              Late runner, wrong food, payment issues — message{" "}
              {profile?.fullName ? `${profile.fullName}, ` : ""}we&apos;ll reply
              here (and see it at /admin/support).
            </Text>
          </Card>

          {messages.length === 0 ? (
            <Text className="mb-3 text-center text-sm text-gray-500">
              No messages yet. Say hi — we&apos;re here.
            </Text>
          ) : (
            messages.map((msg) => {
              const mine = msg.senderId === uid;
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
                    className={`text-sm ${mine ? "text-white" : "text-gray-900"}`}
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
            placeholder="Message support…"
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
  );
}
