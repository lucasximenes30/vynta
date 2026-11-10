'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Odometer from './Odometer'

const INCOMES = [1500, 2000, 3000, 4000, 5000, 7000, 10000, 15000]
const PERCENTS = [5, 10, 15, 20, 30]

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function Pill({ value, onChange, options, label, tone }: { value: number; onChange: (v: number) => void; options: { v: number; t: string }[]; label: string; tone: string }) {
  return (
    <span className={`relative mx-1 inline-flex items-center rounded-2xl px-3 align-baseline ${tone}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="cursor-pointer appearance-none bg-transparent pr-6 font-semibold outline-none [&>option]:bg-[#0d0e14] [&>option]:text-base [&>option]:text-white"
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 opacity-70" />
    </span>
  )
}

// Interactive "mad-lib" savings calculator. Honest arithmetic only (income × % × 12), no promises.
export default function SavingsSimulator() {
  const [income, setIncome] = useState(4000)
  const [percent, setPercent] = useState(10)
  const [seen, setSeen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect() }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const monthly = Math.round((income * percent) / 100)
  const yearly = monthly * 12
  // Same digits as zeros until the block is on screen, so every reel rolls up from 0
  const shown = seen ? brl(yearly) : brl(yearly).replace(/\d/g, '0')

  return (
    <div ref={ref} className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 sm:p-10">
      <p className="font-display text-[1.6rem] font-semibold leading-[1.6] tracking-tight text-white sm:text-4xl sm:leading-[1.5]">
        Eu ganho
        <Pill label="Quanto você ganha por mês" value={income} onChange={setIncome} tone="bg-brand-500/20 text-brand-200" options={INCOMES.map((v) => ({ v, t: brl(v) }))} />
        por mês e quero guardar
        <Pill label="Quanto quer guardar" value={percent} onChange={setPercent} tone="bg-emerald-500/15 text-emerald-300" options={PERCENTS.map((v) => ({ v, t: `${v}%` }))} />
        dele.
      </p>
      <div className="mt-8 border-t border-white/10 pt-6">
        <p className="text-sm text-surface-400">Em 12 meses, você junta</p>
        <p className="mt-1 font-display text-5xl font-semibold tracking-tight text-emerald-300 sm:text-6xl">
          <Odometer value={shown} />
        </p>
        <p className="mt-3 text-sm leading-relaxed text-surface-400">
          São <span className="font-semibold text-white">{brl(monthly)} por mês</span>. Parece pouco, mas só acontece se você souber pra onde vai o resto.
        </p>
      </div>
    </div>
  )
}
