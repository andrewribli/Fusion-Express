import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCampusDishes } from "./catalog";
import {
  defaultFilters,
  searchCampusDishes,
  type MealSearchFilters,
} from "./search";
import { distanceAvailable } from "./walk";

const sundayNight = new Date("2026-10-04T03:00:00+08:00");

function withFilters(patch: Partial<MealSearchFilters>): MealSearchFilters {
  return { ...defaultFilters(), ...patch };
}

describe("campus dish search", () => {
  it("matches Chinese dish names on the current campus", () => {
    const coffee = searchCampusDishes("cuhk", "咖啡", defaultFilters());
    assert.ok(coffee.items.length > 0);
    for (const dish of coffee.items) {
      assert.equal(dish.campus, "cuhk");
      assert.match(`${dish.name}${dish.description}`, /咖啡/);
    }
  });

  it("chicken returns matching items on the current campus", () => {
    const cuhk = searchCampusDishes("cuhk", "chicken", defaultFilters());
    assert.ok(cuhk.items.length > 0);
    for (const dish of cuhk.items) {
      assert.equal(dish.campus, "cuhk");
      const blob = `${dish.name} ${dish.description} ${dish.category}`.toLowerCase();
      assert.match(blob, /chicken/);
    }

    const cityu = searchCampusDishes("cityu", "chicken", defaultFilters());
    assert.ok(cityu.items.length > 0);
    for (const dish of cityu.items) {
      assert.equal(dish.campus, "cityu");
    }
  });

  it("CUHK search never returns CityU items", () => {
    const cuhkIds = new Set(getCampusDishes("cuhk").map((d) => d.canteenId));
    const cityuIds = new Set(getCampusDishes("cityu").map((d) => d.canteenId));
    for (const id of cuhkIds) assert.equal(cityuIds.has(id), false);

    const found = searchCampusDishes("cuhk", "chicken", defaultFilters());
    for (const dish of found.items) {
      assert.equal(dish.campus, "cuhk");
      assert.equal(cityuIds.has(dish.canteenId), false);
    }
    const cityu = searchCampusDishes("cityu", "rice", defaultFilters());
    for (const dish of cityu.items) {
      assert.equal(cuhkIds.has(dish.canteenId), false);
    }
  });

  it("price filter excludes out-of-range items", () => {
    const all = searchCampusDishes("cuhk", "rice", defaultFilters());
    assert.ok(all.items.some((d) => d.price >= 20));
    const cheap = searchCampusDishes(
      "cuhk",
      "rice",
      withFilters({ price: { kind: "preset", preset: "under20" } }),
    );
    assert.ok(cheap.items.length > 0);
    assert.ok(cheap.items.length < all.items.length);
    for (const dish of cheap.items) assert.ok(dish.price < 20);
  });

  it("distance filter is unavailable and hides distance when no hall is set", () => {
    assert.equal(distanceAvailable("cuhk", null, null), false);
    assert.equal(distanceAvailable("cityu", "", null), false);
    const noHall = searchCampusDishes("cuhk", "rice", defaultFilters());
    assert.ok(noHall.items.length > 0);
    for (const dish of noHall.items) assert.equal(dish.walkMinutes, null);

    const ignored = searchCampusDishes(
      "cuhk",
      "rice",
      withFilters({ distance: "under10" }),
    );
    assert.equal(ignored.items.length, noHall.items.length);
    for (const dish of ignored.items) assert.equal(dish.walkMinutes, null);
  });

  it("shows walk minutes once a hall is set", () => {
    assert.equal(
      distanceAvailable("cuhk", "Adam Schall Residence", "United College"),
      true,
    );
    const withHall = searchCampusDishes("cuhk", "rice", defaultFilters(), [], {
      hall: "Adam Schall Residence",
      college: "United College",
    });
    const united = withHall.items.find((d) => d.canteenId === "uc-canteen");
    const bf = withHall.items.find((d) => d.canteenId === "benjamin-franklin");
    assert.ok(united);
    assert.equal(united.walkMinutes, 2);
    if (bf) assert.ok((bf.walkMinutes ?? 0) > 2);

    const pg = searchCampusDishes("cuhk", "rice", defaultFilters(), [], {
      hall: "Postgraduate Hall 1",
      college: "Postgraduate Halls (PGH)",
    });
    const fromBf = pg.items.find((d) => d.canteenId === "benjamin-franklin");
    assert.ok(fromBf);
    assert.equal(fromBf.walkMinutes, 12);
  });

  it("price sort order is correct", () => {
    const sorted = searchCampusDishes(
      "cuhk",
      "chicken",
      withFilters({ sort: "price-asc" }),
    );
    assert.ok(sorted.items.length > 1);
    for (let i = 1; i < sorted.items.length; i += 1) {
      assert.ok(sorted.items[i].price >= sorted.items[i - 1].price);
    }
    const desc = searchCampusDishes(
      "cuhk",
      "chicken",
      withFilters({ sort: "price-desc" }),
    );
    for (let i = 1; i < desc.items.length; i += 1) {
      assert.ok(desc.items[i].price <= desc.items[i - 1].price);
    }
  });

  it("keeps closed items unless open now is on", () => {
    const closedNight = searchCampusDishes("cuhk", "rice", defaultFilters(), [], {
      now: sundayNight,
    });
    assert.ok(closedNight.items.length > 0);
    assert.ok(closedNight.items.some((d) => d.openNow === false));
    const openOnly = searchCampusDishes(
      "cuhk",
      "rice",
      withFilters({ openNowOnly: true }),
      [],
      { now: sundayNight },
    );
    assert.ok(openOnly.items.length < closedNight.items.length);
    for (const dish of openOnly.items) assert.equal(dish.openNow, true);
  });

  it("worked examples", () => {
    const spicy = searchCampusDishes(
      "cityu",
      "spicy chicken",
      withFilters({ sort: "price-asc" }),
    );
    const spicyCuhk = searchCampusDishes(
      "cuhk",
      "spicy chicken",
      withFilters({ sort: "price-asc" }),
    );
    const coffee = searchCampusDishes(
      "cuhk",
      "coffee",
      withFilters({ bucket: "drinks" }),
    );
    const rice = searchCampusDishes(
      "cuhk",
      "rice",
      withFilters({
        price: { kind: "preset", preset: "under20" },
        openNowOnly: true,
      }),
      [],
      { now: new Date("2026-10-05T12:30:00+08:00") },
    );

    console.log(
      JSON.stringify(
        {
          spicyChickenPriceAsc: spicy.items.slice(0, 5).map((d) => ({
            name: d.name,
            price: d.price,
            canteen: d.canteenShortName,
            campus: d.campus,
          })),
          spicyCount: spicy.total,
          spicyCuhkCount: spicyCuhk.total,
          coffeeDrinks: coffee.items.slice(0, 5).map((d) => ({
            name: d.name,
            price: d.price,
            category: d.category,
            canteen: d.canteenShortName,
          })),
          coffeeCount: coffee.total,
          riceUnder20Open: rice.items.slice(0, 5).map((d) => ({
            name: d.name,
            price: d.price,
            openNow: d.openNow,
            canteen: d.canteenShortName,
          })),
          riceCount: rice.total,
        },
        null,
        2,
      ),
    );

    for (let i = 1; i < spicy.items.length; i += 1) {
      assert.ok(spicy.items[i].price >= spicy.items[i - 1].price);
    }
    assert.ok(spicy.items.length > 0, "spicy chicken should match CityU dishes");
    for (const dish of spicy.items) assert.equal(dish.campus, "cityu");
    for (const dish of spicyCuhk.items) assert.equal(dish.campus, "cuhk");
    for (const dish of coffee.items) {
      assert.equal(dish.campus, "cuhk");
      const blob = `${dish.name} ${dish.description} ${dish.category}`.toLowerCase();
      assert.match(blob, /coffee/);
    }
    for (const dish of rice.items) {
      assert.ok(dish.price < 20);
      assert.equal(dish.openNow, true);
      assert.equal(dish.campus, "cuhk");
    }
  });
});
