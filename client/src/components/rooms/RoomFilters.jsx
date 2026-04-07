const statusOptions = ['All', 'Available', 'Occupied']

const capacityOptions = [
  { label: 'Any capacity', value: '' },
  { label: 'Up to 5', value: '0-5' },
  { label: '6–10', value: '6-10' },
  { label: '11–20', value: '11-20' },
  { label: '20+', value: '20+' },
]

export default function RoomFilters({ filters, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {statusOptions.map((option) => {
        const isActive = filters.status === option
        return (
          <button
            key={option}
            onClick={() => onChange({ ...filters, status: option })}
            className={`text-sm px-3 py-1.5 rounded-full font-medium transition-colors duration-150 ${
              isActive
                ? 'bg-gray-900 text-white'
                : 'btn-secondary !rounded-full'
            }`}
          >
            {option}
          </button>
        )
      })}

      <select
        value={filters.capacity}
        onChange={(e) => onChange({ ...filters, capacity: e.target.value })}
        className="input text-sm !w-auto !py-1.5 !px-3 !rounded-full"
      >
        {capacityOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
