import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatMoney, formatPercent, moneyColor } from '@/lib/formatters';

export default function SupplierLedger() {
  const [suppliers, setSuppliers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [apEntries, setApEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [supps, lds, aps] = await Promise.all([
        base44.entities.Supplier.list(),
        base44.entities.Lead.list(undefined, 500),
        base44.entities.APEntry.list(undefined, 500),
      ]);
      setSuppliers(supps);
      setLeads(lds);
      setApEntries(aps);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Build supplier ledger
  const ledger = {};
  suppliers.forEach(s => {
    ledger[s.name] = {
      supplier: s,
      opening: 0, accruals: 0, payments: 0, adjustments: 0, closing: 0,
      totalLeads: 0, soldLeads: 0, dqLeads: 0, returnedLeads: 0,
      revenue: 0, payout: 0, grossMargin: 0, verdict: 'OK',
    };
  });

  // AP entries
  apEntries.forEach(e => {
    const key = e.supplier_name;
    if (!ledger[key]) ledger[key] = { supplier: { name: key }, opening: 0, accruals: 0, payments: 0, adjustments: 0, closing: 0, totalLeads: 0, soldLeads: 0, dqLeads: 0, returnedLeads: 0, revenue: 0, payout: 0, grossMargin: 0, verdict: 'OK' };
    if (e.entry_type === 'Opening Balance') ledger[key].opening += (e.amount || 0);
    else if (e.entry_type === 'Accrual') ledger[key].accruals += (e.amount || 0);
    else if (e.entry_type === 'Payment') ledger[key].payments += (e.amount || 0);
    else if (e.entry_type === 'Adjustment') ledger[key].adjustments += (e.amount || 0);
  });

  // Leads
  leads.forEach(l => {
    const key = l.supplier_source || l.supplier_brand;
    if (!key || !ledger[key]) return;
    ledger[key].totalLeads++;
    if (l.lead_status === 'Sold') { ledger[key].soldLeads++; ledger[key].revenue += (l.lead_revenue || 0); ledger[key].payout += (l.supplier_payout || 0); }
    if (l.lead_status === 'Disqualified') ledger[key].dqLeads++;
    if (l.lead_status === 'Returned') ledger[key].returnedLeads++;
  });

  // Calculations
  Object.values(ledger).forEach(l => {
    l.closing = l.opening + l.accruals + l.payments + l.adjustments;
    l.grossMargin = l.revenue - l.payout;
    const sellThru = l.totalLeads > 0 ? (l.soldLeads / l.totalLeads) * 100 : 0;
    const dqRate = l.totalLeads > 0 ? (l.dqLeads / l.totalLeads) * 100 : 0;
    const returnRate = l.soldLeads > 0 ? (l.returnedLeads / l.soldLeads) * 100 : 0;
    l.sellThru = sellThru;
    l.dqRate = dqRate;
    l.returnRate = returnRate;

    if (sellThru > 60 && l.grossMargin > 30000) l.verdict = 'STAR';
    else if (dqRate > 30 || returnRate > 20) l.verdict = 'REVIEW TERMS';
    else if (l.closing > 30000 && sellThru < 40) l.verdict = 'PAUSE';
    else l.verdict = 'OK';
  });

  const sorted = Object.values(ledger).sort((a, b) => b.closing - a.closing);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Supplier Ledger</h1>
        <p className="text-xs text-muted-foreground mt-1">Per-supplier P&L, balances, and verdicts</p>
      </div>

      <SectionPanel title="Supplier Performance" subtitle={`${sorted.length} suppliers`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3">Supplier</th>
                <th className="pb-2 pr-3">Verdict</th>
                <th className="pb-2 pr-3 text-right">Opening</th>
                <th className="pb-2 pr-3 text-right">Accruals</th>
                <th className="pb-2 pr-3 text-right">Payments</th>
                <th className="pb-2 pr-3 text-right">Closing</th>
                <th className="pb-2 pr-3 text-right">Leads</th>
                <th className="pb-2 pr-3 text-right">Sold</th>
                <th className="pb-2 pr-3 text-right">Sell %</th>
                <th className="pb-2 pr-3 text-right">DQ %</th>
                <th className="pb-2 pr-3 text-right">Return %</th>
                <th className="pb-2 pr-3 text-right">Revenue <span className="text-[9px] text-blue-400">B</span></th>
                <th className="pb-2 pr-3 text-right">Payout <span className="text-[9px] text-blue-400">B</span></th>
                <th className="pb-2 text-right">Margin <span className="text-[9px] text-blue-400">B</span></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((l, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-2 pr-3 font-medium">{l.supplier.name}</td>
                  <td className="py-2 pr-3"><StatusBadge status={l.verdict} /></td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{formatMoney(l.opening)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-orange-400">{formatMoney(l.accruals)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{formatMoney(l.payments)}</td>
                  <td className={`py-2 pr-3 text-right tabular-nums font-medium ${l.closing > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>{formatMoney(l.closing)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{l.totalLeads}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{l.soldLeads}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatPercent(l.sellThru)}</td>
                  <td className={`py-2 pr-3 text-right tabular-nums ${l.dqRate > 20 ? 'text-red-400' : ''}`}>{formatPercent(l.dqRate)}</td>
                  <td className={`py-2 pr-3 text-right tabular-nums ${l.returnRate > 15 ? 'text-red-400' : ''}`}>{formatPercent(l.returnRate)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(l.revenue)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-orange-400">{formatMoney(l.payout)}</td>
                  <td className={`py-2 text-right tabular-nums font-medium ${moneyColor(l.grossMargin)}`}>{formatMoney(l.grossMargin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
}