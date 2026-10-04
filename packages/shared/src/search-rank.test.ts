import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SCORE_EXACT_NAME,
  SCORE_NAME_SUBSTRING,
  SCORE_WHOLE_WORD,
  SCORE_WHOLE_WORD_DERIVED,
  SCORE_WHOLE_WORD_PRIMARY,
  SCORE_WHOLE_WORD_SECONDARY,
  hasWholeWord,
  isDerived,
  rankItemsByQuery,
  scoreItem,
  type SearchableItem,
} from "./search-rank";

function item(
  partial: Partial<SearchableItem> & { name: string },
): SearchableItem {
  return {
    inStock: true,
    price: 20,
    ...partial,
  };
}

describe("hasWholeWord", () => {
  it("matches milk as a whole word but not milky", () => {
    assert.equal(hasWholeWord("Milk — Meiji", "milk"), true);
    assert.equal(hasWholeWord("Fresh Milk Full Cream", "milk"), true);
    assert.equal(hasWholeWord("Almond Milk Original", "milk"), true);
    assert.equal(hasWholeWord("Milky Repair Shampoo", "milk"), false);
    assert.equal(hasWholeWord("Oatmilk Barista Blend", "milk"), false);
  });
});

describe("isDerived", () => {
  it("detects yogurt / juice / flavored / toiletry forms", () => {
    assert.equal(isDerived("Creamy Aus Style Yoghurt Strawberry 160g"), true);
    assert.equal(isDerived("Apple Juice 1L"), true);
    assert.equal(isDerived("Beef Flavored Crackers"), true);
    assert.equal(isDerived("Milky Repair Shampoo"), true);
    assert.equal(isDerived("Strawberry"), false);
    assert.equal(isDerived("Frozen Strawberries"), false);
    assert.equal(isDerived("SELECT Fresh Chicken Thigh ~500g"), false);
  });
});

