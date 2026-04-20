'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, ArrowLeftRight } from 'lucide-react'

interface MonthlyPoint {
  label: string
  income: number
  expense: number
  balance: number
}

interface CategoryPoint {
  name: string
  color: string
  total: number
}

interface RelatoriosClientProps {
  monthlyData: MonthlyPoint[]
  topCategories: CategoryPoint[]
  totalIncome: number
  totalExpense: number
  totalTransactions: number
}

export function RelatoriosClient({
  monthlyData,
  topCategories,
  totalIncome,
  totalExpense,
  totalTransactions,
}: RelatoriosClientProps) {
  const totalBalance = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0

  const tooltipStyle = {
    backgroundColor: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    fontSize: '13px',
    color: 'var(--color-foreground)',
  }

  const kpis = [
    {
      icon: <TrendingUp size={18} style={{ color: 'var(--color-success)' }} />,
      label: 'Total Receitas',
      value: formatCurrency(totalIncome),
      color: 'var(--color-success)',
      bg: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
    },
    {
      icon: <TrendingDown size={18} style={{ color: 'var(--color-destructive)' }} />,
      label: 'Total Despesas',
      value: formatCurrency(totalExpense),
      color: 'var(--color-destructive)',
      bg: 'color-mix(in srgb, var(--color-destructive) 10%, transparent)',
    },
    {
      icon: <DollarSign size={18} style={{ color: 'var(--color-primary)' }} />,
      label: 'Saldo Período',
      value: formatCurrency(totalBalance),
      color: totalBalance >= 0 ? 'var(--color-primary)' : 'var(--color-destructive)',
      bg: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
    },
    {
      icon: <ArrowLeftRight size={18} style={{ color: 'var(--color-warning)' }} />,
      label: 'Transações',
      value: String(totalTransactions),
      sub: `Taxa poupança: ${savingsRate}%`,
      color: 'var(--color-foreground)',
      bg: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Relatórios</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>Últimos 6 meses</p>
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
        <h2 className="font-semibold mb-6" style={{ color: 'var(--color-foreground)' }}>Receitas vs Despesas — Últimos 6 meses</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
            <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
            <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={tooltipStyle} cursor={{ fill: 'color-mix(in srgb, var(--color-foreground) 5%, transparent)' }} />
            <Legend formatter={(value) => <span style={{ color: 'var(--color-muted-foreground)', fontSize: 12 }}>{value}</span>} />
            <Bar dataKey="income" name="Receitas" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Despesas" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line chart */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h2 className="font-semibold mb-6" style={{ color: 'var(--color-foreground)' }}>Evolução do Saldo Mensal</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
            <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
            <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="balance" name="Saldo" stroke="var(--color-primary)" strokeWidth={2.5}
              dot={{ fill: 'var(--color-primary)', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: 'var(--color-primary)', strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pie + ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h2 className="font-semibold mb-6" style={{ color: 'var(--color-foreground)' }}>Despesas por Categoria (mês atual)</h2>
          {topCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={topCategories} dataKey="total" nameKey="name" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={100} paddingAngle={2}>
                  {topCategories.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={tooltipStyle} />
                <Legend formatter={(value) => <span style={{ color: 'var(--color-muted-foreground)', fontSize: 12 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Nenhuma despesa este mês
            </div>
          )}
        </div>

        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h2 className="font-semibold mb-5" style={{ color: 'var(--color-foreground)' }}>Ranking de Gastos (mês atual)</h2>
          {topCategories.length > 0 ? (
            <div className="space-y-3">
              {topCategories.map((cat, i) => {
                const maxTotal = topCategories[0].total
                const pct = maxTotal > 0 ? Math.round((cat.total / maxTotal) * 100) : 0
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
              Nenhuma despesa este mês
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
