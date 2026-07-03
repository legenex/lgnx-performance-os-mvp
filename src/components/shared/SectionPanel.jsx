import React from 'react';

export default function SectionPanel({ title, subtitle, children, actions, className = '' }) {
  return (
    <div className={`rounded-xl border border-border ${className}`} style={{ background: 'hsl(213, 17%, 20%)' }}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}