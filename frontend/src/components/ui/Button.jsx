/* =========================================================================
   BUTTON — Premium glass / gradient interactive button
   Variants: primary (gradient + glow), secondary (glass), ghost, danger
   ========================================================================= */
import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  primary: `
    text-text-inverse border-transparent font-semibold
    bg-[linear-gradient(135deg,#5EEAD4_0%,#2DD4BF_55%,#22B8A6_100%)]
    shadow-[0_1px_0_rgba(255,255,255,.4)_inset,0_8px_20px_-6px_rgba(45,212,191,.55)]
    hover:shadow-[0_1px_0_rgba(255,255,255,.5)_inset,0_10px_28px_-4px_rgba(45,212,191,.7)]
  `,
  secondary: `
    glass text-text-primary
    hover:bg-white/[0.07] hover:border-border-strong
  `,
  ghost: 'bg-transparent border-transparent text-text-secondary hover:bg-white/[0.06] hover:text-text-primary',
  danger: `
    text-white border-transparent font-semibold
    bg-[linear-gradient(135deg,#FF6B6B_0%,#FB4B4B_100%)]
    shadow-[0_8px_20px_-6px_rgba(251,75,75,.5)]
  `,
};

const sizes = {
  default: 'h-[38px] px-4 text-[13.5px]',
  compact: 'h-[30px] px-2.5 text-[12px]',
  icon: 'h-[38px] w-[38px] p-0 flex items-center justify-center',
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
    <motion.button
      whileHover={disabled ? {} : { scale: 1.015, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ duration: 0.15, ease: [0.16, 0.84, 0.32, 1] }}
      className={`
        inline-flex items-center justify-center gap-1.5
        rounded-[var(--radius-md)] border
        transition-[background,border-color,box-shadow] duration-[180ms] ease-[var(--ease-default)]
        cursor-pointer select-none
        disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
        focus-visible:outline-1 focus-visible:outline-border-focus focus-visible:outline-offset-2
        ${variants[variant] || variants.secondary}
        ${sizes[size] || sizes.default}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
