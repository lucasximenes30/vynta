import Image from 'next/image'

type BrandLogoSize = 'sm' | 'md' | 'lg'

interface BrandLogoProps {
  showText?: boolean
  size?: BrandLogoSize
  className?: string
  textClassName?: string
  priority?: boolean
}

const markSizeClasses: Record<BrandLogoSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
}

const textSizeClasses: Record<BrandLogoSize, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
}

const imageSizes: Record<BrandLogoSize, string> = {
  sm: '32px',
  md: '36px',
  lg: '40px',
}

export default function BrandLogo({
  showText = true,
  size = 'md',
  className,
  textClassName,
  priority = false,
}: BrandLogoProps) {
  const rootClassName = ['inline-flex items-center gap-2', className].filter(Boolean).join(' ')
  const labelClassName = [
    textSizeClasses[size],
    'font-semibold tracking-tight text-surface-900 dark:text-surface-100',
    textClassName,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClassName}>
      <div
        className={[
          'relative overflow-hidden rounded-xl border border-surface-200/80 bg-white p-1 shadow-sm',
          'dark:border-surface-700/70 dark:bg-surface-900',
          markSizeClasses[size],
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center text-xs font-bold text-brand-600 dark:text-brand-300"
        >
          V
        </span>
        <Image
          src="/assets/logo/logo-mark.png"
          alt="Vynta logo"
          fill
          priority={priority}
          sizes={imageSizes[size]}
          className="relative z-10 object-contain"
        />
      </div>
      {showText ? <span className={labelClassName}>Vynta</span> : null}
    </div>
  )
}
