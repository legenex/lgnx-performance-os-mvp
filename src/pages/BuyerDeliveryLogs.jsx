import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import { Button } from '@/components/ui/button';
import { formatMoney, formatNumber, formatPercent } from '@/lib/formatters';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function BuyerDeliveryLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ buyer: '', status: '' });

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    try {
      const data = await base44.entities.BuyerDeliveryLog.list('-attempted_at', 500);
      setLogs(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filter.buyer && l.buyer_name !== filter.buyer) return false;
      if (filter.status && l.status !== filter.status) return false;
      return true;
    });
  }, [logs, filter]);

  const buyers = useMemo(() => [...new Set(logs.map(l => l.buyer_name).filter(Boolean))], [logs]);

  // Buyer summary
  const buyerSummary = useMemo(() => {
    const groups = {};
    logs.forEach(l => {
      if (!groups[l.buyer_name]) groups[l.buyer_name] = { total: 0, sold: 0, failed: 0, timeout: 0, rejected: 0, responseTime: [], price: 0 };
      const g = groups[l.buyer_name];
      g.total++;
      if (l.status === 'Sold') g.sold++;
      if (l.status === 'Failed') g.failed++;
      if (l.status === 'Timeout') g.timeout++;
      if (l.status === 'Rejected' || l.status === 'DQ') g.rejected++;
      if (l.response_time_ms) g.responseTime.push(l.response_time_ms);
      if (l.sold) g.price += (l.buyer_price || 0);
    });
    return Object.entries(groups).map(([buyer, g]) => ({
      buyer,
      total: g.total,
      sold: g.sold,
      failed: g.failed,
      timeout: g.timeout,
      rejected: g.rejected,
      errorRate: g.total > 0 ? ((g.failed + g.timeout) / g.total) * 100 : 0,
      acceptanceRate: g.total > 0 ? (g.sold / g.total) * 100 : 0,
      avgResponseMs: g.responseTime.length > 0 ? Math.round(g.responseTime.reduce((a, b) => a + b, 0) / g.responseTime.length) : 0,
      totalRevenue: g.price,
    }));
  }, [logs]);

  async function retryDelivery(log) {
    try {
      await base44.entities.BuyerDeliveryLog.create({
        gateway_lead_id: log.gateway_lead_id,
        lead_key: log.lead_key,
        leadbyte_id: log.leadbyte_id,
        buyer_name: log.buyer_name,
        buyer_id: log.buyer_id,
        delivery_method: log.delivery_method,
        endpoint: log.endpoint,
        attempted_at: new Date().toISOString(),
        status: 'Pending',
        retry_count: (log.retry_count || 0) + 1,
      });
      await loadLogs();
    } catch (err) { console.error(err); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Buyer Delivery Logs</h1>
        <p className="text-xs text-muted-foreground mt-1">Delivery attempts, error rates, and buyer acceptance</p>
      </div>

      {/* Buyer Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {buyerSummary.map((b, i) => (
          <div key={i} className="rounded-lg border border-border p-3" style={{ background: '#14171C' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">{b.buyer}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${b.errorRate > 20 ? 'bg-red-500/20 text-red-400' : b.errorRate > 5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {b.errorRate.toFixed(0)}% err
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[10px]">
              <div><p className="text-muted-foreground">Total</p><p className="font-bold tabular-nums">{formatNumber(b.total)}</p></div>
              <div><p className="text-muted-foreground">Sold</p><p className="font-bold tabular-nums text-emerald-400">{formatNumber(b.sold)}</p></div>
              <div><p className="text-muted-foreground">Failed</p><p className="font-bold tabular-nums text-red-400">{formatNumber(b.failed + b.timeout)}</p></div>
              <div><p className="text-muted-foreground">Accept</p><p className="font-bold tabular-nums">{formatPercent(b.acceptanceRate)}</p></div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
              <span className="text-[10px] text-muted-foreground">Avg response: <span className="text-foreground tabular-nums">{b.avgResponseMs}ms</span></span>
              <span className="text-[10px] text-muted-foreground">Revenue: <span className="text-emerald-400 tabular-nums">{formatMoney(b.totalRevenue)}</span></span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select value={filter.buyer} onChange={e => setFilter({ ...filter, buyer: e.target.value })} className="h-8 px-2 text-xs rounded border border-input bg-secondary">
          <option value="">All Buyers</option>
          {buyers.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })} className="h-8 px-2 text-xs rounded border border-input bg-secondary">
          <option value="">All Statuses</option>
          {['Success', 'Failed', 'Timeout', 'Rejected', 'Duplicate', 'Sold', 'Unsold', 'DQ', 'Pending'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Delivery Logs Table */}
      <SectionPanel title="Delivery Attempts" subtitle={`${formatNumber(filtered.length)} attempts`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-2">Attempted At</th>
                <th className="pb-2 pr-2">Lead Key</th>
                <th className="pb-2 pr-2">Buyer</th>
                <th className="pb-2 pr-2">Method</th>
                <th className="pb-2 pr-2">Endpoint</th>
                <th className="pb-2 pr-2">Status</th>
                <th className="pb-2 pr-2 text-right">HTTP</th>
                <th className="pb-2 pr-2 text-right">Response</th>
                <th className="pb-2 pr-2 text-right">Price</th>
                <th className="pb-2 pr-2 text-center">Sold</th>
                <th className="pb-2 pr-2 text-center">Retry</th>
                <th className="pb-2 pr-2">Error</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((l, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-1.5 pr-2 text-muted-foreground whitespace-nowrap">{l.attempted_at ? new Date(l.attempted_at).toLocaleString() : '—'}</td>
                  <td className="py-1.5 pr-2 font-mono text-[10px]">{l.lead_key || '—'}</td>
                  <td className="py-1.5 pr-2 font-medium">{l.buyer_name}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground">{l.delivery_method}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground text-[10px] max-w-32 truncate">{l.endpoint || '—'}</td>
                  <td className="py-1.5 pr-2"><DeliveryStatusBadge status={l.status} /></td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{l.http_status || '—'}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{l.response_time_ms || 0}ms</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(l.buyer_price)}</td>
                  <td className="py-1.5 pr-2 text-center">{l.sold ? '✓' : '—'}</td>
                  <td className="py-1.5 pr-2 text-center tabular-nums">{l.retry_count || 0}</td>
                  <td className="py-1.5 pr-2 text-red-400 text-[10px] max-w-32 truncate">{l.error_message || '—'}</td>
                  <td className="py-1.5">
                    {['Failed', 'Timeout', 'Rejected'].includes(l.status) && !l.final_attempt && (
                      <Button variant="ghost" size="sm" className="text-[9px] h-6 gap-1" onClick={() => retryDelivery(l)}>
                        <RefreshCw className="w-3 h-3" /> Retry
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
}

function DeliveryStatusBadge({ status }) {
  const colors = {
    'Sold': 'bg-emerald-500/20 text-emerald-400',
    'Success': 'bg-emerald-500/20 text-emerald-400',
    'Failed': 'bg-red-500/20 text-red-400',
    'Timeout': 'bg-red-500/20 text-red-400',
    'Rejected': 'bg-orange-500/20 text-orange-400',
    'DQ': 'bg-orange-500/20 text-orange-400',
    'Unsold': 'bg-gray-500/20 text-gray-400',
    'Duplicate': 'bg-yellow-500/20 text-yellow-400',
    'Pending': 'bg-blue-500/20 text-blue-400',
  };
  return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>{status}</span>;
}