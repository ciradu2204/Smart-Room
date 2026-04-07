const dotColor = {
  available: 'bg-emerald-600',
  occupied: 'bg-rose-600',
  upcoming: 'bg-amber-500',
  pending: 'bg-amber-500',
  released: 'bg-gray-400',
}

export default function StatusDot({ status, className = '' }) {
  return (
    <span
      className={`status-dot ${dotColor[status] || 'bg-gray-400'} ${className}`}
      aria-label={status}
    />
  )
}
