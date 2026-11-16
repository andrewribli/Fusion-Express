import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

/**
 * NativeWind className on Image often ignores width/height.
 * Always pin size via style. Missing / broken URLs show a bag placeholder
 * so the shop never looks unfinished to App Review.
 */
export function ProductImage({
  uri,
  size = 64,
  contain = true,
  rounded = 12,
}: {
  uri?: string;
  size?: number;
  contain?: boolean;
  rounded?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !uri || failed;

  if (showPlaceholder) {
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, borderRadius: rounded },
        ]}
        accessibilityLabel="Product image placeholder"
      >
        <Text style={{ fontSize: Math.max(18, size * 0.28) }}>🛒</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        backgroundColor: "#FAFAFA",
      }}
      resizeMode={contain ? "contain" : "cover"}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
});
