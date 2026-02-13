import { webcrypto } from 'node:crypto';
import fs from 'fs';

async function generateIdentity() {
  const agentId = process.argv[2];
  if (!agentId) {
    console.error('Usage: node scripts/generate-agent-keys.mjs <agent-id>');
    process.exit(1);
  }

  console.log(`Generating RSA-PSS 2048-bit keypair for agent: ${agentId}...`);

  const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  // Export keys as JWK (JSON Web Key) - easiest format for Node/Web interop
  const privateJwk = await webcrypto.subtle.exportKey("jwk", privateKey);
  const publicJwk = await webcrypto.subtle.exportKey("jwk", publicKey);
  
  // Export public key as PEM for database storage/display (standard format)
  const publicSpki = await webcrypto.subtle.exportKey("spki", publicKey);
  const publicPem = `-----BEGIN PUBLIC KEY-----
${Buffer.from(publicSpki).toString('base64').match(/.{1,64}/g).join('
')}
-----END PUBLIC KEY-----`;

  console.log('
✅ Keys generated successfully!');

  console.log('
--- 1. REGISTER THIS IDENTITY (Admin Only) ---');
  console.log('Run this curl command to register the public key with DashClaw:');
  console.log(`
curl -X POST https://your-app.vercel.app/api/identities 
  -H "x-api-key: YOUR_ADMIN_KEY" 
  -H "Content-Type: application/json" 
  -d '{
    "agent_id": "${agentId}",
    "public_key": ${JSON.stringify(publicPem)},
    "algorithm": "RSASSA-PKCS1-v1_5"
  }'
`);

  console.log('
--- 2. CONFIGURE YOUR AGENT ---');
  console.log('Pass this Private Key to your DashClaw SDK constructor:');
  console.log('
// Option A: Env Var (Recommended)');
  console.log(`AGENT_PRIVATE_KEY='${JSON.stringify(privateJwk)}'`);
  
  console.log('
// Option B: Code (For testing)');
  console.log(`const privateKeyJwk = ${JSON.stringify(privateJwk, null, 2)};`);
  
  console.log(`
// Usage in Agent Code:
import { DashClaw } from 'dashclaw';
import { webcrypto } from 'node:crypto';

// Import the key
const keyData = JSON.parse(process.env.AGENT_PRIVATE_KEY);
const privateKey = await webcrypto.subtle.importKey(
  "jwk",
  keyData,
  { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
  false,
  ["sign"]
);

const claw = new DashClaw({
  ...,
  agentId: '${agentId}',
  privateKey: privateKey
});
`);
}

generateIdentity();
