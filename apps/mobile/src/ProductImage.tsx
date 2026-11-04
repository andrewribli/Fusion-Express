import { Image, View } from "react-native";
import { resolveProductImageUrl } from "@fusion-express/shared/products";

type ProductImageProps = {
  image?: string;
  size?: number;
  roundedClassName?: string;
};

/**
 * NativeWind className sizing is unreliable on RN Image — always set
 * numeric width/height via style so thumbs never collapse to grey blanks.
 */
export function ProductImage({
  image,
  size = 64,
  roundedClassName = "rounded-xl",
}: ProductImageProps) {
  const uri = resolveProductImageUrl(image);
  if (!uri) {
    return (
      <View
        className={`items-center justify-center bg-gray-100 ${roundedClassName}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <Image
      source={{ uri }}
      className={`bg-gray-50 ${roundedClassName}`}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
