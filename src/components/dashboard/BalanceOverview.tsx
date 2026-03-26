'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { BankAccount } from '@/lib/db/schema'

interface BalanceOverviewProps {
  accounts: Pick<BankAccount, 'id' | 'name' | 'balance' | 'color'>[]
}

export function BalanceOverview({ accounts }: BalanceOverviewProps) {
  const chartData = accounts
    .filter(acc => parseFloat(acc.balance as string) !== 0)
    .map(acc => ({
      name: acc.name,
      value: parseFloat(acc.balance as string),
      color: acc.color || '#3B82F6',
    }))

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        Nenhuma conta cadastrada
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} layout="vertical">
        <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => formatCurrency(value as number)}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
