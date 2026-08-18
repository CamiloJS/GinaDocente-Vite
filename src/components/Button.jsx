// src/components/Button.jsx
import React from 'react'

const variants = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-xs",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-xs",
  success: "bg-green-600 hover:bg-green-700 text-white shadow-xs",
  ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
  outline: "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700",
  brand: "bg-[#AD3333] hover:bg-[#8a2828] text-white shadow-sm",
}

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg min-h-[32px]",
  md: "px-4 py-2.5 text-sm rounded-xl min-h-[44px]",
  lg: "px-6 py-3 text-base rounded-xl min-h-[48px]",
  icon: "p-2.5 rounded-xl min-h-[44px] min-w-[44px]",
  iconSm: "p-1.5 rounded-lg min-h-[32px] min-w-[32px]",
}

const Button = ({ variant = 'primary', size = 'md', children, className = '', disabled, ...props }) => {
  return (
    <button
      className={`font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
