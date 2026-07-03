import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import StatusBadge from '@/components/shared/StatusBadge';
import WarningBanner from '@/components/shared/WarningBanner';
import { formatMoney, moneyColor } from '@/lib/formatters';

export default function MediaGap() {
  const [adSpend, setAdSpend] = useState([]);
  const [bankTxns, setBankTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [ads, txns] = await Promise.all([
        base44.entities.AdSpend.list(undefined, 500),
        base44.entities.BankTransaction.list(undefined, 500),
      ]);
      setAdSpend(ads.filter(a => !a.superseded));
      setBankTxns(txns);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Group by platform x month
  const platforms = ['Meta', 'Google', 'Taboola', 'Other'];
  const months = [...new Set(adSpend.map(a => a.date ? a.date.substring(0, 7) : null).filter(Boolean))].sort();

  const mediaPayments = bankTxns.filter(t => t.cash_type === 'Media Spend');
  const leadflowPayments = bankTxns.filter(t => (t.counterparty || '').toLowerCase().includes('leadflow') || (t.description || '').toLowerCase().includes('leadflow'));

  // Build gap data
  const gapData = [];
  platforms.forEach(platform => {
    months.forEach(month => {
      const tracked = adSpend.filter(a => a.platform === platform && a.date && a.date.startsWith(month)).reduce((s, a) => s + (a.cost || 0), 0);
      if (tracked === 0) return;
      
      // Paid: media spend bank txns matching platform
      const paid = mediaPayments
        .filter(t => t.date && t.date.startsWith(month) && (
          (platform === 'Meta' && ((t.description || '').toLowerCase().includes('facebook') || (t.description || '').toLowerCase().includes('meta'))) ||
          (platform === 'Google' && (t.description || '').toLowerCase().includes('google')) ||
          (platform === 'Taboola' && (t.description || '').toLowerCase().includes('taboola'))
        ))
        .reduce((s, t) => s + Math.abs(t.amount), 0);

      const leadflowPaid = month ? leadflowPayments
        .filter(t => t.date && t.date.startsWith(month))
        .reduce((s, t) => s + Math.abs(t.amount), 0) : 0;

      const gap = tracked - paid - (platform === 'Meta' ? leadflowPaid : 0);
      const status = gap > 5000 ? 'Critical' : gap > 2000 ? 'Review' : 'OK';

      gapData.push({ platform, month, tracked, paid, leadflowPaid: platform === 'Meta' ? leadflowPaid : 0, gap, status });
    });
  });

  // Platform totals
  const platformTotals = {};
  platforms.forEach(p => {
    const rows = gapData.filter(r => r.platform === p);
    platformTotals[p] = {
      tracked: rows.reduce((s, r) => s + r.tracked, 0),
      paid: rows.reduce((s, r) => s + r.paid, 0),
      leadflow: rows.reduce((s, r) => s + r.leadflowPaid, 0),
      gap: rows.reduce((s, r) => s + r.gap, 0),
    };
  });

  const totalGap = gapData.reduce((s, r) => s + r.gap, 0);
  const totalTracked = gapData.reduce((s, r) => s + r.tracked, 0);
  const totalPaid = gapData.reduce((s, r) => s + r.paid, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Media Gap</h1>
        <p className="text-xs text-muted-foreground mt-1">Tracked ad spend vs cash paid — detect unexplained media payables</p>
      </div>

      <WarningBanner>Tracked spend is not always paid spend. This page identifies gaps between what ad platforms report and what was actually paid from bank accounts.</WarningBanner>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Tracked Spend" value={totalTracked} label="BOOKED" />
        <MetricCard title="Total Paid Spend" value={totalPaid} label="CASH" />
        <MetricCard title="LeadFlow Payments" value={leadflowPayments.reduce((s, t) => s + Math.abs(t.amount), 0)} label="CASH" />
        <MetricCard title="Unexplained Gap" value={totalGap} label="CASH" className={totalGap > 10000 ? 'border-red-500/30' : ''} />
      </div>

      {/* Platform Summary */}
      <SectionPanel title="Gap by Platform" subtitle="H1 totals">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="pb-2 pr-3">Platform</th>
              <th className="pb-2 pr-3 text-right">Tracked <span className="text-[9px] text-blue-400">BOOKED</span></th>
              <th className="pb-2 pr-3 text-right">Paid Own Accts <span className="text-[9px] text-emerald-400">CASH</span></th>
              <th className="pb-2 pr-3 text-right">LeadFlow Paid <span className="text-[9px] text-emerald-400">CASH</span></th>
              <th className="pb-2 pr-3 text-right">Gap</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {platforms.map(p => {
              const d = platformTotals[p] || { tracked: 0, paid: 0, leadflow: 0, gap: 0 };
              if (d.tracked === 0) return null;
              const status = d.gap > 10000 ? 'Critical' : d.gap > 2000 ? 'Review' : 'OK';
              return (
                <tr key={p} className="border-b border-border/30">
                  <td className="py-2.5 pr-3 font-medium">{p}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{formatMoney(d.tracked)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-400">{formatMoney(d.paid)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-400">{formatMoney(d.leadflow)}</td>
                  <td className={`py-2.5 pr-3 text-right tabular-nums font-medium ${d.gap > 5000 ? 'text-red-400' : d.gap > 2000 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {formatMoney(d.gap)}
                  </td>
                  <td className="py-2.5"><StatusBadge status={status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionPanel>

      {/* Monthly Detail */}
      <SectionPanel title="Monthly Detail" subtitle="Platform × Month">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3">Platform</th>
                <th className="pb-2 pr-3">Month</th>
                <th className="pb-2 pr-3 text-right">Tracked</th>
                <th className="pb-2 pr-3 text-right">Paid</th>
                <th className="pb-2 pr-3 text-right">LeadFlow</th>
                <th className="pb-2 pr-3 text-right">Gap</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {gapData.map((r, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="py-1.5 pr-3">{r.platform}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{r.month}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{formatMoney(r.tracked)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-emerald-400">{formatMoney(r.paid)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-emerald-400">{formatMoney(r.leadflowPaid)}</td>
                  <td className={`py-1.5 pr-3 text-right tabular-nums font-medium ${r.gap > 5000 ? 'text-red-400' : r.gap > 2000 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {formatMoney(r.gap)}
                  </td>
                  <td className="py-1.5"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
}