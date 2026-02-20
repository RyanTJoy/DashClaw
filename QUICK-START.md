# Quick Start Guide (No Coding Required!)

This guide will get you up and running in 5 minutes, even if you've never used a terminal before.

## What You Need

1. **A Computer** (Windows, Mac, or Linux)
2. **Node.js 20+** ([nodejs.org](https://nodejs.org/) — click the LTS button)
3. **5 Minutes**

That's it!

---

## Step 1: Download DashClaw

### Option A: Clone with Git

```bash
git clone https://github.com/ucsandman/DashClaw.git
cd DashClaw
```

### Option B: Download ZIP

1. Go to the [GitHub repo](https://github.com/ucsandman/DashClaw)
2. Click **Code** > **Download ZIP**
3. Extract to a folder and open a terminal there

---

## Step 2: Run Setup

One command does everything — database, secrets, dependencies, migrations, build:

```bash
node scripts/setup.mjs
```

Or use the platform installer (checks for Node.js first):

```bash
# Windows
./install-windows.bat

# Mac / Linux
bash ./install-mac.sh
```

The setup script will ask you:

1. **Database** — Docker (local), Neon (cloud), or paste any Postgres URL
2. **Deployment** — local only (`localhost:3000`) or cloud (Vercel, etc.)
3. Then it auto-generates secrets, installs deps, runs migrations, and builds

---

## Step 3: Set Your Admin Password (Recommended)

The easiest way to sign in is by setting a local admin password. This avoids the need to set up a GitHub or Google OAuth app.

1. Open your `.env.local` file (created by the setup script).
2. Add this line:
   ```
   DASHCLAW_LOCAL_ADMIN_PASSWORD=your-strong-password-here
   ```
3. Save the file. You can now sign in using this password on the login page.

---

## Step 4: Set Up OAuth (Optional — for inviting teams)

If you want to invite teammates later, you can set up an OAuth provider.

### GitHub OAuth

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: `DashClaw`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy the **Client ID** and **Client Secret**
5. Add to your `.env.local`:
   ```
   GITHUB_ID=your-client-id
   GITHUB_SECRET=your-client-secret
   ```

---

## Step 5: Start the Dashboard

```bash
npm run dev
```

Open `http://localhost:3000` — you'll be redirected to login. Sign in with your **Admin Password** or **GitHub** and you're in!

---

## Step 6: Deploy to Cloud (Optional — access from anywhere)

Want to check on your agents from your phone?

1. Re-run setup with cloud option: `node scripts/setup.mjs`
   - Choose **Cloud** deployment and enter your Vercel URL
   - It prints all the env vars you need
2. Push to GitHub and import into [Vercel](https://vercel.com)
3. Paste the env vars into Vercel's Settings → Environment Variables.
   - **Tip**: Set `DASHCLAW_LOCAL_ADMIN_PASSWORD` to sign in immediately without setting up GitHub OAuth.
4. Update your GitHub OAuth callback URL to use the Vercel domain (if using OAuth)
5. Deploy!

For the database, use [Neon](https://neon.tech) (free) — optimized for Vercel.

---

## Step 7: Import Your Agent (Optional)

Already have an AI agent with a workspace? Import everything into the dashboard:

```bash
# Preview what will be imported
node scripts/bootstrap-agent.mjs --dir "/path/to/agent" --agent-id "my-agent" --dry-run

# Push to local dashboard
node scripts/bootstrap-agent.mjs --dir "/path/to/agent" --agent-id "my-agent" --local

# Push to cloud dashboard
node scripts/bootstrap-agent.mjs --dir "/path/to/agent" --agent-id "my-agent" --base-url "https://your-app.vercel.app" --api-key "oc_live_..."
```

The scanner auto-discovers identity files, skills, tools, relationships, goals, memory, and more.

---

## Troubleshooting

### "node is not recognized"
Node.js isn't installed. Download it from [nodejs.org](https://nodejs.org/).

### "Cannot connect to database"
Double-check your connection string. For Docker, make sure Docker Desktop is running.

### Login page spins forever
Check that `NEXTAUTH_URL` matches your actual URL and that the GitHub OAuth callback URL is correct.

### "Port 3000 is already in use"
Another app is using that port. Close it, or add `PORT=3001` to `.env.local`.

---

## Getting Help

- **GitHub Issues:** [Report a bug](https://github.com/ucsandman/DashClaw/issues)
- **Documentation:** Check the `docs/` folder and `/docs` page on your deployment
- **Client Setup Guide:** See `docs/client-setup-guide.md` for the full reference

---

## What's Next?

Once your dashboard is running:

1. Follow the **onboarding checklist** on the dashboard
2. Install the SDK: `npm install dashclaw` (or `pip install dashclaw`)
3. Connect your agents using the connection snippet from setup
4. Start tracking your AI agent's activity!
