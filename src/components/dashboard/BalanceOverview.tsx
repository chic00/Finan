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
      color: acc.color || '#00d4aa',
    }))

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Nenhuma conta cadastrada
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} layout="vertical">
        <XAxis 
          type="number" 
          tickFormatter={(v) => formatCurrency(v)} 
          tick={{ fill: '#71717a', fontSize: 12 }}
          axisLine={{ stroke: '#27272a' }}
          tickLine={{ stroke: '#27272a' }}
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          width={100} 
          tick={{ fill: '#a1a1aa', fontSize: 12 }}
          axisLine={{ stroke: '#27272a' }}
          tickLine={{ stroke: '#27272a' }}
        />
        <Tooltip
          formatter={(value) => formatCurrency(value as number)}
          contentStyle={{
            backgroundColor: '#111118',
            border: '1px solid #27272a',
            borderRadius: '12px',
            color: '#fafafa',
          }}
          labelStyle={{ color: '#a1a1aa' }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
