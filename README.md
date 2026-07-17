# Don't Bet On It 🪙

> **A risk-free, virtual social betting platform for squads.**
> Wager Betcoins with your crew on anything — no real money, ever.

Built with **Next.js 16**, **TypeScript**, **Upstash Redis**, and a **Premium Fintech** UI (deep hunter green + metallic gold, glassmorphism panels, pill-shaped buttons).

---

## 🌟 Features

| Feature | Description |
|---|---|
| **Virtual Economy** | Closed, zero-real-money economy. Every new user gets **100,000 Betcoins** on signup. |
| **Squad Crews** | Private betting lobbies joined via a unique 6-character invite code. |
| **Bet Cards** | Any member can post a question with a fixed wager amount and custom answer options. |
| **Custom Options** | Voters can add their own answer option when placing a wager. |
| **1-Bet Enforcement** | Database-level constraint prevents placing more than one bet per card. |
| **Wager Limit** | Users cannot wager more Betcoins than their current global balance. |
| **Leaderboard** | Real-time crew standings sortable by *Net Profit*, *Global Balance*, or *Win Rate*. |
| **Atomic Payouts** | Pot is split equally among winners. No winners → everyone is refunded. |
| **Admin Controls** | Crew admins can create bet cards, resolve outcomes, edit options, and promote members. |
| **Google SSO** | Sign in with Google OAuth 2.0, or register with username + password. |
| **Safe Account Deletion** | Profile page with a typed confirmation guard before permanent deletion. |
| **Mobile-First UI** | Fully responsive layout — compact single-row navbar, fluid panels, pill buttons. |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, API Routes) |
| Language | TypeScript 5 |
| Database | Upstash Redis (`@upstash/redis` REST client) |
| Auth | JWT session cookies via `jose` · Passwords hashed with `bcryptjs` · Google OAuth 2.0 |
| Styling | Vanilla CSS — glassmorphism, CSS custom properties, responsive media queries |
| Deployment | Vercel (edge-compatible, zero cold-start) |

---

## 📁 Project Structure

```
dont-bet-on-it/
├── public/                         # Static assets
├── scripts/
│   ├── test-db.js                  # Redis PING connection test
│   └── test-signup.ts              # Signup pipeline integration test
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── auth/               # login · signup · logout · me · google · delete-account
    │   │   └── crews/              # CRUD · join · bets · wager · resolve · promote
    │   ├── crew/[crewId]/          # Squad Lobby page
    │   ├── dashboard/              # Global dashboard (crews feed + balance)
    │   ├── profile/                # User profile & account settings
    │   ├── globals.css             # Design system (tokens, components, responsive rules)
    │   ├── layout.tsx              # Root HTML shell & metadata
    │   └── page.tsx                # Landing page & tabbed auth forms
    ├── components/
    │   └── layout/
    │       └── Navbar.tsx          # Shared authenticated navigation bar
    ├── constants/
    │   └── index.ts                # SESSION_COOKIE_NAME · STARTING_BALANCE · Redis KEYS
    ├── lib/
    │   ├── db/
    │   │   ├── users.ts            # User CRUD (create, read, delete)
    │   │   ├── crews.ts            # Crew CRUD, membership, leaderboard
    │   │   ├── bets.ts             # Bet CRUD, wager, resolve
    │   │   └── index.ts            # Barrel export
    │   ├── auth.ts                 # JWT sign/verify · session cookie helpers
    │   └── redis.ts                # Upstash Redis client singleton
    ├── types/
    │   ├── user.ts                 # User, SessionPayload
    │   ├── crew.ts                 # Crew, CrewMemberStats
    │   ├── bet.ts                  # BetCard
    │   └── index.ts                # Barrel export
    └── middleware.ts               # JWT route guard (protects /dashboard, /crew/*)
```

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/rkshthg/VC-AGY-DontBetOnIt.git
cd VC-AGY-DontBetOnIt
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```env
# Upstash Redis — https://console.upstash.com
UPSTASH_REDIS_REST_URL=https://your-database-id.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# JWT Session Secret — generate with: openssl rand -base64 32
JWT_SECRET=your_long_random_secret_here

# Google OAuth — https://console.cloud.google.com → APIs & Services → Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# App URL (used for OAuth callback resolution)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. (Optional) Verify Database Connection

```bash
# Test Redis connectivity
node scripts/test-db.js

# Test the full signup pipeline
npx tsx scripts/test-signup.ts
```

### 4. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚡ Production Deployment (Vercel)

1. **Connect to Vercel** — Import the GitHub repository at [vercel.com/new](https://vercel.com/new).
2. **Add Environment Variables** — Under **Settings → Environment Variables**, add all five keys from your `.env`.
3. **Configure Google OAuth Redirect** — In Google Cloud Console → Credentials → your OAuth 2.0 Client ID, add:
   - **Authorized JavaScript origins**: `https://your-domain.vercel.app`
   - **Authorized redirect URIs**: `https://your-domain.vercel.app/api/auth/google/callback`
4. **Deploy** — Vercel will build and deploy automatically on every push to `main`.

---

## 🔑 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Compile a production build |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint across the codebase |

---

## 🗺️ API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Log in (username/email + password) |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/auth/me` | Get the current authenticated user |
| `GET` | `/api/auth/google` | Initiate Google OAuth flow |
| `GET` | `/api/auth/google/callback` | OAuth callback handler |
| `POST` | `/api/auth/delete-account` | Permanently delete user & all data |

### Crews
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/crews` | List all crews for the current user |
| `POST` | `/api/crews` | Create a new crew |
| `POST` | `/api/crews/join` | Join a crew by invite code |
| `GET` | `/api/crews/[crewId]` | Get crew details, members, bets, leaderboard |
| `POST` | `/api/crews/[crewId]/promote` | Promote a member to admin |

### Bets
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/crews/[crewId]/bets` | List all bet cards for a crew |
| `POST` | `/api/crews/[crewId]/bets` | Create a new bet card (admin only) |
| `PATCH` | `/api/crews/[crewId]/bets/[betId]` | Edit bet card options (admin only) |
| `POST` | `/api/crews/[crewId]/bets/[betId]/wager` | Place a wager on a bet card |
| `POST` | `/api/crews/[crewId]/bets/[betId]/resolve` | Resolve a bet card (admin only) |

---

## 🎨 Design System

The UI uses a **Premium Fintech** aesthetic — a blend of the clean, accessible layouts of modern finance apps with the luxurious color palette of a high-end casino.

| Token | Value | Usage |
|---|---|---|
| `--bg-color` | `#0A1410` | Deep hunter green page background |
| `--gold-primary` | `#D4AF37` | Metallic gold — CTAs, highlights, icons |
| `--radius-lg` | `32px` | Heavily rounded panels (fintech style) |
| `--shadow-gold` | `0 12px 32px rgba(212,175,55,0.3)` | Soft gold glow on interactive elements |
| Buttons | `border-radius: 9999px` | Pill-shaped buttons |
| Panels | `backdrop-filter: blur(16px)` | Frosted glass effect |

---

## 📜 License

This project is for entertainment and educational purposes only. No real currency is involved.
