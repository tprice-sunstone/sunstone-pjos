'use client';

import { useRef, useEffect } from 'react';

export interface MaterialTabsProps {
  materials: string[];
  selected: string | null;
  onSelect: (material: string | null) => void;
  showAll?: boolean;
}

export function MaterialTabs({ materials, selected, onSelect, showAll = true }: MaterialTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const tab = activeRef.current;
      const left = tab.offsetLeft - container.offsetLeft - 12;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [selected]);

  if (materials.length <= 1 && !showAll) return null;

  const activeClass = 'bg-[var(--accent-primary)] text-white border-transparent shadow-sm';
  const inactiveClass = 'bg-[var(--surface-raised)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]';

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {showAll && (
        <button
          ref={selected === null ? activeRef : undefined}
          onClick={() => onSelect(null)}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all min-h-[44px] ${
            selected === null ? activeClass : inactiveClass
          }`}
        >
          All
        </button>
      )}
      {materials.map((mat) => (
        <button
          key={mat}
          ref={selected === mat ? activeRef : undefined}
          onClick={() => onSelect(mat)}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all min-h-[44px] ${
            selected === mat ? activeClass : inactiveClass
          }`}
        >
          {mat}
        </button>
      ))}
    </div>
  );
}
