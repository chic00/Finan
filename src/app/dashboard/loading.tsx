export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-xl" style={{ backgroundColor: 'var(--color-secondary)' }} />
        <div className="h-4 w-64 rounded-xl" style={{ backgroundColor: 'var(--color-secondary)' }} />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl p-5 space-y-3"
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="h-4 w-24 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)' }} />
            <div className="h-7 w-32 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)' }} />
            <div className="h-3 w-20 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)' }} />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="h-5 w-40 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)' }} />
            <div className="h-48 rounded-xl" style={{ backgroundColor: 'var(--color-secondary)' }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4 p-4"
            style={{ borderBottom: i < 5 ? '1px solid var(--color-border)' : 'none' }}>
            <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ backgroundColor: 'var(--color-secondary)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)' }} />
              <div className="h-3 w-24 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)' }} />
            </div>
            <div className="h-5 w-20 rounded-lg" style={{ backgroundColor: 'var(--color-secondary)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
