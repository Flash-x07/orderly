# Orderly — Subscription Architecture

## Overview

Subscription logic is now **fully centralised** and flows through a clean
middleware chain.  No limits or feature flags are hardcoded in controllers.

---

## File Map

```
backend/
├── config/
│   └── plans.js                     ← Single source of truth for all plans
│
├── middleware/
│   ├── auth.js                      ← (unchanged) JWT auth + role guards
│   ├── loadSubscription.js          ← NEW: resolve plan, auto-expire, attach req.planConfig
│   ├── checkTableLimit.js           ← NEW: enforce per-plan table cap
│   ├── requireFeature.js            ← NEW: lock premium features
│   └── requireActiveSubscription.js ← NEW: require any paid plan
│
├── utils/
│   └── subscriptionHelpers.js       ← Pure helpers: date math, update builders, formatters
│
├── controllers/
│   └── subscriptionController.js    ← Refactored: thin, delegates to helpers
│
└── routes/
    ├── subscription.js              ← Refactored: + POST /upgrade endpoint
    ├── tables.js                    ← Refactored: uses new middleware chain
    └── analytics.js                 ← Example: shows requireFeature usage
```

---

## Plan Configuration (`config/plans.js`)

All plan definitions live in one object:

```js
const PLANS = {
  free:    { tableLimit: 3,    features: { analytics: false, qrCodeGeneration: false, ... } },
  pro:     { tableLimit: 20,   features: { analytics: false, qrCodeGeneration: true,  ... } },
  premium: { tableLimit: null, features: { analytics: true,  qrCodeGeneration: true,  ... } },
};
```

**To add a new plan** — add one entry here.  Nothing else changes.
**To change a table limit** — change one number here.  Enforced everywhere automatically.

---

## Middleware Chain

Every protected route that needs plan enforcement follows this pattern:

```
protect → loadSubscription → [requireFeature / checkTableLimit] → controller
```

### `loadSubscription`
- Auto-expires subscriptions past their `subscriptionExpiresAt`
- Resolves the effective plan (expired/pending/none → `free`)
- Attaches `req.planConfig` and `req.effectivePlan` for downstream use
- Admins get `premium` config automatically

### `checkTableLimit`
- Reads `req.planConfig.tableLimit` (set by loadSubscription)
- Counts active tables for the restaurant
- Returns `TABLE_LIMIT_REACHED` 403 if limit exceeded

### `requireFeature(featureName)`
- Reads `req.planConfig.features[featureName]`
- Returns `FEATURE_LOCKED` 403 if the feature is not in the plan
- Automatically suggests which plan to upgrade to

### `requireActiveSubscription`
- Blocks routes that require any paid plan (status must be `active`)
- Returns `SUBSCRIPTION_REQUIRED` 403 for free/expired/pending users

---

## Error Response Format

All subscription errors return consistent JSON:

```json
// Table limit reached
{
  "success": false,
  "code": "TABLE_LIMIT_REACHED",
  "message": "You have reached the maximum number of tables (20) for the Pro plan.",
  "currentPlan": "pro",
  "tableLimit": 20,
  "upgradeTo": "premium"
}

// Feature locked
{
  "success": false,
  "code": "FEATURE_LOCKED",
  "message": "\"Analytics\" is not available on the Pro plan.",
  "feature": "analytics",
  "currentPlan": "pro",
  "upgradeTo": "premium"
}

// Subscription required
{
  "success": false,
  "code": "SUBSCRIPTION_REQUIRED",
  "message": "An active subscription is required to access this feature.",
  "currentPlan": "free",
  "subscriptionStatus": "expired",
  "upgradeTo": "pro"
}
```

---

## Subscription Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/subscription/request` | Submit approval-flow request |
| `POST` | `/api/subscription/upgrade` | Instant self-serve upgrade (post-payment) |
| `GET`  | `/api/subscription/status`  | Current subscription info |
| `POST` | `/api/subscription/cancel`  | Cancel → downgrades to Free |
| `GET`  | `/api/subscription/admin/requests` | Admin: list all requests |
| `PATCH`| `/api/subscription/admin/requests/:id/approve` | Admin: approve |
| `PATCH`| `/api/subscription/admin/requests/:id/reject`  | Admin: reject |

---

## Table Generation Flow

```
POST /api/tables/:restaurantId/generate
  │
  ├─ protect                        → must be logged in
  ├─ loadSubscription               → resolve plan, auto-expire
  ├─ requireFeature('qrCodeGeneration') → block Free plan (Pro+ only)
  ├─ checkTableLimit                → enforce 3/20/∞ cap
  └─ generateTables                 → controller
```

---

## How to Protect a New Feature

1. Add the feature flag to `config/plans.js` for each plan.
2. Add `requireFeature('yourFeatureName')` to the route.

That's it. No controller changes needed.

```js
// Example: adding a "reservations" feature
// 1. In config/plans.js:
//    pro:     { features: { reservations: true  } }
//    free:    { features: { reservations: false } }

// 2. In your route:
router.get(
  '/reservations',
  protect,
  loadSubscription,
  requireFeature('reservations'),
  getReservations
);
```
