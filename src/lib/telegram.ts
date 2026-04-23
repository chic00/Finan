const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN não configurado')
    return false
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })

    const data = await response.json()
    if (!data.ok) {
      console.error('Telegram API error:', data.description)
      return false
    }
    return true
  } catch (err) {
    console.error('Erro ao enviar Telegram:', err)
    return false
  }
}

export async function sendDueBillTelegram(
  chatId: string,
  data: {
    userName: string
    billName: string
    amount: number
    dueDate: Date
    daysUntilDue: number
    accountName: string
  }
): Promise<boolean> {
  const appUrl = process.env.NEXTAUTH_URL || 'https://fyneo.vercel.app'

  // Ícone e texto de urgência
  const urgencyIcon =
    data.daysUntilDue === 0 ? '🚨' :
    data.daysUntilDue === 1 ? '🔴' :
    data.daysUntilDue <= 2  ? '🟠' :
    data.daysUntilDue <= 5  ? '🟡' : '🔵'

  const urgencyText =
    data.daysUntilDue === 0 ? '<b>VENCE HOJE!</b>' :
    data.daysUntilDue === 1 ? 'vence <b>amanhã</b>' :
                              `vence em <b>${data.daysUntilDue} dias</b>`

  // Linha separadora
  const sep = '─────────────────────'

  const message =
    `${urgencyIcon} <b>Finan — Lembrete de vencimento</b>\n` +
    `${sep}\n` +
    `Olá, <b>${data.userName}</b>! A conta abaixo ${urgencyText}:\n\n` +
    `📋 <b>${data.billName}</b>\n` +
    `💵 Valor: <b>${formatCurrency(data.amount)}</b>\n` +
    `📅 Vencimento: <b>${formatDate(data.dueDate)}</b>\n` +
    `🏦 Conta: ${data.accountName}\n` +
    `${sep}\n` +
    // Link funcional — abre direto na página de recorrentes do sistema
    `<a href="${appUrl}/dashboard/recorrentes">✅ Abrir sistema para registrar pagamento</a>`

  return sendTelegramMessage(chatId, message)
}

// Mensagem de teste
export async function sendTelegramText(chatId: string, message: string): Promise<boolean> {
  return sendTelegramMessage(chatId, message)
}

// Busca Chat ID para configuração inicial
export async function getTelegramUpdates(): Promise<
  Array<{ chat_id: string; username: string; first_name: string }> | null
> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null

  try {
    const response = await fetch(`${TELEGRAM_API}/getUpdates`)
    const data = await response.json()
    if (!data.ok || data.result.length === 0) return null

    const chats = new Map<string, { chat_id: string; username: string; first_name: string }>()
    for (const update of data.result) {
      if (update.message?.chat) {
        const chat = update.message.chat
        chats.set(String(chat.id), {
          chat_id: String(chat.id),
          username: chat.username || '',
          first_name: chat.first_name || '',
        })
      }
    }
    return Array.from(chats.values())
  } catch {
    return null
  }
}
