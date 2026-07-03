import React from 'react';

export default function CashBookedPill({ type, size = 'sm' }) {
  if (!type) return null;
  const isCash = type === 'CASH' || type === 'cash';
  const sizeClass = size === 'sm' ? 'text-[8px] px-1 py-0.5' : 'text-[9px] px-1.5 py-1';
  return (
    <span className={`inline-flex items-center rounded font-medium uppercase ${sizeClass} ${
      isCash
        ? 'bg-success/10 text-success'
        : 'bg-info/10 text-info'
    }`}>
      {isCash ? 'CASH' : 'BOOKED'}
    </span>
  );
}