/* =========================================================================
   BUTTON — Clean Standardized Control
   Variants: primary (Blue 600), secondary (White/Slate 200), ghost (Slate 100), danger (Red)
   ========================================================================= */
import React from 'react';

const variants = {
  primary: `
    bg-blue-600 text-white font-medium border border-blue-600
    hover:bg-blue-700 active:bg-blue-800 shadow-sm
  `,
  secondary: `
    bg-white text-slate-800 font-medium border border-slate-200
    hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 shadow-sm
  `,
  ghost: `
    bg-transparent text-slate-600 font-medium border border-transparent
    hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200
  `,
  danger: `
    bg-red-50 text-red-700 font-medium border border-red-200
    hover:bg-red-100 active:bg-red-200
  `,
  dangerSolid: `
    bg-red-600 text-white font-medium border border-red-600
    hover:bg-red-700 active:bg-red-800 shadow-sm
  `,
};

const sizes = {
  default: 'h-10 px-4 text-[14px]',
  compact: 'h-8 px-3 text-[13px]',
  icon: 'h-9 w-9 p-0 flex items-center justify-center',
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
        inline-flex items-center justify-center gap-2
        rounded-lg transition-colors duration-150
        cursor-pointer select-none
        disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
        focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2
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
