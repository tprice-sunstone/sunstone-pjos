'use client';

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-sm p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-[var(--surface-base)]" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-2/3 bg-[var(--surface-base)] rounded" />
          <div className="h-3 w-full bg-[var(--surface-base)] rounded" />
          <div className="h-3 w-1/2 bg-[var(--surface-base)] rounded" />
        </div>
      </div>
    </div>
  );
}
