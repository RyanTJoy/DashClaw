# Security Checklist

Quick reference for secure development and deployment.

---

## 🚨 Before First Commit

### 1. Set Up .gitignore FIRST

```bash
# Create .gitignore BEFORE creating any files
cat > .gitignore << 'EOF'
# Environment files - NEVER commit
.env
.env.*
.env.local
*.env

# Secrets folder
secrets/
*secret*
*.key
*.pem

# Database files
*.db
*.sqlite
*.sqlite3

# Dependencies
node_modules/
__pycache__/
venv/

# Build output
.next/
dist/
build/

# IDE/OS
.vscode/
.idea/
.DS_Store
Thumbs.db
EOF
```

### 2. Create Secrets Structure

```bash
mkdir -p secrets
echo "# Sensitive files - NEVER COMMIT" > secrets/README.md
```

---

## 🔍 Before Every Commit

```bash
# 1. Check what's tracked (MOST IMPORTANT)
git ls-files "*.env*" "*.db" "*secret*" "*password*"
# Expected: Empty output!

# 2. Check what's staged
git diff --cached --name-only

# 3. Scan for hardcoded secrets
grep -r "sk-\|Bearer \|api_key=" --include="*.js" --exclude-dir=node_modules

# 4. Verify .gitignore is working
git status --ignored
```

---

## 🚀 Before Every Deploy

- [ ] `ENCRYPTION_KEY` is set in environment (32 characters)
- [ ] `DASHCLAW_API_KEY` is set in environment (prod only)
- [ ] No hardcoded API keys in code
- [ ] No hardcoded passwords/tokens
- [ ] No personal info (emails, names, IDs)
- [ ] No local file paths
- [ ] No database connection strings in code
- [ ] Environment variables used for all secrets
- [ ] `.env` files are gitignored AND not tracked
- [ ] Run `node scripts/security-scan.js`

---

## 🔥 If Credentials Are Leaked

**DON'T INVESTIGATE FIRST - ROTATE FIRST**

1. **IMMEDIATELY**: Generate new credentials from the service
2. **IMMEDIATELY**: Update environment variables
3. Then: Check if old credentials were used maliciously
4. Then: Document the incident
5. Then: Add preventive measures

---

## 📁 Where Secrets Go

| Type | Location |
|------|----------|
| API Keys | Vercel Environment Variables |
| Database URLs | Vercel Environment Variables |
| OAuth Credentials | Vercel Environment Variables |
| Local Dev | `.env.local` (gitignored) |

**NEVER put secrets in:**
- Source code files
- README or documentation
- Git commits (even private repos)
- Chat messages or tickets

---

## 🔄 Credential Rotation Schedule

| Type | Frequency | Notes |
|------|-----------|-------|
| API Keys | 90 days | Set calendar reminder |
| Database Passwords | 90 days | Update connection string |
| OAuth Tokens | Per provider | Usually auto-refresh |
| After Incident | Immediately | Don't wait |

---

## ✅ Security Scan

Run before every release:

```bash
node scripts/security-scan.js
```

This checks:
- Hardcoded secrets in source files
- Tracked sensitive files in git
- Missing .gitignore entries
- npm audit vulnerabilities

---

*When in doubt, rotate it out.*
