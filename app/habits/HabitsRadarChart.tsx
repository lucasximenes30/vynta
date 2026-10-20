'use client'

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'

export default function HabitsRadarChart({ data }: { data: { subject: string; A: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="#e5e7eb" className="dark:stroke-surface-700/50" />
        <PolarAngleAxis 
          dataKey="subject" 
          tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }} 
        />
        <RechartsTooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(17, 24, 39, 0.95)', 
            border: '1px solid rgba(55, 65, 81, 0.5)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '12px'
          }}
          itemStyle={{ color: '#a855f7' }}
          formatter={(value) => [`${value}%`, 'Score']}
        />
        <Radar 
          name="Performance" 
          dataKey="A" 
          stroke="#a855f7" 
          strokeWidth={2}
          fill="#a855f7" 
          fillOpacity={0.35} 
          isAnimationActive={true}
          animationDuration={1500}
          animationEasing="ease-out"
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
