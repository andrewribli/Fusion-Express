import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  loadMenuItems,
  resolveProductImageUrl,
} from "@fusion-express/shared/products";
import { formatMenuPrice } from "@fusion-express/shared/types";
import { isServiceOpen, SERVICE_HOURS } from "@fusion-express/shared";
import type { MenuItem } from "@fusion-express/shared/types";
import {
  closedBannerText,
  isCanteenOpenByConfig,
} from "@fusion-express/shared/canteen-hours";
import { pinCanteenListOrder } from "@fusion-express/shared/canteen-list-order";
import { useCart } from "../../src/cart";
import { canteenCoverImage } from "../../src/canteen/images";
import {
  minMenuPrice,
  searchCanteenDishes,
  sortDishesByPrice,
  type CanteenListSort,
} from "../../src/canteen/menus";
import {
  menuReadyRestaurants,
  type Restaurant,
} from "../../src/canteen/restaurants";
import { ProductImage } from "../../src/ProductImage";
import { colors } from "../../src/theme";
import type { RootStackParamList, TabsParamList } from "../../src/navigation";

type ShopChannel = "groceries" | "canteens";

const CANTEEN_SORT_OPTIONS: Array<{ id: CanteenListSort; label: string }> = [
  { id: "default", label: "Featured" },
  { id: "cheap", label: "Cheapest first" },
  { id: "expensive", label: "Most expensive" },
  { id: "distance", label: "Distance" },
];

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabsParamList, "Shop">,
  NativeStackNavigationProp<RootStackParamList>
>;

const BADGES = ["Highly rated", "In demand", "Lowest price"] as const;

const CATEGORIES = [
  { id: "all", label: "All items" },
  { id: "drinks", label: "Drinks", match: /drink|beverage|juice|water|tea|coffee|soda/i },
  { id: "snacks", label: "Snacks", match: /snack|chip|cracker|biscuit|cookie/i },
  { id: "noodles", label: "Instant noodles", match: /noodle|ramen|indomie|cup noodle/i },
  { id: "dairy", label: "Dairy", match: /milk|yogurt|cheese|dairy|butter/i },
  { id: "frozen", label: "Frozen", match: /frozen|ice cream/i },
  { id: "care", label: "Personal care", match: /shampoo|soap|toothpaste|care|tissue/i },
  { id: "home", label: "Household", match: /household|detergent|cleaner|bag/i },
] as const;

function priceLabel(item: MenuItem): string {
  const raw = formatMenuPrice(item);
  return raw.startsWith("HK") ? raw : `HK${raw}`;
}

function pickBadge(item: MenuItem, index: number): string {
  if (item.salePrice != null && item.salePrice < item.price) {
    return "Lowest price";
  }
  return BADGES[index % BADGES.length];
}

function TopPickCard({
  item,
  index,
  onAdd,
}: {
  item: MenuItem;
  index: number;
  onAdd: () => void;
}) {
  const uri = resolveProductImageUrl(item.image);
  return (
    <View style={styles.topCard}>
      <View style={styles.topImageWrap}>
        <ProductImage uri={uri || undefined} size={120} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pickBadge(item, index)}</Text>
        </View>
        <Pressable style={styles.qtyBtn} onPress={onAdd}>
          <Text style={styles.qtyBtnText}>+</Text>
        </Pressable>
      </View>
      <Text style={styles.topName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.topPrice}>{priceLabel(item)}</Text>
    </View>
  );
}

