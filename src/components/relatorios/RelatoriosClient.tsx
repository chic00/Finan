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

const tooltipStyle = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '13px',
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-500">Últimos 6 meses</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-green-500" size={18} />
            <p className="text-sm text-gray-500">Total Receitas</p>
          </div>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="text-red-500" size={18} />
            <p className="text-sm text-gray-500">Total Despesas</p>
          </div>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-blue-500" size={18} />
            <p className="text-sm text-gray-500">Saldo Período</p>
          </div>
          <p className={`text-xl font-bold ${totalBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency(totalBalance)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowLeftRight className="text-purple-500" size={18} />
            <p className="text-sm text-gray-500">Transações</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{totalTransactions}</p>
          <p className="text-xs text-gray-400 mt-1">Taxa poupança: {savingsRate}%</p>
        </div>
      </div>

      {/* Receitas vs Despesas por mês */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-6">Receitas vs Despesas — Últimos 6 meses</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => formatCurrency(value as number)}
              contentStyle={tooltipStyle}
            />
            <Legend />
            <Bar dataKey="income" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Evolução do saldo */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-6">Evolução do Saldo Mensal</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => formatCurrency(value as number)}
              contentStyle={tooltipStyle}
            />
            <Line
              type="monotone"
              dataKey="balance"
              name="Saldo"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Despesas por categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-6">Despesas por Categoria (mês atual)</h2>
          {topCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={topCategories}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {topCategories.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={tooltipStyle}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              Nenhuma despesa este mês
            </div>
          )}
        </div>

        {/* Ranking de categorias */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Ranking de Gastos (mês atual)</h2>
          {topCategories.length > 0 ? (
            <div className="space-y-3">
              {topCategories.map((cat, i) => {
                const maxTotal = topCategories[0].total
                const pct = maxTotal > 0 ? Math.round((cat.total / maxTotal) * 100) : 0
                return (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs w-4">{i + 1}</span>
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                      <span className="font-medium text-gray-900">{formatCurrency(cat.total)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              Nenhuma despesa este mês
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
