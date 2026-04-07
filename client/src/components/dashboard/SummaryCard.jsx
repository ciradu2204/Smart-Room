import Skeleton from '../ui/Skeleton'

export default function SummaryCard({ label, value, detail, loading }) {
  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg p-5 bg-white">
        <Skeleton width="60%" height="0.875rem" className="mb-2" />
        <Skeleton width="40%" height="2rem" className="mb-1.5" />
        <Skeleton width="50%" height="0.75rem" />
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-white">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-semibold text-gray-900 mt-1">{value}</p>
      {detail && <p className="text-xs text-gray-400 mt-1">{detail}</p>}
    </div>
  )
}
