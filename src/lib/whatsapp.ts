// ─── Serviço de WhatsApp via Z-API ────────────────────────────────
// Docs: https://developer.z-api.io/

const ZAPI_BASE = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

// Formata número: garante que começa com 55 (Brasil) e sem caracteres especiais
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55')) return digits
  return `55${digits}`
}

async function sendWhatsAppText(phone: string, message: string): Promise<boolean> {
  if (!process.env.ZAPI_INSTANCE_ID || !process.env.ZAPI_TOKEN) {
    console.warn('Z-API credentials not configured')
    return false
  }

  try {
    const response = await fetch(`${ZAPI_BASE}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: formatPhone(phone),
        message,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Z-API error:', data)
      return false
    }

    return true
  } catch (err) {
    console.error('Error sending WhatsApp message:', err)
    return false
  }
}

// ─── Mensagens WhatsApp ────────────────────────────────────────────

export async function sendDueBillWhatsApp(
  phone: string,
  data: {
    userName: string
    billName: string
    amount: number
    dueDate: Date
    daysUntilDue: number
    accountName: string
  }
): Promise<boolean> {
  const urgency =
    data.daysUntilDue === 0
      ? '🚨 *VENCE HOJE!*'
      : data.daysUntilDue === 1
      ? '⚠️ Vence *amanhã*'
      : `⏰ Vence em *${data.daysUntilDue} dias*`

  const message = `💰 *Finan — Lembrete de vencimento*

Olá, ${data.userName}!

${urgency}

📋 *${data.billName}*
💵 Valor: *${formatCurrency(data.amount)}*
📅 Vencimento: *${formatDate(data.dueDate)}*
🏦 Conta: ${data.accountName}

Acesse o app para registrar o pagamento:
${process.env.NEXTAUTH_URL}/dashboard/transacoes`

  return sendWhatsAppText(phone, message)
}

export async function sendBudgetAlertWhatsApp(
  phone: string,
  data: {
    userName: string
    categoryName: string
    budgetAmount: number
    spentAmount: number
    percent: number
    isOverBudget: boolean
  }
): Promise<boolean> {
  const icon = data.isOverBudget ? '🚨' : '⚠️'
  const status = data.isOverBudget
    ? `*ESTOURADO!* Excedeu em ${formatCurrency(data.spentAmount - data.budgetAmount)}`
    : `em alerta — *${data.percent}%* utilizado`

  const message = `💰 *Finan — Alerta de orçamento*

Olá, ${data.userName}!

${icon} Orçamento de *${data.categoryName}* ${status}

📊 Orçado: ${formatCurrency(data.budgetAmount)}
💸 Gasto: *${formatCurrency(data.spentAmount)}*

Acesse o app para ver detalhes:
${process.env.NEXTAUTH_URL}/dashboard/orcamentos`

  return sendWhatsAppText(phone, message)
}

export async function sendGoalDeadlineWhatsApp(
  phone: string,
  data: {
    userName: string
    goalName: string
    targetAmount: number
    currentAmount: number
    deadline: Date
    daysUntilDeadline: number
    missingAmount: number
  }
): Promise<boolean> {
  const progress = Math.round((data.currentAmount / data.targetAmount) * 100)

  const message = `💰 *Finan — Prazo de meta*

Olá, ${data.userName}!

🎯 A meta *${data.goalName}* tem prazo em *${data.daysUntilDeadline} dia${data.daysUntilDeadline > 1 ? 's' : ''}* (${formatDate(data.deadline)})

📈 Progresso: *${progress}%*
✅ Acumulado: ${formatCurrency(data.currentAmount)}
⬜ Faltam: *${formatCurrency(data.missingAmount)}*

Contribua agora:
${process.env.NEXTAUTH_URL}/dashboard/metas`

  return sendWhatsAppText(phone, message)
}
