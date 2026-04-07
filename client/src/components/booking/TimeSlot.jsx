export default function TimeSlot({ index, actualHour, day, onSelect }) {
  function handleClick() {
    onSelect({ day, hour: actualHour })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      className="absolute left-0 right-0 h-[60px] cursor-pointer group"
      style={{ top: `${index * 60}px` }}
      aria-label={`Book at ${actualHour}:00`}
    >
      <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 bg-gray-50 transition-opacity duration-150 rounded">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
    </div>
  )
}
