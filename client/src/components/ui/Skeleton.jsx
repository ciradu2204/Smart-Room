export default function Skeleton({
  width,
  height = '1rem',
  rounded = false,
  className = '',
}) {
  return (
    <div
      className={`animate-skeleton ${rounded ? 'rounded-full' : ''} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.875rem"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`card flex flex-col gap-3 ${className}`}>
      <Skeleton height="1.25rem" width="40%" />
      <SkeletonText lines={2} />
      <Skeleton height="2rem" width="30%" />
    </div>
  )
}
