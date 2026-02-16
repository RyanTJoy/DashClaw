import { describe, it, expect } from 'vitest';
import { scanSensitiveData, SECURITY_PATTERNS } from '@/lib/security.js';

describe('scanSensitiveData', () => {
  // --- Clean input ---

  it('returns clean for normal text', () => {
    const result = scanSensitiveData('Hello world, this is a normal message.');
    expect(result.clean).toBe(true);
    expect(result.findings).toEqual([]);
    expect(result.redacted).toBe('Hello world, this is a normal message.');
  });

  it('returns clean for null input', () => {
    const result = scanSensitiveData(null);
    expect(result.clean).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it('returns clean for empty string', () => {
    const result = scanSensitiveData('');
    expect(result.clean).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it('returns clean for non-string input', () => {
    const result = scanSensitiveData(42);
    expect(result.clean).toBe(true);
  });

  // --- Generic API key ---

  it('detects generic API key', () => {
    const result = scanSensitiveData('api_key=sk_test_1234567890abcdef');
    expect(result.clean).toBe(false);
    expect(result.findings.some(f => f.pattern === 'api_key_generic')).toBe(true);
    expect(result.redacted).toContain('[REDACTED:api_key_generic]');
  });

  // --- OpenAI key ---

  it('detects OpenAI key', () => {
    const result = scanSensitiveData('Using key sk-abcdefghijklmnopqrstuvwx');
    expect(result.clean).toBe(false);
    expect(result.findings.some(f => f.pattern === 'openai_key')).toBe(true);
    expect(result.findings.find(f => f.pattern === 'openai_key').severity).toBe('critical');
  });

  // --- Anthropic key ---

  it('detects Anthropic key', () => {
    const result = scanSensitiveData('sk-ant-api03-abcdefghijklmnopqrst');
    expect(result.clean).toBe(false);
    expect(result.findings.some(f => f.pattern === 'anthropic_key')).toBe(true);
  });

  // --- Stripe key ---

  it('detects Stripe live key', () => {
    // Build key via concatenation to avoid GitHub push protection false positive
    const stripeKey = ['sk', 'live', '00TESTKEY00FAKE000000000'].join('_');
    const result = scanSensitiveData(stripeKey);
    expect(result.clean).toBe(false);
    expect(result.findings.some(f => f.pattern === 'stripe_key')).toBe(true);
  });

  // --- AWS access key ---

  it('detects AWS access key', () => {
    const result = scanSensitiveData('AKIAIOSFODNN7EXAMPLE');
    expect(result.clean).toBe(false);
    expect(result.findings.some(f => f.pattern === 'aws_access_key')).toBe(true);
    expect(result.findings.find(f => f.pattern === 'aws_access_key').category).toBe('cloud_credential');
  });

  // --- AWS secret key ---

  it('detects AWS secret key', () => {
    const result = scanSensitiveData('aws_secret_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    expect(result.clean).toBe(false);
    expect(result.findings.some(f => f.pattern === 'aws_secret_key')).toBe(true);
  });

  // --- GitHub token ---

  it('detects GitHub personal access token', () => {
    const result = scanSensitiveData('ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl');
    expect(result.clean).toBe(false);
    expect(result.findings.some(f => f.pattern === 'github_token')).toBe(true);
  });

  // --- Slack token ---

  it('detects Slack token', () => {
    const result = scanSensitiveData('xoxb-1234567890-abcdefghij');
    expect(result.clean).toBe(false);
    expect(result.findings.some(f => f.pattern === 'slack_token')).toBe(true);
  });

  // --- JWT ---

  it('detects JWT token', () => {
    const result = scanSensitiveData('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U');
    expect(result.clean).toBe(false);
    expect(result.findings.some(f => f.pattern === 'jwt_token')).toBe(true);
    expect(result.findings.find(f => f.pattern === 'jwt_token').severity).toBe('high');
  });

  // --- Bearer token ---

  it('detects Bearer token', () => {
    const result = scanSensitiveData('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0');
    expect(result.clean).toBe(false);
    expect(result.findings.some(f => f.pattern === 'bearer_token')).toBe(true);
  });

  // --- Private key ---

  it('detects private key header', () => {
    const result = scanSensitiveData('-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQ...');
    expect(result.clean).toBe(false);
    expect(result.findings.some(f => f.pattern === 'private_key')).toBe(true);
    expect(result.findings.find(f => f.pattern === 'private_key').category).toBe('private_key');
  });

  // --- Password field ---

  it('detects password field', () => {
    const result = scanSensitiveData('password="supersecret123"');
    expect(result.clean).toBe(false);
    expect(result.findings.some(f => f.pattern === 'password_field')).toBe(true);
    expect(result.findings.find(f => f.pattern === 'password_field').severity).toBe('high');
  });

  // --- Database URL ---

  it('detects database URL', () => {
    const result = scanSensitiveData('postgres://user:pass@host:5432/dbname');
    expect(result.clean).toBe(false);
    expect(result.findings.some(f => f.pattern === 'database_url')).toBe(true);
    expect(result.findings.find(f => f.pattern === 'database_url').category).toBe('connection_string');
  });

  // --- Redaction ---

  it('redacts matched secrets from text', () => {
    const result = scanSensitiveData('key is AKIAIOSFODNN7EXAMPLE, done');
    expect(result.redacted).toContain('[REDACTED:aws_access_key]');
    expect(result.redacted).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(result.redacted).toContain(', done');
  });

  // --- Multiple secrets ---

  it('detects multiple secrets in one text', () => {
    const text = 'API: AKIAIOSFODNN7EXAMPLE and password="hunter2secret"';
    const result = scanSensitiveData(text);
    expect(result.clean).toBe(false);
    expect(result.findings.length).toBeGreaterThanOrEqual(2);
  });

  // --- Preview truncation ---

  it('truncates preview in findings', () => {
    const result = scanSensitiveData('AKIAIOSFODNN7EXAMPLE');
    const finding = result.findings.find(f => f.pattern === 'aws_access_key');
    expect(finding.preview.length).toBeLessThanOrEqual(11); // 8 chars + '***'
    expect(finding.preview).toContain('***');
  });
});
