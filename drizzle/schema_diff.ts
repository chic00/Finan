// ─── Recurring Transactions ────────────────────────────────────────
// ADICIONE estas duas colunas na definição existente de recurringTransactions:
//
//   isPaid:  boolean('is_paid').notNull().default(false),
//   paidAt:  timestamp('paid_at'),
//
// O bloco completo da tabela deve ficar assim:

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
  // ✅ NOVOS CAMPOS:
  isPaid: boolean('is_paid').notNull().default(false),   // pago no ciclo atual?
  paidAt: timestamp('paid_at'),                          // quando foi pago
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
