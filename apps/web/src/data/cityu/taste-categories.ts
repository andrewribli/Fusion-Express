/**
 * Foodpanda-style Taste sidebar categories for the CityU prototype.
 * Product `category` ids match these. Empty categories still show in the rail.
 */
export const SIDEBAR_CATEGORIES = [
  { id: "offers", label: "Offers" },
  { id: "moneyback", label: "Add To Cart For MoneyBack Points" },
  { id: "weekly-best", label: "Weekly Best Buy" },
  { id: "new-arrivals", label: "New Arrivals" },
  { id: "fruits", label: "Fruits" },
  { id: "vegetables", label: "Vegetables" },
  { id: "meat-seafood", label: "Meat & Seafood" },
  { id: "dairy-eggs", label: "Dairy/Chilled & Eggs" },
  { id: "frozen", label: "Frozen Food" },
  { id: "bakery", label: "Bakery & Breakfast" },
  { id: "ice-cream", label: "Ice Cream & Desserts" },
  { id: "food-court", label: "Food Court" },
  { id: "instant-meal", label: "Instant Meal" },
  { id: "beverages", label: "Beverages" },
  { id: "wine", label: "Wine & Spirit" },
  { id: "beer", label: "Beer/Cider & Sour" },
  { id: "chocolates", label: "Chocolates & Sweets" },
  { id: "snacks", label: "Snacks & Crisps" },
  { id: "noodles", label: "Noodles & Pasta" },
] as const;

export type SidebarCategoryId = (typeof SIDEBAR_CATEGORIES)[number]["id"];

export const PRODUCT_CATEGORIES = SIDEBAR_CATEGORIES.map((c) => c.id);

export type ProductCategory = SidebarCategoryId;

export const CATEGORY_LABELS: Record<ProductCategory, string> =
  Object.fromEntries(SIDEBAR_CATEGORIES.map((c) => [c.id, c.label])) as Record<
    ProductCategory,
    string
  >;
