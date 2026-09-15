"""Append Google Drive shelf-photo SKUs to foodpanda-fusion-catalog.json."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "packages" / "shared" / "data" / "foodpanda-fusion-catalog.json"

# ParknShop-style names; brand also stored separately when known.
DRIVE_SHELF_ITEMS: list[dict] = [
    # drive-shelf-01 — chilled/frozen ready meals & noodles
    {"name": "Kerisom Black Gold Braised Pork Rice", "price": 39.9, "category": "Groceries", "subcategory": "Frozen Food", "brand": "Kerisom", "image": "/images/catalog/drive-shelf-01.jpg"},
    {"name": "Kerisom Crab Sauce Noodles", "price": 39.9, "category": "Groceries", "subcategory": "Frozen Food", "brand": "Kerisom", "image": "/images/catalog/drive-shelf-01.jpg"},
    {"name": "Tai Hing Braised Pork with Preserved Vegetable Rice", "price": 22.0, "category": "Groceries", "subcategory": "Frozen Food", "brand": "Tai Hing", "image": "/images/catalog/drive-shelf-01.jpg"},
    {"name": "Tai Hing Stewed Chicken with Five Spices Rice", "price": 22.0, "category": "Groceries", "subcategory": "Frozen Food", "brand": "Tai Hing", "image": "/images/catalog/drive-shelf-01.jpg"},
    {"name": "Ho E Eat Spaghetti Carbonara", "price": 18.0, "category": "Groceries", "subcategory": "Frozen Food", "brand": "Ho E Eat", "image": "/images/catalog/drive-shelf-01.jpg", "bulkDealPrice": 50.0, "bulkDealQty": 3},
    {"name": "Ho E Eat Spaghetti Bolognese", "price": 18.0, "category": "Groceries", "subcategory": "Frozen Food", "brand": "Ho E Eat", "image": "/images/catalog/drive-shelf-01.jpg", "bulkDealPrice": 50.0, "bulkDealQty": 3},
    {"name": "Ho E Eat Spaghetti with White Mushroom Sauce", "price": 18.0, "category": "Groceries", "subcategory": "Frozen Food", "brand": "Ho E Eat", "image": "/images/catalog/drive-shelf-01.jpg", "bulkDealPrice": 50.0, "bulkDealQty": 3},
    {"name": "Ho E Eat Laksa Chicken Noodles", "price": 18.0, "category": "Groceries", "subcategory": "Frozen Food", "brand": "Ho E Eat", "image": "/images/catalog/drive-shelf-01.jpg", "bulkDealPrice": 50.0, "bulkDealQty": 3},
    {"name": "Ho E Eat Shredded Chicken with Sesame Sauce Cold Noodles", "price": 18.0, "category": "Groceries", "subcategory": "Frozen Food", "brand": "Ho E Eat", "image": "/images/catalog/drive-shelf-01.jpg", "bulkDealPrice": 50.0, "bulkDealQty": 3},
    {"name": "Inaniwa Udon", "price": 39.9, "category": "Groceries", "subcategory": "Rice & Noodles", "image": "/images/catalog/drive-shelf-01.jpg"},
    {"name": "Fish Noodle 2-Pack", "price": 20.0, "category": "Groceries", "subcategory": "Rice & Noodles", "image": "/images/catalog/drive-shelf-01.jpg"},
    {"name": "Master Chiu Beef Brisket in Soup", "price": 39.9, "category": "Groceries", "subcategory": "Frozen Food", "brand": "Master Chiu", "image": "/images/catalog/drive-shelf-01.jpg"},
    {"name": "Inaniwa Style Udon 3-Pack", "price": 39.9, "category": "Groceries", "subcategory": "Rice & Noodles", "image": "/images/catalog/drive-shelf-01.jpg"},
    {"name": "Sous Vide Confit Duck Leg", "price": 55.0, "category": "Groceries", "subcategory": "Frozen Food", "image": "/images/catalog/drive-shelf-01.jpg"},
    {"name": "Margherita Pizza", "price": 39.9, "category": "Groceries", "subcategory": "Frozen Food", "image": "/images/catalog/drive-shelf-01.jpg"},
    {"name": "Korean No.1 Best Seller Pizza Bread", "price": 55.0, "category": "Groceries", "subcategory": "Frozen Food", "image": "/images/catalog/drive-shelf-01.jpg"},
    # drive-shelf-02 — fruit
    {"name": "PureSpect Black Label Orange 3pcs", "price": 16.9, "category": "Fresh Food", "subcategory": "Fruit", "brand": "PureSpect", "image": "/images/catalog/drive-shelf-02.jpg"},
    {"name": "Small Citrus Fruit 3pcs", "price": 14.9, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-02.jpg"},
    {"name": "Bagged Oranges", "price": 16.9, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-02.jpg"},
    {"name": "Honey Pomelo", "price": 15.8, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-02.jpg"},
    {"name": "Whole Pineapple", "price": 22.0, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-02.jpg"},
    {"name": "Red Dragon Fruit", "price": 11.0, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-02.jpg", "bulkDealPrice": 21.0, "bulkDealQty": 3},
    {"name": "Crystal Pear with Mesh Wrap", "price": 16.0, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-02.jpg"},
    # drive-shelf-03 — fruit
    {"name": "Honey Pears Medium 3pcs", "price": 16.0, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-03.jpg", "bulkDealPrice": 6.5, "bulkDealQty": 1},
    {"name": "Honey Pears Small 5pcs", "price": 12.5, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-03.jpg", "bulkDealPrice": 3.0, "bulkDealQty": 1},
    {"name": "Yellow Mango 3pcs", "price": 21.0, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-03.jpg", "bulkDealPrice": 8.0, "bulkDealQty": 1},
    {"name": "Hass Avocado 3pcs", "price": 26.8, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-03.jpg", "bulkDealPrice": 11.0, "bulkDealQty": 1},
    {"name": "Zespri Gold Kiwi Fruit 5pcs", "price": 48.0, "category": "Fresh Food", "subcategory": "Fruit & Berries", "brand": "Zespri", "image": "/images/catalog/drive-shelf-03.jpg", "bulkDealPrice": 10.8, "bulkDealQty": 1},
    # drive-shelf-04 — fruit
    {"name": "Red Kiwi Pack", "price": 24.9, "category": "Fresh Food", "subcategory": "Fruit & Berries", "image": "/images/catalog/drive-shelf-04.jpg"},
    {"name": "Cherry Persimmon Pack", "price": 19.9, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-04.jpg"},
    {"name": "Golden Flat Peach Pack", "price": 19.9, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-04.jpg"},
    {"name": "Golden Flat Peach Premium Pack", "price": 22.9, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-04.jpg"},
    {"name": "Honey Peach Pack", "price": 19.9, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-04.jpg"},
    {"name": "Premium Japanese Peach 2pcs", "price": 88.0, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-04.jpg"},
    {"name": "Long Green Papaya", "price": 18.0, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-04.jpg"},
    {"name": "Long Watermelon", "price": 25.0, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-04.jpg"},
    {"name": "Viva Young Coconut Thailand", "price": 18.0, "category": "Fresh Food", "subcategory": "Fruit", "brand": "Viva", "image": "/images/catalog/drive-shelf-04.jpg"},
    # drive-shelf-05 — fruit & berries
    {"name": "Calyx Blueberries Tube", "price": 32.0, "category": "Fresh Food", "subcategory": "Fruit & Berries", "brand": "Calyx", "image": "/images/catalog/drive-shelf-05.jpg"},
    {"name": "Mandarins 4pcs", "price": 19.9, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-05.jpg"},
    {"name": "Shine Muscat Grapes", "price": 25.0, "category": "Fresh Food", "subcategory": "Fruit & Berries", "image": "/images/catalog/drive-shelf-05.jpg"},
    {"name": "Premium Red Apple 4pcs", "price": 88.0, "category": "Fresh Food", "subcategory": "Fruit", "image": "/images/catalog/drive-shelf-05.jpg"},
    # drive-shelf-06 — frozen desserts
    {"name": "OHAYO Brulee Frozen Dessert", "price": 18.0, "category": "Groceries", "subcategory": "Frozen Food", "brand": "OHAYO", "image": "/images/catalog/drive-shelf-06.jpg"},
    {"name": "OHAYO Matcha Soft Serve Ice Cream Cone", "price": 12.0, "category": "Groceries", "subcategory": "Frozen Food", "brand": "OHAYO", "image": "/images/catalog/drive-shelf-06.jpg"},
    {"name": "OHAYO Melon Soft Serve Ice Cream Cone", "price": 12.0, "category": "Groceries", "subcategory": "Frozen Food", "brand": "OHAYO", "image": "/images/catalog/drive-shelf-06.jpg"},
    {"name": "OHAYO Vanilla Soft Serve Ice Cream Cone", "price": 12.0, "category": "Groceries", "subcategory": "Frozen Food", "brand": "OHAYO", "image": "/images/catalog/drive-shelf-06.jpg"},
    # drive-shelf-07 — biscuits & crackers
    {"name": "McVitie's Ginger Nuts The Fiery One", "price": 23.5, "category": "Groceries", "subcategory": "Biscuits", "brand": "McVitie's", "image": "/images/catalog/drive-shelf-07.jpg"},
    {"name": "McVitie's go ahead! Crispy Slices Apple Flavor", "price": 18.5, "category": "Groceries", "subcategory": "Biscuits", "brand": "McVitie's", "image": "/images/catalog/drive-shelf-07.jpg"},
    {"name": "McVitie's go ahead! Crispy Slices Forest Fruit Flavor", "price": 18.5, "category": "Groceries", "subcategory": "Biscuits", "brand": "McVitie's", "image": "/images/catalog/drive-shelf-07.jpg"},
    {"name": "Oreo Original Sandwich Cookies", "price": 16.9, "category": "Groceries", "subcategory": "Biscuits", "brand": "Oreo", "image": "/images/catalog/drive-shelf-07.jpg", "bulkDealPrice": 26.5, "bulkDealQty": 2},
    {"name": "Mini Oreo Original Pouch", "price": 11.9, "category": "Groceries", "subcategory": "Biscuits", "brand": "Oreo", "image": "/images/catalog/drive-shelf-07.jpg"},
    {"name": "Ritz Cheese Sandwich Crackers Promotion Pack", "price": 49.0, "category": "Groceries", "subcategory": "Crackers", "brand": "Ritz", "image": "/images/catalog/drive-shelf-07.jpg"},
    {"name": "Oreo Chocolate Cream Sandwich Cookies", "price": 24.5, "category": "Groceries", "subcategory": "Biscuits", "brand": "Oreo", "image": "/images/catalog/drive-shelf-07.jpg"},
    {"name": "Oreo Strawberry Cream Sandwich Cookies", "price": 24.5, "category": "Groceries", "subcategory": "Biscuits", "brand": "Oreo", "image": "/images/catalog/drive-shelf-07.jpg"},
    {"name": "Ritz Lemon Sandwich Crackers", "price": 24.5, "category": "Groceries", "subcategory": "Crackers", "brand": "Ritz", "image": "/images/catalog/drive-shelf-07.jpg"},
    {"name": "Ritz Cheese Sandwich Crackers", "price": 24.5, "category": "Groceries", "subcategory": "Crackers", "brand": "Ritz", "image": "/images/catalog/drive-shelf-07.jpg"},
    {"name": "Julie's Le-mond Lemon Puff Sandwich", "price": 12.0, "category": "Groceries", "subcategory": "Biscuits", "brand": "Julie's", "image": "/images/catalog/drive-shelf-07.jpg"},
    {"name": "Select Cheese Flavoured Biscuits", "price": 24.5, "category": "Groceries", "subcategory": "Biscuits", "brand": "Select", "image": "/images/catalog/drive-shelf-07.jpg"},
    {"name": "Julie's Assorted Biscuits Red Box", "price": 36.9, "category": "Groceries", "subcategory": "Biscuits", "brand": "Julie's", "image": "/images/catalog/drive-shelf-07.jpg"},
    {"name": "Julie's Assorted Biscuits Yellow Box", "price": 36.9, "category": "Groceries", "subcategory": "Biscuits", "brand": "Julie's", "image": "/images/catalog/drive-shelf-07.jpg"},
    # drive-shelf-08 — confectionary (gum & gummies)
    {"name": "Hi-Chew Fruit Chews Grape", "price": 17.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Hi-Chew", "image": "/images/catalog/drive-shelf-08.jpg"},
    {"name": "Hi-Chew Fruit Chews Apple", "price": 17.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Hi-Chew", "image": "/images/catalog/drive-shelf-08.jpg"},
    {"name": "Fruilia Fruit Gummy Mixed Berry", "price": 22.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "Fruilia", "image": "/images/catalog/drive-shelf-08.jpg", "bulkDealPrice": 22.0, "bulkDealQty": 2},
    {"name": "nimm2 Smilegummi Sour", "price": 22.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "nimm2", "image": "/images/catalog/drive-shelf-08.jpg", "bulkDealPrice": 22.0, "bulkDealQty": 2},
    {"name": "nimm2 Smilegummi Original", "price": 22.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "nimm2", "image": "/images/catalog/drive-shelf-08.jpg", "bulkDealPrice": 22.0, "bulkDealQty": 2},
    {"name": "Extra Sugarfree Gum Peppermint", "price": 19.8, "category": "Groceries", "subcategory": "Confectionary", "brand": "Extra", "image": "/images/catalog/drive-shelf-08.jpg", "bulkDealPrice": 19.8, "bulkDealQty": 2},
    {"name": "Extra Sugarfree Gum Strawberry", "price": 19.8, "category": "Groceries", "subcategory": "Confectionary", "brand": "Extra", "image": "/images/catalog/drive-shelf-08.jpg", "bulkDealPrice": 19.8, "bulkDealQty": 2},
    {"name": "Extra Sugarfree Gum Peach", "price": 19.8, "category": "Groceries", "subcategory": "Confectionary", "brand": "Extra", "image": "/images/catalog/drive-shelf-08.jpg", "bulkDealPrice": 19.8, "bulkDealQty": 2},
    {"name": "Extra Sugarfree Gum Honey Melon", "price": 19.8, "category": "Groceries", "subcategory": "Confectionary", "brand": "Extra", "image": "/images/catalog/drive-shelf-08.jpg", "bulkDealPrice": 19.8, "bulkDealQty": 2},
    {"name": "Extra Sugarfree Gum Apple Lime", "price": 19.8, "category": "Groceries", "subcategory": "Confectionary", "brand": "Extra", "image": "/images/catalog/drive-shelf-08.jpg", "bulkDealPrice": 19.8, "bulkDealQty": 2},
    {"name": "Airwaves Sugarfree Gum Original", "price": 14.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "Airwaves", "image": "/images/catalog/drive-shelf-08.jpg", "bulkDealPrice": 14.0, "bulkDealQty": 2},
    {"name": "Eclipse Chewy Mints Spearmint", "price": 18.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "Eclipse", "image": "/images/catalog/drive-shelf-08.jpg", "bulkDealPrice": 18.0, "bulkDealQty": 2},
    {"name": "Eclipse Chewy Mints Minty Lemon", "price": 18.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "Eclipse", "image": "/images/catalog/drive-shelf-08.jpg", "bulkDealPrice": 18.0, "bulkDealQty": 2},
    {"name": "Eclipse Sugarfree Mints Peppermint Tin", "price": 18.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "Eclipse", "image": "/images/catalog/drive-shelf-08.jpg", "bulkDealPrice": 18.0, "bulkDealQty": 2},
    # drive-shelf-09 — chocolate bars
    {"name": "Godiva Masterpieces Chocolate", "price": 15.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "Godiva", "image": "/images/catalog/drive-shelf-09.jpg"},
    {"name": "Ferrero Rocher Collection", "price": 13.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Ferrero", "image": "/images/catalog/drive-shelf-09.jpg"},
    {"name": "Cadbury Dairy Milk Milk Chocolate Multi-pack", "price": 22.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "Cadbury", "image": "/images/catalog/drive-shelf-09.jpg", "bulkDealPrice": 22.0, "bulkDealQty": 2},
    {"name": "Cadbury Picnic Multi-pack", "price": 24.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "Cadbury", "image": "/images/catalog/drive-shelf-09.jpg", "bulkDealPrice": 24.0, "bulkDealQty": 2},
    {"name": "Toblerone Milk Chocolate", "price": 15.5, "category": "Groceries", "subcategory": "Confectionary", "brand": "Toblerone", "image": "/images/catalog/drive-shelf-09.jpg"},
    {"name": "M&M's Peanut Chocolate Bag", "price": 18.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "M&M's", "image": "/images/catalog/drive-shelf-09.jpg", "bulkDealPrice": 18.0, "bulkDealQty": 2},
    {"name": "M&M's Crispy Chocolate Bag", "price": 18.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "M&M's", "image": "/images/catalog/drive-shelf-09.jpg", "bulkDealPrice": 18.0, "bulkDealQty": 2},
    {"name": "Ritter Sport Strawberry Yogurt", "price": 21.5, "category": "Groceries", "subcategory": "Confectionary", "brand": "Ritter Sport", "image": "/images/catalog/drive-shelf-09.jpg", "bulkDealPrice": 21.5, "bulkDealQty": 2},
    {"name": "Ritter Sport Marzipan", "price": 21.5, "category": "Groceries", "subcategory": "Confectionary", "brand": "Ritter Sport", "image": "/images/catalog/drive-shelf-09.jpg", "bulkDealPrice": 21.5, "bulkDealQty": 2},
    {"name": "Ritter Sport Cornflakes", "price": 21.5, "category": "Groceries", "subcategory": "Confectionary", "brand": "Ritter Sport", "image": "/images/catalog/drive-shelf-09.jpg", "bulkDealPrice": 21.5, "bulkDealQty": 2},
    {"name": "Ritter Sport Dark Whole Hazelnuts", "price": 21.5, "category": "Groceries", "subcategory": "Confectionary", "brand": "Ritter Sport", "image": "/images/catalog/drive-shelf-09.jpg", "bulkDealPrice": 21.5, "bulkDealQty": 2},
    {"name": "Ritter Sport Rum Raisins Hazelnuts", "price": 21.5, "category": "Groceries", "subcategory": "Confectionary", "brand": "Ritter Sport", "image": "/images/catalog/drive-shelf-09.jpg", "bulkDealPrice": 21.5, "bulkDealQty": 2},
    {"name": "Hershey's Milk Chocolate Bar", "price": 14.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "Hershey's", "image": "/images/catalog/drive-shelf-09.jpg"},
    {"name": "Hershey's Kisses Milk Chocolate", "price": 40.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "Hershey's", "image": "/images/catalog/drive-shelf-09.jpg"},
    {"name": "Snickers Fun Size Bag", "price": 33.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Snickers", "image": "/images/catalog/drive-shelf-09.jpg"},
    {"name": "KitKat 2-Finger Bag", "price": 20.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "KitKat", "image": "/images/catalog/drive-shelf-09.jpg"},
    {"name": "KitKat Otona No Amasa Dark Chocolate", "price": 35.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "KitKat", "image": "/images/catalog/drive-shelf-09.jpg"},
    {"name": "Maltesers Chocolate Bag", "price": 14.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "Maltesers", "image": "/images/catalog/drive-shelf-09.jpg"},
    # drive-shelf-10 — chocolate & snacks
    {"name": "Maltesers Chocolate Bucket", "price": 94.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Maltesers", "image": "/images/catalog/drive-shelf-10.jpg"},
    {"name": "Merci Finest Selection", "price": 86.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "Merci", "image": "/images/catalog/drive-shelf-10.jpg"},
    {"name": "Almond Roca Canister", "price": 59.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Almond Roca", "image": "/images/catalog/drive-shelf-10.jpg"},
    {"name": "Smarties Tube", "price": 5.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Smarties", "image": "/images/catalog/drive-shelf-10.jpg"},
    {"name": "Meiji Apollo Strawberry Chocolate", "price": 20.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Meiji", "image": "/images/catalog/drive-shelf-10.jpg"},
    {"name": "Andes Creme De Menthe Thins", "price": 24.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Andes", "image": "/images/catalog/drive-shelf-10.jpg"},
    {"name": "Meiji Kinoko no Yama Chocolate Biscuit", "price": 21.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Meiji", "image": "/images/catalog/drive-shelf-10.jpg"},
    {"name": "Meiji Macadamia Chocolate", "price": 26.8, "category": "Groceries", "subcategory": "Confectionary", "brand": "Meiji", "image": "/images/catalog/drive-shelf-10.jpg"},
    {"name": "Meiji Almond Chocolate", "price": 26.8, "category": "Groceries", "subcategory": "Confectionary", "brand": "Meiji", "image": "/images/catalog/drive-shelf-10.jpg"},
    {"name": "Meiji Black Chocolate", "price": 20.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Meiji", "image": "/images/catalog/drive-shelf-10.jpg"},
    {"name": "Kinder Bueno 3-Pack", "price": 22.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Kinder", "image": "/images/catalog/drive-shelf-10.jpg"},
    {"name": "Kinder Surprise Egg", "price": 10.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Kinder", "image": "/images/catalog/drive-shelf-10.jpg"},
    {"name": "Kinder Chocolate Mini Bars", "price": 10.9, "category": "Groceries", "subcategory": "Confectionary", "brand": "Kinder", "image": "/images/catalog/drive-shelf-10.jpg"},
    {"name": "Toblerone Tiny Bag", "price": 32.0, "category": "Groceries", "subcategory": "Confectionary", "brand": "Toblerone", "image": "/images/catalog/drive-shelf-10.jpg"},
    # drive-shelf-11 — chips
    {"name": "Select Cheese Flavoured Potato Chips Canister", "price": 7.0, "category": "Groceries", "subcategory": "Chips", "brand": "Select", "image": "/images/catalog/drive-shelf-11.jpg"},
    {"name": "Lay's Sour Cream & Onion Potato Chips", "price": 7.0, "category": "Groceries", "subcategory": "Chips", "brand": "Lay's", "image": "/images/catalog/drive-shelf-11.jpg"},
    {"name": "Lay's Classic Potato Chips", "price": 7.0, "category": "Groceries", "subcategory": "Chips", "brand": "Lay's", "image": "/images/catalog/drive-shelf-11.jpg"},
    {"name": "Lay's Korean Roasted Chicken Flavored Potato Chips", "price": 24.95, "category": "Groceries", "subcategory": "Chips", "brand": "Lay's", "image": "/images/catalog/drive-shelf-11.jpg", "bulkDealPrice": 49.9, "bulkDealQty": 2},
    {"name": "Lay's Salted Egg Yolk Prawn Flavoured Potato Chips", "price": 24.95, "category": "Groceries", "subcategory": "Chips", "brand": "Lay's", "image": "/images/catalog/drive-shelf-11.jpg", "bulkDealPrice": 49.9, "bulkDealQty": 2},
    {"name": "Lay's Grilled Squid Sweet & Sour Sauce Potato Chips", "price": 24.95, "category": "Groceries", "subcategory": "Chips", "brand": "Lay's", "image": "/images/catalog/drive-shelf-11.jpg", "bulkDealPrice": 49.9, "bulkDealQty": 2},
    {"name": "Pringles Sour Cream & Onion", "price": 28.9, "category": "Groceries", "subcategory": "Chips", "brand": "Pringles", "image": "/images/catalog/drive-shelf-11.jpg"},
    {"name": "Pringles Cheesy Cheese", "price": 28.9, "category": "Groceries", "subcategory": "Chips", "brand": "Pringles", "image": "/images/catalog/drive-shelf-11.jpg"},
    {"name": "Lay's Kyushu Seaweed Potato Chips", "price": 28.9, "category": "Groceries", "subcategory": "Chips", "brand": "Lay's", "image": "/images/catalog/drive-shelf-11.jpg"},
    {"name": "Lay's Barbecue Potato Chips", "price": 28.9, "category": "Groceries", "subcategory": "Chips", "brand": "Lay's", "image": "/images/catalog/drive-shelf-11.jpg"},
    {"name": "Lay's Cheddar & Sour Cream Potato Chips", "price": 28.9, "category": "Groceries", "subcategory": "Chips", "brand": "Lay's", "image": "/images/catalog/drive-shelf-11.jpg"},
    {"name": "Lay's Honey Barbecue Potato Chips", "price": 28.9, "category": "Groceries", "subcategory": "Chips", "brand": "Lay's", "image": "/images/catalog/drive-shelf-11.jpg"},
    # drive-shelf-12 — instant noodles (photo unavailable; items from shelf audit)
    {"name": "Prima Taste Laksa Wholegrain La Mian", "price": 27.0, "category": "Groceries", "subcategory": "Instant Noodles", "brand": "Prima Taste", "image": "/images/catalog/img-7053.jpg"},
    {"name": "Itomen Crab Flavor Instant Noodle 5-Pack", "price": 28.5, "category": "Groceries", "subcategory": "Instant Noodles", "brand": "Itomen", "image": "/images/catalog/img-7053.jpg"},
    {"name": "Chewy Silver Silk Rice Vermicelli 5-Pack", "price": 19.0, "category": "Groceries", "subcategory": "Instant Noodles", "brand": "Chewy", "image": "/images/catalog/img-7053.jpg", "bulkDealPrice": 38.0, "bulkDealQty": 2},
    {"name": "Nongshim Stone Pot Style Noodles 5-Pack", "price": 19.95, "category": "Groceries", "subcategory": "Instant Noodles", "brand": "Nongshim", "image": "/images/catalog/img-7054.jpg", "bulkDealPrice": 39.9, "bulkDealQty": 2},
    {"name": "Samyang Tangle Creamy Mushroom Pasta 5-Pack", "price": 41.9, "category": "Groceries", "subcategory": "Instant Noodles", "brand": "Samyang", "image": "/images/catalog/img-7054.jpg"},
    {"name": "Samyang Tangle Garlic Alfredo Pasta 5-Pack", "price": 41.9, "category": "Groceries", "subcategory": "Instant Noodles", "brand": "Samyang", "image": "/images/catalog/img-7054.jpg"},
    {"name": "Nongshim Omori Kimchi Jjigae Ramyun 5-Pack", "price": 58.0, "category": "Groceries", "subcategory": "Instant Noodles", "brand": "Nongshim", "image": "/images/catalog/img-7054.jpg"},
    {"name": "Nongshim Ansungtangmyun 5-Pack", "price": 58.0, "category": "Groceries", "subcategory": "Instant Noodles", "brand": "Nongshim", "image": "/images/catalog/img-7054.jpg"},
    # drive-shelf-13 — chips & snacks
    {"name": "Cheetos Crunchy Cheese Flavoured Corn Snacks", "price": 18.5, "category": "Groceries", "subcategory": "Chips", "brand": "Cheetos", "image": "/images/catalog/drive-shelf-13.jpg"},
    {"name": "Cheetos Flamin' Hot Crunchy Corn Snacks", "price": 18.5, "category": "Groceries", "subcategory": "Chips", "brand": "Cheetos", "image": "/images/catalog/drive-shelf-13.jpg"},
    {"name": "Doritos Roasted Corn Tortilla Chips", "price": 18.6, "category": "Groceries", "subcategory": "Chips", "brand": "Doritos", "image": "/images/catalog/drive-shelf-13.jpg"},
    {"name": "Doritos Nacho Cheese Tortilla Chips", "price": 18.6, "category": "Groceries", "subcategory": "Chips", "brand": "Doritos", "image": "/images/catalog/drive-shelf-13.jpg"},
    {"name": "Calbee Hot & Spicy Potato Chips", "price": 18.5, "category": "Groceries", "subcategory": "Chips", "brand": "Calbee", "image": "/images/catalog/drive-shelf-13.jpg"},
    {"name": "Calbee Curry Flavoured Potato Chips", "price": 18.5, "category": "Groceries", "subcategory": "Chips", "brand": "Calbee", "image": "/images/catalog/drive-shelf-13.jpg"},
    {"name": "Calbee Prawn Crackers Original", "price": 13.9, "category": "Groceries", "subcategory": "Chips", "brand": "Calbee", "image": "/images/catalog/drive-shelf-13.jpg"},
    {"name": "Jack 'n Jill Potato Chips Sour Cream & Onion", "price": 12.5, "category": "Groceries", "subcategory": "Chips", "brand": "Jack 'n Jill", "image": "/images/catalog/drive-shelf-13.jpg"},
]


def _norm(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip().lower())


def _find_subcategory(categories: list, category: str, subcategory: str) -> dict | None:
    for cat in categories:
        if cat["name"] != category:
            continue
        for sub in cat.get("subcategories", []):
            if sub["name"] == subcategory:
                return sub
    return None


def _ensure_subcategory(categories: list, category: str, subcategory: str) -> dict:
    for cat in categories:
        if cat["name"] != category:
            continue
        sub = _find_subcategory(categories, category, subcategory)
        if sub:
            return sub
        sub = {"name": subcategory, "items": []}
        cat.setdefault("subcategories", []).append(sub)
        return sub
    raise KeyError(f"Unknown top-level category: {category}")


def main() -> None:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    categories = data["categories"]

    existing = {
        (_norm(i["name"]), i.get("category", ""), i.get("subcategory", ""))
        for cat in categories
        for sub in cat.get("subcategories", [])
        for i in sub.get("items", [])
    }

    added = 0
    skipped = 0
    for raw in DRIVE_SHELF_ITEMS:
        key = (_norm(raw["name"]), raw["category"], raw["subcategory"])
        if key in existing:
            skipped += 1
            continue
        sub = _ensure_subcategory(categories, raw["category"], raw["subcategory"])
        item = {k: v for k, v in raw.items() if v is not None}
        sub.setdefault("items", []).append(item)
        existing.add(key)
        added += 1

    CATALOG.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"added {added}, skipped {skipped} duplicates, {len(DRIVE_SHELF_ITEMS)} defined")


if __name__ == "__main__":
    main()
