'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface CategoryChartProps {
  data: Record<string, { amount: number; color: string }>
}

export function CategoryChart({ data }: CategoryChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value: value.amount,
    color: value.color,
  }))

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Nenhuma despesa registrada este mes
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
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
        <Legend 
          formatter={(value) => <span style={{ color: '#a1a1aa', fontSize: '12px' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
