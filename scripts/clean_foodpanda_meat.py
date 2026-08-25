"""Clean Foodpanda Fusion meat scrape into weight/brand/unit JSON."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "packages" / "shared" / "data" / "foodpanda-fusion-meat.json"

# name, price, priceText, image (truncated URLs kept as scraped)
RAW: list[tuple[str, str, str, str]] = [
    ("Pure Mountain Andes Mountain Pork Collar Steak 350g", "45.9", "HK$ 45.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…ed3454-5af9-4eb5-bbdf-049cb070d510.jpg?height=176"),
    ("Danish Crown Danish Pork Baby Back Rib 500g", "75.9", "HK$ 75.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/50664.jpg?height=176"),
    ("Thailand Chilled Pork Sparerib Sliced 280g", "55.9", "HK$ 55.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-39713.jpg?height=176"),
    ("Select USA Hot Pot Pork Collar Slices 200g", "49.9", "HK$ 49.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…a469db-53ec-433d-a023-9ba9b5a39c69.jpg?height=176"),
    ("Danish Crown Danish Pork Boneless Collar Chop 400g / Packet", "55.0", "HK$ 55.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/52923.jpg?height=176"),
    ("Farm Fresh Spain Minced Pork 181g", "36.9", "HK$ 36.9Buy any 2 to have 10% off", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…8c555c-df72-470d-9a12-78828adc18be.jpg?height=176"),
    ("Pure Mountain Andes Mountain Pork Collar Slice 300g", "39.9", "HK$ 39.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…8928f1-2658-41e0-878e-990a05df0f2d.jpg?height=176"),
    ("Batalle El Unico Spanish White Pork Shank Meat 2 Pieces", "35.9", "HK$ 35.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…ca0ce0-bb0b-4cb0-8b3f-b5150543f50d.jpg?height=176"),
    ("Select U.S.A. Hot Pot Pork Loin Slices 200g", "49.9", "HK$ 49.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…55d53b-adca-4963-9815-812c54c6b3d6.jpg?height=176"),
    ("Farm Fresh Spain Pork Belly Sukiyaki Pre-frozen 181g", "36.9", "HK$ 36.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…374f1b-6203-4d7b-881e-2fe94fe07975.jpg?height=176"),
    ("Select Salted Pork Knuckle 800g", "57.9", "HK$ 57.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…603aad-b2bd-4e4c-9483-ab957a46a1b7.jpg?height=176"),
    ("Danish Crown Danish Boneless Pork Chop 400g", "55.0", "HK$ 55.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/68710.jpg?height=176"),
    ("Farm Fresh Spain Pork Collar Sukiyaki 181g", "34.9", "HK$ 34.9HK$ 36.9Save HK$2.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…323806-550a-4848-8652-4891cbbcac51.jpg?height=176"),
    ("Kingsland Australian Black Angus Chuck Eye Roll Sliced M4+ 200g", "40.0", "HK$ 40.0HK$ 49.9Save HK$9.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…b7a953-0b54-4824-86cf-a7222a088608.jpg?height=176"),
    ("Kingsland Australian Black Angus Oyster Blade Sliced M4+ 200g", "40.0", "HK$ 40.0HK$ 49.9Save HK$9.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…d19ab2-eb6d-4a86-be8b-bb7da8d10d56.jpg?height=176"),
    ("AMG Australian Grass-fed Angus Beef Patty 150g", "29.9", "HK$ 29.9Save HK$16.9 with any 2", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…610a8f-dc28-4f2a-a740-6b27134658e8.jpg?height=176"),
    ("Select USA Grain Fed Hot Pot Beef 200g", "49.9", "HK$ 49.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…d6d833-7338-49aa-85d1-c30d082e7c7f.jpg?height=176"),
    ("Select Australia Minced Beef 177g", "35.9", "HK$ 35.9Buy any 2 to have 10% off", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…ebf497-b851-4570-a4e1-a8689a4707f0.JPG?height=176"),
    ("Kingsland Australian Black Angus Beef Striploin M4+ 250g", "95.0", "HK$ 95.0HK$ 99.0Save HK$4.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…cf667d-48df-475f-b2b5-543e2f595bd0.jpg?height=176"),
    ("Farm Fresh US Beef Hot Pot Sliced 181g", "41.9", "HK$ 41.9Buy any 2 to have 10% off", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…11f121-7d8c-4a99-a2eb-2a12a7777a64.jpg?height=176"),
    ("AMG Australian 150 Days Grain-fed Angus Oyster Blade 300g", "88.0", "HK$ 88.0HK$ 99.0Save HK$11.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…ce22e0-05b2-4f2d-be8a-80ffcb8844f4.jpg?height=176"),
    ("Farm Fresh Black Pepper Australia Beef Steak 363g", "51.9", "HK$ 51.9Buy any 2 to have 10% off", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…528191-00ec-4c86-bb99-3cb78eff52c2.jpg?height=176"),
    ("AMG Australian 150 Days Grain-fed Angus Ribeye Steak 200g", "88.0", "HK$ 88.0HK$ 99.0Save HK$11.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…6fb8e2-6914-479a-a646-61fa529ab9da.jpg?height=176"),
    ("FIRST CUT Aust Chilled Beef Scotch Steak 200G", "88.0", "HK$ 88.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/85548.jpg?height=176"),
    ("FIRST CUT Aust Chilled Beef Striploin Steak 200G", "88.0", "HK$ 88.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/85547.jpg?height=176"),
    ("Farm Fresh Australia Lean Beef 181g", "39.9", "HK$ 39.9Buy any 2 to have 10% off", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…b0f59d-5079-4bbe-b978-925102245f09.jpg?height=176"),
    ("First Cut Australian Chilled Beef Rump Steak 200g", "88.0", "HK$ 88.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/cs9ny-50460.jpg?height=176"),
    ("AMG Australian 150 Days Grain-fed Beef Patty 150g", "29.9", "HK$ 29.9Save HK$16.9 with any 2", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…c95cfd-6adc-4788-9027-f926f9a29ba5.jpg?height=176"),
    ("Tasty Farm USA Beef Rib Finger 454g", "81.9", "HK$ 81.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/84219.jpg?height=176"),
    ("Select Canada Beef Short Ribs 1lb", "82.0", "HK$ 82.0HK$ 89.0Save HK$7.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…283233-db66-4a5c-8bad-60194ae5c363.jpg?height=176"),
    ("Fresh House USA Angus Beef Cube 454g", "89.0", "HK$ 89.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…3556a8-210d-400f-ad81-1d5332a80caa.jpg?height=176"),
    ("Fresh House USA Beef Brisket Finger Meat 454g", "69.0", "HK$ 69.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…ba5c79-088b-490d-847e-075f492ef5c6.jpg?height=176"),
    ("FIRST CUT Aust Chilled Beef Oyster Blade Steak 350G", "88.0", "HK$ 88.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/85549.jpg?height=176"),
    ("Farm Fresh Brazil Chicken Leg Meat Cuts 272g", "34.9", "HK$ 34.9Buy any 2 to have 10% off", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…98f506-b759-407c-97e2-93cede216f1c.jpg?height=176"),
    ("Imperial Banquet Chilled Sesame Chicken 1pc", "46.9", "HK$ 46.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-64000-22112023.jpg?height=176"),
    ("Select Frozen Chicken Tenderloins 1.5lbs", "42.9", "HK$ 42.9Save HK$17.9 with any 2", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…2344fb-b611-4b34-89a9-0ea8f1f0e38c.jpg?height=176"),
    ("Sky Chicken Poland Chicken Mid-joint Wings 1kg", "58.0", "HK$ 58.0HK$ 69.9Save HK$11.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/87285.jpg?height=176"),
    ("Farm Fresh Boneless Chicken Breast (China) 318g", "34.9", "HK$ 34.9Buy any 2 to have 10% off", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…d8058c-a4cf-40fa-bf95-b0ca198fb5b3.jpg?height=176"),
    ("Select Boneless Chicken Thighs 1.5lbs", "42.9", "HK$ 42.9Save HK$17.9 with any 2", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…e5acee-2441-441c-9b2f-276b9dd7236b.jpg?height=176"),
    ("Select Brazil Mid Joint Wings 2lbs", "42.9", "HK$ 42.9HK$ 55.9Save HK$13.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…a809d2-17e3-4046-ac9d-68bdf64593f0.jpg?height=176"),
    ("Australian Meat Garden Australia Chicken Drumsticks (1 Pack) 400g", "57.9", "HK$ 57.9Save HK$35.8 with any 2", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…ec5289-5a3f-4610-aa44-4876f3fa37b9.jpg?height=176"),
    ("Australian Meat Garden Australian Chicken Mid Wings (1 Pack) 400g", "57.9", "HK$ 57.9Save HK$35.8 with any 2", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…b2f9dc-4de8-48a1-a634-af372ae8667e.jpg?height=176"),
    ("Farm Fresh China Chicken Tenderloins 272g", "34.9", "HK$ 34.9Buy any 2 to have 10% off", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…435123-62e1-4ee2-b839-a016fa4f73d3.jpg?height=176"),
    ("Emperor Thailand Frozen Chicken Fillet 1.5lbs", "64.0", "HK$ 64.0HK$ 65.0Save HK$1.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…398e1a-f2d5-473c-a944-4a41cb11df70.jpg?height=176"),
    ("Select Boneless Chicken Thighs (Skinless) 1.5lbs", "42.9", "HK$ 42.9Save HK$17.9 with any 2", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…5ca5b1-f802-4ad0-b9d7-06490939b5f7.jpg?height=176"),
    ("Sky Chicken Poland Chicken Drumsticks 1kg", "69.9", "HK$ 69.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/cs9ny-87302.jpg?height=176"),
    ("Emperor Thailand Frozen Chicken Thigh Boneless 1.5lbs", "64.0", "HK$ 64.0HK$ 65.0Save HK$1.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…6a926a-d20e-4e95-b4e1-09d4ea6ca045.jpg?height=176"),
    ("Farm Fresh Honey Sauce Chicken Steak 363g", "36.9", "HK$ 36.9Buy any 2 to have 10% off", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…482b76-79f0-441f-94a2-cf9017aaccc9.jpg?height=176"),
    ("Emperor Thailand Frozen Chicken Mid-joint Wing 1.5lbs", "64.0", "HK$ 64.0HK$ 65.0Save HK$1.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…69fcaa-8192-4be7-9162-683244ffb1a1.jpg?height=176"),
    ("Sky Chicken Poland Chicken Leg Meat 1kg", "69.9", "HK$ 69.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/87306.jpg?height=176"),
    ("Farm Fresh Chicken Mid Joint Wings (Previously Frozen) 363g", "30.9", "HK$ 30.9Buy any 2 to have 10% off", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…1c90fb-b5da-4bc0-8396-fccc7d04a1bf.jpg?height=176"),
    ("Sky Chicken No Added Hormones Tenderloin 1000g", "60.0", "HK$ 60.0HK$ 79.9Save HK$19.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…c028e0-363f-407f-a96e-af4e39cacfbb.jpg?height=176"),
    ("Sky Chicken No Added Hormones Boneless Thigh 1000g", "60.0", "HK$ 60.0HK$ 79.9Save HK$19.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…bc272b-01af-4791-994c-a231daa0b0cc.jpg?height=176"),
    ("Farm Fresh Chicken Feet (Previously Frozen) 363g", "34.9", "HK$ 34.9Buy any 2 to have 10% off", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…7dfca4-e8ff-464d-99c9-f387ab8b315c.jpg?height=176"),
    ("Coco Duck Smoked Duck Breast 1 Piece", "22.02", "HK$ 22.02 for the price of 1", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…8af2e6-89cc-41ac-8d1f-1c4e25da5105.JPG?height=176"),
    ("CP SELECTION Middle Wing 1KG", "75.0", "HK$ 75.0HK$ 99.0Save HK$24.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/64728.jpg?height=176"),
    ("Sky Chicken No Added Hormones Mid-joint Wing 1000g", "79.9", "HK$ 79.9HK$ 89.9Save HK$10.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…394dc0-1747-4c56-8c87-8ce9220e9ec6.jpg?height=176"),
    ("Coco Duck Smoked Duck Breast (Black Pepper) 1 Piece", "22.02", "HK$ 22.02 for the price of 1", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…075a9c-3945-460b-beaf-fa74307f7323.JPG?height=176"),
    ("Danpo Chicken Thigh 908g", "68.0", "HK$ 68.0HK$ 69.9Save HK$1.9", "https://foodpanda.dhmedia.io/image/product-informa…anagement/696ee34aa113d738948fd699.jpg?height=176"),
    ("Farm Fresh US Chicken Drumstick 454g", "34.9", "HK$ 34.9Buy any 2 to have 10% off", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…9788c7-acd4-444f-bed8-c83f9c15d178.jpg?height=176"),
    ("Supreme Balance Frozen Norwegian Atlantic Salmon Steak 320g", "55.0", "HK$ 55.0HK$ 59.9Save HK$4.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…4809a9-c8c7-40ca-bf27-cd8d4ff6fd07.jpg?height=176"),
    ("Select Frozen Vietnam Whole Black Tiger Prawns (ASC) 300g", "59.9", "HK$ 59.9HK$ 62.9Save HK$3.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…71fe5a-37ea-4c81-9148-1ec67a1b79b3.jpg?height=176"),
    ("Select Frozen Vietnam Raw Black Tiger Prawn Meat (ASC) 180g", "32.0", "HK$ 32.0HK$ 39.9Save HK$7.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…bf13bc-0352-4bf2-aa50-1a1156d07889.jpg?height=176"),
    ("Royal Banquet Frozen Fish Maw 300g", "57.9", "HK$ 57.9HK$ 59.9Save HK$2.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/cs9ny-13727.jpg?height=176"),
    ("Frozen Canadian Greenland Halibut Steaks (MSC) 320g", "47.9", "HK$ 47.9HK$ 55.0Save HK$7.1", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…f0c986-7a18-4f92-b60d-ee5a7b3435c3.jpg?height=176"),
    ("Supreme Balance Frozen Snubnose Pompano 1 Piece", "30.9", "HK$ 30.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…f6f276-9527-4da0-8a83-1bc2e97553d4.jpg?height=176"),
    ("Leader Marine Frozen Cooked Hoso Vannamei (ASC) 1kg", "144.0", "HK$ 144.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…1970fb-2cc8-4d75-b059-6fd75f981ed2.JPG?height=176"),
    ("Valley Chef Chicken Frank 12oz", "27.9", "HK$ 27.9Save HK$6.8 with any 2", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/187136.jpg?height=176"),
    ("Johnsonville Beddar with Cheddar Smoked Sausage 12.7oz", "62.0", "HK$ 62.0HK$ 70.9Save HK$8.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/21072023/87637.jpg?height=176"),
    ("Four Seas Fish Ball Fish Meat Shao Mai 350g", "15.9", "HK$ 15.9HK$ 20.9Save HK$5.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/125757.jpg?height=176"),
    ("Four Seas Fried Fish Ball 170g", "17.0", "HK$ 17.0Save HK$10.0 with any 2", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/33104.jpg?height=176"),
    ("Four Sea Beef Tendon Ball 170g", "24.9", "HK$ 24.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-38886.jpg?height=176"),
    ("Four Seas Fish Ball 170g", "17.0", "HK$ 17.0Save HK$10.0 with any 2", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/33103.jpg?height=176"),
    ("Holland Meat Mart Streaky Bacon 200g", "34.0", "HK$ 34.0HK$ 49.9Save HK$15.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…b3e074-7ef1-4b7d-b84a-02204c2e611c.jpg?height=176"),
    ("Pe Kang Fish & Cuttlefish Ball 454g", "65.92", "HK$ 65.92 for the price of 1", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/31082023/104205.jpg?height=176"),
    ("Hormel Smoked Streaky Bacon 12oz", "88.9", "HK$ 88.9HK$ 91.9Save HK$3.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/90697.jpg?height=176"),
    ("Maid Brand Sandwich Ham 200g 200g", "33.9", "HK$ 33.9Save HK$16.9 with any 2", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/85070.jpg?height=176"),
    ("Maid Brand Honey Cocktail Sausage 160g", "32.0", "HK$ 32.0HK$ 33.9Save HK$1.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/30915.jpg?height=176"),
    ("Johnsonville Smoked Bratwurst 12.7oz", "62.0", "HK$ 62.0HK$ 70.9Save HK$8.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/87387.jpg?height=176"),
    ("Pe Kang Assorted Balls 800g", "68.0", "HK$ 68.0HK$ 69.9Save HK$1.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/121234.jpg?height=176"),
    ("Johnsonville Hot and Spicy Sausage 12.7oz", "62.0", "HK$ 62.0HK$ 70.9Save HK$8.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/ahqj-87386.jpg?height=176"),
    ("Select Pork Patties 170g", "29.9", "HK$ 29.9HK$ 32.9Save HK$3.0", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…0a6323-284a-4b6d-bf35-f39ebc61cdb8.jpg?height=176"),
    ("Pe Kang Meat & Mushroom Ball 454g", "65.92", "HK$ 65.92 for the price of 1", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/31082023/104204.jpg?height=176"),
    ("Four Seas Fried Fish Roll 170g", "17.0", "HK$ 17.0Save HK$13.0 with any 3", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/31082023/30518.jpg?height=176"),
    ("Maid Brand Ham Sliced 200g 200g", "33.9", "HK$ 33.9Save HK$16.9 with any 2", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/25089.jpg?height=176"),
    ("Johnsonville Garlic Brat Sausage 12.7oz", "62.0", "HK$ 62.0HK$ 70.9Save HK$8.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/87389.jpg?height=176"),
    ("Four Seas Fried Fish Block 170g", "17.0", "HK$ 17.0Save HK$12.0 with any 3", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/31082023/30517.jpg?height=176"),
    ("Pe Kang Meat Balls with Black Pepper 454g", "65.92", "HK$ 65.92 for the price of 1", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/31082023/149459.jpg?height=176"),
    ("Maid Brand Cheese Cocktail 160g", "32.0", "HK$ 32.0HK$ 33.9Save HK$1.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/AEON/cb0jp-2306439.jpg?height=176"),
    ("Chan Kee Japanese Style Fish Shao Mai 450g", "27.0", "HK$ 27.0HK$ 27.9Save HK$0.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/36324.jpg?height=176"),
    ("Harvest Creek Chicken Franks 340g", "18.0", "HK$ 18.0HK$ 20.9Save HK$2.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/356297.jpg?height=176"),
    ("Holland Meat Mart Back Bacon 200g", "34.0", "HK$ 34.0HK$ 49.9Save HK$15.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…24196c-3c98-4830-85d0-ac578c8f4889.jpg?height=176"),
    ("BAHELI Beef Tendon Balls 180G", "45.0", "HK$ 45.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/31082023/125142.jpg?height=176"),
    ("MAID Black Pepper Ham Slices 150G/PKT", "37.9", "HK$ 37.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/31082023/76002.jpg?height=176"),
    ("Four Sea Black Pepper Beef Ball 170g", "24.9", "HK$ 24.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-91321.jpg?height=176"),
    ("FOUR SEA Mushroom Pork Ball 170g", "24.9", "HK$ 24.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/91968.jpg?height=176"),
    ("Morliny Smoked Bacon 150g", "39.0", "HK$ 39.0HK$ 43.9Save HK$4.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-94213.jpg?height=176"),
    ("Four Sea Pork Ball 170g", "24.9", "HK$ 24.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/45096.jpg?height=176"),
    ("BAHELI Beef Balls 180G", "45.0", "HK$ 45.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/31082023/125141.jpg?height=176"),
    ("Frozen Salmon Fishballs 150g", "29.9", "HK$ 29.9HK$ 40.0Save HK$10.1", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…f1d489-f523-4fb2-8162-746524e35212.jpg?height=176"),
    ("Four Seas Supreme Cuttlefish Ball 170g", "26.0", "HK$ 26.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-33109.jpg?height=176"),
    ("Moguchon Vienna Sausage 180g", "28.9", "HK$ 28.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/28202.jpg?height=176"),
    ("FOUR SEAS Fish Dumpling 125G", "26.0", "HK$ 26.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/31082023/56398.jpg?height=176"),
    ("Oscar Mayer 1988 Sugar Cured Bacon 16oz", "122.9", "HK$ 122.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-23114.jpg?height=176"),
    ("Vismara Smoked Pancetta Cube 160g", "67.9", "HK$ 67.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-70602.jpg?height=176"),
    ("Maid Brand Cheese Cocktail Sausage 400g", "59.9", "HK$ 59.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/50221.jpg?height=176"),
    ("Oscar Mayer 54462 Turkey Franks 16oz", "77.9", "HK$ 77.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-23105.jpg?height=176"),
    ("Jackson's Grill Germany Smoked Brats with Cheddar 396g", "62.9", "HK$ 62.9Save HK$35.9 with any 2", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…42b494-9368-4d4b-975d-b8cb038bf9e7.jpg?height=176"),
    ("Laselva Premium Cooked Ham 1 Pack 140g", "82.9", "HK$ 82.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-70198-22112023.jpg?height=176"),
    ("Maid Brand Honey Cocktail Sausage 400g", "59.9", "HK$ 59.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/AEON/cb0jp-2471746.jpg?height=176"),
    ("Jackson's Grill Germany Smoked Garlic Brats 396g", "62.9", "HK$ 62.9Save HK$35.9 with any 2", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…b9dc81-84c9-4477-8662-6ec13e8b6879.jpg?height=176"),
    ("Four Seas Golden Triangular Fish Block 170g", "26.0", "HK$ 26.0", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/31082023/42366.jpg?height=176"),
    ("Jackson's Grill Germany Hot and Spicy Smoked Brats 396g", "62.9", "HK$ 62.9Save HK$35.9 with any 2", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…ab363b-5d5e-48c1-a9fb-8c0849566d27.jpg?height=176"),
    ("JACKSON'S GRILL Smoked Brats Cheddar Cocktail 288G", "62.9", "HK$ 62.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/92012.jpg?height=176"),
    ("JINZAI Quail Egg - Salty Baked 120G", "16.9", "HK$ 16.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Ci…le-K-Convenience-Store/qe25-105575.jpg?height=176"),
    ("Easy Cook Minced Pork with Dried Squid 300g", "39.8", "HK$ 39.8", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-22398.jpg?height=176"),
    ("Easy Cook Pepper Salt Pork Chop 454g", "39.8", "HK$ 39.8", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-11475.jpg?height=176"),
    ("Easy Cook Pork Collar Steak with Honey Sauce 454g", "39.8", "HK$ 39.8", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-20220.jpg?height=176"),
    ("Easy Cook Chicken Mid Joint Wing with Honey Sauce 300g", "39.8", "HK$ 39.8", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/hjww-21558.jpg?height=176"),
    ("SALMON FARM Smoked Salmon 100G", "72.9", "HK$ 72.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/48124.jpg?height=176"),
    ("Hormel Natural Choice Honey Ham 8oz", "58.0", "HK$ 58.0HK$ 88.9Save HK$30.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/55760.jpg?height=176"),
    ("Hormel Natural Choice Smoked Ham 8oz", "58.0", "HK$ 58.0HK$ 88.9Save HK$30.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…4b8839-aec5-4c19-af03-6732f9fdf751.jpg?height=176"),
    ("Rovagnati Italian Salami Milano 90g", "72.9", "HK$ 72.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/PARKnSHOP/cs9ny-81758-19032024.jpg?height=176"),
    ("BARS Shaved Honey Ham 255G", "72.0", "HK$ 72.0HK$ 80.9Save HK$8.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/31082023/61996.jpg?height=176"),
    ("BARS Shaved Turkey Breast 227G", "72.0", "HK$ 72.0HK$ 80.9Save HK$8.9", "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/31082023/61998.jpg?height=176"),
    ("Impossible Beef Made from Plants 340g", "68.0", "HK$ 68.0HK$ 69.9Save HK$1.9", "https://foodpanda.dhmedia.io/image/darkstores/nv-g…f9b158-ad8e-43b3-862a-ec168d2e896b.jpg?height=176"),
]

BRANDS = [
    "Australian Meat Garden",
    "Holland Meat Mart",
    "Imperial Banquet",
    "Jackson's Grill",
    "JACKSON'S GRILL",
    "Danish Crown",
    "Pure Mountain",
    "Farm Fresh",
    "Fresh House",
    "Supreme Balance",
    "Royal Banquet",
    "Leader Marine",
    "Valley Chef",
    "Johnsonville",
    "Harvest Creek",
    "Oscar Mayer",
    "Maid Brand",
    "Hormel Natural Choice",
    "Tasty Farm",
    "Sky Chicken",
    "Coco Duck",
    "CP SELECTION",
    "FIRST CUT",
    "First Cut",
    "Four Seas",
    "FOUR SEAS",
    "Four Sea",
    "FOUR SEA",
    "Easy Cook",
    "SALMON FARM",
    "Pe Kang",
    "Chan Kee",
    "Kingsland",
    "Laselva",
    "Rovagnati",
    "Impossible",
    "Vismara",
    "Morliny",
    "Moguchon",
    "Danpo",
    "Emperor",
    "Batalle",
    "BAHELI",
    "JINZAI",
    "Hormel",
    "Select",
    "MAID",
    "BARS",
    "AMG",
]

LB_KG = 0.45359237
OZ_KG = 0.028349523125


def parse_price(price: str, price_text: str) -> float:
    match = re.search(r"HK\$\s*(\d+(?:\.\d+)?)", price_text)
    if match:
        return round(float(match.group(1)), 2)
    return round(float(price), 2)


def parse_weight_and_unit(name: str) -> tuple[float | None, str]:
    n = name
    if re.search(r"/\s*PKT|/ Packet|Packet", n, re.I):
        pack_unit = "packet"
    elif re.search(r"1 Pack|\(1 Pack\)", n, re.I):
        pack_unit = "pack"
    else:
        pack_unit = None

    piece = re.search(r"(\d+)\s*(?:Pieces?|pcs?)\b", n, re.I)
    if piece and not re.search(r"\d+(?:\.\d+)?\s*(?:g|kg|lb|oz)\b", n, re.I):
        return None, "piece"

    m = re.search(
        r"(\d+(?:\.\d+)?)\s*(kg|g|lbs?|oz)\b",
        n,
        re.I,
    )
    if m:
        qty = float(m.group(1))
        unit = m.group(2).lower()
        if unit == "g":
            kg = qty / 1000
            display = pack_unit or "g"
        elif unit == "kg":
            kg = qty
            display = pack_unit or "kg"
        elif unit.startswith("lb"):
            kg = qty * LB_KG
            display = pack_unit or "lb"
        else:
            kg = qty * OZ_KG
            display = pack_unit or "oz"
        return round(kg, 3), display

    if re.search(r"\b1\s*pc\b", n, re.I):
        return None, "piece"
    if pack_unit:
        return None, pack_unit
    return None, "piece"


def parse_brand(name: str) -> str | None:
    lower = name.lower()
    for brand in BRANDS:
        if lower.startswith(brand.lower()):
            if brand.upper() in {"FOUR SEA", "FOUR SEAS", "MAID"}:
                return {
                    "FOUR SEA": "Four Seas",
                    "FOUR SEAS": "Four Seas",
                    "MAID": "Maid Brand",
                }[brand.upper()]
            if brand.lower() == "first cut":
                return "First Cut"
            if brand.lower() == "jackson's grill":
                return "Jackson's Grill"
            return brand
    return None


def slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s[:80]


def clean() -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for i, (name, price, price_text, image) in enumerate(RAW):
        key = re.sub(r"\s+", " ", name).strip().lower()
        if key in seen:
            continue
        seen.add(key)
        weight_kg, unit = parse_weight_and_unit(name)
        out.append(
            {
                "id": slug(name),
                "name": re.sub(r"\s+", " ", name).strip(),
                "brand": parse_brand(name),
                "category": "Meat",
                "price": parse_price(price, price_text),
                "unit": unit,
                "weightKg": weight_kg,
                "image": image,
                "sourceIndex": i,
            }
        )
    return out


def main() -> None:
    items = clean()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} products to {OUT} (from {len(RAW)} scraped)")


if __name__ == "__main__":
    main()
