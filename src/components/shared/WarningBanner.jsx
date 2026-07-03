import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export default function WarningBanner({ type = 'warning', children }) {
  const isInfo = type === 'info';
  const Icon = isInfo ? Info : AlertTriangle;
  
  return (
    <div className={`flex items-start gap-2 px-4 py-3 rounded-lg text-xs ${
      isInfo 
        ? 'bg-info/10 border border-info/20 text-info'
        : 'bg-warning/10 border border-warning/20 text-warning'
    }`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}