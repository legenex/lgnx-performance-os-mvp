import React from 'react';
import { X } from 'lucide-react';

export default function FilterChips({ filters, onRemove }) {
  if (!filters || filters.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {filters.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border border-border"
          style={{ background: 'hsl(214, 18%, 23%)', color: '#AAB4C0' }}
        >
          <span className="text-muted-foreground">{f.label}:</span>
          <span className="text-foreground font-medium">{f.value}</span>
          <button
            onClick={() => onRemove(f.key)}
            className="ml-0.5 hover:text-critical transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
}