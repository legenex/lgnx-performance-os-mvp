import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatMoney, formatPercent, moneyColor } from '@/lib/formatters';

export default function SupplierPerformance() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [feedHealth, setFeedHealth] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [gatewayLeads, health] = await Promise.all([
        base44.entities.GatewayLead.list('-received_at', 500).catch(() => []),
        base44.entities.SupplierFeedHealth.list('-date', 100).catch(() => []),
      ]);
      setLeads(gatewayLeads || []);
      setFeedHealth(health || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const tableData = useMemo(() => {
    const bySupplier = {};
    leads.forEach(l => {
      const sid = l.supplier_sid || 'UNKNOWN';
      if (!bySupplier[sid]) bySupplier[sid] = { supplier: l.supplier_source || sid, sid, leads: 0, sold: 0, dq: 0, returned: 0, revenue: 0, payoutAccrued: 0 };
      bySupplier[sid].leads++;
      if (l.lead_status === 'Sold') bySupplier[sid].sold++;
      if (l.lead_status === 'Disqualified' || l.lead_status === 'DQ') bySupplier[sid].dq++;
      if (l.lead_status === 'Returned') bySupplier[sid].returned++;
      bySupplier[sid].revenue += l.lead_revenue || 0;
      bySupplier[sid].payoutAccrued += l.supplier_payout || 0;
    });
    return Object.values(bySupplier).map(s => {
      const sellThrough = s.leads > 0 ? (s.sold / s.leads) * 100 : 0;
      const dqRate = s.leads > 0 ? (s.dq / s.leads) * 100 : 0;
      const returnRate = s.sold > 0 ? (s.returned / s.sold) * 100 : 0;
      const grossMargin = s.revenue - s.payoutAccrued;
      const qualityScore = Math.round(sellThrough * 0.3 + (100 - dqRate) * 0.3 + (100 - returnRate) * 0.2 + (grossMargin > 0 ? 20 : 0));
      const verdict = qualityScore >= 70 ? 'STAR' : qualityScore >= 50 ? 'OK' : qualityScore >= 30 ? 'REVIEW TERMS' : 'PAUSE';
      const healthRecord = feedHealth.find(h => h.supplier_sid === s.sid);
      return { ...s, sellThrough, dqRate, returnRate, grossMargin, payoutPaid: healthRecord?.payout || 'UNKNOWN', arrears: 'UNKNOWN', qualityScore, verdict };
    });
  }, [leads, feedHealth]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Supplier Performance</h1>
        <p className="text-xs text-muted-foreground mt-1">Sell-through, quality, payout, and margin by supplier</p>
      </div>
      <DataTable
        exportFileName="supplier_performance"
        data={tableData}
        columns={[
          { key: 'supplier', label: 'Supplier' },
          { key: 'sid', label: 'SID' },
          { key: 'leads', label: 'Leads', align: 'right' },
          { key: 'sold', label: 'Sold', align: 'right' },
          { key: 'sellThrough', label: 'Sell-through %', align: 'right', render: v => formatPercent(v) },
          { key: 'dqRate', label: 'DQ %', align: 'right', render: v => formatPercent(v) },
          { key: 'returnRate', label: 'Return %', align: 'right', render: v => formatPercent(v) },
          { key: 'revenue', label: 'Revenue', align: 'right', render: v => <span className={moneyColor(v)}>{formatMoney(v)}</span> },
          { key: 'payoutAccrued', label: 'Payout Accrued', align: 'right', render: v => <span className={moneyColor(v)}>{formatMoney(v)}</span> },
          { key: 'payoutPaid', label: 'Payout Paid', align: 'right' },
          { key: 'grossMargin', label: 'Gross Margin', align: 'right', render: v => <span className={moneyColor(v)}>{formatMoney(v)}</span> },
          { key: 'arrears', label: 'Arrears', align: 'right' },
          { key: 'qualityScore', label: 'Quality Score', align: 'right' },
          { key: 'verdict', label: 'Verdict', render: v => <StatusBadge status={v} /> },
        ]}
      />
    </div>
  );
}