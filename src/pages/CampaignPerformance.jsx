import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor, formatPercent, formatNumber } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';

export default function CampaignPerformance() {
  const [truthMetrics, setTruthMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await base44.entities.CampaignTruthMetric.list().catch(() => []);
      setTruthMetrics(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const tableData = useMemo(() => {
    const byCampaign = {};
    truthMetrics.forEach(m => {
      const c = m.campaign_name || 'Unknown';
      if (!byCampaign[c]) byCampaign[c] = {
        platform: m.platform || '—', campaign: c, vertical: m.vertical || '—',
        spendTracked: 0, spendPaid: 0, webLeads: 0, soldLeads: 0, dqLeads: 0, returnedLeads: 0,
        callRevenue: 0, bookedRevenue: 0, cashCollected: 0, supplierCost: 0,
        margin: 0, cashMargin: 0, decision: 'UNKNOWN', dataQuality: 'Incomplete',
      };
      const r = byCampaign[c];
      r.spendTracked += (m.spend_tracked || 0);
      r.spendPaid += (m.spend_paid || 0);
      r.webLeads += (m.web_lead_count || 0);
      r.soldLeads += (m.sold_leads || 0);
      r.dqLeads += (m.dq_leads || 0);
      r.returnedLeads += (m.returned_leads || 0);
      r.callRevenue += (m.call_revenue || 0);
      r.bookedRevenue += (m.total_booked_revenue || 0);
      r.cashCollected += (m.buyer_collected_cash || 0);
      r.supplierCost += (m.supplier_payout_accrued || 0);
      r.margin += (m.true_gross_margin || 0);
      r.cashMargin += (m.cash_margin || 0);
      r.decision = m.decision || 'UNKNOWN';
      r.dataQuality = m.data_quality || 'Incomplete';
    });
    return Object.values(byCampaign).map(r => ({
      ...r,
      trueCPL: r.webLeads > 0 ? (r.spendTracked + r.supplierCost) / r.webLeads : 0,
      dqRate: r.webLeads > 0 ? (r.dqLeads / r.webLeads) * 100 : 0,
      returnRate: r.soldLeads > 0 ? (r.returnedLeads / r.soldLeads) * 100 : 0,
      roas: r.spendTracked > 0 ? r.bookedRevenue / r.spendTracked : 0,
      totalRevenue: r.bookedRevenue + r.callRevenue,
    })).filter(r => !search || r.campaign.toLowerCase().includes(search.toLowerCase()));
  }, [truthMetrics, search]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  const moneyCol = (key) => ({ key, align: 'right', render: (v) => <span className={moneyColor(v)}>{formatMoney(v)}</span> });
  const numCol = (key) => ({ key, align: 'right', render: (v) => <span>{formatNumber(v)}</span> });
  const pctCol = (key) => ({ key, align: 'right', render: (v) => <span className={v > 15 ? 'text-critical' : v > 5 ? 'text-warning' : 'text-success'}>{formatPercent(v)}</span> });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Campaign Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">Ad spend, lead, call, and bank verification by campaign.</p>
      </div>

      <input
        type="text"
        placeholder="Search campaigns..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-md bg-secondary text-sm rounded-md px-3 py-2 border border-border text-foreground placeholder:text-muted-foreground"
      />

      <DataTable
        exportFileName="campaign_performance_detail"
        data={tableData}
        maxHeight="600px"
        columns={[
          { key: 'platform', label: 'Platform' },
          { key: 'campaign', label: 'Campaign' },
          { key: 'vertical', label: 'Vertical' },
          moneyCol('spendTracked'),
          moneyCol('spendPaid'),
          numCol('webLeads'),
          numCol('soldLeads'),
          pctCol('dqRate'),
          pctCol('returnRate'),
          moneyCol('bookedRevenue'),
          moneyCol('callRevenue'),
          moneyCol('totalRevenue'),
          moneyCol('supplierCost'),
          moneyCol('trueCPL'),
          moneyCol('margin'),
          moneyCol('cashMargin'),
          { key: 'roas', label: 'ROAS', align: 'right', render: v => v > 0 ? `${v.toFixed(2)}x` : '—' },
          { key: 'decision', label: 'Decision', render: v => <StatusBadge status={v} /> },
          { key: 'dataQuality', label: 'Data Quality' },
        ]}
      />
    </div>
  );
}