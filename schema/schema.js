import { pgTable, text, timestamp, integer, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(), // org_ prefix
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan').default('free'),
  createdAt: text('created_at'),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(), // usr_ prefix
  orgId: text('org_id').notNull().references(() => organizations.id),
  email: text('email').notNull(),
  name: text('name'),
  image: text('image'),
  provider: text('provider'),
  providerAccountId: text('provider_account_id'),
  role: text('role').default('member'),
  createdAt: text('created_at'),
  lastLoginAt: text('last_login_at'),
}, (table) => ({
  providerUnique: uniqueIndex('users_provider_account_unique').on(table.provider, table.providerAccountId),
}));

export const actionRecords = pgTable('action_records', {
  id: text('id').primaryKey(), // ar_ prefix
  orgId: text('org_id').notNull().references(() => organizations.id),
  agentId: text('agent_id').notNull(),
  actionType: text('action_type').notNull(),
  description: text('description'),
  declaredGoal: text('declared_goal'),
  status: text('status'),
  riskScore: integer('risk_score').default(0),
  timestampStart: text('timestamp_start'),
  timestampEnd: text('timestamp_end'),
  signature: text('signature'),
  verified: boolean('verified').default(false),
});

export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(), // key_ prefix
  orgId: text('org_id').notNull().references(() => organizations.id),
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  label: text('label'),
  role: text('role').default('member'),
  revokedAt: text('revoked_at'),
});

export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(), // al_ prefix
  orgId: text('org_id').notNull().references(() => organizations.id),
  actorId: text('actor_id'),
  actorType: text('actor_type'),
  action: text('action'),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  details: text('details'), // JSON string
  ipAddress: text('ip_address'),
  createdAt: text('created_at'),
});
