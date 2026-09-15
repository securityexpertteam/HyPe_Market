# Hype Marketplace

Expo React Native storefront plus Express/MongoDB API. It includes buyer and seller flows, JWT authentication, inventory endpoints, stock-aware dummy checkout, and order emails.

## Start locally

1. Create a free MongoDB Atlas database and allow your development IP under **Network Access**.
2. Copy `server/.env.example` to `server/.env`, then set `MONGODB_URI` and a long random `JWT_SECRET`. SMTP variables are optional; without them the app simply skips email delivery.
3. Run `npm install` from the repository root.
4. Start the API: `npm run dev:server`.
5. In a second terminal start Expo: `npm run dev:mobile`. For an Android emulator, the demo API base URL is already `http://10.0.2.2:4000/api`. Change `API` in `mobile/App.tsx` to your computer's LAN IP for Expo Go on a physical device.

The API creates demo inventory on first startup. Seller demo credentials are `seller@hype.local` / `Seller123!`; change or remove them before any public deployment.

## API surface

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/products`, `GET /api/products/:id`
- Seller-only: `POST|PATCH|DELETE /api/products/:id`, `GET /api/seller/products`
- Buyer: `POST /api/orders`, `GET /api/orders`

Send the access token using `Authorization: Bearer <token>`. The mobile UI currently has a local demo sign-in state; use the API routes above to wire it to a persistent account provider when moving beyond the demo.

## Deploy safely

Deploy `server` to Render with its Dockerfile and configure the same environment variables in Render. Keep images in Cloudinary/S3 rather than local storage—Render free instances are stateless. Render terminates TLS; set `CLIENT_ORIGIN` to the trusted deployed client origin. `helmet`, request-size limits, Joi input validation, bcrypt, JWT role authorization, and rate limiting are configured in the API.

MongoDB Atlas M0 and Render free tiers are suitable for a demo only, not the stated 10k concurrent-user target. That requires load testing, a horizontally scalable compute tier, Redis-backed distributed rate limiting/cache, and a paid Atlas cluster with appropriate connection-pool and index design.
