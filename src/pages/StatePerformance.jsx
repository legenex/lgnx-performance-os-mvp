import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatMoney, formatPercent, moneyColor } from '@/lib/formatters';

export default function StatePerformance() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await base44.entities.GatewayLead.list('-received_at', 500).catch(() => []);
      setLeads(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const tableData = useMemo(() => {
    const byState = {};
    leads.forEach(l => {
      const state = l.accident_state || l.geo_state || 'UNKNOWN';
      if (!byState[state]) byState[state] = { state, leads: 0, sold: 0, returned: 0, revenue: 0, payout: 0, buyers: new Set() };
      byState[state].leads++;
      if (l.lead_status === 'Sold') byState[state].sold++;
      if (l.lead_status === 'Returned') byState[state].returned++;
      byState[state].revenue += l.lead_revenue || 0;
      byState[state].payout += l.supplier_payout || 0;
      if (l.buyer_name) byState[state].buyers.add(l.buyer_name);
    });
    return Object.values(byState).map(s => {
      const soldRate = s.leads > 0 ? (s.sold / s.leads) * 100 : 0;
      const margin = s.revenue - s.payout;
      const returnRate = s.sold > 0 ? (s.returned / s.sold) * 100 : 0;
      const buyerCoverage = s.buyers.size;
      const verdict = soldRate >= 50 && margin > 0 ? 'SCALE' : soldRate >= 30 ? 'WATCH' : soldRate > 0 ? 'CUT' : 'UNKNOWN';
      return { state: s.state, leads: s.leads, sold: s.sold, soldRate, revenue: s.revenue, payout: s.payout, margin, returnRate, buyerCoverage, verdict };
    });
  }, [leads]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">State Performance</h1>
        <p className="text-xs text-muted-foreground mt-1">Lead volume, sell-through, margin, and buyer coverage by state</p>
      </div>
      <DataTable
        exportFileName="state_performance"
        data={tableData}
        columns={[
          { key: 'state', label: 'State' },
          { key: 'leads', label: 'Leads', align: 'right' },
          { key: 'sold', label: 'Sold', align: 'right' },
          { key: 'soldRate', label: 'Sold Rate', align: 'right', render: v => formatPercent(v) },
          { key: 'revenue', label: 'Revenue', align: 'right', render: v => <span className={moneyColor(v)}>{formatMoney(v)}</span> },
          { key: 'payout', label: 'Payout', align: 'right', render: v => <span className={moneyColor(v)}>{formatMoney(v)}</span> },
          { key: 'margin', label: 'Margin', align: 'right', render: v => <span className={moneyColor(v)}>{formatMoney(v)}</span> },
          { key: 'returnRate', label: 'Return Rate', align: 'right', render: v => formatPercent(v) },
          { key: 'buyerCoverage', label: 'Buyer Coverage', align: 'right' },
          { key: 'verdict', label: 'Verdict', render: v => <StatusBadge status={v} /> },
        ]}
      />
    </div>
  );
}