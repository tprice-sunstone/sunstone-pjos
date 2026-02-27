'use client';

export function CardSkeleton() {
  return (
    <div
      className="border border-[var(--border-default)] bg-[var(--surface-raised)] animate-pulse"
      style={{
        borderRadius: 'var(--card-radius, 16px)',
        boxShadow: 'var(--shadow-card)',
        padding: 18,
      }}
    >
      {/* Section label skeleton */}
      <div
        className="bg-[var(--surface-base)]"
        style={{ width: 70, height: 8, borderRadius: 4 }}
      />

      {/* Main content skeleton */}
      <div
        className="bg-[var(--surface-base)]"
        style={{ width: '60%', height: 20, borderRadius: 4, marginTop: 14 }}
      />
      <div
        className="bg-[var(--surface-base)]"
        style={{ width: '80%', height: 10, borderRadius: 4, marginTop: 10 }}
      />
      <div
        className="bg-[var(--surface-base)]"
        style={{ width: '50%', height: 10, borderRadius: 4, marginTop: 8 }}
      />

      {/* Action skeleton */}
      <div
        className="bg-[var(--surface-base)]"
        style={{ width: 80, height: 10, borderRadius: 4, marginTop: 16 }}
      />
    </div>
  );
}
