import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// Lazy-init Neon driver (same pattern as API routes)
let _sql;
function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('DATABASE_URL is not set in production. Auth failed.');
      }
      console.warn('[AUTH] DATABASE_URL is not set. Using mock SQL driver.');
      // Return a dummy driver that returns empty arrays or safely ignores writes
      return async (strings, ...values) => {
        console.warn('[AUTH] Mock SQL executed:', strings[0]);
        return [];
      };
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

function isLocalhostNextAuthUrl() {
  const raw = String(process.env.NEXTAUTH_URL || '').trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function canUseLocalDevLogin() {
  // Local-only escape hatch so self-hosters can use the dashboard without setting up OAuth apps.
  // Guardrails:
  // - only enabled when NEXTAUTH_URL points at localhost/127.0.0.1
  // - default enabled in dev; opt-in via DASHCLAW_LOCAL_LOGIN=true for production-mode localhost runs
  const localLogin = String(process.env.DASHCLAW_LOCAL_LOGIN || '').toLowerCase() === 'true';
  const devDefault = process.env.NODE_ENV === 'development';
  return isLocalhostNextAuthUrl() && (devDefault || localLogin);
}

function buildProviders() {
  const providers = [];

  // Only register real OAuth providers when properly configured.
  if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
    providers.push(
      GitHubProvider({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
      })
    );
  }

  if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_ID,
        clientSecret: process.env.GOOGLE_SECRET,
      })
    );
  }

  if (canUseLocalDevLogin()) {
    providers.push(
      CredentialsProvider({
        id: 'local-dev',
        name: 'Local Dev',
        credentials: {},
        async authorize() {
          // No password: this is intentionally a localhost-only convenience.
          return {
            id: 'usr_local_dev',
            name: 'Local Dev Admin',
            email: 'local-dev@dashclaw.local',
          };
        },
      })
    );
  }

  return providers;
}

export const authOptions = {
  providers: buildProviders(),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async signIn({ user, account }) {
      try {
        // Local dev login: no OAuth setup; treat as org_default admin.
        if (account?.provider === 'local-dev') return true;

        const sql = getSql();
        // If mock driver, skip logic
        if (!process.env.DATABASE_URL) return true;

        const now = new Date().toISOString();

        // Upsert user on every login
        const existing = await sql`
          SELECT id, org_id, role FROM users
          WHERE provider = ${account.provider}
            AND provider_account_id = ${account.providerAccountId}
          LIMIT 1
        `;

        if (existing.length > 0) {
          // Update last login + profile info
          await sql`
            UPDATE users
            SET last_login_at = ${now},
                name = ${user.name || null},
                image = ${user.image || null},
                email = ${user.email || ''}
            WHERE id = ${existing[0].id}
          `;
        } else {
          // Create new user mapped to org_default
          const userId = `usr_${crypto.randomUUID()}`;
          await sql`
            INSERT INTO users (id, org_id, email, name, image, provider, provider_account_id, role, created_at, last_login_at)
            VALUES (${userId}, 'org_default', ${user.email || ''}, ${user.name || null}, ${user.image || null}, ${account.provider}, ${account.providerAccountId}, 'member', ${now}, ${now})
          `;
        }
        return true;
      } catch (err) {
        console.error('[AUTH] signIn callback error:', err.message);
        // Allow sign-in even if DB upsert fails (graceful degradation)
        return true;
      }
    },

    async jwt({ token, account }) {
      // On initial sign-in, attach org info from DB
      if (account) {
        try {
          // Local dev login: mint a minimal trusted session without requiring OAuth apps.
          if (account.provider === 'local-dev') {
            token.userId = 'usr_local_dev';
            token.orgId = 'org_default';
            token.role = 'admin';
            token.plan = 'pro';
            token.orgRefreshedAt = Date.now();
            return token;
          }

          if (!process.env.DATABASE_URL) throw new Error('No DB');
          
          const sql = getSql();
          const rows = await sql`
            SELECT u.id, u.org_id, u.role, COALESCE(o.plan, 'free') AS plan
            FROM users u
            LEFT JOIN organizations o ON o.id = u.org_id
            WHERE u.provider = ${account.provider}
              AND u.provider_account_id = ${account.providerAccountId}
            LIMIT 1
          `;
          if (rows.length > 0) {
            token.userId = rows[0].id;
            token.orgId = rows[0].org_id;
            token.role = rows[0].role;
            token.plan = rows[0].plan;
          } else {
            token.orgId = 'org_default';
            token.role = 'member';
            token.plan = 'free';
          }
        } catch (err) {
          if (err.message !== 'No DB') console.error('[AUTH] jwt callback error:', err.message);
          token.orgId = 'org_default';
          token.role = 'member';
          token.plan = 'free';
        }
        token.orgRefreshedAt = Date.now();
      } else if (token.userId) {
        // Periodically re-query user's org so session picks up changes (e.g. after workspace creation)
        const age = Date.now() - (token.orgRefreshedAt || 0);
        if (age > 5 * 60 * 1000) {
          try {
            if (!process.env.DATABASE_URL) throw new Error('No DB');
            const sql = getSql();
            const rows = await sql`
              SELECT u.org_id, u.role, COALESCE(o.plan, 'free') AS plan
              FROM users u
              LEFT JOIN organizations o ON o.id = u.org_id
              WHERE u.id = ${token.userId} LIMIT 1
            `;
            if (rows.length > 0) {
              token.orgId = rows[0].org_id;
              token.role = rows[0].role;
              token.plan = rows[0].plan;
            }
          } catch (err) {
             if (err.message !== 'No DB') console.error('[AUTH] jwt refresh error:', err.message);
          }
          token.orgRefreshedAt = Date.now();
        }
      }
      return token;
    },


    async session({ session, token }) {
      session.user.id = token.userId || null;
      session.user.orgId = token.orgId || 'org_default';
      session.user.role = token.role || 'member';
      session.user.plan = token.plan || 'free';
      return session;
    },
  },
};
