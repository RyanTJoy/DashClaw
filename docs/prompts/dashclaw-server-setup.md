# DashClaw: One-Clipboard Setup (Dashboard Server Machine)

You are helping a non-technical user self-host the DashClaw dashboard. The user wants the easiest path possible.

Rules:
- Do NOT ask the user to paste secrets into chat. If a secret must be entered, instruct them to paste it only into their terminal.
- Never exfiltrate `.env.local` contents.
- If you can run shell commands on the user's machine, do so. If you cannot, provide exact copy/paste commands for the user.

Goal:
- Get DashClaw running at `http://localhost:3000` (or the user's chosen host URL).
- Produce a short "Agent Connect" snippet the user can paste into any agent machine:
  - `DASHCLAW_BASE_URL=...`
  - `DASHCLAW_API_KEY=...`

## Step 0: Confirm Where We Are Installing

Ask the user:
1. Are we setting up the dashboard on THIS machine (the server host)?
2. Are we on Windows or Mac/Linux?

Proceed once confirmed.

## Step 1: Install Prereqs

Ensure:
- Node.js 20+
- npm 10+

If missing, instruct the user to install Node.js LTS from `https://nodejs.org`.

## Step 2: Get a Postgres Database (Pick One)

Option A (recommended): Neon (hosted Postgres)
- User creates a free Neon project and gets a `postgresql://...` connection string.

Option B: Local Postgres (Docker)
- Install Docker Desktop
- Run:
  - `docker compose up -d db`
- Use:
  - `DATABASE_URL=postgresql://dashclaw:dashclaw@localhost:5432/dashclaw`

## Step 3: Install DashClaw

In a new folder, the user runs:

```bash
git clone https://github.com/ucsandman/DashClaw.git
cd DashClaw
```

Fastest: run the installer (it writes `.env.local` and generates secrets):

Windows:
```bash
./install-windows.bat
```

Mac/Linux:
```bash
bash ./install-mac.sh
```

The installer will prompt for `DATABASE_URL` if `.env.local` doesn't exist.

## Step 4: Start the Dashboard

```bash
npm run dev
```

Open:
- `http://localhost:3000`

## Step 5: Capture The Two Values Agents Need

On the server machine, the generated `.env.local` contains:
- `DASHCLAW_API_KEY=...` (this is what agents use)
- `NEXTAUTH_URL=...` (this becomes the default `DASHCLAW_BASE_URL` for agents)

If you can run commands, print just those two values (do not print the whole file):
- Read `.env.local` and extract `NEXTAUTH_URL` and `DASHCLAW_API_KEY`.

Then produce this snippet for the user (fill in real values):

```bash
# Put these on each agent machine (NOT on the database host)
DASHCLAW_BASE_URL=http://localhost:3000
DASHCLAW_API_KEY=oc_live_...
```

## Step 6: Sanity Check (No Code)

From any machine that can reach the dashboard host:
- `GET {DASHCLAW_BASE_URL}/api/health` should return healthy JSON.

If the dashboard is deployed publicly:
- Ensure `DASHCLAW_API_KEY` is set on the server.
- Never expose `DATABASE_URL` to agents.