describe("scoreItem", () => {
  it("ranks dairy milk / oat milk above Milky Repair Shampoo for q=milk", () => {
    const dairyMilk = item({
      name: "Milk — Meiji",
      category: "dairy",
      subcategory: "Dairy",
      price: 24,
    });
    const oatMilk = item({
      name: "Almond Milk Original",
      category: "drinks",
      subcategory: "Drinks",
      price: 42,
    });
    const oatmilkCompound = item({
      name: "Oatmilk Barista Blend",
      category: "drinks",
      subcategory: "Drinks",
      price: 25,
    });
    const shampoo = item({
      name: "Milky Repair Shampoo",
      category: "toiletries",
      subcategory: "Toiletries",
      price: 64.9,
    });

    assert.equal(scoreItem(dairyMilk, "milk"), SCORE_WHOLE_WORD_PRIMARY);
    assert.equal(scoreItem(oatMilk, "milk"), SCORE_WHOLE_WORD_SECONDARY);
    assert.equal(scoreItem(oatmilkCompound, "milk"), SCORE_NAME_SUBSTRING);
    assert.equal(scoreItem(shampoo, "milk"), SCORE_NAME_SUBSTRING);

    const ranked = rankItemsByQuery(
      [shampoo, oatmilkCompound, oatMilk, dairyMilk],
      "milk",
    );
    assert.deepEqual(
      ranked.map((r) => r.name),
      [
        "Milk — Meiji",
        "Almond Milk Original",
        "Oatmilk Barista Blend",
        "Milky Repair Shampoo",
      ],
    );
  });

  it("puts Dairy category priority ahead of Toiletries within the same tier", () => {
    const dairySubstr = item({
      name: "Milky Way Style Yogurt",
      category: "dairy",
      subcategory: "Dairy",
      price: 30,
    });
    const shampoo = item({
      name: "Milky Repair Shampoo",
      category: "toiletries",
      subcategory: "Toiletries",
      price: 20,
    });
    const ranked = rankItemsByQuery([shampoo, dairySubstr], "milk");
    assert.equal(ranked[0]?.name, "Milky Way Style Yogurt");
    assert.equal(ranked[1]?.name, "Milky Repair Shampoo");
  });

  it("maps milk query to Dairy category for yogurt without milk in the name", () => {
    const yogurt = item({
      name: "Greek Yogurt",
      category: "dairy",
      subcategory: "Dairy",
      price: 16,
    });
    assert.equal(scoreItem(yogurt, "milk"), 800);
  });

  it("matches brand / nameAlt fields", () => {
    const row = item({
      name: "Fresh Full Cream 1L",
      brand: "Meiji",
      nameAlt: "Sold at ParknShop",
      category: "dairy",
      subcategory: "Dairy",
    });
    assert.ok(scoreItem(row, "meiji") >= SCORE_NAME_SUBSTRING);
    assert.ok(scoreItem(row, "parknshop") >= SCORE_NAME_SUBSTRING);
  });

  it("ranks fresh strawberry above strawberry yogurt for q=strawberry", () => {
    const fresh = item({
      name: "Strawberry",
      category: "produce",
      subcategory: "Produce",
      price: 0,
    });
    const pack = item({
      name: "Strawberry 250g",
      category: "produce",
      subcategory: "Produce",
      price: 29,
    });
    const frozen = item({
      name: "Frozen Strawberries",
      category: "frozen-vegetables",
      subcategory: "Frozen Vegetables",
      price: 0,
    });
    const yogurt = item({
      name: "Creamy Aus Style Yoghurt Strawberry 160g",
      category: "yogurt",
      subcategory: "Yogurt",
      price: 16,
    });

    assert.equal(scoreItem(fresh, "strawberry"), SCORE_EXACT_NAME);
    assert.equal(scoreItem(pack, "strawberry"), SCORE_WHOLE_WORD_PRIMARY);
    assert.equal(scoreItem(frozen, "strawberry"), SCORE_WHOLE_WORD_SECONDARY);
    assert.equal(scoreItem(yogurt, "strawberry"), SCORE_WHOLE_WORD_DERIVED);

    const ranked = rankItemsByQuery([yogurt, frozen, pack, fresh], "strawberry");
    assert.deepEqual(
      ranked.map((r) => r.name),
      [
        "Strawberry",
        "Strawberry 250g",
        "Frozen Strawberries",
        "Creamy Aus Style Yoghurt Strawberry 160g",
      ],
    );
  });

  it("ranks apple above apple juice for q=apple", () => {
    const apple = item({
      name: "Apple",
      category: "produce",
      subcategory: "Produce",
      price: 0,
    });
    const fuji = item({
      name: "Fuji Apple 4pcs Pack",
      category: "produce",
      subcategory: "Produce",
      price: 19.9,
    });
    const juice = item({
      name: "Apple Juice 1L",
      category: "drinks",
      subcategory: "Drinks",
      price: 18,
    });

    assert.equal(scoreItem(apple, "apple"), SCORE_EXACT_NAME);
    assert.equal(scoreItem(fuji, "apple"), SCORE_WHOLE_WORD_PRIMARY);
    assert.equal(scoreItem(juice, "apple"), SCORE_WHOLE_WORD_DERIVED);

    const ranked = rankItemsByQuery([juice, fuji, apple], "apple");
    assert.equal(ranked[0]?.name, "Apple");
    assert.equal(ranked[ranked.length - 1]?.name, "Apple Juice 1L");
    assert.ok(
      ranked.findIndex((r) => r.name.includes("Fuji")) <
        ranked.findIndex((r) => r.name.includes("Juice")),
    );
  });

  it("ranks Meat - Beef above snack crackers for q=beef", () => {
    const brisket = item({
      name: "Fresh House USA Beef Brisket Finger Meat 454g",
      category: "meat-beef",
      subcategory: "Meat - Beef",
      price: 69,
    });
    const chuck = item({
      name: "Australian Angus Beef Chuck Steak ~300g",
      category: "meat-beef",
      subcategory: "Meat - Beef",
      price: 0,
    });
    const crackers = item({
      name: "Beef Flavored Crackers",
      category: "snacks",
      subcategory: "Snacks",
      price: 12,
    });

    assert.equal(scoreItem(brisket, "beef"), SCORE_WHOLE_WORD);
    assert.equal(scoreItem(crackers, "beef"), SCORE_WHOLE_WORD_DERIVED);

    const ranked = rankItemsByQuery([crackers, chuck, brisket], "beef");
    assert.equal(ranked[ranked.length - 1]?.name, "Beef Flavored Crackers");
    assert.ok(
      ranked.findIndex((r) => r.name.includes("Brisket")) <
        ranked.findIndex((r) => r.name.includes("Crackers")),
    );
    assert.ok(
      ranked.findIndex((r) => r.name.includes("Chuck")) <
        ranked.findIndex((r) => r.name.includes("Crackers")),
    );
  });

  it("ranks Meat - Chicken above snack chicken flavor for q=chicken", () => {
    const thigh = item({
      name: "SELECT Fresh Chicken Thigh ~500g",
      category: "meat-chicken",
      subcategory: "Meat - Chicken",
      price: 0,
    });
    const breast = item({
      name: "SELECT Fresh Chicken Breast ~500g",
      category: "meat-chicken",
      subcategory: "Meat - Chicken",
      price: 0,
    });
    const snack = item({
      name: "Buldak Hot Chicken Flavor Ramen Cheese",
      category: "noodles",
      subcategory: "Noodles",
      price: 18,
    });

    assert.equal(scoreItem(thigh, "chicken"), SCORE_WHOLE_WORD_PRIMARY);
    assert.equal(scoreItem(snack, "chicken"), SCORE_WHOLE_WORD_DERIVED);

    const ranked = rankItemsByQuery([snack, thigh, breast], "chicken");
    assert.ok(
      ranked.findIndex((r) => r.name.includes("Thigh")) <
        ranked.findIndex((r) => r.name.includes("Ramen")),
    );
    assert.ok(
      ranked.findIndex((r) => r.name.includes("Breast")) <
        ranked.findIndex((r) => r.name.includes("Ramen")),
    );
  });
});
