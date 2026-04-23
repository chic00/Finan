import {
  pgTable, text, timestamp, decimal, varchar,
  boolean, integer, uuid, index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Users (NextAuth) ──────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expires: timestamp('expires').notNull(),
}, (table) => ({
  compoundKey: index('verification_token_key').on(table.identifier, table.token),
}))

// ─── Email Verifications (cadastro) ───────────────────────────────
export const emailVerifications = pgTable('email_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index('email_verifications_token_idx').on(table.token),
  userIdIdx: index('email_verifications_user_id_idx').on(table.userId),
}))

// ─── Bank Accounts ─────────────────────────────────────────────────
export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  color: varchar('color', { length: 7 }).default('#3B82F6'),
  icon: varchar('icon', { length: 50 }).default('wallet'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Categories ────────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  color: varchar('color', { length: 7 }).default('#6B7280'),
  icon: varchar('icon', { length: 50 }).default('tag'),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('categories_user_id_idx').on(table.userId),
}))

// ─── Tags ──────────────────────────────────────────────────────────
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).default('#6B7280'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Recurring Transactions ────────────────────────────────────────
export const recurringTransactions = pgTable('recurring_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id, { onDelete: 'cascade' }),
  toAccountId: uuid('to_account_id').references(() => bankAccounts.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 20 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  description: text('description'),
  frequency: varchar('frequency', { length: 20 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  nextDueDate: timestamp('next_due_date').notNull(),
  lastGenerated: timestamp('last_generated'),
  isActive: boolean('is_active').notNull().default(true),
  isPaid: boolean('is_paid').notNull().default(false),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('recurring_transactions_user_idx').on(table.userId),
  nextDueDateIdx: index('recurring_transactions_next_due_idx').on(table.nextDueDate),
}))

// ─── Transactions ──────────────────────────────────────────────────
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id, { onDelete: 'cascade' }),
  toAccountId: uuid('to_account_id').references(() => bankAccounts.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 20 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  description: text('description'),
  date: timestamp('date').notNull(),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringId: uuid('recurring_id').references(() => recurringTransactions.id, { onDelete: 'set null' }),
  attachmentUrl: text('attachment_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('transactions_user_id_idx').on(table.userId),
  accountIdIdx: index('transactions_account_id_idx').on(table.accountId),
  dateIdx: index('transactions_date_idx').on(table.date),
}))

// ─── Transaction Tags ──────────────────────────────────────────────
export const transactionTags = pgTable('transaction_tags', {
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: index('transaction_tags_pk').on(table.transactionId, table.tagId),
}))

// ─── Budgets ───────────────────────────────────────────────────────
export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userMonthIdx: index('budgets_user_month_idx').on(table.userId, table.month, table.year),
}))

// ─── Goals ─────────────────────────────────────────────────────────
export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  targetAmount: decimal('target_amount', { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal('current_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  deadline: timestamp('deadline'),
  isCompleted: boolean('is_completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── User Notification Settings ────────────────────────────────────
export const userNotificationSettings = pgTable('user_notification_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  notificationEmail: varchar('notification_email', { length: 255 }),
  telegramEnabled: boolean('telegram_enabled').notNull().default(false),
  telegramChatId: varchar('telegram_chat_id', { length: 50 }),
  reminderDays: text('reminder_days').notNull().default('[1,2,5,10]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Notification Logs ─────────────────────────────────────────────
export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  referenceType: varchar('reference_type', { length: 50 }).notNull(),
  referenceId: uuid('reference_id').notNull(),
  alertType: varchar('alert_type', { length: 50 }).notNull(),
  channel: varchar('channel', { length: 20 }).notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  success: boolean('success').notNull().default(true),
  errorMessage: text('error_message'),
}, (table) => ({
  dedupIdx: index('notification_logs_dedup_idx').on(
    table.userId, table.referenceId, table.alertType, table.channel
  ),
  userIdx: index('notification_logs_user_idx').on(table.userId),
}))

// ─── Relations ─────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many, one }) => ({
  bankAccounts: many(bankAccounts),
  transactions: many(transactions),
  categories: many(categories),
  tags: many(tags),
  budgets: many(budgets),
  goals: many(goals),
  sessions: many(sessions),
  oauthAccounts: many(accounts),
  recurringTransactions: many(recurringTransactions),
  emailVerifications: many(emailVerifications),
  notificationSettings: one(userNotificationSettings, {
    fields: [users.id],
    references: [userNotificationSettings.userId],
  }),
  notificationLogs: many(notificationLogs),
}))

export const emailVerificationsRelations = relations(emailVerifications, ({ one }) => ({
  user: one(users, { fields: [emailVerifications.userId], references: [users.id] }),
}))

export const bankAccountsRelations = relations(bankAccounts, ({ one, many }) => ({
  user: one(users, { fields: [bankAccounts.userId], references: [users.id] }),
  transactions: many(transactions),
  recurringTransactions: many(recurringTransactions),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
  budgets: many(budgets),
}))

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  account: one(bankAccounts, { fields: [transactions.accountId], references: [bankAccounts.id] }),
  toAccount: one(bankAccounts, { fields: [transactions.toAccountId], references: [bankAccounts.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
  recurring: one(recurringTransactions, { fields: [transactions.recurringId], references: [recurringTransactions.id] }),
  tags: many(transactionTags),
}))

export const recurringTransactionsRelations = relations(recurringTransactions, ({ one }) => ({
  user: one(users, { fields: [recurringTransactions.userId], references: [users.id] }),
  account: one(bankAccounts, { fields: [recurringTransactions.accountId], references: [bankAccounts.id] }),
  toAccount: one(bankAccounts, { fields: [recurringTransactions.toAccountId], references: [bankAccounts.id] }),
  category: one(categories, { fields: [recurringTransactions.categoryId], references: [categories.id] }),
}))

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.id] }),
  category: one(categories, { fields: [budgets.categoryId], references: [categories.id] }),
}))

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
}))

export const userNotificationSettingsRelations = relations(userNotificationSettings, ({ one }) => ({
  user: one(users, { fields: [userNotificationSettings.userId], references: [users.id] }),
}))

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  user: one(users, { fields: [notificationLogs.userId], references: [users.id] }),
}))

// ─── Types ─────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type BankAccount = typeof bankAccounts.$inferSelect
export type NewBankAccount = typeof bankAccounts.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Tag = typeof tags.$inferSelect
export type Budget = typeof budgets.$inferSelect
export type Goal = typeof goals.$inferSelect
export type RecurringTransaction = typeof recurringTransactions.$inferSelect
export type UserNotificationSettings = typeof userNotificationSettings.$inferSelect
export type NotificationLog = typeof notificationLogs.$inferSelect
export type EmailVerification = typeof emailVerifications.$inferSelect
