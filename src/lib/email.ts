// src/lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Fyneo <onboarding@resend.dev>'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

// ─── Email de Verificação de Cadastro ─────────────────────────────

export async function sendVerificationEmail(
  to: string,
  data: { userName: string; verificationUrl: string }
): Promise<boolean> {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu email — Fyneo</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#00d4aa 0%,#0891b2 100%);padding:32px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">💰 FYNEO</p>
              <p style="margin:12px 0 0;color:#FFFFFF;font-size:24px;font-weight:700;">Confirme seu email</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">
                Olá, <strong>${data.userName}</strong>! Seja bem-vindo(a) ao Fyneo.
              </p>
              <p style="margin:0 0 28px;color:#6B7280;font-size:14px;line-height:1.7;">
                Para ativar sua conta e começar a organizar suas finanças, clique no botão abaixo para confirmar seu endereço de email.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="border-radius:12px;background:linear-gradient(135deg,#00d4aa 0%,#0891b2 100%);">
                    <a href="${data.verificationUrl}"
                       style="display:block;padding:16px 32px;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;text-align:center;">
                      ✅ Confirmar meu email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px 20px;">
                    <p style="margin:0;color:#166534;font-size:13px;line-height:1.6;">
                      ⏰ <strong>Este link expira em 24 horas.</strong><br>
                      Se você não criou uma conta no Fyneo, pode ignorar este email com segurança.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="color:#9CA3AF;font-size:12px;line-height:1.6;margin:0;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <a href="${data.verificationUrl}" style="color:#0891b2;word-break:break-all;">${data.verificationUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background-color:#F9FAFB;border-top:1px solid #E5E7EB;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                Fyneo &mdash; Controle de Finanças Pessoais
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: '✅ Confirme seu email — Fyneo',
      html,
    })
    if (error) { console.error('Resend verification error:', error); return false }
    return true
  } catch (err) {
    console.error('Error sending verification email:', err)
    return false
  }
}

// ─── Email de Lembrete de Vencimento ──────────────────────────────

export interface DueBillEmailData {
  userName: string
  billName: string
  amount: number
  dueDate: Date
  daysUntilDue: number
  accountName: string
}

export async function sendDueBillEmail(to: string, data: DueBillEmailData): Promise<boolean> {
  const theme =
    data.daysUntilDue === 0 ? { color: '#DC2626', bg: '#FEF2F2', badge: '#FCA5A5', text: '🚨 VENCE HOJE!' } :
    data.daysUntilDue === 1 ? { color: '#EA580C', bg: '#FFF7ED', badge: '#FED7AA', text: '🔴 Vence amanhã' } :
    data.daysUntilDue <= 2  ? { color: '#D97706', bg: '#FFFBEB', badge: '#FDE68A', text: `🟠 Vence em ${data.daysUntilDue} dias` } :
    data.daysUntilDue <= 5  ? { color: '#CA8A04', bg: '#FEFCE8', badge: '#FEF08A', text: `🟡 Vence em ${data.daysUntilDue} dias` } :
                              { color: '#2563EB', bg: '#EFF6FF', badge: '#BFDBFE', text: `🔵 Vence em ${data.daysUntilDue} dias` }

  const subject =
    data.daysUntilDue === 0 ? `🚨 VENCE HOJE — ${data.billName} (${formatCurrency(data.amount)})` :
    data.daysUntilDue === 1 ? `🔴 Vence amanhã — ${data.billName} (${formatCurrency(data.amount)})` :
                              `⏰ ${data.billName} vence em ${data.daysUntilDue} dias — ${formatCurrency(data.amount)}`

  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
          <tr>
            <td style="background-color:${theme.color};padding:28px 32px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">💰 FYNEO</p>
              <p style="margin:10px 0 0;color:#FFFFFF;font-size:22px;font-weight:700;line-height:1.3;">${theme.text}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
                Olá, <strong>${data.userName}</strong>! Você tem uma conta próxima do vencimento.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${theme.bg};border:1.5px solid ${theme.badge};border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#6B7280;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Conta</p>
                    <p style="margin:0 0 20px;color:#111827;font-size:20px;font-weight:700;">${data.billName}</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                      <tr>
                        <td style="color:#6B7280;font-size:14px;">Valor</td>
                        <td align="right" style="color:${theme.color};font-size:24px;font-weight:700;">${formatCurrency(data.amount)}</td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="border-top:1px solid ${theme.badge};padding-bottom:12px;"></td></tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                      <tr>
                        <td style="color:#6B7280;font-size:14px;">📅&nbsp; Vencimento</td>
                        <td align="right" style="color:#111827;font-size:14px;font-weight:600;">${formatDate(data.dueDate)}</td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#6B7280;font-size:14px;">🏦&nbsp; Conta bancária</td>
                        <td align="right" style="color:#374151;font-size:14px;">${data.accountName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="border-radius:10px;background-color:${theme.color};">
                    <a href="${appUrl}/dashboard/recorrentes"
                       style="display:block;padding:14px 24px;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;border-radius:10px;text-align:center;">
                      Registrar pagamento &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#F9FAFB;border-top:1px solid #E5E7EB;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;">
                Fyneo &mdash; Controle de Finanças Pessoais
                &nbsp;&middot;&nbsp;
                <a href="${appUrl}/dashboard/configuracoes" style="color:#9CA3AF;text-decoration:underline;">Gerenciar notificações</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html })
    if (error) { console.error('Resend error:', error); return false }
    return true
  } catch (err) {
    console.error('Error sending email:', err)
    return false
  }
}
