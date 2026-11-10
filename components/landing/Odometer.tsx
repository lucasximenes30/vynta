// Rolling-digit number (AbacatePay style): each digit is a 0–9 reel translated with CSS.
// Pure render — the parent decides when the value changes.
const DIGITS = '0123456789'.split('')

export default function Odometer({ value, className = '' }: { value: string; className?: string }) {
  const chars = value.split('')
  return (
    <span className={`inline-flex tabular-nums ${className}`} aria-label={value} role="img">
      {chars.map((ch, i) => {
        // Keyed from the right so the units keep their reel when the number gains a digit
        const key = chars.length - i
        if (!/\d/.test(ch)) return <span key={`s${key}`} aria-hidden>{ch === ' ' ? '\u00a0' : ch}</span>
        return (
          <span key={`d${key}`} className="odo-digit" aria-hidden>
            <span className="odo-reel" style={{ translate: `0 -${Number(ch)}em`, ['--d' as string]: `${(chars.length - i) * 40}ms` }}>
              {DIGITS.map((d) => <span key={d}>{d}</span>)}
            </span>
          </span>
        )
      })}
    </span>
  )
}
