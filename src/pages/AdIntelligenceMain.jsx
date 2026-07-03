import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor, formatPercent } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';

export default function AdIntelligenceMain() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [truthMetrics, adAlerts] = await Promise.all([
        base44.entities.CampaignTruthMetric.list().catch(() => []),
        base44.entities.AdAlert.list().catch(() => []),
      ]);

      const scaleCampaigns = truthMetrics.filter(m => m.decision === 'SCALE');
      const cutCampaigns = truthMetrics.filter(m => m.decision === 'CUT');
      const missingCalls = truthMetrics.filter(m => m.data_quality === 'Missing Calls');
      const goodCplPoorQuality = truthMetrics.filter(m => {
        const cpl = m.web_lead_count > 0 ? (m.spend_tracked || 0) / m.web_lead_count : 0;
        return cpl > 0 && cpl < 30 && (m.dq_rate || 0) > 15;
      });

      const spendTracked = truthMetrics.reduce((s, m) => s + (m.spend_tracked || 0), 0);
      const spendPaid = truthMetrics.reduce((s, m) => s + (m.spend_paid || 0), 0);
      const bookedProfit = truthMetrics.reduce((s, m) => s + (m.true_gross_margin || 0), 0);
      const cashMargin = truthMetrics.reduce((s, m) => s + (m.cash_margin || 0), 0);
      const totalRevenue = truthMetrics.reduce((s, m) => s + (m.total_booked_revenue || 0), 0);
      const totalSpend = spendTracked;

      const openAlerts = (adAlerts || []).filter(a => a.status === 'Open');

      setData({ scaleCampaigns, cutCampaigns, missingCalls, goodCplPoorQuality, spendTracked, spendPaid, bookedProfit, cashMargin, totalRevenue, totalSpend, openAlerts });
    } catch (err) {
      console.error('AdIntelligenceMain error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;
  const d = data || {};
  const moneyCol = (key) => ({ key, align: 'right', render: (v) => <span className={moneyColor(v)}>{formatMoney(v)}</span> });
  const numCol = (key) => ({ key, align: 'right', render: (v) => <span>{v || 0}</span> });

  const campaignCols = [
    { key: 'platform', label: 'Platform' },
    { key: 'campaign_name', label: 'Campaign' },
    moneyCol('spend_tracked'),
    numCol('web_lead_count'),
    numCol('sold_leads'),
    moneyCol('total_booked_revenue'),
    moneyCol('true_gross_margin'),
    moneyCol('cash_margin'),
    { key: 'decision_reason', label: 'Reason' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Ad Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">Spend truth, profit reality, and scale/cut decisions.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Spend Tracked" value={d.spendTracked || 0} />
        <MetricCard title="Spend Paid" value={d.spendPaid || 0} label="CASH" />
        <MetricCard title="Booked Profit" value={d.bookedProfit || 0} label="BOOKED" />
        <MetricCard title="Cash Margin" value={d.cashMargin || 0} label="CASH" />
        <MetricCard title="Total Revenue" value={d.totalRevenue || 0} />
        <MetricCard title="Open Alerts" value={d.openAlerts?.length || 0} />
      </div>

      {d.openAlerts && d.openAlerts.length > 0 && (
        <SectionPanel title="Active Alerts" subtitle="Campaign issues needing attention">
          <div className="space-y-2">
            {d.openAlerts.slice(0, 8).map((a, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                <div className="flex items-center gap-3">
                  <StatusBadge status={a.severity} />
                  <div>
                    <p className="text-sm text-foreground">{a.message}</p>
                    <p className="text-[11px] text-muted-foreground">{a.alert_type} · {a.campaign_name || '—'}</p>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground">{a.recommended_action}</span>
              </div>
            ))}
          </div>
        </SectionPanel>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title="Campaigns to Scale" subtitle="Positive margin and healthy quality">
          <DataTable exportFileName="scale_campaigns" data={d.scaleCampaigns || []} maxHeight="300px" columns={campaignCols} emptyMessage="No campaigns to scale" />
        </SectionPanel>
        <SectionPanel title="Campaigns to Cut" subtitle="Negative margin or poor quality">
          <DataTable exportFileName="cut_campaigns" data={d.cutCampaigns || []} maxHeight="300px" columns={campaignCols} emptyMessage="No campaigns to cut" />
        </SectionPanel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title="Missing Calls" subtitle="Campaigns with call tracking gaps">
          <DataTable exportFileName="missing_calls" data={d.missingCalls || []} maxHeight="300px"
            columns={[{ key: 'platform', label: 'Platform' }, { key: 'campaign_name', label: 'Campaign' }, moneyCol('spend_tracked'), numCol('web_lead_count'), moneyCol('call_revenue'), { key: 'data_quality', label: 'Data Quality' }]}
            emptyMessage="No missing call data" />
        </SectionPanel>
        <SectionPanel title="Good CPL, Poor Quality" subtitle="Low cost per lead but high DQ/return rate">
          <DataTable exportFileName="good_cpl_poor_quality" data={d.goodCplPoorQuality || []} maxHeight="300px"
            columns={[{ key: 'platform', label: 'Platform' }, { key: 'campaign_name', label: 'Campaign' }, moneyCol('spend_tracked'), numCol('web_lead_count'), { key: 'dq_rate', label: 'DQ %', align: 'right', render: (v) => <span>{formatPercent(v)}</span> }, { key: 'return_rate', label: 'Return %', align: 'right', render: (v) => <span>{formatPercent(v)}</span> }, moneyCol('true_gross_margin')]}
            emptyMessage="No campaigns with this pattern" />
        </SectionPanel>
      </div>
    </div>
  );
}