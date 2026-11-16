import { useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  loadMenuItems,
  resolveProductImageUrl,
} from "@fusion-express/shared/products";
import { formatMenuPrice } from "@fusion-express/shared/types";
import type { MenuItem } from "@fusion-express/shared/types";
import { useCart } from "../src/cart";
import { ProductImage } from "../src/ProductImage";
import type { RootStackParamList } from "../src/navigation";
import { EmptyState, LoadingBlock, Page, ScreenHeader } from "../src/ui";

export default function MenuScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addItem, itemCount } = useCart();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadMenuItems()
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load menu"),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? items.filter((item) => item.name.toLowerCase().includes(q))
      : items;
    return list.slice(0, 20);
  }, [items, search]);

  return (
    <Page>
      <ScreenHeader
        title="Menu"
        onBack={() => navigation.goBack()}
        right={
          <Pressable
            className="rounded-full bg-fusion px-3 py-1.5"
            onPress={() => navigation.navigate("Cart")}
          >
            <Text className="text-xs font-bold text-white">
              Cart ({itemCount})
            </Text>
          </Pressable>
        }
      />

      <View className="mx-3 mt-3 h-11 flex-row items-center rounded-full border border-gray-200 bg-white px-4">
        <TextInput
          className="flex-1 text-sm text-gray-900"
          placeholder="Search products"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <LoadingBlock label="Loading products…" />
      ) : error ? (
        <EmptyState title="Couldn’t load menu" body={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No products found"
          body="Try another search, or clear the filter."
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperClassName="gap-2.5 px-3"
          contentContainerClassName="pb-8 pt-3"
          renderItem={({ item }) => {
            const uri = resolveProductImageUrl(item.image);
            return (
              <View className="mb-2.5 flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <View className="min-h-[148px] items-center justify-center bg-[#FAFAFA] py-3">
                  <ProductImage uri={uri || undefined} size={132} />
                </View>
                <Text
                  className="min-h-[34px] px-2.5 pt-1.5 text-xs font-semibold text-gray-900"
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <Text className="px-2.5 text-[11px] text-gray-400">
                  per {item.unit}
                </Text>
                <Text className="px-2.5 pt-1 text-sm font-extrabold text-fusion">
                  {formatMenuPrice(item)}
                </Text>
                <Pressable
                  className="mx-2.5 mb-2.5 mt-2 items-center rounded-[10px] bg-fusion py-2"
                  onPress={() => addItem(item)}
                >
                  <Text className="text-[13px] font-bold text-white">Add</Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </Page>
  );
}
