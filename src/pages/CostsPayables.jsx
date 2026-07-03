import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import moment from 'moment';

export default function CostsPayables() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [apEntries, bankTxns, truthMetrics] = await Promise.all([
        base44.entities.APEntry.list().catch(() => []),
        base44.entities.BankTransaction.list().catch(() => []),
        base44.entities.CampaignTruthMetric.list().catch(() => []),
      ]);

      const mediaPaid = bankTxns.filter(t => t.cash_type === 'Media Spend').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const supplierPaidFromBank = bankTxns.filter(t => t.cash_type === 'Supplier Payout').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const mediaTracked = truthMetrics.reduce((s, m) => s + (m.spend_tracked || 0), 0);
      const supplierAccruedFromTruth = truthMetrics.reduce((s, m) => s + (m.supplier_payout_accrued || 0), 0);

      const supplierAccrued = apEntries.filter(e => e.entry_type === 'Accrual').reduce((s, e) => s + (e.amount || 0), 0) + supplierAccruedFromTruth;
      const supplierPaid = apEntries.filter(e => e.entry_type === 'Payment').reduce((s, e) => s + (e.amount || 0), 0) + supplierPaidFromBank;

      const totalAccrued = supplierAccrued + mediaTracked;
      const totalPaid = supplierPaid + mediaPaid;
      const totalGap = totalAccrued - totalPaid;

      // By supplier
      const bySupplier = {};
      apEntries.forEach(e => {
        const s = e.supplier_name || 'Unknown';
        if (!bySupplier[s]) bySupplier[s] = { vendor: s, accrued: 0, paid: 0, lastPayment: null };
        if (e.entry_type === 'Accrual') bySupplier[s].accrued += (e.amount || 0);
        if (e.entry_type === 'Payment') bySupplier[s].paid += (e.amount || 0);
        if (e.date && e.entry_type === 'Payment' && (!bySupplier[s].lastPayment || e.date > bySupplier[s].lastPayment)) bySupplier[s].lastPayment = e.date;
      });
      bankTxns.filter(t => t.cash_type === 'Supplier Payout').forEach(t => {
        const s = t.counterparty || 'Unknown';
        if (!bySupplier[s]) bySupplier[s] = { vendor: s, accrued: 0, paid: 0, lastPayment: null };
        bySupplier[s].paid += Math.abs(t.amount || 0);
        if (t.date && (!bySupplier[s].lastPayment || t.date > bySupplier[s].lastPayment)) bySupplier[s].lastPayment = t.date;
      });
      const supplierData = Object.values(bySupplier).map(r => {
        const gap = r.accrued - r.paid;
        const status = Math.abs(gap) < 100 ? 'OK' : gap > 0 ? 'Unpaid' : 'Over Paid';
        return { ...r, gap, status, action: status === 'OK' ? '—' : 'Verify' };
      }).sort((a, b) => b.gap - a.gap);

      // By month
      const byMonth = {};
      apEntries.forEach(e => {
        if (!e.date) return;
        const m = moment(e.date).format('YYYY-MM');
        if (!byMonth[m]) byMonth[m] = { month: m, supplierAccrued: 0, supplierPaid: 0, mediaTracked: 0, mediaPaid: 0 };
        if (e.entry_type === 'Accrual') byMonth[m].supplierAccrued += (e.amount || 0);
        if (e.entry_type === 'Payment') byMonth[m].supplierPaid += (e.amount || 0);
      });
      bankTxns.forEach(t => {
        if (!t.date) return;
        const m = moment(t.date).format('YYYY-MM');
        if (!byMonth[m]) byMonth[m] = { month: m, supplierAccrued: 0, supplierPaid: 0, mediaTracked: 0, mediaPaid: 0 };
        if (t.cash_type === 'Media Spend') byMonth[m].mediaPaid += Math.abs(t.amount || 0);
        if (t.cash_type === 'Supplier Payout') byMonth[m].supplierPaid += Math.abs(t.amount || 0);
      });
      truthMetrics.forEach(m => {
        if (!m.date) return;
        const mo = moment(m.date).format('YYYY-MM');
        if (!byMonth[mo]) byMonth[mo] = { month: mo, supplierAccrued: 0, supplierPaid: 0, mediaTracked: 0, mediaPaid: 0 };
        byMonth[mo].mediaTracked += (m.spend_tracked || 0);
      });
      const monthData = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month)).map(r => ({
        ...r,
        totalAccrued: (r.supplierAccrued || 0) + (r.mediaTracked || 0),
        totalPaid: (r.supplierPaid || 0) + (r.mediaPaid || 0),
        gap: (r.supplierAccrued || 0) + (r.mediaTracked || 0) - (r.supplierPaid || 0) - (r.mediaPaid || 0),
      }));

      setData({ totalAccrued, totalPaid, totalGap, supplierAccrued, supplierPaid, mediaTracked, mediaPaid, supplierData, monthData });
    } catch (err) {
      console.error('CostsPayables error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;
  const d = data || {};

  const moneyCol = (key) => ({ key, align: 'right', render: (v) => <span className={moneyColor(v)}>{formatMoney(v)}</span> });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Costs & Payables</h1>
        <p className="text-sm text-muted-foreground mt-1">Supplier and media costs — accrued vs paid, with gaps highlighted.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Accrued Cost" value={d.totalAccrued || 0} label="BOOKED" />
        <MetricCard title="Total Paid Cost" value={d.totalPaid || 0} label="CASH" />
        <MetricCard title="Cost Gap" value={d.totalGap || 0} sublabel="Accrued - Paid" />
        <MetricCard title="Supplier Cost Accrued" value={d.supplierAccrued || 0} />
        <MetricCard title="Supplier Cost Paid" value={d.supplierPaid || 0} label="CASH" />
        <MetricCard title="Media Spend Tracked" value={d.mediaTracked || 0} label="BOOKED" />
        <MetricCard title="Media Spend Paid" value={d.mediaPaid || 0} label="CASH" />
        <MetricCard title="Cost Gap %" value={d.totalAccrued > 0 ? `${((d.totalGap / d.totalAccrued) * 100).toFixed(1)}%` : '—'} />
      </div>

      <SectionPanel title="Cost Verification by Supplier" subtitle="Accrued vs paid costs by supplier/vendor">
        <DataTable
          exportFileName="costs_by_supplier"
          data={d.supplierData || []}
          maxHeight="400px"
          columns={[
            { key: 'vendor', label: 'Supplier / Vendor' },
            moneyCol('accrued'),
            moneyCol('paid'),
            moneyCol('gap'),
            { key: 'lastPayment', label: 'Last Payment' },
            { key: 'status', label: 'Status' },
            { key: 'action', label: 'Action' },
          ]}
        />
      </SectionPanel>

      <SectionPanel title="Costs by Month" subtitle="Accrued vs paid costs by month">
        <DataTable
          exportFileName="costs_by_month"
          data={d.monthData || []}
          columns={[
            { key: 'month', label: 'Month' },
            moneyCol('supplierAccrued'),
            moneyCol('supplierPaid'),
            moneyCol('mediaTracked'),
            moneyCol('mediaPaid'),
            moneyCol('totalAccrued'),
            moneyCol('totalPaid'),
            moneyCol('gap'),
          ]}
        />
      </SectionPanel>
    </div>
  );
}