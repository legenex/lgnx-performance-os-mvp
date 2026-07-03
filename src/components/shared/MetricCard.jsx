import React from 'react';
import { formatMoney, moneyColor } from '@/lib/formatters';

export default function MetricCard({ title, value, label, icon: Icon, sublabel, onClick, className = '' }) {
  const numValue = typeof value === 'number' ? value : null;

  return (
    <div
      className={`bg-card border border-border rounded-[10px] p-5 ${onClick ? 'cursor-pointer hover:border-primary/30 transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{title}</span>
        {label && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium uppercase ${
            label === 'CASH' ? 'bg-success/10 text-success' : 'bg-info/10 text-info'
          }`}>{label}</span>
        )}
        {Icon && !label && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className={`text-xl font-bold tabular-nums ${numValue !== null ? moneyColor(numValue) : 'text-foreground'}`}>
        {numValue !== null ? formatMoney(numValue) : value}
      </div>
      {sublabel && <div className="text-[11px] text-muted-foreground mt-1">{sublabel}</div>}
    </div>
  );
}