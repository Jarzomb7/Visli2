# VISLI — License Server & Admin Panel

Production-ready license server for the VISLI WordPress booking plugin.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# 3. Push database schema + seed admin user
npm run db:setup

# 4. Start dev server
npm run dev
```

Open http://localhost:3000

**Default login:** `admin@visli.io` / `admin123`

> The admin user is also auto-created on first login attempt if no users exist.

## Deploy to Vercel

1. Push to GitHub
2. Import in [vercel.com/new](https://vercel.com/new)
3. Add environment variables:
   - `DATABASE_URL` — Your Neon/Supabase PostgreSQL connection string
   - `JWT_SECRET` — Random 32+ char string
4. Deploy (build command runs `prisma generate && prisma db push && next build` automatically)
5. After first deploy, run seed: `npx prisma db seed` or login will auto-create admin

## Database Setup (Neon)

1. Create free database at [neon.tech](https://neon.tech)
2. Copy the connection string
3. Set as `DATABASE_URL` in Vercel environment variables

## API

### POST /api/check-license
```json
{ "license_key": "VISLI-XXXX-XXXX-XXXX-XXXX", "domain": "example.com" }
```
Returns: `{ "status": "active" | "expired" | "invalid", "plan": "basic" | "pro" }`

### POST /api/auth/login
```json
{ "email": "admin@visli.io", "password": "admin123" }
```

### POST /api/auth/register
```json
{ "email": "new@user.com", "password": "password123" }
```

## WordPress Integration

```php
function visli_check_license($key) {
    $domain = parse_url(home_url(), PHP_URL_HOST);
    $response = wp_remote_post('https://your-app.vercel.app/api/check-license', [
        'headers' => ['Content-Type' => 'application/json'],
        'body' => json_encode(['license_key' => $key, 'domain' => $domain]),
    ]);
    return json_decode(wp_remote_retrieve_body($response), true);
}
```

## Stack

Next.js 14 · TypeScript · Tailwind CSS · Prisma · PostgreSQL · bcryptjs · jose (JWT)
