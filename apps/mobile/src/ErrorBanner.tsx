import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { subscribeGlobalErrors } from "./global-error-handler";

/** Always-visible strip so TestFlight white screens still show the JS error. */
export function ErrorBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => subscribeGlobalErrors(setMessage), []);

  if (!message) return null;

  return (
    <View
      style={{
        backgroundColor: "#7F1D1D",
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
        GraceRun JS error
      </Text>
      <ScrollView style={{ maxHeight: 120, marginTop: 4 }}>
        <Text style={{ color: "#FECACA", fontSize: 11 }}>{message}</Text>
      </ScrollView>
    </View>
  );
}
