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
    'font-display font-semibold tracking-[-0.04em]',
    textClassName || 'text-surface-900 dark:text-surface-100',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClassName}>
      <div className={['relative', markSizeClasses[size]].filter(Boolean).join(' ')}>
        <Image
          src="/assets/logo/broto-mark.png"
          alt="Vynta — broto"
          fill
          priority={priority}
          sizes={imageSizes[size]}
          className="relative z-10 rounded-[28%] object-contain"
        />
      </div>
      {showText ? <span className={labelClassName}>Vynta</span> : null}
    </div>
  )
}
