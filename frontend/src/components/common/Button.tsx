import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
};

/** Also used to style <Link>s as buttons. */
export const buttonStyles = (variant: Variant = 'primary', size: Size = 'md') =>
  `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]}`;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
}

export function Button({ variant, size, isLoading, leftIcon, className = '', disabled, children, ...rest }: ButtonProps) {
  return (
    <button className={`${buttonStyles(variant, size)} ${className}`} disabled={disabled || isLoading} {...rest}>
      {isLoading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : leftIcon}
      {children}
    </button>
  );
}
