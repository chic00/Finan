'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
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
      <div className="h-64 flex items-center justify-center text-gray-400">
        Nenhuma despesa registrada este mês
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
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
