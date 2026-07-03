import React from 'react';
import { getStatusColor } from '@/lib/formatters';

export default function StatusBadge({ status, size = 'sm' }) {
  if (!status) return null;
  const color = getStatusColor(status);
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  
  return (
    <span className={`inline-flex items-center rounded font-medium border ${color} ${sizeClass}`}>
      {status}
    </span>
  );
}