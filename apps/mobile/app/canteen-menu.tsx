import { useMemo, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  collegeLabel,
  getCollege,
} from "@fusion-express/shared/canteen-college";
import { useCart } from "../src/cart";
import {
  isCanteenCart,
  isGroceryCart,
  toCanteenMenuItem,
} from "../src/canteen/cart";
import { canteenCoverImage } from "../src/canteen/images";
import {
  CANTEEN_CATEGORY_ORDER,
  categoryLabel,
  loadCanteenMenu,
} from "../src/canteen/menus";
import { getRestaurant } from "../src/canteen/restaurants";
import { ProductImage } from "../src/ProductImage";
import { colors } from "../src/theme";
import type { RootStackParamList } from "../src/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "CanteenMenu">;
type Route = RouteProp<RootStackParamList, "CanteenMenu">;

export default function CanteenMenuScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const restaurantId = route.params.restaurantId;
  const restaurant = getRestaurant(restaurantId);
  const { addItem, items, itemCount, clearCart } = useCart();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const { dishes, mealPeriodLabel } = useMemo(
    () => loadCanteenMenu(restaurantId),
    [restaurantId],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dishes.filter((d) => {
      if (category !== "all" && d.category !== category) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [dishes, search, category]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const dish of filtered) {
      const list = map.get(dish.category) ?? [];
      list.push(dish);
      map.set(dish.category, list);
    }
    const ordered: Array<{ category: string; items: typeof filtered }> = [];
    for (const cat of CANTEEN_CATEGORY_ORDER) {
      const itemsInCat = map.get(cat);
      if (itemsInCat?.length) ordered.push({ category: cat, items: itemsInCat });
      map.delete(cat);
    }
    for (const [cat, itemsInCat] of map) {
      ordered.push({ category: cat, items: itemsInCat });
    }
    return ordered;
  }, [filtered]);

  const college = restaurant?.collegeId
    ? getCollege(restaurant.collegeId)
    : undefined;

  function tryAdd(dish: (typeof dishes)[number]) {
    if (!restaurant) return;
    const menuItem = toCanteenMenuItem(dish, restaurant.id);
    if (isGroceryCart(items)) {
      Alert.alert(
        "Replace grocery cart?",
        "Your cart has Fusion groceries. Clear it to order from this canteen?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear & add",
            style: "destructive",
            onPress: () => {
              clearCart();
              addItem(menuItem);
            },
          },
        ],
      );
      return;
    }
    if (isCanteenCart(items)) {
      const existing = items[0]?.item.id;
      const prefix = `canteen:${restaurant.id}:`;
      if (existing && !existing.startsWith(prefix)) {
        Alert.alert(
          "One canteen at a time",
          "Clear your cart to order from a different canteen?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Clear & add",
              style: "destructive",
              onPress: () => {
                clearCart();
                addItem(menuItem);
              },
            },
          ],
        );
        return;
      }
    }
    addItem(menuItem);
  }

  if (!restaurant) {
    return (
      <View style={styles.page}>
        <Text style={styles.empty}>Canteen not found.</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const listData = grouped.flatMap((g) => [
    { type: "header" as const, key: `h-${g.category}`, category: g.category },
    ...g.items.map((item) => ({
      type: "dish" as const,
      key: item.id,
      dish: item,
    })),
  ]);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <View style={styles.titleRow}>
          <Image
            source={canteenCoverImage(restaurant.id)}
            style={styles.avatar}
            resizeMode="cover"
          />
          <Text style={styles.title} numberOfLines={1}>
            {restaurant.shortName}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate("Cart")}
          accessibilityLabel="Cart"
        >
          <Text style={styles.cart}>
            🛒{itemCount > 0 ? ` ${itemCount}` : ""}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.hours}>{restaurant.hoursLabel}</Text>
      {mealPeriodLabel ? (
        <Text style={styles.period}>
          Showing {mealPeriodLabel} menu for right now
        </Text>
      ) : null}

      {college ? (
        <View style={styles.discountBanner}>
          <Text style={styles.discountTitle}>
            Save HK$5 with your runner's college discount
          </Text>
          <Text style={styles.discountBody}>
            10% off food when your runner is from {collegeLabel(college.id)} —
            often around HK$5 or more. Delivery fee is not discounted.
          </Text>
        </View>
      ) : (
        <View style={styles.discountBanner}>
          <Text style={styles.discountTitle}>Campus canteen delivery</Text>
          <Text style={styles.discountBody}>
            Flat HK$10 delivery to your hall lobby. College canteens unlock a
            runner college discount at accept.
          </Text>
        </View>
      )}

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search dishes"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <View style={styles.chips}>
        <Pressable
          style={[styles.chip, category === "all" && styles.chipActive]}
          onPress={() => setCategory("all")}
        >
          <Text
            style={[styles.chipText, category === "all" && styles.chipTextActive]}
          >
            All
          </Text>
        </Pressable>
        {CANTEEN_CATEGORY_ORDER.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text
              style={[
                styles.chipText,
                category === cat && styles.chipTextActive,
              ]}
            >
              {categoryLabel(cat)}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(row) => row.key}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No dishes match that search.</Text>
        }
        renderItem={({ item: row }) => {
          if (row.type === "header") {
            return (
              <Text style={styles.section}>{categoryLabel(row.category)}</Text>
            );
          }
          const dish = row.dish;
          return (
            <View style={styles.row}>
              <ProductImage uri={dish.image} size={64} />
              <View style={styles.rowBody}>
                <Text style={styles.dishName} numberOfLines={2}>
                  {dish.name}
                </Text>
                {dish.description ? (
                  <Text style={styles.dishDesc} numberOfLines={2}>
                    {dish.description}
                  </Text>
                ) : null}
                <Text style={styles.dishPrice}>HK${dish.price}</Text>
              </View>
              <Pressable style={styles.addBtn} onPress={() => tryAdd(dish)}>
                <Text style={styles.addBtnText}>+</Text>
              </Pressable>
            </View>
          );
        }}
      />

      {itemCount > 0 ? (
        <Pressable
          style={styles.orderBar}
          onPress={() => navigation.navigate("Cart")}
        >
          <Text style={styles.orderBarText}>
            View cart · {itemCount} item{itemCount === 1 ? "" : "s"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: "#fff",
  },
  back: { color: colors.fusion, fontWeight: "700", fontSize: 16, width: 64 },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 0,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  title: {
    flexShrink: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
  },
  cart: { width: 64, textAlign: "right", fontSize: 16, fontWeight: "700" },
  hours: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    fontSize: 12,
    color: "#6B7280",
    backgroundColor: "#fff",
  },
  period: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 12,
    color: colors.fusion,
    fontWeight: "600",
    backgroundColor: "#fff",
  },
  discountBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(237,28,36,0.25)",
    backgroundColor: "rgba(237,28,36,0.05)",
    padding: 12,
  },
  discountTitle: { fontSize: 13, fontWeight: "700", color: "#111" },
  discountBody: { marginTop: 4, fontSize: 12, color: "#4B5563", lineHeight: 16 },
  searchBar: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
  },
  searchInput: { height: 42, fontSize: 15, color: "#111" },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { borderColor: colors.fusion, backgroundColor: "#FEF2F2" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#4B5563" },
  chipTextActive: { color: colors.fusion },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  section: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  rowBody: { flex: 1, minWidth: 0 },
  dishName: { fontSize: 14, fontWeight: "700", color: "#111" },
  dishDesc: { marginTop: 2, fontSize: 11, color: "#6B7280" },
  dishPrice: { marginTop: 4, fontSize: 13, fontWeight: "800", color: colors.fusion },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.fusion,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontSize: 22, fontWeight: "700", marginTop: -2 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 24 },
  link: { textAlign: "center", color: colors.fusion, marginTop: 12, fontWeight: "700" },
  orderBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.fusion,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  orderBarText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
