import { forwardRef } from 'react'

const variantClass = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
}

const sizeClass = {
  sm: 'px-3 py-1.5 text-sm',
  md: '',
  lg: 'px-5 py-2.5 text-base',
}

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})

export default Button
