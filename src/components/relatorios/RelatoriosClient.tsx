'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, ArrowLeftRight, Calendar } from 'lucide-react'

interface MonthlyPoint  { label: string; income: number; expense: number; balance: number }
interface CategoryPoint { name: string; color: string; total: number }

interface RelatoriosClientProps {
  monthlyData:       MonthlyPoint[]
  topCategories:     CategoryPoint[]
  totalIncome:       number
  totalExpense:      number
  totalTransactions: number
  currentFrom:       string   // 'YYYY-MM-DD'
  currentTo:         string   // 'YYYY-MM-DD'
}

// Presets rápidos
function getPreset(key: string): { from: string; to: string } {
  const now   = new Date()
  const yyyy  = now.getFullYear()
  const mm    = now.getMonth()
  const pad   = (n: number) => String(n).padStart(2, '0')
  const ymd   = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  switch (key) {
    case '1m':
      return { from: ymd(new Date(yyyy, mm, 1)),     to: ymd(new Date(yyyy, mm + 1, 0)) }
    case '3m':
      return { from: ymd(new Date(yyyy, mm - 2, 1)), to: ymd(new Date(yyyy, mm + 1, 0)) }
    case '6m':
      return { from: ymd(new Date(yyyy, mm - 5, 1)), to: ymd(new Date(yyyy, mm + 1, 0)) }
    case '12m':
      return { from: ymd(new Date(yyyy, mm - 11, 1)),to: ymd(new Date(yyyy, mm + 1, 0)) }
    case 'ytd':
      return { from: `${yyyy}-01-01`,                to: ymd(new Date(yyyy, mm + 1, 0)) }
    default:
      return { from: ymd(new Date(yyyy, mm - 5, 1)), to: ymd(new Date(yyyy, mm + 1, 0)) }
  }
}

const PRESETS = [
  { key: '1m',  label: 'Este mês' },
  { key: '3m',  label: '3 meses' },
  { key: '6m',  label: '6 meses' },
  { key: '12m', label: '12 meses' },
  { key: 'ytd', label: 'Este ano' },
]

export function RelatoriosClient({
  monthlyData,
  topCategories,
  totalIncome,
  totalExpense,
  totalTransactions,
  currentFrom,
  currentTo,
}: RelatoriosClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [from, setFrom] = useState(currentFrom)
  const [to,   setTo  ] = useState(currentTo)

  const totalBalance = totalIncome - totalExpense
  const savingsRate  = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0

  const applyFilter = (f: string, t: string) => {
    setFrom(f); setTo(t)
    startTransition(() => {
      router.push(`/dashboard/relatorios?from=${f}&to=${t}`)
    })
  }

  const tooltipStyle = {
    backgroundColor: 'var(--color-card)',
    border:          '1px solid var(--color-border)',
    borderRadius:    '12px',
    fontSize:        '13px',
    color:           'var(--color-foreground)',
  }

  const kpis = [
    {
      icon:  <TrendingUp  size={18} style={{ color: 'var(--color-success)' }} />,
      label: 'Total Receitas',
      value: formatCurrency(totalIncome),
      color: 'var(--color-success)',
      bg:    'color-mix(in srgb, var(--color-success) 10%, transparent)',
    },
    {
      icon:  <TrendingDown size={18} style={{ color: 'var(--color-destructive)' }} />,
      label: 'Total Despesas',
      value: formatCurrency(totalExpense),
      color: 'var(--color-destructive)',
      bg:    'color-mix(in srgb, var(--color-destructive) 10%, transparent)',
    },
    {
      icon:  <DollarSign size={18} style={{ color: 'var(--color-primary)' }} />,
      label: 'Saldo Período',
      value: formatCurrency(totalBalance),
      color: totalBalance >= 0 ? 'var(--color-primary)' : 'var(--color-destructive)',
      bg:    'color-mix(in srgb, var(--color-primary) 10%, transparent)',
    },
    {
      icon:  <ArrowLeftRight size={18} style={{ color: 'var(--color-warning)' }} />,
      label: 'Transações',
      value: String(totalTransactions),
      sub:   `Taxa poupança: ${savingsRate}%`,
      color: 'var(--color-foreground)',
      bg:    'color-mix(in srgb, var(--color-warning) 10%, transparent)',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Relatórios</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
          Análise do período selecionado
        </p>
      </div>

      {/* ── Filtro de período ─────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            Período
          </span>
          {isPending && (
            <span className="text-xs px-2 py-0.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: 'var(--color-primary)' }}>
              Carregando…
            </span>
          )}
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => {
            const preset   = getPreset(p.key)
            const isActive = preset.from === from && preset.to === to
            return (
              <button key={p.key} onClick={() => applyFilter(preset.from, preset.to)}
                className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-secondary)',
                  color:           isActive ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
                  border:          isActive ? 'none' : '1px solid var(--color-border)',
                }}>
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Datas customizadas */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>De</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-sm theme-input" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Até</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-sm theme-input" />
          </div>
          <button
            onClick={() => applyFilter(from, to)}
            disabled={isPending}
            className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 glow-primary"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
            Aplicar
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="rounded-2xl p-5 transition-all"
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.bg }}>
                {kpi.icon}
              </div>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{kpi.label}</p>
            </div>
            <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            {kpi.sub && <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h2 className="font-semibold mb-6" style={{ color: 'var(--color-foreground)' }}>
          Receitas vs Despesas
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
            <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
            <Tooltip formatter={value => formatCurrency(value as number)} contentStyle={tooltipStyle} cursor={{ fill: 'color-mix(in srgb, var(--color-foreground) 5%, transparent)' }} />
            <Legend formatter={value => <span style={{ color: 'var(--color-muted-foreground)', fontSize: 12 }}>{value}</span>} />
            <Bar dataKey="income"  name="Receitas" fill="var(--color-success)"     radius={[4,4,0,0]} />
            <Bar dataKey="expense" name="Despesas" fill="var(--color-destructive)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line chart */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h2 className="font-semibold mb-6" style={{ color: 'var(--color-foreground)' }}>
          Evolução do Saldo
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
            <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
            <Tooltip formatter={value => formatCurrency(value as number)} contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="balance" name="Saldo" stroke="var(--color-primary)" strokeWidth={2.5}
              dot={{ fill: 'var(--color-primary)', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: 'var(--color-primary)', strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pie + ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h2 className="font-semibold mb-6" style={{ color: 'var(--color-foreground)' }}>
            Despesas por Categoria
          </h2>
          {topCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={topCategories} dataKey="total" nameKey="name" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={100} paddingAngle={2}>
                  {topCategories.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={value => formatCurrency(value as number)} contentStyle={tooltipStyle} />
                <Legend formatter={value => <span style={{ color: 'var(--color-muted-foreground)', fontSize: 12 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Nenhuma despesa no período
            </div>
          )}
        </div>

        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h2 className="font-semibold mb-5" style={{ color: 'var(--color-foreground)' }}>
            Ranking de Gastos
          </h2>
          {topCategories.length > 0 ? (
            <div className="space-y-3">
              {topCategories.map((cat, i) => {
                const pct = topCategories[0].total > 0 ? Math.round((cat.total / topCategories[0].total) * 100) : 0
                return (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="flex items-center gap-2">
                        <span className="text-xs w-4" style={{ color: 'var(--color-muted-foreground)' }}>{i + 1}</span>
                        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                        <span style={{ color: 'var(--color-foreground)' }}>{cat.name}</span>
                      </span>
                      <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>{formatCurrency(cat.total)}</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--color-border)' }}>
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Nenhuma despesa no período
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
