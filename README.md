# 💰 Finan — Controle de Finanças Pessoais

Aplicação web full-stack para controle de finanças pessoais, construída com **Next.js 15 App Router**, **Drizzle ORM**, **PostgreSQL** e **NextAuth v5**.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/license-ISC-green)

---

## ✨ Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| 🏦 **Contas** | Gerencie contas corrente, poupança, carteira e investimento |
| 💸 **Transações** | Registre receitas, despesas e transferências com categorias |
| 📊 **Dashboard** | KPIs, gráficos de despesas por categoria e saldo por conta |
| 🎯 **Orçamentos** | Defina limites mensais por categoria com alertas visuais |
| 🏆 **Metas** | Crie metas de economia e contribua diretamente de uma conta |
| 📈 **Relatórios** | Gráficos dos últimos 6 meses: receitas × despesas, evolução do saldo, ranking de categorias |
| 🔐 **Autenticação** | Login/cadastro seguro com e-mail e senha (bcrypt + JWT) |

---

## 🛠 Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, Server Actions)
- **Linguagem:** TypeScript 5
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Banco:** PostgreSQL
- **Auth:** [NextAuth v5](https://authjs.dev/) com Credentials Provider
- **Estilização:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Gráficos:** [Recharts](https://recharts.org/)
- **Validação:** [Zod](https://zod.dev/)
- **Hash:** bcryptjs

---

## 🚀 Instalação

### Pré-requisitos

- Node.js >= 20
- PostgreSQL >= 14 rodando localmente ou na nuvem

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/finan.git
cd finan
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com os seus dados:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME"
AUTH_SECRET="gere-com-openssl-rand-base64-32"
NEXTAUTH_URL="https://fyneo.vercel.app"
```

> **Dica:** Gere um `AUTH_SECRET` seguro com:
> ```bash
> openssl rand -base64 32
> ```

### 3. Crie as tabelas no banco

```bash
npm run db:push
```

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [https://fyneo.vercel.app](https://fyneo.vercel.app) e crie sua conta. As categorias padrão são criadas automaticamente no primeiro cadastro.

---

## 📁 Estrutura do Projeto

```
src/
├── app/                        # Rotas (App Router)
│   ├── api/
│   │   ├── auth/[...nextauth]/ # Handler NextAuth
│   │   └── register/           # POST /api/register
│   ├── dashboard/
│   │   ├── layout.tsx          # Layout com sidebar responsiva
│   │   ├── page.tsx            # Dashboard com KPIs e alertas
│   │   ├── contas/
│   │   ├── transacoes/         # Suporta ?month=&year=
│   │   ├── categorias/
│   │   ├── orcamentos/
│   │   ├── metas/
│   │   └── relatorios/
│   ├── login/
│   └── register/
│
├── actions/                    # Server Actions (mutações)
│   ├── accounts.ts
│   ├── transactions.ts         # Atualiza saldo corretamente em CRUD
│   ├── categories.ts           # Inclui initDefaultCategories
│   ├── budgets.ts              # getBudgetsWithSpent + checkBudgetAlerts
│   └── goals.ts                # contributeToGoal com débito de conta
│
├── components/
│   ├── dashboard/              # Sidebar, RecentTransactions, charts, BudgetAlerts
│   ├── accounts/               # AccountsClient (CRUD completo)
│   ├── transactions/           # TransactionsClient (editar, filtrar por mês)
│   ├── orcamentos/             # OrcamentosClient (% gasto, barra de progresso)
│   ├── metas/                  # GoalsClient (contribuir com conta, editar)
│   ├── relatorios/             # RelatoriosClient (gráficos reais)
│   └── ui/                     # Card, Modal, FormElements
│
└── lib/
    ├── auth.ts                 # Configuração NextAuth
    ├── db/
    │   ├── index.ts            # Conexão Drizzle
    │   └── schema.ts           # Schema completo (11 tabelas)
    ├── utils.ts                # formatCurrency, formatDate, etc.
    └── validations.ts          # Schemas Zod
```

---

## 🗃 Banco de Dados

O schema contém 11 tabelas:

```
users ──┬── accounts (OAuth)
        ├── sessions
        ├── bank_accounts ──── transactions ──── transaction_tags ── tags
        ├── categories ──────┘                └── recurring_transactions
        ├── budgets
        └── goals
```

### Comandos úteis

```bash
npm run db:generate    # Gera migration após alterar schema.ts
npm run db:migrate     # Aplica migrations pendentes
npm run db:push        # Push direto (sem migration — dev only)
npm run db:studio      # Abre Drizzle Studio (GUI)
```

---

## 📜 Scripts

```bash
npm run dev        # Desenvolvimento
npm run build      # Build de produção
npm run start      # Servidor de produção
npm run lint       # ESLint
```

---

## 🔐 Segurança

- Senhas armazenadas com **bcrypt** (12 rounds)
- Sessões assinadas com **JWT** (NextAuth)
- Todas as Server Actions verificam a sessão antes de qualquer operação
- Ownership validado nas operações de update/delete
- Variáveis sensíveis apenas no `.env` (nunca comitar)

---

## 🗺 Roadmap

- [ ] Transações recorrentes (schema já criado)
- [ ] Tags de transações (schema já criado)
- [ ] Exportação CSV / PDF nos relatórios
- [ ] Upload de comprovantes (campo `attachment_url` já existe)
- [ ] Paginação na listagem de transações
- [ ] Testes unitários e de integração
- [ ] Dark mode
- [ ] PWA / app mobile

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit: `git commit -m 'feat: adiciona minha feature'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

ISC © [Seu Nome]
