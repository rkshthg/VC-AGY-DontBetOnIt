# Don't Bet On It | Risk-Free Social Betting Platform

**Don't Bet On It** is a web-based, risk-free social betting platform designed for friends, coworkers, and online communities to prediction-wager on custom topics using a strictly virtual currency named **Betcoin**. 

This application is built with **Next.js 16 (App Router)**, styled with responsive **Vanilla CSS**, and backed by **Upstash Redis** for fast, edge-compatible atomic database operations. The platform is optimized for seamless deployment to **Vercel**.

---

## 🌟 Key Features

* **Strictly Virtual Economy**: The application is closed and uses **Betcoin** for entertainment wagers. No real money integration, gateways, or transactions are supported.
* **Welcome Bonus**: Upon registration, every user is automatically credited with **100,000 Betcoins** to start playing.
* **Squad "Crews"**: Private betting groups identified by a unique, shareable invite code. Admins can promote other members to admins.
* **Lobby Betting Cards**: Members can post questions with fixed wager amounts.
* **User-Generated Custom Options**: Voters are not limited to default options; they can type in a custom choice, add it to the card, and cast their vote immediately.
* **Fixed-Wager Constraints**: Enforces a strict **1-bet-per-user-per-card** limit at the database level.
* **Standings Leaderboard**: Real-time crew standings sortable by *Net Profit* (Betcoins won minus Betcoins wagered), *Global Balance*, or *Win-Rate*.
* **Atomic Payouts**: Admins declare the winning outcome. Payouts are split equally among winners. If nobody wagers on the winning option, the wagers are refunded.
* **Exclusive Visual Theme**: Premium, responsive **Dark Brown and Gold** user interface featuring a radial background, custom scrollbars, and glowing indicators.

---

## 🛠️ Tech Stack

* **Framework**: Next.js 16 (App Router, Server Actions, API routes)
* **Language**: TypeScript
* **Database**: Upstash Redis (accessed via edge-compatible REST `@upstash/redis` client)
* **Security & JWT**: Edge-compatible JSON Web Token session cookies via `jose` and passwords hashed with `bcryptjs`.
* **Styling**: Vanilla CSS (Global variables, glassmorphism card panels, and neon elements).

---

## 🚀 Setup & Installation

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd DontBetOnIt
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Upstash Redis Credentials (from https://console.upstash.com)
UPSTASH_REDIS_REST_URL=https://your-database-id.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# JWT Session Secret
JWT_SECRET=generate_a_long_random_string_here

# Google OAuth Credentials (for Google SSO Login)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Local Development App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Database Connectivity Tests
```bash
# Verify connection to your Upstash Redis database
node scripts/test-db.js

# Verify the user registration database pipeline
npx tsx scripts/test-signup.ts
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## ⚡ Production Deployment (Vercel)

1. **Deploy to Vercel**: Connect your GitHub repository to Vercel and import the project.
2. **Add Environment Variables**: Under Project **Settings** &rarr; **Environment Variables**, add:
   * `UPSTASH_REDIS_REST_URL`
   * `UPSTASH_REDIS_REST_TOKEN`
   * `JWT_SECRET` (generate a unique production key)
   * `GOOGLE_CLIENT_ID`
   * `GOOGLE_CLIENT_SECRET`
   * `NEXT_PUBLIC_APP_URL` (set to your Vercel deployment domain: `https://your-domain.vercel.app`)
3. **Configure Google Cloud Console OAuth**:
   Under APIs & Services &rarr; Credentials &rarr; OAuth 2.0 Web Client ID, configure:
   * **Authorized JavaScript origins**: `https://your-domain.vercel.app`
   * **Authorized redirect URIs**: `https://your-domain.vercel.app/api/auth/google/callback`

---

## 📁 Repository Structure

```text
├── src/
│   ├── app/
│   │   ├── api/             # REST endpoints (auth, crews, bets wagers)
│   │   ├── crew/            # Individual Squad Lobby page
│   │   ├── dashboard/       # Global Crews feed & balance dashboard
│   │   ├── globals.css      # Core Dark Brown & Gold visual design system
│   │   ├── layout.tsx       # Main HTML structure and metadata
│   │   └── page.tsx         # Landing page and tabbed signup/login forms
│   ├── lib/
│   │   ├── auth.ts          # Edge-compatible JWT session cookie managers
│   │   ├── db.ts            # Atomic database actions & Redis schema mapping
│   │   └── redis.ts         # Upstash Redis client initialization
│   └── middleware.ts        # Route guard checking authentication state
├── scripts/
│   ├── test-db.js           # Redis PING & connection unit test
│   └── test-signup.ts       # Database signup transaction validator
```
