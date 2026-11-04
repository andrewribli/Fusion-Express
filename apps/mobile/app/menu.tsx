import { useEffect, useState } from "react";
import { Link } from "expo-router";
import {
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { loadMenuItems } from "@fusion-express/shared/products";
import { formatMenuPrice } from "@fusion-express/shared/types";
import type { MenuItem } from "@fusion-express/shared/types";
import { useCart } from "../src/cart";
import { ProductImage } from "../src/ProductImage";

const GAP = 12;
const H_PAD = 16;

export default function MenuScreen() {
  const { addItem, itemCount } = useCart();
  const [items, setItems] = useState<MenuItem[]>([]);
  const { width } = useWindowDimensions();
  const cardWidth = (width - H_PAD * 2 - GAP) / 2;

  useEffect(() => {
    void loadMenuItems().then(setItems);
  }, []);

  return (
    <View className="flex-1 bg-page">
      <Link href="/cart" asChild>
        <Pressable className="mx-4 mt-3 rounded-2xl bg-fusion py-3.5 shadow-sm">
          <Text className="text-center font-sans-semibold text-base text-white">
            Cart ({itemCount})
          </Text>
        </Pressable>
      </Link>

      <FlatList
        className="mt-3"
        contentContainerStyle={{ paddingHorizontal: H_PAD, paddingBottom: 24 }}
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GAP }}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        renderItem={({ item }) => (
          <View
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            style={{ width: cardWidth }}
          >
            <View
              className="items-center justify-center bg-gray-50"
              style={{ width: cardWidth, height: cardWidth }}
            >
              <ProductImage image={item.image} size={cardWidth - 16} />
            </View>
            <View className="flex-1 p-2.5">
              <Text
                className="font-sans-semibold text-xs leading-snug text-ink"
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <Text className="mt-0.5 font-sans text-xs text-muted">
                per {item.unit}
              </Text>
              <Text className="mt-1 font-sans-bold text-sm text-fusion">
                {formatMenuPrice(item)}
              </Text>
              <Pressable
                className="mt-2 rounded-xl bg-fusion py-2"
                onPress={() => addItem(item)}
              >
                <Text className="text-center font-sans-semibold text-sm text-white">
                  Add
                </Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text className="mt-8 text-center font-sans text-muted">
            Loading menu…
          </Text>
        }
      />
    </View>
  );
}
