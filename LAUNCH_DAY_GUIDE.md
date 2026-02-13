# 🎬 DashClaw Launch Day: The "Fresh Start" Setup Guide

This document is your step-by-step instructions for recording the DashClaw setup video. It is designed to be followed from a "blank slate" so your audience can see the entire onboarding and security flow.

---

## 🛠 Phase 0: The "Clean Slate" (Pre-Recording)
**Do these steps before you hit "Record" to ensure the app acts like it's brand new.**

1.  **Open VS Code** to the `DashClaw` folder.
2.  **Rename your config**: Right-click `.env.local` and rename it to `.env.backup`.
3.  **Create a Demo Folder**: On your Desktop, create a new folder named `my-demo-agent`.
4.  **Open two terminal windows**:
    *   Terminal 1: Inside `DashClaw`
    *   Terminal 2: Inside `my-demo-agent`

---

## 🚀 Phase 1: Launching the Brain (The Dashboard)
**Start Recording Now.**

1.  **Start the Server** (Terminal 1):
    ```bash
    npm run dev
    ```
2.  **Open Browser**: Go to `http://localhost:3000`.
3.  **Complete Onboarding**:
    *   Name your workspace (e.g., "Main Ops Hub").
    *   **🔑 THE ADMIN KEY**: When the key appears, copy it! Tell the audience: *"This is the master key our agents use to talk to DashClaw."*

---

## 🛡️ Phase 2: The Security Flex
**Show them the enterprise-grade safety features we built.**

1.  **Check Security Status**: Click "Security" in the sidebar. Show the "Security Score" starting low.
2.  **Generate Encryption Key** (Terminal 1):
    ```bash
    node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
    ```
3.  **Configure `.env.local`**: 
    *   Open the new (empty) `.env.local` file.
    *   Paste your `DATABASE_URL` (copy it from `.env.backup`).
    *   Add: `ENCRYPTION_KEY=your_generated_hex_here`
4.  **The Result**: Refresh the dashboard. **Watch the score jump to 100.** Tell the audience: *"Now all agent credentials are automatically encrypted at rest."*

---

## 🤖 Phase 3: Connecting an Agent (Live Coding)
**Show how easy it is to integrate with any agent.**

1.  **Initialize Agent Folder** (Terminal 2):
    ```bash
    npm init -y
    # Important: Open package.json and add "type": "module" so imports work!
    npm install dashclaw
    ```
2.  **Create `index.js`**: Create the file and paste this code:

```javascript
import { DashClaw } from 'dashclaw';

const agent = new DashClaw({
  baseUrl: 'http://localhost:3000',
  apiKey: 'PASTE_YOUR_KEY_HERE', // Use the key from Phase 1
  agentId: 'video-demo-001',
  agentName: 'Demo Assistant'
});

async function run() {
  console.log("🚀 Agent reporting for duty...");

  // 1. Normal Tracking
  await agent.track({
    action_type: 'research',
    declared_goal: 'Analyze market trends',
    risk_score: 10
  }, async () => {
    return "Market analysis complete.";
  });

  // 2. High Risk Alert
  await agent.createAction({
    action_type: 'deploy',
    declared_goal: 'Wiping the production server',
    risk_score: 98, // This triggers the alarm
    reversible: false
  });
}
run();
```

---

## 🎯 Phase 4: The Payload
**Show the data flowing live.**

1.  **Run it** (Terminal 2): `node index.js`
2.  **Switch to Dashboard**:
    *   Show the **Dashboard** tab updating with the "Research" action.
    *   Show the **Security** tab lighting up with a **Red Alert** for the "Wiping the server" action.
3.  **Conclusion**: *"And just like that, we have full oversight, security, and an audit trail for our AI."*

---

**You're ready. Good luck with the video! 🎬🚀**
