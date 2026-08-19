# Fusion Express — Firestore Schema

## Collections

### `menuItems`

Pre-populated catalog of Fusion supermarket items.

| Field       | Type      | Required | Description                          |
|-------------|-----------|----------|--------------------------------------|
| `id`        | string    | yes      | Document ID (slug, e.g. `indomie-goreng`) |
| `name`      | string    | yes      | Display name                         |
| `nameZh`    | string    | no       | Chinese name                         |
| `category`  | string    | yes      | One of `MenuCategory` enum           |
| `price`     | number    | yes      | Price in HKD                         |
| `inStock`   | boolean   | yes      | Available for ordering               |
| `imageUrl`  | string    | no       | Optional product image               |
| `sortOrder` | number    | yes      | Display order within category        |

**Indexes:** `category` + `sortOrder` (composite, for menu queries)

---

### `orders`

Customer grocery delivery orders.

| Field              | Type                | Required | Description |
|--------------------|---------------------|----------|-------------|
| `id`               | string              | yes      | Auto-generated document ID |
| `sessionId`        | string              | yes      | Anonymous browser session (localStorage) |
| `items`            | OrderItem[]         | yes      | Line items snapshot at order time |
| `status`           | OrderStatus         | yes      | See lifecycle below |
| `dormName`         | string              | yes      | e.g. "Shaw College", "Lee Shau Kee" |
| `lobbyPoint`       | string              | yes      | Lobby / pickup point within dorm |
| `roomNumber`       | string              | no       | Optional room number |
| `customerNote`     | string              | no       | Special instructions |
| `subtotal`         | number              | yes      | Sum of item prices × qty |
| `deliveryFee`      | number              | yes      | Flat fee (default 10 HKD) |
| `total`            | number              | yes      | subtotal + deliveryFee |
| `paymentReceived`  | boolean             | yes      | Admin marks PayMe/FPS received |
| `paymentMethod`    | string              | no       | "PayMe" or "FPS" |
| `runnerId`         | string              | no       | Assigned runner session/name |
| `runnerName`       | string              | no       | Runner display name |
| `deliveryPhotoUrl` | string              | no       | Firebase Storage URL for proof |
| `createdAt`        | Timestamp           | yes      | Order placed |
| `updatedAt`        | Timestamp           | yes      | Last status change |
| `pickedUpAt`       | Timestamp           | no       | When runner marked picked up |
| `deliveredAt`      | Timestamp           | no       | When runner marked delivered |

#### `OrderItem` (embedded)

| Field     | Type   | Description                    |
|-----------|--------|--------------------------------|
| `itemId`  | string | Reference to menuItems.id      |
| `name`    | string | Snapshot of name at order time |
| `price`   | number | Snapshot of unit price         |
| `quantity`| number | Units ordered                  |

#### Order Status Lifecycle

```
pending → runner_assigned → picked_up → delivered
                ↓
            cancelled (admin only)
```

---

### `runners` (optional for MVP)

Simple runner registry. MVP uses session-based runner login with a shared PIN.

| Field      | Type      | Required | Description              |
|------------|-----------|----------|--------------------------|
| `id`       | string    | yes      | Document ID              |
| `name`     | string    | yes      | Runner display name      |
| `phone`    | string    | no       | Contact number           |
| `active`   | boolean   | yes      | Currently accepting jobs |
| `createdAt`| Timestamp | yes      |                          |

---

## Session Model (no user accounts)

| Role     | Storage        | Key                    |
|----------|----------------|------------------------|
| Customer | localStorage   | `fusion_customer_session` |
| Runner   | sessionStorage | `fusion_runner_session`   |
| Admin    | sessionStorage | `fusion_admin_pin`        |

Sessions are random UUIDs. Orders link to `sessionId` for status lookup.

---

## Firebase Storage

```
/delivery-proofs/{orderId}/{filename}
```

---

## Security Rules (MVP — tighten before production)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /menuItems/{itemId} {
      allow read: if true;
      allow write: if false; // seed via admin SDK only
    }
    match /orders/{orderId} {
      allow read: if true; // MVP: open read for runner queue + status
      allow create: if true;
      allow update: if true; // MVP: tighten with custom claims later
    }
    match /runners/{runnerId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

---

## Seed Data

Run `npm run seed` after configuring Firebase env vars to upload the 50-item menu to Firestore.

The homepage reads from static seed data (`src/data/menu-items.ts`) so the app works before Firebase is configured.
