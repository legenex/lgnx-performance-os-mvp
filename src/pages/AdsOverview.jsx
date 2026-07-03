import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor, formatPercent, formatNumber } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';

export default function AdsOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [truthMetrics, adAlerts] = await Promise.all([
        base44.entities.CampaignTruthMetric.list().catch(() => []),
        base44.entities.AdAlert.list().catch(() => []),
      ]);

      const spendTracked = truthMetrics.reduce((s, m) => s + (m.spend_tracked || 0), 0);
      const spendPaid = truthMetrics.reduce((s, m) => s + (m.spend_paid || 0), 0);
      const spendGap = spendTracked - spendPaid;
      const leads = truthMetrics.reduce((s, m) => s + (m.web_lead_count || 0), 0);
      const soldLeads = truthMetrics.reduce((s, m) => s + (m.sold_leads || 0), 0);
      const revenue = truthMetrics.reduce((s, m) => s + (m.total_booked_revenue || 0), 0);
      const callRevenue = truthMetrics.reduce((s, m) => s + (m.call_revenue || 0), 0);
      const trueMargin = truthMetrics.reduce((s, m) => s + (m.true_gross_margin || 0), 0);
      const cashMargin = truthMetrics.reduce((s, m) => s + (m.cash_margin || 0), 0);

      const scaleCampaigns = truthMetrics.filter(m => m.decision === 'SCALE');
      const cutCampaigns = truthMetrics.filter(m => m.decision === 'CUT');
      const missingData = truthMetrics.filter(m => m.data_quality === 'Incomplete' || m.data_quality === 'Missing Calls' || m.data_quality === 'Missing Spend' || m.data_quality === 'Missing Buyer Feedback' || m.data_quality === 'Missing Cash');

      const openAlerts = (adAlerts || []).filter(a => a.status === 'Open');

      // Campaign table
      const byCampaign = {};
      truthMetrics.forEach(m => {
        const c = m.campaign_name || 'Unknown';
        if (!byCampaign[c]) byCampaign[c] = {
          platform: m.platform || '—', campaign: c,
          spendTracked: 0, spendPaid: 0, webLeads: 0, soldLeads: 0, dqRate: 0,
          bookedRevenue: 0, callRevenue: 0, supplierCost: 0,
          trueMargin: 0, cashMargin: 0, decision: 'UNKNOWN', dataQuality: 'Incomplete',
        };
        const r = byCampaign[c];
        r.spendTracked += (m.spend_tracked || 0);
        r.spendPaid += (m.spend_paid || 0);
        r.webLeads += (m.web_lead_count || 0);
        r.soldLeads += (m.sold_leads || 0);
        r.dqRate = Math.max(r.dqRate, m.dq_rate || 0);
        r.bookedRevenue += (m.total_booked_revenue || 0);
        r.callRevenue += (m.call_revenue || 0);
        r.supplierCost += (m.supplier_payout_accrued || 0);
        r.trueMargin += (m.true_gross_margin || 0);
        r.cashMargin += (m.cash_margin || 0);
        r.decision = m.decision || 'UNKNOWN';
        r.dataQuality = m.data_quality || 'Incomplete';
      });
      const campaignData = Object.values(byCampaign).map(r => ({
        ...r,
        totalRevenue: r.bookedRevenue + r.callRevenue,
        trueCPL: r.webLeads > 0 ? (r.spendTracked + r.supplierCost) / r.webLeads : 0,
        roas: r.spendTracked > 0 ? (r.bookedRevenue + r.callRevenue) / r.spendTracked : 0,
      })).sort((a, b) => b.trueMargin - a.trueMargin);

      setData({ spendTracked, spendPaid, spendGap, leads, soldLeads, revenue, callRevenue, trueMargin, cashMargin, scaleCount: scaleCampaigns.length, cutCount: cutCampaigns.length, missingCount: missingData.length, openAlerts, campaignData });
    } catch (err) {
      console.error('AdsOverview error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;
  const d = data || {};

  const moneyCol = (key) => ({ key, align: 'right', render: (v) => <span className={moneyColor(v)}>{formatMoney(v)}</span> });
  const numCol = (key) => ({ key, align: 'right', render: (v) => <span>{formatNumber(v)}</span> });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Ads Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Spend truth, profit reality, and scale/cut decisions.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard title="Spend Tracked" value={d.spendTracked || 0} label="BOOKED" />
        <MetricCard title="Spend Paid" value={d.spendPaid || 0} label="CASH" />
        <MetricCard title="Spend Gap" value={d.spendGap || 0} sublabel="Tracked - Paid" />
        <MetricCard title="Leads" value={formatNumber(d.leads || 0)} />
        <MetricCard title="Sold Leads" value={formatNumber(d.soldLeads || 0)} />
        <MetricCard title="Revenue" value={d.revenue || 0} label="BOOKED" />
        <MetricCard title="Call Revenue" value={d.callRevenue || 0} />
        <MetricCard title="True Margin" value={d.trueMargin || 0} label="BOOKED" />
        <MetricCard title="Cash Margin" value={d.cashMargin || 0} label="CASH" />
        <MetricCard title="To Scale" value={d.scaleCount || 0} />
        <MetricCard title="To Cut" value={d.cutCount || 0} />
        <MetricCard title="Missing Data" value={d.missingCount || 0} />
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

      <SectionPanel title="Campaign Profitability" subtitle="Spend, revenue, margin, and decisions by campaign">
        <DataTable
          exportFileName="ads_campaign_profitability"
          data={d.campaignData || []}
          maxHeight="500px"
          columns={[
            { key: 'platform', label: 'Platform' },
            { key: 'campaign', label: 'Campaign' },
            moneyCol('spendTracked'),
            moneyCol('spendPaid'),
            numCol('webLeads'),
            numCol('soldLeads'),
            { key: 'dqRate', label: 'DQ %', align: 'right', render: v => formatPercent(v) },
            moneyCol('bookedRevenue'),
            moneyCol('callRevenue'),
            moneyCol('totalRevenue'),
            moneyCol('supplierCost'),
            moneyCol('trueCPL'),
            moneyCol('trueMargin'),
            moneyCol('cashMargin'),
            { key: 'roas', label: 'ROAS', align: 'right', render: v => v > 0 ? `${v.toFixed(2)}x` : '—' },
            { key: 'decision', label: 'Decision', render: v => <StatusBadge status={v} /> },
            { key: 'dataQuality', label: 'Missing Data' },
          ]}
        />
      </SectionPanel>
    </div>
  );
}