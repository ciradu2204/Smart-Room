import { forwardRef } from 'react'

const Input = forwardRef(function Input(
  { label, error, className = '', ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <input ref={ref} className={`input ${className}`} {...props} />
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  )
})

export default Input
