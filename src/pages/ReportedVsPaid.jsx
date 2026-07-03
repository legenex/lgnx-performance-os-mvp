import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor, formatPercent } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import moment from 'moment';

export default function ReportedVsPaid() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [bankTxns, truthMetrics, arInvoices] = await Promise.all([
        base44.entities.BankTransaction.list().catch(() => []),
        base44.entities.CampaignTruthMetric.list().catch(() => []),
        base44.entities.ARInvoice.list().catch(() => []),
      ]);

      const incomeTxns = bankTxns.filter(t => t.amount > 0 && (t.cash_type === 'Buyer Collection' || t.category?.toLowerCase().includes('income')));

      const totalReported = truthMetrics.reduce((s, m) => s + (m.total_booked_revenue || 0), 0);
      const totalPaid = incomeTxns.reduce((s, t) => s + (t.amount || 0), 0);
      const totalGap = totalReported - totalPaid;
      const gapPct = totalReported > 0 ? (totalGap / totalReported) * 100 : 0;

      // By month
      const byMonth = {};
      truthMetrics.forEach(m => {
        if (!m.date) return;
        const mo = moment(m.date).format('YYYY-MM');
        if (!byMonth[mo]) byMonth[mo] = { month: mo, reported: 0, paid: 0, lastPayment: null };
        byMonth[mo].reported += (m.total_booked_revenue || 0);
      });
      incomeTxns.forEach(t => {
        if (!t.date) return;
        const mo = moment(t.date).format('YYYY-MM');
        if (!byMonth[mo]) byMonth[mo] = { month: mo, reported: 0, paid: 0, lastPayment: null };
        byMonth[mo].paid += (t.amount || 0);
        if (t.date && (!byMonth[mo].lastPayment || t.date > byMonth[mo].lastPayment)) byMonth[mo].lastPayment = t.date;
      });
      const monthData = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month)).map(r => {
        const gap = r.reported - r.paid;
        const gapPct = r.reported > 0 ? (gap / r.reported) * 100 : 0;
        const status = Math.abs(gap) < 100 ? 'OK' : gap > r.reported * 0.5 ? 'Missing' : gap > 0 ? 'Short Paid' : 'Over Paid';
        return { ...r, gap, gapPct, status, action: status === 'OK' ? '—' : 'Chase' };
      });

      // By buyer
      const byBuyer = {};
      truthMetrics.forEach(m => {
        const b = m.buyer_name || 'Unknown';
        if (!byBuyer[b]) byBuyer[b] = { buyer: b, reported: 0, paid: 0, lastPayment: null };
        byBuyer[b].reported += (m.total_booked_revenue || 0);
      });
      incomeTxns.forEach(t => {
        const b = t.counterparty || 'Unknown';
        if (!byBuyer[b]) byBuyer[b] = { buyer: b, reported: 0, paid: 0, lastPayment: null };
        byBuyer[b].paid += (t.amount || 0);
        if (t.date && (!byBuyer[b].lastPayment || t.date > byBuyer[b].lastPayment)) byBuyer[b].lastPayment = t.date;
      });
      arInvoices.forEach(inv => {
        const b = inv.buyer_name || 'Unknown';
        if (!byBuyer[b]) byBuyer[b] = { buyer: b, reported: 0, paid: 0, lastPayment: null };
        if (inv.status === 'Paid') byBuyer[b].paid += (inv.total_amount || 0);
        if (inv.payment_date && (!byBuyer[b].lastPayment || inv.payment_date > byBuyer[b].lastPayment)) byBuyer[b].lastPayment = inv.payment_date;
      });
      const buyerData = Object.values(byBuyer).map(r => {
        const gap = r.reported - r.paid;
        const gapPct = r.reported > 0 ? (gap / r.reported) * 100 : 0;
        const status = Math.abs(gap) < 100 ? 'OK' : gap > r.reported * 0.5 ? 'Missing' : gap > 0 ? 'Short Paid' : 'Verify';
        return { ...r, gap, gapPct, status, action: status === 'OK' ? '—' : 'Chase' };
      }).sort((a, b) => b.gap - a.gap);

      // By vertical
      const byVertical = {};
      truthMetrics.forEach(m => {
        const v = m.vertical || 'Unknown';
        if (!byVertical[v]) byVertical[v] = { vertical: v, reported: 0, paid: 0 };
        byVertical[v].reported += (m.total_booked_revenue || 0);
      });
      const verticalData = Object.values(byVertical).map(r => {
        const gap = r.reported - r.paid;
        const gapPct = r.reported > 0 ? (gap / r.reported) * 100 : 0;
        return { ...r, gap, gapPct, status: Math.abs(gap) < 100 ? 'OK' : 'Verify' };
      });

      // By campaign/supplier
      const byCampaign = {};
      truthMetrics.forEach(m => {
        const c = m.campaign_name || 'Unknown';
        if (!byCampaign[c]) byCampaign[c] = { campaign: c, supplier: m.supplier_sid || '—', reported: 0, paid: 0 };
        byCampaign[c].reported += (m.total_booked_revenue || 0);
        byCampaign[c].paid += (m.buyer_collected_cash || 0);
      });
      const campaignData = Object.values(byCampaign).map(r => {
        const gap = r.reported - r.paid;
        const gapPct = r.reported > 0 ? (gap / r.reported) * 100 : 0;
        return { ...r, gap, gapPct, status: Math.abs(gap) < 100 ? 'OK' : 'Verify' };
      }).sort((a, b) => b.gap - a.gap);

      setData({ totalReported, totalPaid, totalGap, gapPct, monthData, buyerData, verticalData, campaignData });
    } catch (err) {
      console.error('ReportedVsPaid error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;
  const d = data || {};

  const moneyCol = (key) => ({ key, align: 'right', render: (v) => <span className={moneyColor(v)}>{formatMoney(v)}</span> });
  const pctCol = (key) => ({ key, align: 'right', render: (v) => <span className={v > 20 ? 'text-critical' : v > 5 ? 'text-warning' : 'text-success'}>{formatPercent(v)}</span> });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reported vs Paid</h1>
        <p className="text-sm text-muted-foreground mt-1">Compare performance-reported revenue to verified bank/Xero/Stripe payments.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Reported Revenue" value={d.totalReported || 0} label="BOOKED" />
        <MetricCard title="Verified Income" value={d.totalPaid || 0} label="CASH" />
        <MetricCard title="Revenue Gap" value={d.totalGap || 0} sublabel="Reported - Paid" />
        <MetricCard title="Gap %" value={`${formatPercent(d.gapPct || 0)}`} />
      </div>

      <SectionPanel title="By Month" subtitle="Reported vs paid revenue by month">
        <DataTable
          exportFileName="reported_vs_paid_month"
          data={d.monthData || []}
          columns={[
            { key: 'month', label: 'Month' },
            moneyCol('reported'),
            moneyCol('paid'),
            moneyCol('gap'),
            pctCol('gapPct'),
            { key: 'lastPayment', label: 'Last Payment' },
            { key: 'status', label: 'Status' },
            { key: 'action', label: 'Action' },
          ]}
        />
      </SectionPanel>

      <SectionPanel title="By Buyer" subtitle="Reported vs paid revenue by buyer">
        <DataTable
          exportFileName="reported_vs_paid_buyer"
          data={d.buyerData || []}
          maxHeight="400px"
          columns={[
            { key: 'buyer', label: 'Buyer' },
            moneyCol('reported'),
            moneyCol('paid'),
            moneyCol('gap'),
            pctCol('gapPct'),
            { key: 'lastPayment', label: 'Last Payment' },
            { key: 'status', label: 'Status' },
            { key: 'action', label: 'Action' },
          ]}
        />
      </SectionPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title="By Vertical" subtitle="Reported vs paid revenue by vertical">
          <DataTable
            exportFileName="reported_vs_paid_vertical"
            data={d.verticalData || []}
            maxHeight="350px"
            columns={[
              { key: 'vertical', label: 'Vertical' },
              moneyCol('reported'),
              moneyCol('paid'),
              moneyCol('gap'),
              pctCol('gapPct'),
              { key: 'status', label: 'Status' },
            ]}
          />
        </SectionPanel>
        <SectionPanel title="By Campaign / Supplier" subtitle="Reported vs paid revenue by campaign">
          <DataTable
            exportFileName="reported_vs_paid_campaign"
            data={d.campaignData || []}
            maxHeight="350px"
            columns={[
              { key: 'campaign', label: 'Campaign' },
              { key: 'supplier', label: 'Supplier' },
              moneyCol('reported'),
              moneyCol('paid'),
              moneyCol('gap'),
              pctCol('gapPct'),
              { key: 'status', label: 'Status' },
            ]}
          />
        </SectionPanel>
      </div>
    </div>
  );
}