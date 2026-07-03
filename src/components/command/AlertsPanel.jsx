import React from 'react';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { AlertTriangle } from 'lucide-react';

export default function AlertsPanel({ alerts = [] }) {
  return (
    <SectionPanel title="Critical Alerts" subtitle={`${alerts.length} open`}>
      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No critical alerts</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.slice(0, 10).map((alert, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded" style={{ background: '#22272e' }}>
              <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                alert.severity === 'Critical' ? 'text-red-400' : 'text-orange-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground">{alert.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={alert.severity} />
                  <span className="text-[10px] text-muted-foreground">{alert.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionPanel>
  );
}