function GridCard({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
  const uri = resolveProductImageUrl(item.image);
  return (
    <View style={styles.gridCard}>
      <View style={styles.gridImageWrap}>
        <ProductImage uri={uri || undefined} size={140} />
        <Pressable style={styles.qtyBtn} onPress={onAdd}>
          <Text style={styles.qtyBtnText}>+</Text>
        </Pressable>
      </View>
      <Text style={styles.gridName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.gridUnit}>per {item.unit}</Text>
      <Text style={styles.gridPrice}>{formatMenuPrice(item)}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const { addItem, itemCount } = useCart();
  const [channel, setChannel] = useState<ShopChannel>("groceries");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [canteenSearch, setCanteenSearch] = useState("");
  const [canteenSort, setCanteenSort] = useState<CanteenListSort>("default");
  const [catsOpen, setCatsOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<(typeof CATEGORIES)[number]["id"]>("all");

  const canteens = useMemo(() => {
    let list = [...menuReadyRestaurants()];
    if (canteenSort === "distance") {
      list.sort((a, b) => a.campusWalkOrder - b.campusWalkOrder);
    } else if (canteenSort === "cheap" || canteenSort === "expensive") {
      list.sort((a, b) => {
        const pa = minMenuPrice(a.id);
        const pb = minMenuPrice(b.id);
        return canteenSort === "cheap" ? pa - pb : pb - pa;
      });
    } else {
      list = pinCanteenListOrder(list);
    }
    return list;
  }, [canteenSort]);

  const dishHits = useMemo(() => {
    const hits = searchCanteenDishes(canteenSearch);
    if (canteenSort === "cheap" || canteenSort === "expensive") {
      return sortDishesByPrice(hits, canteenSort);
    }
    if (canteenSort === "distance") {
      const order = new Map(
        menuReadyRestaurants().map((r) => [r.id, r.campusWalkOrder]),
      );
      return [...hits].sort(
        (a, b) =>
          (order.get(a.restaurantId) ?? 999) -
          (order.get(b.restaurantId) ?? 999),
      );
    }
    return hits;
  }, [canteenSearch, canteenSort]);
  const searchingDishes = canteenSearch.trim().length > 0;
  const canteenListColumns = searchingDishes ? 1 : 2;

  const reloadMenu = useCallback(() => {
    setLoading(true);
    setLoadError("");
    void loadMenuItems()
      .then(setItems)
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "Could not load menu"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reloadMenu();
  }, [reloadMenu]);

  const searching = search.trim().length > 0;
  const activeCategory = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0];

  const filtered = useMemo(() => {
    let list = items;
    if (categoryId !== "all") {
      const match = "match" in activeCategory ? activeCategory.match : null;
      list = list.filter((item) => {
        const hay = `${item.category} ${item.subcategory ?? ""} ${item.name}`;
        if (match) return match.test(hay);
        return item.category.toLowerCase().includes(categoryId);
      });
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search, categoryId, activeCategory]);

  /** Curated home feed for App Store review — keep the first screen light. */
  const recommended = useMemo(() => filtered.slice(0, 8), [filtered]);
  const feed = useMemo(() => filtered.slice(0, 18), [filtered]);

  const serviceOpen = isServiceOpen();

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Pressable
            style={styles.menuBtn}
            onPress={() => setCatsOpen(true)}
            accessibilityLabel="Open categories"
          >
            <Text style={styles.menuBtnIcon}>☰</Text>
          </Pressable>

          <Image
            source={require("../../assets/gracerun-logo-source.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="GraceRun — delivering with grace"
          />
          <Text style={styles.brand}>GraceRun</Text>

          <Pressable
            style={styles.runnerChip}
            onPress={() => navigation.navigate("Runner")}
          >
            <Text style={styles.runnerChipText}>Runner</Text>
          </Pressable>

          <Pressable
            style={styles.cartIconBtn}
            onPress={() => navigation.navigate("Cart")}
            accessibilityLabel="Cart"
          >
            <Text style={styles.cartIcon}>🛒</Text>
            {itemCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {itemCount > 99 ? "99+" : itemCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.channelRow}>
          <Pressable
            style={[
              styles.channelBtn,
              channel === "groceries" && styles.channelBtnActive,
            ]}
            onPress={() => setChannel("groceries")}
          >
            <Text
              style={[
                styles.channelText,
                channel === "groceries" && styles.channelTextActive,
              ]}
            >
              Groceries
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.channelBtn,
              channel === "canteens" && styles.channelBtnActive,
            ]}
            onPress={() => setChannel("canteens")}
          >
            <Text
              style={[
                styles.channelText,
                channel === "canteens" && styles.channelTextActive,
              ]}
            >
              Canteens
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder={
              channel === "canteens" ? "Search food item" : "Search products"
            }
            placeholderTextColor="#9CA3AF"
            value={channel === "canteens" ? canteenSearch : search}
            onChangeText={
              channel === "canteens" ? setCanteenSearch : setSearch
            }
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <View style={styles.searchOrb}>
            <Text style={styles.searchOrbText}>⌕</Text>
          </View>
        </View>

        {channel === "canteens" ? (
          <View style={styles.sortChips}>
            {CANTEEN_SORT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                style={[
                  styles.sortChip,
                  canteenSort === opt.id && styles.sortChipActive,
                ]}
                onPress={() => setCanteenSort(opt.id)}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    canteenSort === opt.id && styles.sortChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {channel === "canteens" ? (
        <FlatList
          key={canteenListColumns === 1 ? "list" : "grid"}
          data={
            (searchingDishes ? dishHits : canteens) as Array<
              Restaurant | (typeof dishHits)[number]
            >
          }
          keyExtractor={(item) =>
            searchingDishes
              ? `${(item as (typeof dishHits)[number]).restaurantId}:${(item as (typeof dishHits)[number]).id}`
              : (item as Restaurant).id
          }
          numColumns={canteenListColumns}
          columnWrapperStyle={
            canteenListColumns === 2 ? styles.canteenRow : undefined
          }
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            searchingDishes ? (
              <Text style={styles.sectionTitle}>
                Dishes matching “{canteenSearch.trim()}”
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {searchingDishes
                ? "No dishes match that search."
                : "No canteens available yet."}
            </Text>
          }
          renderItem={({ item }) => {
            if (searchingDishes) {
              const dish = item as (typeof dishHits)[number];
              return (
                <Pressable
                  style={styles.dishHit}
                  onPress={() =>
                    navigation.navigate("CanteenMenu", {
                      restaurantId: dish.restaurantId,
                    })
                  }
                >
                  <ProductImage uri={dish.image} size={64} />
                  <View style={styles.dishHitBody}>
                    <Text style={styles.dishHitName} numberOfLines={2}>
                      {dish.name}
                    </Text>
                    <Text style={styles.dishHitMeta} numberOfLines={1}>
                      {dish.restaurantShortName} · HK${dish.price}
                    </Text>
                    {!isCanteenOpenByConfig(dish.restaurantId) ? (
                      <Text style={styles.dishHitClosed}>Closed now</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            }
            const restaurant = item as Restaurant;
            const open = isCanteenOpenByConfig(restaurant.id);
            return (
              <Pressable
                style={styles.canteenCard}
                onPress={() =>
                  navigation.navigate("CanteenMenu", {
                    restaurantId: restaurant.id,
                  })
                }
              >
                <Image
                  source={canteenCoverImage(restaurant.id)}
                  style={styles.canteenCover}
                  resizeMode="cover"
                />
                <View style={styles.canteenBody}>
                  <Text style={styles.canteenName} numberOfLines={2}>
                    {restaurant.shortName}
                  </Text>
                  <Text style={styles.canteenHours} numberOfLines={2}>
                    {restaurant.hoursLabel}
                  </Text>
                  <Text
                    style={[
                      styles.canteenOpen,
                      !open && styles.canteenClosed,
                    ]}
                  >
                    {open
                      ? "Open now"
                      : closedBannerText(restaurant.shortName, restaurant.id)}
                  </Text>
                  <Text style={styles.canteenBlurb} numberOfLines={2}>
                    {restaurant.blurb}
                  </Text>
                  {restaurant.collegeId ? (
                    <Text style={styles.canteenBadge}>
                      {restaurant.collegeId} · college discount
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.fusion} />
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <Text style={styles.empty}>{loadError}</Text>
          <Pressable
            style={{
              marginTop: 16,
              backgroundColor: colors.fusion,
              borderRadius: 12,
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
            onPress={reloadMenu}
          >
            <Text style={styles.orderBarText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              {serviceOpen ? null : (
                <View style={styles.closedCard}>
                  <Text style={styles.closedTitle}>GraceRun is closed right now</Text>
                  <Text style={styles.closedBody}>
                    Fusion delivery is {SERVICE_HOURS.label}. You can still
                    browse. Orders open again at 8:30 AM.
                  </Text>
                </View>
              )}
              {searching || categoryId !== "all" ? (
              <Text style={styles.sectionTitle}>
                {searching
                  ? `Results for “${search.trim()}”`
                  : activeCategory.label}
              </Text>
            ) : (
              <View>
                <View style={styles.promo}>
                  <Text style={styles.promoEyebrow}>GraceRun CUHK</Text>
                  <Text style={styles.promoTitle}>
                    Apply a voucher at checkout!
                  </Text>
                  <Text style={styles.promoBody}>
                    Groceries from Fusion to your CUHK hall lobby. Pay nothing
                    until after delivery.
                  </Text>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
                  Recommended for you
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recommendedRow}
                >
                  {recommended.map((item, index) => (
                    <TopPickCard
                      key={item.id}
                      item={item}
                      index={index}
                      onAdd={() => addItem(item)}
                    />
                  ))}
                </ScrollView>

                <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
                  You may also like
                </Text>
              </View>
            )}
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No products match that search.</Text>
          }
          renderItem={({ item }) => (
            <GridCard item={item} onAdd={() => addItem(item)} />
          )}
        />
      )}

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

      <Modal
        visible={catsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCatsOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalScrim}
            onPress={() => setCatsOpen(false)}
          />
          <View style={styles.drawer}>
            <View style={styles.drawerHead}>
              <Text style={styles.drawerTitle}>Categories</Text>
              <Pressable onPress={() => setCatsOpen(false)}>
                <Text style={styles.drawerClose}>Close</Text>
              </Pressable>
            </View>
            <ScrollView>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.catRow,
                    categoryId === cat.id ? styles.catRowActive : null,
                  ]}
                  onPress={() => {
                    setCategoryId(cat.id);
                    setSearch("");
                    setCatsOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.catLabel,
                      categoryId === cat.id ? styles.catLabelActive : null,
                    ]}
                  >
                    {cat.label}
                  </Text>
                  <Text style={styles.catChevron}>›</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  header: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  channelRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
    backgroundColor: "#ECEFF3",
    borderRadius: 14,
    padding: 5,
  },
  channelBtn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: "center",
  },
  channelBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  channelText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
    color: "#6B7280",
  },
  channelTextActive: {
    color: colors.fusion,
  },
  canteenRow: {
    gap: 10,
    marginBottom: 10,
  },
  canteenCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  canteenCover: {
    width: "100%",
    height: 110,
    backgroundColor: colors.imageBg,
  },
  canteenBody: { padding: 10, minHeight: 108 },
  canteenName: { fontSize: 14, fontWeight: "800", color: colors.ink },
  canteenHours: { marginTop: 3, fontSize: 11, color: colors.muted },
  canteenBlurb: { marginTop: 4, fontSize: 11, color: "#4B5563", lineHeight: 15 },
  canteenBadge: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "700",
    color: colors.fusion,
  },
  canteenOpen: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
  },
  canteenClosed: { color: "#C2410C" },
  dishHit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 8,
  },
  dishHitBody: { flex: 1, minWidth: 0 },
  dishHitName: { fontSize: 14, fontWeight: "700", color: colors.ink },
  dishHitMeta: { marginTop: 3, fontSize: 12, color: colors.muted },
  dishHitClosed: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
    color: "#C2410C",
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtnIcon: { fontSize: 18, color: "#374151" },
  logo: {
    // Wordmark + "DELIVERING WITH GRACE" must stay readable in the shop header
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: "#000",
  },
  sortChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  sortChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sortChipActive: {
    borderColor: colors.fusion,
    backgroundColor: "#FEF2F2",
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  sortChipTextActive: {
    color: colors.fusion,
  },
  brand: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
  },
  runnerChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  runnerChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  cartIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cartIcon: { fontSize: 16 },
  cartBadge: {
    position: "absolute",
    right: -4,
    top: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.fusion,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  cartBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  searchBar: {
    height: 44,
    borderRadius: 999,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: 8 },
  searchOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  searchOrbText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  list: { padding: 12, paddingBottom: 100 },
  promo: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.fusion,
    overflow: "hidden",
  },
  promoEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  promoTitle: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  promoBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.9)",
  },
  closedCard: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  closedTitle: { fontSize: 16, fontWeight: "800", color: "#9A3412" },
  closedBody: { marginTop: 6, fontSize: 13, lineHeight: 18, color: "#7C2D12" },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 12,
  },
  recommendedRow: { gap: 12, paddingBottom: 8 },
  topCard: {
    width: 148,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  topImageWrap: {
    backgroundColor: colors.imageBg,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 6,
    minHeight: 140,
  },
  badge: {
    position: "absolute",
    left: 8,
    top: 8,
    backgroundColor: colors.fusion,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  qtyBtn: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.fusion,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: -1 },
  topName: {
    minHeight: 36,
    paddingHorizontal: 10,
    paddingTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
    lineHeight: 16,
  },
  topPrice: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
    fontSize: 17,
    fontWeight: "800",
    color: colors.fusion,
  },
  row: { gap: 10 },
  gridCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  gridImageWrap: {
    backgroundColor: colors.imageBg,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 6,
    minHeight: 150,
  },
  gridName: {
    minHeight: 34,
    paddingHorizontal: 10,
    paddingTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
  },
  gridUnit: {
    paddingHorizontal: 10,
    fontSize: 11,
    color: colors.soft,
  },
  gridPrice: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: colors.fusion,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { color: colors.muted, textAlign: "center", marginTop: 24 },
  orderBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.fusion,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  orderBarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalRoot: { flex: 1, flexDirection: "row" },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "82%",
    maxWidth: 320,
    backgroundColor: "#fff",
  },
  drawerHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  drawerTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  drawerClose: { fontSize: 13, fontWeight: "600", color: colors.muted },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  catLabel: { fontSize: 14, fontWeight: "500", color: "#1F2937" },
  catLabelActive: { fontWeight: "700", color: colors.fusion },
  catRowActive: { backgroundColor: "#FEF2F2" },
  catChevron: { fontSize: 16, color: "#9CA3AF" },
});
