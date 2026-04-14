import { db } from '@/lib/db'
import {
  recurringTransactions,
  notificationLogs,
  userNotificationSettings,
} from '@/lib/db/schema'
import { eq, and, lte, gte } from 'drizzle-orm'
import { sendDueBillEmail } from '@/lib/email'
import { sendDueBillTelegram } from '@/lib/telegram'

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function diffInDays(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / msPerDay
  )
}

async function alreadySentToday(
  userId: string,
  referenceId: string,
  alertType: string,
  channel: string
): Promise<boolean> {
  const today = startOfDay(new Date())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  const log = await db.query.notificationLogs.findFirst({
    where: and(
      eq(notificationLogs.userId, userId),
      eq(notificationLogs.referenceId, referenceId),
      eq(notificationLogs.alertType, alertType),
      eq(notificationLogs.channel, channel),
      gte(notificationLogs.sentAt, today),
      lte(notificationLogs.sentAt, tomorrow)
    ),
  })

  return !!log
}

async function log(
  userId: string,
  referenceId: string,
  alertType: string,
  channel: string,
  success: boolean,
  errorMessage?: string
) {
  await db.insert(notificationLogs).values({
    userId,
    referenceType: 'recurring_transaction',
    referenceId,
    alertType,
    channel,
    success,
    errorMessage,
  })
}

export async function processNotifications(): Promise<{
  processed: number
  sent: number
  errors: number
}> {
  const stats = { processed: 0, sent: 0, errors: 0 }
  const today = new Date()

  // Busca todos os usuários com configurações ativas
  const allSettings = await db.query.userNotificationSettings.findMany({
    with: { user: true },
  })

  for (const settings of allSettings) {
    // Pula se nenhum canal estiver ativo
    if (!settings.emailEnabled && !settings.telegramEnabled) continue

    const userId = settings.userId
    const userName = settings.user.name || settings.user.email || 'usuário'
    const reminderDays: number[] = JSON.parse(settings.reminderDays || '[1,2,5,10]')
    const maxDays = Math.max(...reminderDays)

    // Janela: contas que vencem nos próximos maxDays dias
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + maxDays)

    const dueBills = await db.query.recurringTransactions.findMany({
      where: and(
        eq(recurringTransactions.userId, userId),
        eq(recurringTransactions.isActive, true),
        eq(recurringTransactions.type, 'expense'),
        gte(recurringTransactions.nextDueDate, today),
        lte(recurringTransactions.nextDueDate, maxDate)
      ),
      with: { account: true },
    })

    for (const bill of dueBills) {
      const daysUntilDue = diffInDays(today, bill.nextDueDate)

      // Só notifica nos dias configurados (ex: 1, 2, 5, 10)
      if (!reminderDays.includes(daysUntilDue) && daysUntilDue !== 0) continue

      stats.processed++
      const alertType = `due_${daysUntilDue}d`

      const billData = {
        userName,
        billName: bill.description || 'Conta recorrente',
        amount: parseFloat(bill.amount as string),
        dueDate: bill.nextDueDate,
        daysUntilDue,
        accountName: bill.account.name,
      }

      // ── Email ──────────────────────────────────────────────────
      if (settings.emailEnabled && settings.notificationEmail) {
        const already = await alreadySentToday(userId, bill.id, alertType, 'email')
        if (!already) {
          const success = await sendDueBillEmail(settings.notificationEmail, billData)
          await log(userId, bill.id, alertType, 'email', success)
          success ? stats.sent++ : stats.errors++
        }
      }

      // ── Telegram ───────────────────────────────────────────────
      if (settings.telegramEnabled && settings.telegramChatId) {
        const already = await alreadySentToday(userId, bill.id, alertType, 'telegram')
        if (!already) {
          const success = await sendDueBillTelegram(settings.telegramChatId, billData)
          await log(userId, bill.id, alertType, 'telegram', success)
          success ? stats.sent++ : stats.errors++
        }
      }
    }
  }

  return stats
}
