'use client';

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';
import { cn } from '@/lib/utils';

// ---------- Context ----------

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue>({
  activeTab: '',
  setActiveTab: () => {},
  baseId: '',
});

// ---------- Root ----------

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

let tabsCounter = 0;

export function Tabs({
  value,
  defaultValue = '',
  onChange,
  children,
  className,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [baseId] = useState(() => `tabs-${++tabsCounter}`);

  const activeTab = value !== undefined ? value : internalValue;

  const setActiveTab = useCallback(
    (newValue: string) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    },
    [value, onChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// ---------- TabsList ----------

export function TabsList({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const listRef = useRef<HTMLDivElement>(null);
  const { setActiveTab } = useContext(TabsContext);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const triggers = listRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]'
    );
    if (!triggers || triggers.length === 0) return;

    const currentIndex = Array.from(triggers).findIndex(
      (t) => t === document.activeElement
    );
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % triggers.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = triggers.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const next = triggers[nextIndex];
      next.focus();
      const val = next.getAttribute('data-value');
      if (val) setActiveTab(val);
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn(
        'flex border-b border-[var(--border-default)] gap-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ---------- TabsTrigger ----------

export interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: TabsTriggerProps) {
  const { activeTab, setActiveTab, baseId } = useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      type="button"
      tabIndex={isActive ? 0 : -1}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      id={`${baseId}-tab-${value}`}
      data-value={value}
      onClick={() => setActiveTab(value)}
      className={cn(
        'px-4 py-2.5 text-sm font-medium transition-colors duration-200 border-b-2 -mb-px min-h-[48px]',
        isActive
          ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
          : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------- TabsContent ----------

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: TabsContentProps) {
  const { activeTab, baseId } = useContext(TabsContext);

  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn('py-4 focus:outline-none', className)}
      {...props}
    >
      {children}
    </div>
  );
}