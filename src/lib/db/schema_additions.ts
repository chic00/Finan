// ─── ADICIONAR ao final do arquivo src/lib/db/schema.ts ───────────
// Cole estas tabelas antes das Relations

import {
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  integer,
  uuid,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Configurações de notificação por usuário ──────────────────────
export const userNotificationSettings = pgTable('user_notification_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),

  // Canais ativos
  emailEnabled: boolean('email_enabled').notNull().default(true),
  whatsappEnabled: boolean('whatsapp_enabled').notNull().default(false),

  // Contatos
  notificationEmail: varchar('notification_email', { length: 255 }),
  whatsappPhone: varchar('whatsapp_phone', { length: 20 }), // formato: 5511999999999

  // Antecedência: quais dias antes notificar (JSON array: [1,2,5,10])
  reminderDays: text('reminder_days').notNull().default('[1,2,5,10]'),

  // Tipos de notificação
  notifyDueBills: boolean('notify_due_bills').notNull().default(true),
  notifyBudgetAlert: boolean('notify_budget_alert').notNull().default(true),
  notifyGoalDeadline: boolean('notify_goal_deadline').notNull().default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Log de notificações enviadas (evita duplicatas) ──────────────
export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Referência ao item que gerou a notificação
  referenceType: varchar('reference_type', { length: 50 }).notNull(), // 'recurring_transaction' | 'budget' | 'goal'
  referenceId: uuid('reference_id').notNull(),

  // Tipo de alerta
  alertType: varchar('alert_type', { length: 50 }).notNull(), // 'due_1d' | 'due_2d' | 'due_5d' | 'due_10d' | 'budget_80' | 'budget_100' | 'goal_deadline'

  // Canal usado
  channel: varchar('channel', { length: 20 }).notNull(), // 'email' | 'whatsapp'

  // Status
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  success: boolean('success').notNull().default(true),
  errorMessage: text('error_message'),
}, (table) => ({
  // Índice único: não envia o mesmo alerta duas vezes no mesmo dia
  uniqueAlertIdx: index('notification_logs_unique_idx').on(
    table.userId,
    table.referenceId,
    table.alertType,
    table.channel
  ),
  userIdx: index('notification_logs_user_idx').on(table.userId),
}))

// ─── Relations adicionais (adicionar nas relations existentes) ─────
export const userNotificationSettingsRelations = relations(userNotificationSettings, ({ one }) => ({
  user: one(users, { fields: [userNotificationSettings.userId], references: [users.id] }),
}))

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  user: one(users, { fields: [notificationLogs.userId], references: [users.id] }),
}))

// ─── Types ────────────────────────────────────────────────────────
export type UserNotificationSettings = typeof userNotificationSettings.$inferSelect
export type NotificationLog = typeof notificationLogs.$inferSelect
