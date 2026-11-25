import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RequireAdmin } from "../src/RequireAdmin";
import type { RootStackParamList } from "../src/navigation";
import {
  fetchSupportThreads,
  fetchUserDisplayNames,
  type SupportThread,
} from "../src/support-messages";
import {
  Card,
  LoadingBlock,
  Page,
  ScreenHeader,
  SecondaryButton,
} from "../src/ui";

function formatTime(date: Date): string {
  return date.toLocaleString("en-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSupportScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (soft = false) => {
    if (!soft) setLoading(true);
    setError("");
    try {
      const rows = await fetchSupportThreads();
      setThreads(rows);
      const map = await fetchUserDisplayNames(rows.map((t) => t.userId));
      setNames(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load chats.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      void load(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <RequireAdmin title="Support inbox">
      <Page>
        <ScreenHeader
          title="Support inbox"
          onBack={() => navigation.goBack()}
        />
        {loading ? (
          <LoadingBlock label="Loading conversations…" />
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 py-4 pb-10"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void load(true);
                }}
                tintColor="#ED1C24"
              />
            }
          >
            <SecondaryButton
              label="More admin tools"
              className="mb-3"
              onPress={() => navigation.navigate("Admin")}
            />
            {error ? (
              <Text className="mb-3 text-sm text-fusion">{error}</Text>
            ) : null}
            {threads.length === 0 ? (
              <Card>
                <Text className="text-sm text-gray-600">
                  No support chats yet. Customers message from Profile → Contact
                  Support.
                </Text>
              </Card>
            ) : (
              threads.map((thread) => (
                <Pressable
                  key={thread.userId}
                  className="mb-2"
                  onPress={() =>
                    navigation.navigate("AdminSupportThread", {
                      userId: thread.userId,
                      title: names[thread.userId] || thread.userId,
                    })
                  }
                >
                  <Card>
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="min-w-0 flex-1">
                        <Text
                          className="text-sm font-bold text-gray-900"
                          numberOfLines={1}
                        >
                          {names[thread.userId] || thread.userId}
                        </Text>
                        <Text
                          className="mt-1 text-xs text-gray-500"
                          numberOfLines={2}
                        >
                          {thread.lastMessage}
                        </Text>
                        <Text className="mt-1 text-[10px] text-gray-400">
                          {formatTime(thread.lastAt)}
                        </Text>
                      </View>
                      {thread.unreadFromUser > 0 ? (
                        <View className="min-w-5 items-center rounded-full bg-fusion px-1.5 py-0.5">
                          <Text className="text-[10px] font-bold text-white">
                            {thread.unreadFromUser}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Card>
                </Pressable>
              ))
            )}
          </ScrollView>
        )}
      </Page>
    </RequireAdmin>
  );
}
