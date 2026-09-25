/** Fixed grocery aisles. Anything we cannot place stays in Other. */

export const CANONICAL_GROCERY_CATEGORIES = [
  "Produce",
  "Meat",
  "Seafood",
  "Dairy",
  "Bakery",
  "Frozen",
  "Pantry",
  "Snacks",
  "Beverages",
  "Household",
  "Personal Care",
  "Other",
] as const;

export type CanonicalGroceryCategory = (typeof CANONICAL_GROCERY_CATEGORIES)[number];

const SEAFOOD =
  /海鮮|魚|蝦|蟹|貝|蠔|蜆|魷|三文魚|吞拿|龍蝦|seafood|fish|prawn|shrimp|crab|oyster|scallop|squid|salmon|tuna|mussel|clam/i;
const FROZEN = /急凍|冷凍|雪糕|冰|frozen|ice cream|icecream/i;
const PRODUCE = /蔬|水果|生菜|生果|produce|fruit|vegetable/i;
const MEAT = /肉|雞|牛|豬|羊|鴨|meat|beef|pork|chicken|lamb|poultry/i;
const DAIRY = /乳|奶|蛋|芝士|酸乳|dairy|milk|cheese|yogurt|egg/i;
const BAKERY = /麵包|早餐|包點|bakery|bread|toast|croissant/i;
const PANTRY = /米|油|麵|罐頭|醬|調味|湯|意粉|pasta|noodle|pantry|rice|oil|sauce|canned/i;
const SNACKS = /朱古力|薯片|零食|糖果|餅|snack|crisp|chocolate|candy|biscuit/i;
const DRINKS = /飲品|酒|飲料|汽水|茶|咖啡|beverage|drink|wine|beer|juice|water/i;
const HOUSEHOLD = /生活|廚具|餐桌|清潔|紙品|household|kitchenware|detergent|tissue/i;
const PERSONAL = /個人護理|護膚|沐浴|洗頭|口腔|personal care|shampoo|soap|toothpaste/i;

const TASTE_CATEGORY: Record<string, CanonicalGroceryCategory> = {
  fruits: "Produce",
  vegetables: "Produce",
  "meat-seafood": "Meat",
  "dairy-eggs": "Dairy",
  frozen: "Frozen",
  "ice-cream": "Frozen",
  bakery: "Bakery",
  beverages: "Beverages",
  wine: "Beverages",
  beer: "Beverages",
  snacks: "Snacks",
  chocolates: "Snacks",
  noodles: "Pantry",
  "instant-meal": "Pantry",
};

/**
 * Map a shelf name (and product name, when the shelf mixes aisles) onto the
 * fixed grocery list. Unmapped shelves go to Other.
 */
export function canonicalGroceryCategory(
  rawCategory: string,
  productName = "",
): CanonicalGroceryCategory {
  if (TASTE_CATEGORY[rawCategory]) {
    if (rawCategory === "meat-seafood" && SEAFOOD.test(productName) && !MEAT.test(productName)) {
      return "Seafood";
    }
    return TASTE_CATEGORY[rawCategory];
  }

  const blob = `${rawCategory} ${productName}`;
  if (FROZEN.test(blob) && !DAIRY.test(rawCategory)) return "Frozen";
  if (PRODUCE.test(rawCategory)) return "Produce";
  if (/肉類及海鮮|meat\s*&\s*seafood/i.test(rawCategory)) {
    return SEAFOOD.test(productName) ? "Seafood" : "Meat";
  }
  if (SEAFOOD.test(blob) && !MEAT.test(rawCategory)) return "Seafood";
  if (MEAT.test(rawCategory)) return "Meat";
  if (FROZEN.test(blob)) return "Frozen";
  if (DAIRY.test(rawCategory)) return "Dairy";
  if (BAKERY.test(rawCategory)) return "Bakery";
  if (DRINKS.test(rawCategory)) return "Beverages";
  if (SNACKS.test(rawCategory)) return "Snacks";
  if (PANTRY.test(rawCategory)) return "Pantry";
  if (HOUSEHOLD.test(rawCategory)) return "Household";
  if (PERSONAL.test(rawCategory)) return "Personal Care";
  return "Other";
}
