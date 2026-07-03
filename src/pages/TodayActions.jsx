import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatMoney } from '@/lib/formatters';
import { CheckCircle2, AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TodayActions() {
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [alerts, gatewayErrors, overdueInv, failedDeliveries] = await Promise.all([
        base44.entities.AdAlert.filter({ status: 'Open' }).catch(() => []),
        base44.entities.GatewayError.filter({ status: 'Open' }).catch(() => []),
        base44.entities.ARInvoice.filter({ status: 'Overdue' }).catch(() => []),
        base44.entities.BuyerDeliveryLog.filter({ status: 'Failed' }).catch(() => []),
      ]);
      const items = [];
      alerts.slice(0, 5).forEach(a => items.push({ type: 'Ad Alert', severity: a.severity, title: a.message, link: '/ad-intelligence-command', action: 'Review' }));
      gatewayErrors.slice(0, 5).forEach(e => items.push({ type: 'Gateway Error', severity: e.severity, title: e.message, link: '/gateway/error-queue', action: 'Retry' }));
      overdueInv.slice(0, 5).forEach(i => items.push({ type: 'Overdue AR', severity: 'High', title: `${i.buyer_name || 'Buyer'} — ${formatMoney(i.outstanding_amount)}`, link: '/receivables', action: 'Chase' }));
      failedDeliveries.slice(0, 5).forEach(d => items.push({ type: 'Delivery Failed', severity: 'High', title: `${d.buyer_name} — ${d.error_message || 'Unknown error'}`, link: '/gateway/buyer-delivery', action: 'Retry' }));
      setActions(items);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Today's Actions</h1>
        <p className="text-xs text-muted-foreground mt-1">Prioritized tasks requiring immediate attention</p>
      </div>
      <SectionPanel title={`Action Items (${actions.length})`}>
        {actions.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-success py-4"><CheckCircle2 className="w-5 h-5" /> All clear — no pending actions.</div>
        ) : (
          <div className="space-y-1.5">
            {actions.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'hsl(214, 18%, 23%)' }}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-4 h-4 ${a.severity === 'Critical' || a.severity === 'High' ? 'text-critical' : 'text-warning'}`} />
                  <div>
                    <p className="text-xs font-medium">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground">{a.type}</p>
                  </div>
                </div>
                <Link to={a.link} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                  {a.action} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}