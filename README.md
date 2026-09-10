# Water Bottle League

Private monthly water bottle competition for flatmates. Members submit daily bottle counts; the admin approves them. Highest eligible **Strike Rate** wins a free dinner; last place pays 50% of the bill.

> Tracking game only — not medical advice. Do not force unsafe water intake. Bottle size is shown in-app (default 1 litre).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Firebase Authentication (email/password)
- Cloud Firestore + Security Rules
- Firebase Admin SDK (server API routes)
- Deploy: Vercel

## Features

- Member dashboard: submit today’s bottles, stats, strike rate, leaderboard
- Admin dashboard: approvals, members, eligibility, month lock, corrections, dinner calculator, audit log
- Server-calculated base points (capped), strike rate, bonuses, rankings
- Missing eligible days count as 0 toward strike rate
- ≥15 eligible days required for Winner / Last Place
- Firestore rules + API authorization (role not trusted from the client)

## Setup

### 1. Firebase

1. Create a Firebase project
2. Enable **Authentication → Email/Password**
3. Create a **Firestore** database
4. Register a **Web app** and copy the config
5. Project settings → Service accounts → Generate new private key
6. Deploy rules: `firebase deploy --only firestore:rules` (or paste `firestore.rules` in the console)

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_*` | Web app config |
| `ADMIN_EMAIL` / `NEXT_PUBLIC_ADMIN_EMAIL` | Exactly one admin (that email becomes admin) |
| `ADMIN_UID` | Optional; preferred if you already know the UID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key (keep `\n` escapes) |

**Admin bootstrap:** Register/login with the email set in `ADMIN_EMAIL`. Do not rely on “first user = admin”.

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Scoring tests (no Firebase)

```bash
npx tsx scripts/test-scoring.ts
```

## Deploy to Vercel

1. Push this repo to GitHub (`water-bottle-league`)
2. Import the project in Vercel
3. Add the same env vars from `.env.example`
4. Deploy

Or with CLI:

```bash
npx vercel
```

## Security notes

- Approvals, eligibility, points, strike rate, dinner, and audit writes go through **server API routes** using the Admin SDK
- Clients cannot update submission status or escalate `role` via Firestore rules
- Never commit `.env.local` or service account JSON

## Scoring quick reference

| Bottles | Base points |
|--------:|------------:|
| 0 | 0 |
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |
| 4 | 8 |
| 5 | 9 |
| 6+ | 10 (cap) |

**Strike Rate** = Approved base points ÷ (Eligible days × 10) × 100
