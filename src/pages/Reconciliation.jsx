import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatMoney, moneyColor } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Check, X, AlertTriangle, GitCompare } from 'lucide-react';

export default function Reconciliation() {
  const [items, setItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [reconItems, alts] = await Promise.all([
        base44.entities.ReconciliationItem.list('-created_at', 100),
        base44.entities.Alert.filter({ status: 'Open' }),
      ]);
      setItems(reconItems);
      setAlerts(alts);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function resolveItem(item) {
    await base44.entities.ReconciliationItem.update(item.id, { status: 'Resolved' });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'Resolved' } : i));
  }

  async function ignoreItem(item) {
    await base44.entities.ReconciliationItem.update(item.id, { status: 'Ignored' });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'Ignored' } : i));
  }

  const openItems = items.filter(i => i.status === 'Open');
  const byType = {};
  openItems.forEach(i => {
    if (!byType[i.type]) byType[i.type] = [];
    byType[i.type].push(i);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Reconciliation</h1>
        <p className="text-xs text-muted-foreground mt-1">Cross-system parity checks and open items</p>
      </div>

      {/* Parity Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['AR Match', 'AP Match', 'Bank Match', 'Media Gap', 'Xero Match', 'Supplier Variance', 'Lead Variance'].map(type => {
          const count = (byType[type] || []).length;
          return (
            <div key={type} className="rounded-lg border border-border p-3" style={{ background: '#14171C' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-muted-foreground">{type}</span>
                {count > 0 ? <AlertTriangle className="w-3 h-3 text-yellow-400" /> : <Check className="w-3 h-3 text-emerald-400" />}
              </div>
              <div className={`text-lg font-bold tabular-nums ${count > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {count}
              </div>
              <div className="text-[10px] text-muted-foreground">{count > 0 ? 'open items' : 'clear'}</div>
            </div>
          );
        })}
      </div>

      {/* Alert Rules */}
      <SectionPanel title="Alert Rules" subtitle="Automated monitoring">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {[
            'Unmatched bank transaction older than 48h → Alert',
            'Unpaid invoice past due → Alert',
            'Supplier balance rising week-over-week → Alert',
            'Media gap above $2,000 → Alert',
            'Xero sync error → Alert',
            'Sold lead with zero revenue after 48h → Alert',
            'Revenue on non-sold lead → Alert',
          ].map((rule, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded" style={{ background: '#1A1E24' }}>
              <GitCompare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{rule}</span>
            </div>
          ))}
        </div>
      </SectionPanel>

      {/* Open Alerts */}
      <SectionPanel title="Open Alerts" subtitle={`${alerts.length} alerts`}>
        {alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No open alerts</p>
        ) : (
          <div className="space-y-1.5">
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-start justify-between p-2 rounded" style={{ background: '#1A1E24' }}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 ${alert.severity === 'Critical' ? 'text-red-400' : 'text-orange-400'}`} />
                  <div>
                    <p className="text-xs">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={alert.severity} />
                      <span className="text-[10px] text-muted-foreground">{alert.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>

      {/* Open Reconciliation Items */}
      <SectionPanel title="Open Reconciliation Items" subtitle={`${openItems.length} open`}>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="pb-2 pr-3">Type</th>
              <th className="pb-2 pr-3">Description</th>
              <th className="pb-2 pr-3 text-right">Source</th>
              <th className="pb-2 pr-3 text-right">Target</th>
              <th className="pb-2 pr-3 text-right">Variance</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-border/30">
                <td className="py-2 pr-3"><StatusBadge status={item.type} /></td>
                <td className="py-2 pr-3 max-w-48 truncate">{item.description}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(item.source_value)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(item.target_value)}</td>
                <td className={`py-2 pr-3 text-right tabular-nums font-medium ${moneyColor(-(Math.abs(item.variance || 0)))}`}>{formatMoney(item.variance)}</td>
                <td className="py-2 pr-3"><StatusBadge status={item.status} /></td>
                <td className="py-2">
                  {item.status === 'Open' && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] text-emerald-400" onClick={() => resolveItem(item)}>Resolve</Button>
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] text-muted-foreground" onClick={() => ignoreItem(item)}>Ignore</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionPanel>
    </div>
  );
}