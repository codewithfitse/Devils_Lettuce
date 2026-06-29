# Devil's Lettuce 🥬

Multi-vendor fruit marketplace for Addis Ababa. Users order via the website or Telegram bot; merchants manage products and orders; super admins validate Telebirr payments.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Bot | Telegraf (Telegram) |
| Storage | Cloudinary |

## Project Structure

```
├── backend/          # Express API + Telegram bot
│   └── src/
│       ├── models/       # User, Product, Order, Payment
│       ├── middleware/   # Auth, RBAC, upload
│       ├── services/     # Business logic
│       ├── controllers/  # Route handlers
│       ├── routes/       # API endpoints
│       └── bot/          # Telegraf bot
├── frontend/         # React SPA
│   └── src/
│       ├── pages/        # User, admin, merchant, driver
│       ├── components/
│       └── contexts/     # Auth + Cart
└── docker-compose.yml
```

## Quick Start

### 1. Start MongoDB

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # edit with your keys
npm install
npm run dev
```

### 3. Seed Super Admin

```bash
npm run seed
# Default: admin@devilslettuce.com / admin123456
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Order Flow

```
pending → accepted → payment_pending → paid
                                         ↓
                          admin releases → available_for_delivery
                                         ↓
                               driver claims (assigned)
                                         ↓
                                    delivering → completed

Merchant can also "deliver self" from paid (skips the pool).
```

- Multi-merchant carts split into separate orders
- User pays only for accepted orders
- One Telebirr payment can cover multiple orders
- Payments expire after 24 hours

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/telegram` | Telegram auth |
| GET | `/api/products` | Browse products |
| POST | `/api/orders` | Create order(s) |
| PATCH | `/api/orders/:id/accept` | Merchant accepts |
| POST | `/api/payments` | Upload payment proof |
| PATCH | `/api/payments/:id/approve` | Admin approves |
| PATCH | `/api/delivery/:orderId/start` | Start delivery |

## Roles

| Role | Capabilities |
|------|-------------|
| **Super Admin** | Full system access — all orders (including every sub-admin's), payments, users, driver assignment |
| **Sub Admin** | Merchant + driver panels only; manages **own** products/orders; cannot access admin routes or other sub-admins' work |
| **Merchant** | Add products, manage own orders |
| **Driver** | Deliver assigned orders |
| **User** | Browse, order, pay |

## Telegram Bot

Set `TELEGRAM_BOT_TOKEN` in `.env`. The bot supports:

- English / Amharic language selection
- Browse products & cart
- Checkout with zone-based delivery
- Payment proof upload
- Order status tracking

## Environment Variables

See `backend/.env.example` for all required variables:

- `MONGODB_URI`, `JWT_SECRET`
- `CLOUDINARY_*` (image uploads)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`

## License

MIT
