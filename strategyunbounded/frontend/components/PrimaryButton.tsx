import { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export default function PrimaryButton({ children, className = '', disabled, ...rest }: Props) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center gap-2 font-bold rounded-full px-10 py-4 text-base transition-all duration-300 ${
        disabled
          ? 'bg-[#D1D5DB] text-white cursor-not-allowed'
          : 'bg-gradient-action text-white hover:shadow-glow hover:-translate-y-px'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
