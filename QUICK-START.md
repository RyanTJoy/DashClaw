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

## Step 2: Get a Free Database

Your dashboard needs somewhere to store data. Neon gives you a free database:

1. Go to **[neon.tech](https://neon.tech/)**
2. Click **"Start Free"** and create an account (GitHub login works!)
3. Create a new project (any name is fine)
4. On your project page, find the **Connection String**
5. Copy it - it looks like: `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb`

**Keep this safe - you'll need it in the next step!**

---

## Step 3: Download & Install

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
- **Local-only**: you can run without `DASHCLAW_API_KEY`
- **Public deployment**: set `DASHCLAW_API_KEY` or your `/api/*` data may be readable by anyone

---

## Step 5: Start the Dashboard

After installation, open http://localhost:3000

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

- **GitHub Issues:** [Report a bug](../../issues)
- **Documentation:** Check the `docs/` folder and `/docs` page on your deployment
- **Client Setup Guide:** See `docs/client-setup-guide.md` for the full reference

---

## What's Next?

Once your dashboard is running:

1. Follow the **onboarding checklist** on the dashboard
2. Install the SDK: `npm install dashclaw`
3. Configure your **Integrations** (API keys, etc.)
4. Start tracking your AI agent's activity!
