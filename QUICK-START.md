# Quick Start Guide (No Coding Required!)

This guide will get you up and running in 5 minutes, even if you've never used a terminal before.

## What You Need

1. **A Computer** (Windows, Mac, or Linux)
2. **Internet Connection**
3. **5 Minutes**

That's it!

---

## Step 1: Install Node.js (One-Time Setup)

Node.js is what runs the dashboard. If you don't have it:

1. Go to **[nodejs.org](https://nodejs.org/)**
2. Click the big green **"LTS"** button
3. Run the installer (just click Next > Next > Finish)
4. Restart your computer

**How to check if it worked:**
- Open Command Prompt (Windows) or Terminal (Mac)
- Type `node --version` and press Enter
- You should see a version number like `v20.x.x`

---

## Step 2: Get a Database (Where DashClaw Stores Data)

DashClaw is self-hosted (you run it). You bring the database.

### Option A: Free Neon Database (Recommended)

Neon gives you a free hosted Postgres database:

1. Go to **[neon.tech](https://neon.tech/)**
2. Click **"Start Free"** and create an account (GitHub login works!)
3. Create a new project (any name is fine)
4. On your project page, find the **Connection String**
5. Copy it - it looks like: `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb`

**Keep this safe - you'll need it in the next step!**

### Option B: Local Postgres (Docker)

If you already have Docker Desktop installed, you can run Postgres locally:

```bash
docker compose up -d db
```

Then use:

```bash
DATABASE_URL=postgresql://dashclaw:dashclaw@localhost:5432/dashclaw
```

---

## Step 3: Download & Install

### Fastest path (recommended)

Run the installer for your platform. It will:
- ask for your `DATABASE_URL` (from Neon or local Postgres)
- generate `NEXTAUTH_SECRET`, `DASHCLAW_API_KEY`, and `ENCRYPTION_KEY`
- write `.env.local`

Note: to access the real dashboard UI at `/dashboard`, you must also configure at least one OAuth provider (GitHub and/or Google) and add its credentials to `.env.local`.

OAuth callback URIs for local dev:

- `http://localhost:3000/api/auth/callback/github`
- `http://localhost:3000/api/auth/callback/google`

If you see "redirect_uri is not associated with this application", your OAuth app is missing the callback URL above.

### Windows

```bash
./install-windows.bat
```

### Mac / Linux

```bash
bash ./install-mac.sh
```

---

### Option A: Clone with Git

```bash
git clone git@github.com:ucsandman/DashClaw.git
cd DashClaw
```

### Option B: Download ZIP

1. Go to the [GitHub repo](https://github.com/ucsandman/DashClaw)
2. Click **Code** > **Download ZIP**
3. Extract to a folder (Desktop, Documents, etc.)

### Configure

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your `DATABASE_URL` to the connection string from Step 2.

### Install & Run

```bash
npm install
# Optional: Enable Behavioral AI (requires pgvector + OpenAI Key)
npm run migrate:behavioral
npm run dev
```

---

## Step 4: Deploy to Cloud (Optional)

Want it running 24/7 without leaving your computer on?

1. Click the **Deploy with Vercel** button in the README
2. Connect your GitHub account
3. Set your environment variables (`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`)
4. **Set `DASHCLAW_API_KEY`** to protect your data
5. Done! You get a free URL like `your-dashboard.vercel.app`

**Security note:**
- **Local development**: set `DASHCLAW_API_KEY` so agents/tools can authenticate consistently.
- **Production/public deployment**: you must set `DASHCLAW_API_KEY` or the `/api/*` surface will be disabled (fail-closed with `503`).

---

## Step 5: Start the Dashboard

After installation, open:

- Customer site: `http://localhost:3000/`
- Dashboard (real data): `http://localhost:3000/dashboard`
- Demo sandbox (fake data, no login): `http://localhost:3000/demo`

The onboarding checklist will guide you through:
1. Creating a workspace
2. Generating an API key
3. Installing the SDK
4. Sending your first action

---

## Troubleshooting

### "node is not recognized"
Node.js isn't installed. Go back to Step 1.

### "Cannot connect to database"
Double-check your connection string. Make sure you copied the whole thing.

### "Port 3000 is already in use"
Another app is using that port. Close it, or edit `.env.local` and add `PORT=3001`

### The page is blank or shows errors
Try refreshing. If that doesn't work, check that your database URL is correct in `.env.local`

---

## Getting Help

- **GitHub Issues:** [Report a bug](https://github.com/ucsandman/DashClaw/issues)
- **Documentation:** Check the `docs/` folder and `/docs` page on your deployment
- **Client Setup Guide:** See `docs/client-setup-guide.md` for the full reference

---

## What's Next?

Once your dashboard is running:

1. Follow the **onboarding checklist** on the dashboard
2. Install the SDK: `npm install dashclaw`
3. Configure your **Integrations** (API keys, etc.)
4. Start tracking your AI agent's activity!
