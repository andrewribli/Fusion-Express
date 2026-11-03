import { ScrollView, Text, View } from "react-native";

/** Shown when App.tsx fails to evaluate so TestFlight does not SIGABRT. */
export default function FallbackApp({
  error,
}: {
  error?: unknown;
}) {
  const message =
    error instanceof Error ? error.message : error ? String(error) : "Unknown startup error";
  const stack = error instanceof Error ? (error.stack ?? "").slice(0, 1200) : "";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#111",
        padding: 24,
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
        GraceRun failed to start
      </Text>
      <Text style={{ color: "#f88", marginTop: 12, fontSize: 13 }}>{message}</Text>
      {stack ? (
        <ScrollView style={{ marginTop: 16, maxHeight: 280 }}>
          <Text style={{ color: "#aaa", fontSize: 11 }}>{stack}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}
