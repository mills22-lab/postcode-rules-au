# Postcode Rules AU

A Shopify app for Australian merchants that enforces postcode and address rules at checkout using Shopify Functions.

## What it does

- **Block PO Boxes** — prevents checkout with PO Box, Locked Bag, GPO Box, Private Bag addresses
- **Block states/territories** — stop delivery to specific Australian states
- **Block postcodes** — block individual postcodes or ranges (e.g. `0800-0899`)
- **Biosecurity / quarantine** — tag products with `quarantine:WA` etc. to block them from those states
- **Remote area shipping** — hide specific shipping rates for remote postcode ranges
- **Metro-only rates** — hide metro-specific rates outside metropolitan postcodes

## Setup

### Prerequisites

- Node.js 20+
- Shopify CLI: `npm install -g @shopify/cli`
- Shopify Partner account at [partners.shopify.com](https://partners.shopify.com)
- A development store

### Steps

1. **Clone and install**
   ```bash
   git clone <repo>
   cd postcode-rules-au
   npm install
   ```

2. **Copy environment file**
   ```bash
   cp .env.example .env
   # Fill in SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL
   ```

3. **Set up the database**
   ```bash
   npx prisma migrate dev
   ```

4. **Link to your Partner app**
   ```bash
   shopify app config link
   ```
   This fills in `client_id` in `shopify.app.toml`.

5. **Run locally**
   ```bash
   shopify app dev
   ```

6. **Deploy functions**
   ```bash
   shopify app deploy
   ```
   This compiles the two Shopify Functions and registers them. Do this at least once before testing the app UI.

## Project structure

```
postcode-rules-au/
├── shared/
│   └── au-rules.js              # Shared rule engine (copy of this lives in each extension)
├── extensions/
│   ├── postcode-validation/     # cart.validations.generate.run function
│   └── postcode-delivery/       # cart.delivery-options.transform.run function
├── app/
│   ├── lib/
│   │   ├── au-rules.js          # Copy of shared rules (auto-synced)
│   │   └── rules-config.server.ts
│   ├── routes/
│   │   ├── app._index.tsx       # Admin settings UI
│   │   ├── app.help.tsx         # Help page
│   │   ├── app.tsx              # App shell
│   │   ├── webhooks.app.uninstalled.tsx
│   │   └── webhooks.compliance.tsx
│   ├── db.server.ts
│   └── shopify.server.ts
├── prisma/
│   └── schema.prisma
├── scripts/
│   └── sync-shared.js           # Copy shared/au-rules.js to all locations
└── shopify.app.toml
```

## Keeping au-rules.js in sync

The shared rule engine lives in `shared/au-rules.js`. Each extension has its own copy. After editing the shared file run:

```bash
npm run sync-shared
```

## Billing

US$7/month with a 7-day free trial. Set `BILLING_TEST=false` in `.env` for production billing.

## Deployment

Host the Node server anywhere that supports persistent processes:
- **Hetzner VPS** with pm2 (recommended for cost)
- **Fly.io** or **Railway** (easy zero-devops)

Set `SHOPIFY_APP_URL` to your production URL and run `shopify app deploy` to update function registrations.

## Shopify App Store

After testing on a dev store, submit via the Partner Dashboard → Apps → [your app] → Distribution → Submit for review.
