import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import { formatMoney, formatPercent, formatNumber } from '@/lib/formatters';
import { Shield, AlertTriangle, TrendingDown } from 'lucide-react';

export default function SupplierFeedHealth() {
  const [feeds, setFeeds] = useState([]);
  const [apEntries, setApEntries] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [fh, ap, sups] = await Promise.all([
        base44.entities.SupplierFeedHealth.list('-date', 200),
        base44.entities.APEntry.list(),
        base44.entities.Supplier.list(),
      ]);
      setFeeds(fh);
      setApEntries(ap);
      setSuppliers(sups);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Aggregate by supplier (most recent date)
  const supplierStats = useMemo(() => {
    const groups = {};
    feeds.forEach(f => {
      if (!groups[f.supplier_sid || f.supplier_name]) groups[f.supplier_sid || f.supplier_name] = [];
      groups[f.supplier_sid || f.supplier_name].push(f);
    });
    return Object.entries(groups).map(([key, records]) => {
      const latest = records.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
      const totalRev = records.reduce((s, r) => s + (r.revenue || 0), 0);
      const totalPayout = records.reduce((s, r) => s + (r.payout || 0), 0);
      const totalMargin = records.reduce((s, r) => s + (r.gross_margin || 0), 0);
      const totalReceived = records.reduce((s, r) => s + (r.received_count || 0), 0);
      const totalSold = records.reduce((s, r) => s + (r.sold_count || 0), 0);
      const apBalance = apEntries
        .filter(e => e.supplier_sid === key || e.supplier_name === latest.supplier_name)
        .reduce((s, e) => s + (e.amount || 0), 0);
      return { ...latest, totalRev, totalPayout, totalMargin, totalReceived, totalSold, apBalance, records };
    });
  }, [feeds, apEntries]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Supplier Feed Health</h1>
        <p className="text-xs text-muted-foreground mt-1">Quality, margin, and risk by supplier</p>
      </div>

      {/* Protect Supplier Alerts */}
      {supplierStats.filter(s => s.quality_score >= 7 && s.apBalance > 5000).map((s, i) => (
        <div key={i} className="flex items-start gap-2 px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <Shield className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-orange-300 font-medium">Protect Supplier: {s.supplier_name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Quality score {s.quality_score?.toFixed(1)}/10 with {formatPercent(s.sell_through_rate * 100)} sell-through, but AP balance is {formatMoney(s.apBalance)}. 
              Profitable feed at payment risk — prioritize supplier payment to maintain feed.
            </p>
          </div>
        </div>
      ))}

      {/* Summary Table */}
      <SectionPanel title="Supplier Feed Summary" subtitle={`${supplierStats.length} suppliers`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-2">Supplier</th>
                <th className="pb-2 pr-2">SID</th>
                <th className="pb-2 pr-2">Status</th>
                <th className="pb-2 pr-2 text-right">Received</th>
                <th className="pb-2 pr-2 text-right">Posted</th>
                <th className="pb-2 pr-2 text-right">Sold</th>
                <th className="pb-2 pr-2 text-right">DQ</th>
                <th className="pb-2 pr-2 text-right">Ret</th>
                <th className="pb-2 pr-2 text-right">Fake</th>
                <th className="pb-2 pr-2 text-right">Sell-Through</th>
                <th className="pb-2 pr-2 text-right">DQ Rate</th>
                <th className="pb-2 pr-2 text-right">Ret Rate</th>
                <th className="pb-2 pr-2 text-right">Quality</th>
                <th className="pb-2 pr-2 text-right">Revenue</th>
                <th className="pb-2 pr-2 text-right">Payout</th>
                <th className="pb-2 pr-2 text-right">Margin</th>
                <th className="pb-2 pr-2 text-right">AP Bal</th>
                <th className="pb-2 pr-2 text-right">Resp Time</th>
                <th className="pb-2 pr-2 text-right">Errors</th>
              </tr>
            </thead>
            <tbody>
              {supplierStats.map((s, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-2 pr-2 font-medium">{s.supplier_name}</td>
                  <td className="py-2 pr-2 text-muted-foreground font-mono text-[10px]">{s.supplier_sid || '—'}</td>
                  <td className="py-2 pr-2"><FeedStatusBadge status={s.status} /></td>
                  <td className="py-2 pr-2 text-right tabular-nums">{formatNumber(s.totalReceived)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{formatNumber(s.posted_count || 0)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-success">{formatNumber(s.totalSold)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-orange-400">{formatNumber(s.dq_count || 0)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-yellow-400">{formatNumber(s.returned_count || 0)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-critical">{formatNumber(s.fake_count || 0)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{formatPercent(s.sell_through_rate * 100)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{formatPercent(s.dq_rate * 100)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{formatPercent(s.return_rate * 100)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums font-medium">{s.quality_score?.toFixed(1) || '—'}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{formatMoney(s.totalRev)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-orange-400">{formatMoney(s.totalPayout)}</td>
                  <td className={`py-2 pr-2 text-right tabular-nums font-medium ${s.totalMargin < 0 ? 'text-critical' : 'text-success'}`}>{formatMoney(s.totalMargin)}</td>
                  <td className={`py-2 pr-2 text-right tabular-nums ${s.apBalance > 5000 ? 'text-critical font-bold' : 'text-muted-foreground'}`}>{formatMoney(s.apBalance)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{s.avg_response_time_ms || 0}ms</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-critical">{s.error_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Trend by Day */}
      <SectionPanel title="Daily Trend by Supplier" subtitle="Received and sold counts over time">
        <div className="space-y-2">
          {supplierStats.slice(0, 5).map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-medium w-32 truncate">{s.supplier_name}</span>
              <div className="flex-1 flex gap-0.5">
                {s.records.slice(0, 30).reverse().map((r, j) => {
                  const height = Math.max((r.received_count || 0) * 2, 2);
                  const soldHeight = Math.max((r.sold_count || 0) * 2, 0);
                  return (
                    <div key={j} className="relative flex flex-col justify-end" style={{ height: '24px' }} title={`${r.date}: ${r.received_count} received, ${r.sold_count} sold`}>
                      <div className="w-2 bg-blue-500/40 rounded-t" style={{ height: `${height}px` }} />
                      <div className="w-2 bg-emerald-500/60 -mt-0.5 rounded-b" style={{ height: `${soldHeight}px` }} />
                    </div>
                  );
                })}
              </div>
              <span className="text-[10px] text-muted-foreground">30d</span>
            </div>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}

function FeedStatusBadge({ status }) {
  const colors = {
    'Healthy': 'bg-emerald-500/20 text-success',
    'Watch': 'bg-yellow-500/20 text-yellow-400',
    'Critical': 'bg-red-500/20 text-critical',
    'Paused': 'bg-gray-500/20 text-gray-400',
    'Unknown': 'bg-gray-500/20 text-gray-400',
  };
  return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${colors[status] || colors['Unknown']}`}>{status}</span>;
}