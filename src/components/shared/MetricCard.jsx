import React from 'react';
import { formatMoney, moneyColor } from '@/lib/formatters';

export default function MetricCard({ title, value, label, icon: Icon, sublabel, onClick, className = '' }) {
  const isMoney = typeof value === 'number' || (typeof value === 'string' && value.startsWith('$'));
  const numValue = typeof value === 'number' ? value : null;
  
  return (
    <div 
      className={`rounded-lg border border-border p-4 ${onClick ? 'cursor-pointer hover:border-[#E4262C]/30 transition-colors' : ''} ${className}`}
      style={{ background: '#1c2128' }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{title}</span>
        {label && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium uppercase ${
            label === 'CASH' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
          }`}>{label}</span>
        )}
        {Icon && !label && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className={`text-xl font-bold tabular-nums ${numValue !== null ? moneyColor(numValue) : 'text-foreground'}`}>
        {numValue !== null ? formatMoney(numValue) : value}
      </div>
      {sublabel && (
        <div className="text-[11px] text-muted-foreground mt-1">{sublabel}</div>
      )}
    </div>
  );
}