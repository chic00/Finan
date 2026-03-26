'use client'

import { useState } from 'react'
import { BarChart3, Download, Calendar } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function RelatoriosPage() {
  const [period, setPeriod] = useState('month')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-500">Visualize relatórios detalhados das suas finanças</p>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <Calendar className="text-gray-400" size={20} />
        {['week', 'month', 'year', 'custom'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              period === p
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : p === 'year' ? 'Ano' : 'Personalizado'}
          </button>
        ))}
      </div>

      {/* Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-12">
        <div className="text-center">
          <BarChart3 className="mx-auto text-gray-300" size={64} />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Relatórios em breve</h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            Estamos preparando relatórios detalhados com gráficos, exportação CSV/PDF e filtros avançados.
          </p>
        </div>
      </div>
    </div>
  )
}
