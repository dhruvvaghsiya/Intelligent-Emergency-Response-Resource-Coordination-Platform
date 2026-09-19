/* =========================================================================
   BUTTON — §14.2 Component Rules
   Height 32px (28px compact), radius 4px, font 13/500
   Variants: primary (accent fill), secondary (surface+border), ghost, danger
   ========================================================================= */
import React from 'react';

const variants = {
  primary: 'bg-accent text-text-inverse hover:bg-accent-hover border-transparent',
  secondary: 'bg-surface border-border-subtle text-text-primary hover:bg-hover hover:border-border-strong',
  ghost: 'bg-transparent border-transparent text-text-secondary hover:bg-hover hover:text-text-primary',
  danger: 'bg-sev-critical text-white hover:bg-red-600 border-transparent',
};

const sizes = {
  default: 'h-[32px] px-3 text-[13px]',
  compact: 'h-[28px] px-2 text-[12px]',
  icon: 'h-[32px] w-[32px] p-0 flex items-center justify-center',
};

export function Button({
  children,
  variant = 'secondary',
  size = 'default',
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-1.5
        font-medium rounded-[4px] border
        transition-colors duration-[140ms] ease-[var(--ease-default)]
        cursor-pointer select-none
        disabled:opacity-40 disabled:cursor-not-allowed
        focus-visible:outline-1 focus-visible:outline-border-focus focus-visible:outline-offset-2
        ${variants[variant] || variants.secondary}
        ${sizes[size] || sizes.default}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
