import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import DataTable from '@/components/shared/DataTable';
import { formatMoney, formatPercent, moneyColor } from '@/lib/formatters';

export default function LeadQuality() {
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
    const bySegment = {};
    leads.forEach(l => {
      const segment = l.supplier_source || l.supplier_sid || 'UNKNOWN';
      const key = `Supplier|${segment}`;
      if (!bySegment[key]) bySegment[key] = { dimension: 'Supplier', segment, leads: 0, sold: 0, dq: 0, returned: 0, fake: 0, verifiedPhone: 0, revenue: 0, payout: 0 };
      bySegment[key].leads++;
      if (l.lead_status === 'Sold') bySegment[key].sold++;
      if (l.lead_status === 'Disqualified' || l.lead_status === 'DQ') bySegment[key].dq++;
      if (l.lead_status === 'Returned') bySegment[key].returned++;
      if (l.lead_status === 'Fake') bySegment[key].fake++;
      if (l.phone && l.phone.length >= 10) bySegment[key].verifiedPhone++;
      bySegment[key].revenue += l.lead_revenue || 0;
      bySegment[key].payout += l.supplier_payout || 0;
    });
    // Also group by state
    leads.forEach(l => {
      const segment = l.accident_state || l.geo_state || 'UNKNOWN';
      const key = `State|${segment}`;
      if (!bySegment[key]) bySegment[key] = { dimension: 'State', segment, leads: 0, sold: 0, dq: 0, returned: 0, fake: 0, verifiedPhone: 0, revenue: 0, payout: 0 };
      bySegment[key].leads++;
      if (l.lead_status === 'Sold') bySegment[key].sold++;
      if (l.lead_status === 'Disqualified' || l.lead_status === 'DQ') bySegment[key].dq++;
      if (l.lead_status === 'Returned') bySegment[key].returned++;
      if (l.lead_status === 'Fake') bySegment[key].fake++;
      if (l.phone && l.phone.length >= 10) bySegment[key].verifiedPhone++;
      bySegment[key].revenue += l.lead_revenue || 0;
      bySegment[key].payout += l.supplier_payout || 0;
    });
    return Object.values(bySegment).map(s => {
      const soldPct = s.leads > 0 ? (s.sold / s.leads) * 100 : 0;
      const dqPct = s.leads > 0 ? (s.dq / s.leads) * 100 : 0;
      const returnPct = s.sold > 0 ? (s.returned / s.sold) * 100 : 0;
      const fakePct = s.leads > 0 ? (s.fake / s.leads) * 100 : 0;
      const verifiedPct = s.leads > 0 ? (s.verifiedPhone / s.leads) * 100 : 0;
      const avgRevPerLead = s.leads > 0 ? s.revenue / s.leads : 0;
      const avgMarginPerLead = s.leads > 0 ? (s.revenue - s.payout) / s.leads : 0;
      const qualityScore = Math.round(soldPct * 0.3 + (100 - dqPct) * 0.2 + (100 - returnPct) * 0.2 + (100 - fakePct) * 0.15 + verifiedPct * 0.15);
      return { dimension: s.dimension, segment: s.segment, leads: s.leads, soldPct, dqPct, returnPct, fakePct, verifiedPct, avgRevPerLead, avgMarginPerLead, qualityScore };
    });
  }, [leads]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Lead Quality</h1>
        <p className="text-xs text-muted-foreground mt-1">Quality scoring by supplier, state, and other dimensions</p>
      </div>
      <DataTable
        exportFileName="lead_quality"
        data={tableData}
        columns={[
          { key: 'dimension', label: 'Dimension' },
          { key: 'segment', label: 'Segment' },
          { key: 'leads', label: 'Leads', align: 'right' },
          { key: 'soldPct', label: 'Sold %', align: 'right', render: v => formatPercent(v) },
          { key: 'dqPct', label: 'DQ %', align: 'right', render: v => formatPercent(v) },
          { key: 'returnPct', label: 'Return %', align: 'right', render: v => formatPercent(v) },
          { key: 'fakePct', label: 'Fake %', align: 'right', render: v => formatPercent(v) },
          { key: 'verifiedPct', label: 'Verified Phone %', align: 'right', render: v => formatPercent(v) },
          { key: 'avgRevPerLead', label: 'Avg Rev/Lead', align: 'right', render: v => <span className={moneyColor(v)}>{formatMoney(v)}</span> },
          { key: 'avgMarginPerLead', label: 'Avg Margin/Lead', align: 'right', render: v => <span className={moneyColor(v)}>{formatMoney(v)}</span> },
          { key: 'qualityScore', label: 'Quality Score', align: 'right' },
        ]}
      />
    </div>
  );
}