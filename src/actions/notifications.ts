'use server'

import { auth } from '@/lib/auth'
import { db, userNotificationSettings } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const settingsSchema = z.object({
  emailEnabled: z.boolean().default(true),
  notificationEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  telegramEnabled: z.boolean().default(false),
  telegramChatId: z.string().optional().or(z.literal('')),
  reminderDays: z
    .array(z.number().min(1).max(30))
    .min(1, 'Selecione pelo menos 1 dia'),
})

export async function saveNotificationSettings(formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = settingsSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { data } = parsed

  try {
    const existing = await db.query.userNotificationSettings.findFirst({
      where: eq(userNotificationSettings.userId, session.user!.id),
    })

    const values = {
      emailEnabled: data.emailEnabled,
      notificationEmail: data.notificationEmail || null,
      telegramEnabled: data.telegramEnabled,
      telegramChatId: data.telegramChatId || null,
      reminderDays: JSON.stringify(data.reminderDays),
      updatedAt: new Date(),
    }

    if (existing) {
      await db
        .update(userNotificationSettings)
        .set(values)
        .where(eq(userNotificationSettings.userId, session.user!.id))
    } else {
      await db.insert(userNotificationSettings).values({
        userId: session.user!.id,
        ...values,
      })
    }

    revalidatePath('/dashboard/configuracoes')
    return { success: true }
  } catch (error) {
    console.error('Error saving settings:', error)
    return { error: 'Erro ao salvar configurações' }
  }
}

export async function getNotificationSettings() {
  const session = await auth()
  if (!session?.user?.id) return null

  let settings = await db.query.userNotificationSettings.findFirst({
    where: eq(userNotificationSettings.userId, session.user!.id),
  })

  // SEGURANÇA: Se não houver token de verificação, gera um agora
  if (settings && !settings.telegramVerificationToken) {
    const token = `verify_${randomUUID().replace(/-/g, '')}`
    await db.update(userNotificationSettings)
      .set({ telegramVerificationToken: token })
      .where(eq(userNotificationSettings.userId, session.user!.id))
    settings.telegramVerificationToken = token
  }

  return settings
}

export async function generateTelegramToken() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const token = `verify_${randomUUID().replace(/-/g, '')}`
  
  await db.insert(userNotificationSettings)
    .values({
      userId: session.user!.id,
      telegramVerificationToken: token,
      reminderDays: '[1,2,5,10]'
    })
    .onConflictDoUpdate({
      target: userNotificationSettings.userId,
      set: { telegramVerificationToken: token }
    })

  revalidatePath('/dashboard/configuracoes')
  return { token }
}

export async function sendTestNotification(channel: 'email' | 'telegram') {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const settings = await getNotificationSettings()
  if (!settings) return { error: 'Salve as configurações antes de testar' }

  const userName = session.user.name || 'usuário'
  const testData = {
    userName,
    billName: 'Netflix (Teste)',
    amount: 55.90,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    daysUntilDue: 2,
    accountName: 'Conta Corrente',
  }

  if (channel === 'email') {
    if (!settings.notificationEmail) return { error: 'Email não configurado' }
    const { sendDueBillEmail } = await import('@/lib/email')
    const ok = await sendDueBillEmail(settings.notificationEmail, testData)
    return ok
      ? { success: true, message: '✅ Email de teste enviado! Verifique sua caixa de entrada.' }
      : { error: 'Falha ao enviar. Verifique a RESEND_API_KEY no .env' }
  }

  if (channel === 'telegram') {
    if (!settings.telegramChatId) return { error: 'Chat ID do Telegram não configurado' }
    const { sendDueBillTelegram } = await import('@/lib/telegram')
    const ok = await sendDueBillTelegram(settings.telegramChatId, testData)
    return ok
      ? { success: true, message: '✅ Mensagem de teste enviada no Telegram!' }
      : { error: 'Falha ao enviar. Verifique o TELEGRAM_BOT_TOKEN e o Chat ID' }
  }

  return { error: 'Canal inválido' }
}

// ─── Busca o Chat ID do usuário via bot de forma SEGURA ────────────────
export async function fetchTelegramChatId(): Promise<{ chatId?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Não autenticado' }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { error: 'TELEGRAM_BOT_TOKEN não configurado no .env' }
  }

  const settings = await getNotificationSettings()
  if (!settings?.telegramVerificationToken) {
    return { error: 'Token de verificação não gerado. Tente novamente.' }
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getUpdates`
    )
    const data = await response.json()

    if (!data.ok || data.result.length === 0) {
      return { error: 'Nenhuma mensagem recebida ainda. Envie o código para o bot primeiro.' }
    }

    // SEGURANÇA: Busca uma mensagem que contenha o TOKEN ÚNICO do usuário
    const userUpdate = data.result.find((update: any) => 
      update.message?.text?.includes(settings.telegramVerificationToken)
    )

    if (!userUpdate) {
      return { error: 'Código de verificação não encontrado nas mensagens recentes. Envie o código para o bot e tente novamente.' }
    }

    const chatId = String(userUpdate.message.chat.id)

    // Salva o Chat ID automaticamente
    await db.update(userNotificationSettings)
      .set({ telegramChatId: chatId, updatedAt: new Date() })
      .where(eq(userNotificationSettings.userId, session.user!.id))

    revalidatePath('/dashboard/configuracoes')
    return { chatId }
  } catch {
    return { error: 'Erro ao conectar com a API do Telegram' }
  }
}
