'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui';

interface ClientSearchProps {
  onSearch: (term: string) => void;
}

export default function ClientSearch({ onSearch }: ClientSearchProps) {
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(value);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, onSearch]);

  return (
    <div className="max-w-md">
      <Input
        placeholder="Search clients..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
