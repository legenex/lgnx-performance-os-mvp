import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor, formatPercent } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import moment from 'moment';

export default function FinanceMain() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [bankAccounts, bankTxns, arInvoices, apEntries, xeroInvoices, truthMetrics] = await Promise.all([
        base44.entities.BankAccount.list().catch(() => []),
        base44.entities.BankTransaction.list().catch(() => []),
        base44.entities.ARInvoice.list().catch(() => []),
        base44.entities.APEntry.list().catch(() => []),
        base44.entities.XeroInvoice.list().catch(() => []),
        base44.entities.CampaignTruthMetric.list().catch(() => []),
      ]);

      const cashPosition = bankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);
      const buyerCashCollected = bankTxns.filter(t => t.cash_type === 'Buyer Collection' || (t.amount > 0 && t.category?.toLowerCase().includes('income'))).reduce((s, t) => s + (t.amount || 0), 0);
      const bookedRevenue = truthMetrics.reduce((s, m) => s + (m.total_booked_revenue || 0), 0);
      const incomeGap = bookedRevenue - buyerCashCollected;
      const apFromEntries = apEntries.reduce((s, e) => s + (e.amount || 0), 0);
      const apFromXero = xeroInvoices.filter(x => x.type === 'ACCPAY' && x.amount_due > 0).reduce((s, x) => s + (x.amount_due || 0), 0);
      const confirmedPayables = apFromEntries + apFromXero;
      const supplierDebt = apFromEntries;
      const mediaPaid = bankTxns.filter(t => t.cash_type === 'Media Spend').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const spendTracked = truthMetrics.reduce((s, m) => s + (m.spend_tracked || 0), 0);
      const mediaGap = spendTracked - mediaPaid;
      const supplierPaid = bankTxns.filter(t => t.cash_type === 'Supplier Payout').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const opex = bankTxns.filter(t => ['Payroll', 'Tool', 'Contractor', 'Fee'].includes(t.cash_type)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const ownerDraw = bankTxns.filter(t => ['Owner Draw', 'Personal'].includes(t.cash_type)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const cashAdjustedProfit = buyerCashCollected - mediaPaid - supplierPaid - opex - ownerDraw;
      const reportedProfit = truthMetrics.reduce((s, m) => s + (m.true_gross_margin || 0), 0);

      // Monthly Summary
      const byMonth = {};
      bankTxns.forEach(t => {
        if (!t.date) return;
        const m = moment(t.date).format('YYYY-MM');
        if (!byMonth[m]) byMonth[m] = { month: m, buyerCash: 0, mediaPaid: 0, supplierPaid: 0, opex: 0, ownerDraw: 0 };
        if (t.cash_type === 'Buyer Collection' || (t.amount > 0 && t.category?.toLowerCase().includes('income'))) byMonth[m].buyerCash += (t.amount || 0);
        if (t.cash_type === 'Media Spend') byMonth[m].mediaPaid += Math.abs(t.amount || 0);
        if (t.cash_type === 'Supplier Payout') byMonth[m].supplierPaid += Math.abs(t.amount || 0);
        if (['Payroll', 'Tool', 'Contractor', 'Fee'].includes(t.cash_type)) byMonth[m].opex += Math.abs(t.amount || 0);
        if (['Owner Draw', 'Personal'].includes(t.cash_type)) byMonth[m].ownerDraw += Math.abs(t.amount || 0);
      });
      truthMetrics.forEach(m => {
        if (!m.date) return;
        const mo = moment(m.date).format('YYYY-MM');
        if (!byMonth[mo]) byMonth[mo] = { month: mo, buyerCash: 0, mediaPaid: 0, supplierPaid: 0, opex: 0, ownerDraw: 0 };
        byMonth[mo].bookedRevenue = (byMonth[mo].bookedRevenue || 0) + (m.total_booked_revenue || 0);
        byMonth[mo].reportedProfit = (byMonth[mo].reportedProfit || 0) + (m.true_gross_margin || 0);
      });
      const monthlyData = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12).map(r => ({
        ...r,
        incomeGap: (r.bookedRevenue || 0) - r.buyerCash,
        supplierAccrued: 0,
        cashAdjustedProfit: r.buyerCash - r.mediaPaid - r.supplierPaid - r.opex - r.ownerDraw,
        variance: (r.reportedProfit || 0) - (r.buyerCash - r.mediaPaid - r.supplierPaid - r.opex - r.ownerDraw),
      }));

      // Buyer Payment Check
      const byBuyer = {};
      arInvoices.forEach(inv => {
        const b = inv.buyer_name || 'Unknown';
        if (!byBuyer[b]) byBuyer[b] = { buyer: b, bookedRevenue: 0, cashReceived: 0, unpaid: 0, lastPayment: null };
        byBuyer[b].bookedRevenue += (inv.total_amount || 0);
        if (!['Paid', 'Draft'].includes(inv.status)) byBuyer[b].unpaid += (inv.outstanding_amount || 0);
      });
      bankTxns.filter(t => t.cash_type === 'Buyer Collection').forEach(t => {
        const b = t.counterparty || 'Unknown';
        if (!byBuyer[b]) byBuyer[b] = { buyer: b, bookedRevenue: 0, cashReceived: 0, unpaid: 0, lastPayment: null };
        byBuyer[b].cashReceived += (t.amount || 0);
        if (t.date && (!byBuyer[b].lastPayment || t.date > byBuyer[b].lastPayment)) byBuyer[b].lastPayment = t.date;
      });
      const buyerData = Object.values(byBuyer).map(r => ({ ...r, gap: r.bookedRevenue - r.cashReceived, action: r.unpaid > 0 ? 'Chase' : 'OK' }));

      // Supplier Payables
      const bySupplier = {};
      apEntries.forEach(e => {
        const s = e.supplier_name || 'Unknown';
        if (!bySupplier[s]) bySupplier[s] = { supplier: s, confirmedBalance: 0, accrued: 0, paid: 0 };
        if (e.entry_type === 'Accrual') bySupplier[s].accrued += (e.amount || 0);
        else if (e.entry_type === 'Payment') bySupplier[s].paid += (e.amount || 0);
        else bySupplier[s].confirmedBalance += (e.amount || 0);
      });
      const supplierData = Object.values(bySupplier).map(r => ({ ...r, variance: r.confirmedBalance + r.accrued - r.paid, risk: r.confirmedBalance > 10000 ? 'High' : r.confirmedBalance > 2000 ? 'Medium' : 'Low', action: r.confirmedBalance > 2000 ? 'Verify' : 'OK' }));

      setData({ cashPosition, buyerCashCollected, bookedRevenue, incomeGap, confirmedPayables, supplierDebt, mediaGap, cashAdjustedProfit, monthlyData, buyerData, supplierData });
    } catch (err) {
      console.error('FinanceMain error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;
  const d = data || {};

  const moneyCol = (key) => ({ key, align: 'right', render: (v) => <span className={moneyColor(v)}>{formatMoney(v)}</span> });
  const pctCol = (key) => ({ key, align: 'right', render: (v) => <span>{formatPercent(v)}</span> });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground mt-1">Cash truth: what was booked, what was collected, what is owed, and real profit.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Cash Position" value={d.cashPosition || 0} label="CASH" />
        <MetricCard title="Buyer Cash Collected" value={d.buyerCashCollected || 0} label="CASH" />
        <MetricCard title="Booked Revenue" value={d.bookedRevenue || 0} label="BOOKED" />
        <MetricCard title="Income Gap" value={d.incomeGap || 0} sublabel="Booked - Collected" />
        <MetricCard title="Confirmed Payables" value={d.confirmedPayables || 0} />
        <MetricCard title="Supplier Debt" value={d.supplierDebt || 0} />
        <MetricCard title="Media Gap" value={d.mediaGap || 0} sublabel="Tracked - Paid" />
        <MetricCard title="Cash-Adjusted Profit" value={d.cashAdjustedProfit || 0} label="CASH" />
      </div>

      <SectionPanel title="Monthly Finance Summary" subtitle="Cash flow and profit by month">
        <DataTable
          exportFileName="monthly_finance_summary"
          data={d.monthlyData || []}
          columns={[
            { key: 'month', label: 'Month' },
            moneyCol('buyerCash'),
            moneyCol('bookedRevenue'),
            moneyCol('incomeGap'),
            moneyCol('mediaPaid'),
            moneyCol('supplierPaid'),
            moneyCol('supplierAccrued'),
            moneyCol('opex'),
            moneyCol('ownerDraw'),
            moneyCol('cashAdjustedProfit'),
            moneyCol('reportedProfit'),
            moneyCol('variance'),
          ]}
        />
      </SectionPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionPanel title="Buyer Payment Check" subtitle="Booked vs collected by buyer">
          <DataTable
            exportFileName="buyer_payment_check"
            data={d.buyerData || []}
            columns={[
              { key: 'buyer', label: 'Buyer' },
              moneyCol('bookedRevenue'),
              moneyCol('cashReceived'),
              moneyCol('unpaid'),
              { key: 'lastPayment', label: 'Last Payment' },
              moneyCol('gap'),
              { key: 'action', label: 'Action' },
            ]}
          />
        </SectionPanel>

        <SectionPanel title="Supplier / Media Payables" subtitle="What is owed to suppliers and vendors">
          <DataTable
            exportFileName="supplier_payables"
            data={d.supplierData || []}
            columns={[
              { key: 'supplier', label: 'Supplier' },
              moneyCol('confirmedBalance'),
              moneyCol('accrued'),
              moneyCol('paid'),
              moneyCol('variance'),
              { key: 'risk', label: 'Risk' },
              { key: 'action', label: 'Action' },
            ]}
          />
        </SectionPanel>
      </div>
    </div>
  );
}