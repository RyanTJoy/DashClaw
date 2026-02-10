import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';

// Lazy-init Neon driver (same pattern as API routes)
let _sql;
function getSql() {
  if (!_sql) {
    const { neon } = require('@neondatabase/serverless');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async signIn({ user, account }) {
      try {
        const sql = getSql();
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
          const sql = getSql();
          const rows = await sql`
            SELECT id, org_id, role FROM users
            WHERE provider = ${account.provider}
              AND provider_account_id = ${account.providerAccountId}
            LIMIT 1
          `;
          if (rows.length > 0) {
            token.userId = rows[0].id;
            token.orgId = rows[0].org_id;
            token.role = rows[0].role;
          } else {
            token.orgId = 'org_default';
            token.role = 'member';
          }
        } catch (err) {
          console.error('[AUTH] jwt callback error:', err.message);
          token.orgId = 'org_default';
          token.role = 'member';
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId || null;
      session.user.orgId = token.orgId || 'org_default';
      session.user.role = token.role || 'member';
      return session;
    },
  },
};
