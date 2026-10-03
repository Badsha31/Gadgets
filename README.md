# NEXORA TECH — Premium Multi-Layer Commerce Website

Premium 2026-style technology store + Nexora Web services website.

## Included
- Multi-page public site: Home, Shop, Product detail, Services, Packages, Portfolio, Reviews, About, Contact, Cart, Checkout, Search, PC Builder, Privacy and Terms.
- E-commerce flow with cart, quantity controls, checkout and server-side order persistence.
- Product search, category filtering, price sorting and compare.
- Customer review section with continuous horizontal carousel behavior.
- Contact Agent menu for Call, WhatsApp and Messenger.
- NEXORA AI-style assistant with English, Bangla and Banglish-oriented responses and an integration-ready API route.
- Separate admin panel with authentication, dashboard and CRUD for products, services, packages, reviews and portfolio.
- Website settings editor including brand, hero copy/image, contact details, social links, maker and sponsor text.
- Server-side input validation, rate-limiting backstop, secure headers, signed admin session cookies and environment-based credentials.
- Persistent JSON data layer in data/site.json. The API and normalization layer are isolated in server.js for a later SQLite/Postgres migration.

## Run
npm install
npm start

## Admin credentials
Set:
ADMIN_USER=admin
ADMIN_PASSWORD_HASH=<salt>$<scrypt-hash>
SESSION_SECRET=<long-random-secret>

ADMIN_PASSWORD is also supported for local development, but ADMIN_PASSWORD_HASH is recommended.

Generate a hash:
node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');const h=c.scryptSync(process.argv[1],s,64).toString('hex');console.log(s+'$'+h)" "your-strong-password"

Never put admin credentials in frontend code.

## Deployment
The app is a plain Node.js HTTP server and works on Node 20+ hosts. Keep data/site.json on persistent storage. For an ephemeral platform, move the same API layer to a managed database.

## Branding
Made by NEXORA WEB
Sponsored by NEXORA WEB

Final commercial launch should replace demo Unsplash assets and example.com portfolio URLs with your real assets and links.


## Cloudflare Workers deployment

This repository now includes a Worker entrypoint (worker.js), Wrangler config (wrangler.jsonc) and a database-free Cloudflare storefront under public/.

Workers Builds settings:
- Repository: Badsha31/Gadgets-
- Branch: main
- Root directory: /
- Build command: leave empty
- Deploy command: npx wrangler deploy worker.js --assets ./public/

The existing server.js + secure persistent admin remains available for Node.js hosting. The Cloudflare storefront uses static assets and browser-side cart state; persistent Cloudflare admin editing needs a storage binding such as KV or D1.
