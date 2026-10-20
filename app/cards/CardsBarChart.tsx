'use client'

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts'

export default function CardsBarChart({ chartData }: { chartData: { name: string; fatura: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888815" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          dy={10}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickFormatter={(val) => `${'R$'}${val}`}
          dx={-5}
        />
        <Tooltip 
          cursor={{ fill: '#88888810' }}
          contentStyle={{ 
            backgroundColor: 'var(--tooltip-bg, #1f2937)', 
            border: '1px solid var(--tooltip-border, rgba(255,255,255,0.1))', 
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '500',
            color: '#f3f4f6',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          itemStyle={{ color: '#e5e7eb', fontWeight: 'bold' }}
          labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
          formatter={(val: any) => [`${'R$'}${parseFloat(val).toLocaleString('pt-BR')}`, 'Fatura']}
        />
        <Bar dataKey="fatura" radius={[6, 6, 0, 0]} maxBarSize={48} barSize={36}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} className="hover:fill-opacity-100 transition-all duration-300" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
