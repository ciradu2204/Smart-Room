const colorMap = {
  available: 'bg-emerald-50 text-emerald-700',
  occupied: 'bg-rose-50 text-rose-700',
  pending: 'bg-amber-50 text-amber-700',
  released: 'bg-gray-100 text-gray-600',
  info: 'bg-sky-50 text-sky-700',
  neutral: 'bg-gray-100 text-gray-700',
}

export default function Badge({ color = 'neutral', className = '', children }) {
  return (
    <span className={`badge ${colorMap[color] || colorMap.neutral} ${className}`}>
      {children}
    </span>
  )
}
