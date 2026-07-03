import React from 'react';
import { formatNumber } from '@/lib/formatters';

export default function GatewayFunnel({ data }) {
  const stages = [
    { label: 'Received', value: data.received || 0, color: 'bg-blue-500' },
    { label: 'Validated', value: data.validated || 0, color: 'bg-cyan-500' },
    { label: 'Posted', value: data.posted || 0, color: 'bg-indigo-500' },
    { label: 'Sold', value: data.sold || 0, color: 'bg-emerald-500' },
    { label: 'Unsold', value: data.unsold || 0, color: 'bg-gray-500' },
    { label: 'DQ', value: data.dq || 0, color: 'bg-orange-500' },
    { label: 'Rejected', value: data.rejected || 0, color: 'bg-red-500' },
    { label: 'Error', value: data.error || 0, color: 'bg-red-600' },
  ];
  const max = Math.max(...stages.map(s => s.value), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {stages.map((s, i) => {
          const width = max > 0 ? Math.max((s.value / max) * 100, 4) : 4;
          return (
            <div key={s.label} className="flex-1 flex flex-col items-center">
              <div className="w-full h-16 flex items-end justify-center rounded-t" style={{ background: '#1A1E24' }}>
                <div className={`w-full ${s.color} rounded-t flex items-center justify-center text-white text-[10px] font-bold`} style={{ height: `${width}%`, minHeight: '20px' }}>
                  {formatNumber(s.value)}
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1 text-center truncate w-full">{s.label}</p>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Received → Validated → Posted →</span>
        <span className="text-emerald-400">Sold</span>
        <span>/</span>
        <span className="text-gray-400">Unsold</span>
        <span>/</span>
        <span className="text-orange-400">DQ</span>
        <span>/</span>
        <span className="text-red-400">Rejected</span>
        <span>/</span>
        <span className="text-red-500">Error</span>
      </div>
    </div>
  );
}