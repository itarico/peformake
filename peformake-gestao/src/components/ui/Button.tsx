import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const button = cva(
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-45',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-on-brand enabled:hover:opacity-85',
        secondary: 'border border-line-strong bg-transparent font-medium text-ink enabled:hover:border-ink',
        link: 'px-1 font-medium text-ink underline underline-offset-2',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>

export function Button({ className, variant, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(button({ variant }), className)} {...props} />
}
