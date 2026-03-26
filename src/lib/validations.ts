import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
})

export const accountSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['checking', 'savings', 'wallet', 'investment']),
  balance: z.coerce.number().default(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida').optional(),
  icon: z.string().optional(),
})

export const transactionSchema = z.object({
  accountId: z.string().uuid('Conta é obrigatória'),
  toAccountId: z.string().uuid().optional().or(z.literal('')).transform(v => v || undefined),
  categoryId: z.string().uuid().optional().or(z.literal('')).transform(v => v || undefined),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  description: z.string().optional(),
  date: z.coerce.date(),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['income', 'expense', 'transfer']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida').optional(),
  icon: z.string().optional(),
})

export const budgetSchema = z.object({
  categoryId: z.string().uuid('Categoria é obrigatória'),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020),
})

export const goalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  targetAmount: z.coerce.number().positive('Valor deve ser positivo'),
  deadline: z.coerce.date().optional(),
})

export const goalContributionSchema = z.object({
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  accountId: z.string().uuid('Selecione uma conta'),
})

export const recurringTransactionSchema = z.object({
  accountId: z.string().uuid('Conta é obrigatória'),
  toAccountId: z.string().uuid().optional().or(z.literal('')).transform(v => v || undefined),
  categoryId: z.string().uuid().optional().or(z.literal('')).transform(v => v || undefined),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type AccountInput = z.infer<typeof accountSchema>
export type TransactionInput = z.infer<typeof transactionSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type BudgetInput = z.infer<typeof budgetSchema>
export type GoalInput = z.infer<typeof goalSchema>
export type GoalContributionInput = z.infer<typeof goalContributionSchema>
export type RecurringTransactionInput = z.infer<typeof recurringTransactionSchema>
