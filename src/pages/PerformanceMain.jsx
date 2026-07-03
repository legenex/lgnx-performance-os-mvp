import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor, formatPercent, formatNumber } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import moment from 'moment';

export default function PerformanceMain() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [truthMetrics, gatewayLeads, calls] = await Promise.all([
        base44.entities.CampaignTruthMetric.list().catch(() => []),
        base44.entities.GatewayLead.list().catch(() => []),
        base44.entities.Call.list().catch(() => []),
      ]);

      const totalLeads = truthMetrics.reduce((s, m) => s + (m.web_lead_count || 0), 0);
      const totalSold = truthMetrics.reduce((s, m) => s + (m.sold_leads || 0), 0);
      const totalDQ = truthMetrics.reduce((s, m) => s + (m.dq_leads || 0), 0);
      const totalReturned = truthMetrics.reduce((s, m) => s + (m.returned_leads || 0), 0);
      const totalFake = truthMetrics.reduce((s, m) => s + (m.fake_leads || 0), 0);
      const bookedRevenue = truthMetrics.reduce((s, m) => s + (m.total_booked_revenue || 0), 0);
      const cashCollected = truthMetrics.reduce((s, m) => s + (m.buyer_collected_cash || 0), 0);
      const supplierPayout = truthMetrics.reduce((s, m) => s + (m.supplier_payout_accrued || 0), 0);
      const grossMargin = truthMetrics.reduce((s, m) => s + (m.true_gross_margin || 0), 0);
      const cashMargin = truthMetrics.reduce((s, m) => s + (m.cash_margin || 0), 0);
      const callRevenue = truthMetrics.reduce((s, m) => s + (m.call_revenue || 0), 0);
      const mediaSpend = truthMetrics.reduce((s, m) => s + (m.spend_tracked || 0), 0);

      const soldRate = totalLeads > 0 ? (totalSold / totalLeads) * 100 : 0;
      const dqRate = totalLeads > 0 ? (totalDQ / totalLeads) * 100 : 0;
      const returnRate = totalSold > 0 ? (totalReturned / totalSold) * 100 : 0;

      // Daily Performance
      const byDate = {};
      truthMetrics.forEach(m => {
        if (!m.date) return;
        if (!byDate[m.date]) byDate[m.date] = { date: m.date, leads: 0, sold: 0, unsold: 0, dq: 0, returned: 0, fake: 0, bookedRevenue: 0, callRevenue: 0, supplierPayout: 0, mediaSpend: 0, cashCollected: 0, grossMargin: 0 };
        const r = byDate[m.date];
        r.leads += (m.web_lead_count || 0);
        r.sold += (m.sold_leads || 0);
        r.dq += (m.dq_leads || 0);
        r.returned += (m.returned_leads || 0);
        r.fake += (m.fake_leads || 0);
        r.bookedRevenue += (m.total_booked_revenue || 0);
        r.callRevenue += (m.call_revenue || 0);
        r.supplierPayout += (m.supplier_payout_accrued || 0);
        r.mediaSpend += (m.spend_tracked || 0);
        r.cashCollected += (m.buyer_collected_cash || 0);
        r.grossMargin += (m.true_gross_margin || 0);
        r.unsold = r.leads - r.sold - r.dq;
        r.dataQuality = m.data_quality || 'Incomplete';
      });
      const dailyData = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

      // Buyer Performance
      const byBuyer = {};
      truthMetrics.forEach(m => {
        const b = m.buyer_name || 'Unknown';
        if (!byBuyer[b]) byBuyer[b] = { buyer: b, sold: 0, bookedRevenue: 0, cashCollected: 0, conversionRate: 0, returnRate: 0, avgLeadPrice: 0, paymentRisk: 'Low' };
        const r = byBuyer[b];
        r.sold += (m.sold_leads || 0);
        r.bookedRevenue += (m.total_booked_revenue || 0);
        r.cashCollected += (m.buyer_collected_cash || 0);
        r.returnRate += (m.return_rate || 0);
      });
      const buyerData = Object.values(byBuyer).map(r => ({
        ...r,
        incomeGap: r.bookedRevenue - r.cashCollected,
        avgLeadPrice: r.sold > 0 ? r.bookedRevenue / r.sold : 0,
        paymentRisk: r.cashCollected < r.bookedRevenue * 0.7 ? 'High' : r.cashCollected < r.bookedRevenue * 0.9 ? 'Medium' : 'Low',
        action: r.cashCollected < r.bookedRevenue * 0.8 ? 'Chase' : 'OK',
      }));

      // Supplier Performance
      const bySupplier = {};
      truthMetrics.forEach(m => {
        const s = m.supplier_sid || 'Unknown';
        if (!bySupplier[s]) bySupplier[s] = { supplier: s, leads: 0, sold: 0, dq: 0, returned: 0, revenue: 0, payoutAccrued: 0, payoutPaid: 0, margin: 0 };
        const r = bySupplier[s];
        r.leads += (m.web_lead_count || 0);
        r.sold += (m.sold_leads || 0);
        r.dq += (m.dq_leads || 0);
        r.returned += (m.returned_leads || 0);
        r.revenue += (m.total_booked_revenue || 0);
        r.payoutAccrued += (m.supplier_payout_accrued || 0);
        r.payoutPaid += (m.supplier_payout_paid || 0);
        r.margin += (m.true_gross_margin || 0);
      });
      const supplierData = Object.values(bySupplier).map(r => ({
        ...r,
        sellThrough: r.leads > 0 ? (r.sold / r.leads) * 100 : 0,
        dqRate: r.leads > 0 ? (r.dq / r.leads) * 100 : 0,
        returnRate: r.sold > 0 ? (r.returned / r.sold) * 100 : 0,
        payableRisk: r.payoutAccrued - r.payoutPaid > 5000 ? 'High' : r.payoutAccrued - r.payoutPaid > 1000 ? 'Medium' : 'Low',
        verdict: r.sellThrough > 50 && r.dqRate < 10 ? 'Healthy' : r.dqRate > 20 ? 'Critical' : 'Watch',
      }));

      // Campaign Performance
      const byCampaign = {};
      truthMetrics.forEach(m => {
        const c = m.campaign_name || 'Unknown';
        if (!byCampaign[c]) byCampaign[c] = { platform: m.platform || '—', campaign: c, spendTracked: 0, spendPaid: 0, webLeads: 0, soldLeads: 0, dqRate: 0, callRevenue: 0, bookedRevenue: 0, cashCollected: 0, margin: 0, decision: 'UNKNOWN', dataQuality: 'Incomplete' };
        const r = byCampaign[c];
        r.spendTracked += (m.spend_tracked || 0);
        r.spendPaid += (m.spend_paid || 0);
        r.webLeads += (m.web_lead_count || 0);
        r.soldLeads += (m.sold_leads || 0);
        r.dqRate += (m.dq_rate || 0);
        r.callRevenue += (m.call_revenue || 0);
        r.bookedRevenue += (m.total_booked_revenue || 0);
        r.cashCollected += (m.buyer_collected_cash || 0);
        r.margin += (m.true_gross_margin || 0);
        r.decision = m.decision || 'UNKNOWN';
        r.dataQuality = m.data_quality || 'Incomplete';
      });
      const campaignData = Object.values(byCampaign);

      // State Performance
      const byState = {};
      truthMetrics.forEach(m => {
        const st = m.accident_state || 'Unknown';
        if (!byState[st]) byState[st] = { state: st, leads: 0, sold: 0, revenue: 0, margin: 0, returnRate: 0, buyerCoverage: 0 };
        const r = byState[st];
        r.leads += (m.web_lead_count || 0);
        r.sold += (m.sold_leads || 0);
        r.revenue += (m.total_booked_revenue || 0);
        r.margin += (m.true_gross_margin || 0);
        r.returnRate += (m.return_rate || 0);
        r.buyerCoverage += 1;
      });
      const stateData = Object.values(byState).map(r => ({
        ...r,
        soldRate: r.leads > 0 ? (r.sold / r.leads) * 100 : 0,
        verdict: r.soldRate > 40 && r.margin > 0 ? 'Healthy' : r.margin < 0 ? 'Critical' : 'Watch',
      }));

      setData({ totalLeads, totalSold, totalDQ, totalReturned, soldRate, dqRate, returnRate, bookedRevenue, cashCollected, supplierPayout, grossMargin, cashMargin, callRevenue, mediaSpend, dailyData, buyerData, supplierData, campaignData, stateData });
    } catch (err) {
      console.error('PerformanceMain error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;
  const d = data || {};

  const moneyCol = (key) => ({ key, align: 'right', render: (v) => <span className={moneyColor(v)}>{formatMoney(v)}</span> });
  const numCol = (key) => ({ key, align: 'right', render: (v) => <span>{formatNumber(v)}</span> });
  const pctCol = (key) => ({ key, align: 'right', render: (v) => <span>{formatPercent(v)}</span> });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">Lead flow, revenue, margins, and quality across all dimensions.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard title="Leads" value={d.totalLeads || 0} />
        <MetricCard title="Sold Leads" value={d.totalSold || 0} />
        <MetricCard title="Sold Rate" value={`${formatPercent(d.soldRate || 0)}`} />
        <MetricCard title="DQ Rate" value={`${formatPercent(d.dqRate || 0)}`} />
        <MetricCard title="Return Rate" value={`${formatPercent(d.returnRate || 0)}`} />
        <MetricCard title="Booked Revenue" value={d.bookedRevenue || 0} label="BOOKED" />
        <MetricCard title="Cash Collected" value={d.cashCollected || 0} label="CASH" />
        <MetricCard title="Supplier Payout" value={d.supplierPayout || 0} />
        <MetricCard title="Gross Margin" value={d.grossMargin || 0} />
        <MetricCard title="Cash-Adj Margin" value={d.cashMargin || 0} label="CASH" />
        <MetricCard title="Calls Revenue" value={d.callRevenue || 0} />
        <MetricCard title="Media Spend" value={d.mediaSpend || 0} />
      </div>

      <SectionPanel title="Daily Performance" subtitle="Lead flow and revenue by date">
        <DataTable
          exportFileName="daily_performance"
          data={d.dailyData || []}
          maxHeight="400px"
          columns={[
            { key: 'date', label: 'Date' },
            numCol('leads'),
            numCol('sold'),
            numCol('unsold'),
            numCol('dq'),
            numCol('returned'),
            numCol('fake'),
            moneyCol('bookedRevenue'),
            moneyCol('callRevenue'),
            moneyCol('supplierPayout'),
            moneyCol('mediaSpend'),
            moneyCol('grossMargin'),
            moneyCol('cashCollected'),
            { key: 'dataQuality', label: 'Data Quality' },
          ]}
        />
      </SectionPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title="Buyer Performance" subtitle="Revenue and payment risk by buyer">
          <DataTable exportFileName="buyer_performance" data={d.buyerData || []} maxHeight="350px"
            columns={[{ key: 'buyer', label: 'Buyer' }, numCol('sold'), moneyCol('bookedRevenue'), moneyCol('cashCollected'), moneyCol('incomeGap'), pctCol('conversionRate'), pctCol('returnRate'), moneyCol('avgLeadPrice'), { key: 'paymentRisk', label: 'Risk' }, { key: 'action', label: 'Action' }]} />
        </SectionPanel>
        <SectionPanel title="Supplier Performance" subtitle="Lead quality and payout by supplier">
          <DataTable exportFileName="supplier_performance" data={d.supplierData || []} maxHeight="350px"
            columns={[{ key: 'supplier', label: 'Supplier' }, numCol('leads'), numCol('sold'), pctCol('sellThrough'), pctCol('dqRate'), pctCol('returnRate'), moneyCol('revenue'), moneyCol('payoutAccrued'), moneyCol('payoutPaid'), moneyCol('margin'), { key: 'payableRisk', label: 'Payable Risk' }, { key: 'verdict', label: 'Verdict' }]} />
        </SectionPanel>
      </div>

      <SectionPanel title="Campaign Performance" subtitle="Spend, revenue, and decisions by campaign">
        <DataTable exportFileName="campaign_performance" data={d.campaignData || []} maxHeight="400px"
          columns={[{ key: 'platform', label: 'Platform' }, { key: 'campaign', label: 'Campaign' }, moneyCol('spendTracked'), moneyCol('spendPaid'), numCol('webLeads'), numCol('soldLeads'), pctCol('dqRate'), moneyCol('callRevenue'), moneyCol('bookedRevenue'), moneyCol('cashCollected'), moneyCol('margin'), { key: 'decision', label: 'Decision' }, { key: 'dataQuality', label: 'Data Quality' }]} />
      </SectionPanel>

      <SectionPanel title="State Performance" subtitle="Lead flow and profitability by state">
        <DataTable exportFileName="state_performance" data={d.stateData || []} maxHeight="350px"
          columns={[{ key: 'state', label: 'State' }, numCol('leads'), numCol('sold'), pctCol('soldRate'), moneyCol('revenue'), moneyCol('margin'), pctCol('returnRate'), numCol('buyerCoverage'), { key: 'verdict', label: 'Verdict' }]} />
      </SectionPanel>
    </div>
  );
}