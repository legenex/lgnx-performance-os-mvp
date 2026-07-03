import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor, formatPercent, formatNumber } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import moment from 'moment';

export default function PerformanceOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [truthMetrics, calls] = await Promise.all([
        base44.entities.CampaignTruthMetric.list().catch(() => []),
        base44.entities.Call.list().catch(() => []),
      ]);

      const totalLeads = truthMetrics.reduce((s, m) => s + (m.web_lead_count || 0), 0);
      const totalSold = truthMetrics.reduce((s, m) => s + (m.sold_leads || 0), 0);
      const totalUnsold = totalLeads - totalSold - truthMetrics.reduce((s, m) => s + (m.dq_leads || 0), 0);
      const totalDQ = truthMetrics.reduce((s, m) => s + (m.dq_leads || 0), 0);
      const totalReturned = truthMetrics.reduce((s, m) => s + (m.returned_leads || 0), 0);
      const totalFake = truthMetrics.reduce((s, m) => s + (m.fake_leads || 0), 0);
      const bookedRevenue = truthMetrics.reduce((s, m) => s + (m.total_booked_revenue || 0), 0);
      const callRevenue = truthMetrics.reduce((s, m) => s + (m.call_revenue || 0), 0);
      const netRevenue = truthMetrics.reduce((s, m) => s + (m.web_lead_revenue || 0), 0);
      const totalCost = truthMetrics.reduce((s, m) => s + (m.spend_tracked || 0) + (m.supplier_payout_accrued || 0), 0);
      const supplierPayout = truthMetrics.reduce((s, m) => s + (m.supplier_payout_accrued || 0), 0);
      const grossMargin = truthMetrics.reduce((s, m) => s + (m.true_gross_margin || 0), 0);
      const cashMargin = truthMetrics.reduce((s, m) => s + (m.cash_margin || 0), 0);
      const cashCollected = truthMetrics.reduce((s, m) => s + (m.buyer_collected_cash || 0), 0);

      const soldRate = totalLeads > 0 ? (totalSold / totalLeads) * 100 : 0;
      const dqRate = totalLeads > 0 ? (totalDQ / totalLeads) * 100 : 0;
      const returnRate = totalSold > 0 ? (totalReturned / totalSold) * 100 : 0;
      const cpl = totalLeads > 0 ? totalCost / totalLeads : 0;
      const ipl = totalSold > 0 ? totalCost / totalSold : 0;
      const convRate = totalLeads > 0 ? (totalSold / totalLeads) * 100 : 0;
      const netProfit = grossMargin;
      const gpMargin = bookedRevenue > 0 ? (grossMargin / bookedRevenue) * 100 : 0;

      // Daily Performance
      const byDate = {};
      truthMetrics.forEach(m => {
        if (!m.date) return;
        if (!byDate[m.date]) byDate[m.date] = { date: m.date, leads: 0, sold: 0, unsold: 0, dq: 0, returned: 0, fake: 0, bookedRevenue: 0, callRevenue: 0, netRevenue: 0, supplierPayout: 0, mediaSpend: 0, cashCollected: 0, grossMargin: 0, dataQuality: 'Incomplete' };
        const r = byDate[m.date];
        r.leads += (m.web_lead_count || 0);
        r.sold += (m.sold_leads || 0);
        r.dq += (m.dq_leads || 0);
        r.returned += (m.returned_leads || 0);
        r.fake += (m.fake_leads || 0);
        r.bookedRevenue += (m.total_booked_revenue || 0);
        r.callRevenue += (m.call_revenue || 0);
        r.netRevenue += (m.web_lead_revenue || 0);
        r.supplierPayout += (m.supplier_payout_accrued || 0);
        r.mediaSpend += (m.spend_tracked || 0);
        r.cashCollected += (m.buyer_collected_cash || 0);
        r.grossMargin += (m.true_gross_margin || 0);
        r.unsold = r.leads - r.sold - r.dq;
        r.dataQuality = m.data_quality || 'Incomplete';
      });
      const dailyData = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).map(r => ({
        ...r,
        cpl: r.leads > 0 ? ((r.mediaSpend + r.supplierPayout) / r.leads) : 0,
        ipl: r.sold > 0 ? ((r.mediaSpend + r.supplierPayout) / r.sold) : 0,
        convRate: r.leads > 0 ? (r.sold / r.leads) * 100 : 0,
        gpMargin: r.bookedRevenue > 0 ? (r.grossMargin / r.bookedRevenue) * 100 : 0,
        netProfit: r.grossMargin,
      }));

      // Buyer Performance
      const byBuyer = {};
      truthMetrics.forEach(m => {
        const b = m.buyer_name || 'Unknown';
        if (!byBuyer[b]) byBuyer[b] = { buyer: b, vertical: m.vertical || '—', total: 0, sold: 0, returned: 0, bookedRevenue: 0, cost: 0, cashCollected: 0, conversions: 0 };
        byBuyer[b].total += (m.web_lead_count || 0);
        byBuyer[b].sold += (m.sold_leads || 0);
        byBuyer[b].returned += (m.returned_leads || 0);
        byBuyer[b].bookedRevenue += (m.total_booked_revenue || 0);
        byBuyer[b].cost += (m.spend_tracked || 0) + (m.supplier_payout_accrued || 0);
        byBuyer[b].cashCollected += (m.buyer_collected_cash || 0);
        byBuyer[b].conversions += (m.converted_calls || 0);
      });
      const buyerData = Object.values(byBuyer).map(r => {
        const returnRate = r.sold > 0 ? (r.returned / r.sold) * 100 : 0;
        const cpl = r.total > 0 ? r.cost / r.total : 0;
        const ipl = r.sold > 0 ? r.cost / r.sold : 0;
        const netProfit = r.bookedRevenue - r.cost;
        const gpMargin = r.bookedRevenue > 0 ? (netProfit / r.bookedRevenue) * 100 : 0;
        const convRate = r.total > 0 ? (r.sold / r.total) * 100 : 0;
        const paymentGap = r.bookedRevenue - r.cashCollected;
        return { ...r, returnRate, cpl, ipl, netProfit, gpMargin, convRate, paymentGap };
      });

      // Supplier Performance
      const bySupplier = {};
      truthMetrics.forEach(m => {
        const s = m.supplier_sid || 'Unknown';
        if (!bySupplier[s]) bySupplier[s] = { supplier: s, total: 0, sold: 0, returned: 0, revenue: 0, cost: 0, paidCost: 0, dq: 0, conversions: 0 };
        bySupplier[s].total += (m.web_lead_count || 0);
        bySupplier[s].sold += (m.sold_leads || 0);
        bySupplier[s].returned += (m.returned_leads || 0);
        bySupplier[s].revenue += (m.total_booked_revenue || 0);
        bySupplier[s].cost += (m.spend_tracked || 0) + (m.supplier_payout_accrued || 0);
        bySupplier[s].paidCost += (m.supplier_payout_paid || 0);
        bySupplier[s].dq += (m.dq_leads || 0);
        bySupplier[s].conversions += (m.converted_calls || 0);
      });
      const supplierData = Object.values(bySupplier).map(r => {
        const cpl = r.total > 0 ? r.cost / r.total : 0;
        const ipl = r.sold > 0 ? r.cost / r.sold : 0;
        const profit = r.revenue - r.cost;
        const gpMargin = r.revenue > 0 ? (profit / r.revenue) * 100 : 0;
        const convRate = r.total > 0 ? (r.sold / r.total) * 100 : 0;
        const dqRate = r.total > 0 ? (r.dq / r.total) * 100 : 0;
        const returnRate = r.sold > 0 ? (r.returned / r.sold) * 100 : 0;
        const trueCPL = cpl;
        const costGap = r.cost - r.paidCost;
        return { ...r, cpl, ipl, profit, gpMargin, convRate, dqRate, returnRate, trueCPL, costGap };
      });

      // Campaign Performance
      const byCampaign = {};
      truthMetrics.forEach(m => {
        const c = m.campaign_name || 'Unknown';
        if (!byCampaign[c]) byCampaign[c] = { platform: m.platform || '—', campaign: c, spendTracked: 0, webLeads: 0, soldLeads: 0, callRevenue: 0, bookedRevenue: 0, cashCollected: 0, margin: 0, decision: 'UNKNOWN', dataQuality: 'Incomplete' };
        byCampaign[c].spendTracked += (m.spend_tracked || 0);
        byCampaign[c].webLeads += (m.web_lead_count || 0);
        byCampaign[c].soldLeads += (m.sold_leads || 0);
        byCampaign[c].callRevenue += (m.call_revenue || 0);
        byCampaign[c].bookedRevenue += (m.total_booked_revenue || 0);
        byCampaign[c].cashCollected += (m.buyer_collected_cash || 0);
        byCampaign[c].margin += (m.true_gross_margin || 0);
        byCampaign[c].decision = m.decision || 'UNKNOWN';
        byCampaign[c].dataQuality = m.data_quality || 'Incomplete';
      });
      const campaignData = Object.values(byCampaign).map(r => ({
        ...r,
        trueCPL: r.webLeads > 0 ? r.spendTracked / r.webLeads : 0,
        roas: r.spendTracked > 0 ? r.bookedRevenue / r.spendTracked : 0,
      }));

      // State Performance
      const byState = {};
      truthMetrics.forEach(m => {
        const st = m.accident_state || 'Unknown';
        if (!byState[st]) byState[st] = { state: st, total: 0, sold: 0, returned: 0, revenue: 0, cost: 0, margin: 0 };
        byState[st].total += (m.web_lead_count || 0);
        byState[st].sold += (m.sold_leads || 0);
        byState[st].returned += (m.returned_leads || 0);
        byState[st].revenue += (m.total_booked_revenue || 0);
        byState[st].cost += (m.spend_tracked || 0) + (m.supplier_payout_accrued || 0);
        byState[st].margin += (m.true_gross_margin || 0);
      });
      const stateData = Object.values(byState).map(r => {
        const soldRate = r.total > 0 ? (r.sold / r.total) * 100 : 0;
        const cpl = r.total > 0 ? r.cost / r.total : 0;
        const returnRate = r.sold > 0 ? (r.returned / r.sold) * 100 : 0;
        const convRate = soldRate;
        return { ...r, soldRate, cpl, returnRate, convRate };
      });

      setData({ totalLeads, totalSold, totalUnsold, totalDQ, totalReturned, totalFake, soldRate, dqRate, returnRate, convRate, bookedRevenue, netRevenue, callRevenue, totalCost, cpl, ipl, grossMargin, netProfit, gpMargin, cashMargin, cashCollected, dailyData, buyerData, supplierData, campaignData, stateData });
    } catch (err) {
      console.error('PerformanceOverview error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;
  const d = data || {};

  const moneyCol = (key) => ({ key, align: 'right', render: (v) => <span className={moneyColor(v)}>{formatMoney(v)}</span> });
  const numCol = (key) => ({ key, align: 'right', render: (v) => <span>{formatNumber(v)}</span> });
  const pctCol = (key) => ({ key, align: 'right', render: (v) => <span className={v > 50 ? 'text-success' : v > 20 ? 'text-warning' : v > 0 ? 'text-critical' : 'text-muted-foreground'}>{formatPercent(v)}</span> });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Performance Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Lead flow, revenue, margins, and quality across all dimensions.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard title="Total Leads" value={formatNumber(d.totalLeads || 0)} />
        <MetricCard title="Sold Leads" value={formatNumber(d.totalSold || 0)} />
        <MetricCard title="Sold Rate" value={`${formatPercent(d.soldRate || 0)}`} />
        <MetricCard title="DQ" value={formatNumber(d.totalDQ || 0)} />
        <MetricCard title="Unsold" value={formatNumber(d.totalUnsold || 0)} />
        <MetricCard title="Returns" value={formatNumber(d.totalReturned || 0)} />
        <MetricCard title="Fake" value={formatNumber(d.totalFake || 0)} />
        <MetricCard title="Conv Rate" value={`${formatPercent(d.convRate || 0)}`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard title="Booked Revenue" value={d.bookedRevenue || 0} label="BOOKED" />
        <MetricCard title="Net Revenue" value={d.netRevenue || 0} />
        <MetricCard title="Cost" value={d.totalCost || 0} />
        <MetricCard title="CPL" value={d.cpl || 0} />
        <MetricCard title="Profit" value={d.grossMargin || 0} label="BOOKED" />
        <MetricCard title="Net Profit" value={d.netProfit || 0} />
        <MetricCard title="GP Margin" value={`${formatPercent(d.gpMargin || 0)}`} />
        <MetricCard title="Cash-Verified Profit" value={d.cashMargin || 0} label="CASH" />
      </div>

      <SectionPanel title="Daily Performance" subtitle="Lead flow, revenue, and margin by date">
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
            pctCol('convRate'),
            moneyCol('bookedRevenue'),
            moneyCol('netRevenue'),
            moneyCol('callRevenue'),
            moneyCol('mediaSpend'),
            moneyCol('supplierPayout'),
            moneyCol('cpl'),
            moneyCol('grossMargin'),
            moneyCol('netProfit'),
            { key: 'gpMargin', label: 'GP Margin', align: 'right', render: v => formatPercent(v) },
            moneyCol('cashCollected'),
            { key: 'dataQuality', label: 'Data Quality' },
          ]}
        />
      </SectionPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title="Buyer Performance" subtitle="Revenue, cost, and payment gap by buyer">
          <DataTable exportFileName="buyer_performance" data={d.buyerData || []} maxHeight="350px"
            columns={[
              { key: 'buyer', label: 'Buyer' },
              { key: 'vertical', label: 'Vertical' },
              numCol('total'),
              numCol('sold'),
              numCol('returned'),
              pctCol('returnRate'),
              moneyCol('bookedRevenue'),
              moneyCol('cost'),
              moneyCol('cpl'),
              moneyCol('ipl'),
              moneyCol('netProfit'),
              { key: 'gpMargin', label: 'GP Margin', align: 'right', render: v => formatPercent(v) },
              moneyCol('cashCollected'),
              moneyCol('paymentGap'),
            ]} />
        </SectionPanel>
        <SectionPanel title="Supplier Performance" subtitle="Cost, CPL, and margin by supplier">
          <DataTable exportFileName="supplier_performance" data={d.supplierData || []} maxHeight="350px"
            columns={[
              { key: 'supplier', label: 'Supplier' },
              numCol('total'),
              numCol('sold'),
              numCol('returned'),
              moneyCol('revenue'),
              moneyCol('cost'),
              moneyCol('cpl'),
              moneyCol('ipl'),
              moneyCol('profit'),
              { key: 'gpMargin', label: 'GP Margin', align: 'right', render: v => formatPercent(v) },
              pctCol('dqRate'),
              pctCol('returnRate'),
              moneyCol('trueCPL'),
              moneyCol('paidCost'),
              moneyCol('costGap'),
            ]} />
        </SectionPanel>
      </div>

      <SectionPanel title="Campaign Performance" subtitle="Spend, revenue, and decisions by campaign">
        <DataTable exportFileName="campaign_performance" data={d.campaignData || []} maxHeight="400px"
          columns={[
            { key: 'platform', label: 'Platform' },
            { key: 'campaign', label: 'Campaign' },
            moneyCol('spendTracked'),
            numCol('webLeads'),
            numCol('soldLeads'),
            moneyCol('callRevenue'),
            moneyCol('bookedRevenue'),
            moneyCol('cashCollected'),
            moneyCol('margin'),
            moneyCol('trueCPL'),
            { key: 'roas', label: 'ROAS', align: 'right', render: v => v > 0 ? `${v.toFixed(2)}x` : '—' },
            { key: 'decision', label: 'Decision', render: v => <StatusBadge status={v} /> },
            { key: 'dataQuality', label: 'Data Quality' },
          ]} />
      </SectionPanel>

      <SectionPanel title="State Performance" subtitle="Lead flow and profitability by state">
        <DataTable exportFileName="state_performance" data={d.stateData || []} maxHeight="350px"
          columns={[
            { key: 'state', label: 'State' },
            numCol('total'),
            numCol('sold'),
            pctCol('soldRate'),
            numCol('returned'),
            moneyCol('revenue'),
            moneyCol('cost'),
            moneyCol('cpl'),
            moneyCol('margin'),
            pctCol('convRate'),
            { key: 'returnRate', label: 'Return Rate', align: 'right', render: v => formatPercent(v) },
          ]} />
      </SectionPanel>
    </div>
  );
}