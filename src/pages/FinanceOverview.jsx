import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor, formatPercent } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import moment from 'moment';

export default function FinanceOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [bankTxns, truthMetrics, arInvoices, apEntries] = await Promise.all([
        base44.entities.BankTransaction.list().catch(() => []),
        base44.entities.CampaignTruthMetric.list().catch(() => []),
        base44.entities.ARInvoice.list().catch(() => []),
        base44.entities.APEntry.list().catch(() => []),
      ]);

      const now = moment();
      const monthStr = now.format('YYYY-MM');
      const monthBank = bankTxns.filter(t => t.date && moment(t.date).format('YYYY-MM') === monthStr);
      const monthTruth = truthMetrics.filter(m => m.date && moment(m.date).format('YYYY-MM') === monthStr);

      const cashReceived = monthBank.filter(t => t.amount > 0 && (t.cash_type === 'Buyer Collection' || t.category?.toLowerCase().includes('income'))).reduce((s, t) => s + (t.amount || 0), 0);
      const bookedRevenue = monthTruth.reduce((s, m) => s + (m.total_booked_revenue || 0), 0);
      const revenueGap = bookedRevenue - cashReceived;
      const reportedProfit = monthTruth.reduce((s, m) => s + (m.true_gross_margin || 0), 0);
      const mediaPaid = monthBank.filter(t => t.cash_type === 'Media Spend').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const supplierPaid = monthBank.filter(t => t.cash_type === 'Supplier Payout').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const opex = monthBank.filter(t => ['Payroll', 'Tool', 'Contractor', 'Fee'].includes(t.cash_type)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const cashVerifiedProfit = cashReceived - mediaPaid - supplierPaid - opex;
      const profitGap = reportedProfit - cashVerifiedProfit;

      const supplierCostAccrued = apEntries.filter(e => e.entry_type === 'Accrual').reduce((s, e) => s + (e.amount || 0), 0);
      const supplierCostPaid = apEntries.filter(e => e.entry_type === 'Payment').reduce((s, e) => s + (e.amount || 0), 0);
      const mediaSpendTracked = monthTruth.reduce((s, m) => s + (m.spend_tracked || 0), 0);
      const mediaSpendPaid = mediaPaid;
      const totalLeads = monthTruth.reduce((s, m) => s + (m.web_lead_count || 0), 0);
      const trueCPL = totalLeads > 0 ? (mediaSpendPaid + supplierCostPaid) / totalLeads : 0;

      // Monthly Financial Truth Table
      const byMonth = {};
      bankTxns.forEach(t => {
        if (!t.date) return;
        const m = moment(t.date).format('YYYY-MM');
        if (!byMonth[m]) byMonth[m] = { month: m, bookedRevenue: 0, bankIncome: 0, mediaPaid: 0, supplierPaid: 0, opex: 0, supplierAccrued: 0, mediaTracked: 0 };
        if (t.amount > 0 && (t.cash_type === 'Buyer Collection' || t.category?.toLowerCase().includes('income'))) byMonth[m].bankIncome += (t.amount || 0);
        if (t.cash_type === 'Media Spend') byMonth[m].mediaPaid += Math.abs(t.amount || 0);
        if (t.cash_type === 'Supplier Payout') byMonth[m].supplierPaid += Math.abs(t.amount || 0);
        if (['Payroll', 'Tool', 'Contractor', 'Fee'].includes(t.cash_type)) byMonth[m].opex += Math.abs(t.amount || 0);
      });
      truthMetrics.forEach(m => {
        if (!m.date) return;
        const mo = moment(m.date).format('YYYY-MM');
        if (!byMonth[mo]) byMonth[mo] = { month: mo, bookedRevenue: 0, bankIncome: 0, mediaPaid: 0, supplierPaid: 0, opex: 0, supplierAccrued: 0, mediaTracked: 0 };
        byMonth[mo].bookedRevenue += (m.total_booked_revenue || 0);
        byMonth[mo].reportedProfit = (byMonth[mo].reportedProfit || 0) + (m.true_gross_margin || 0);
        byMonth[mo].mediaTracked += (m.spend_tracked || 0);
      });
      apEntries.forEach(e => {
        if (!e.date) return;
        const mo = moment(e.date).format('YYYY-MM');
        if (!byMonth[mo]) byMonth[mo] = { month: mo, bookedRevenue: 0, bankIncome: 0, mediaPaid: 0, supplierPaid: 0, opex: 0, supplierAccrued: 0, mediaTracked: 0 };
        if (e.entry_type === 'Accrual') byMonth[mo].supplierAccrued += (e.amount || 0);
      });
      const monthlyData = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12).map(r => {
        const revenueGap = (r.bookedRevenue || 0) - (r.bankIncome || 0);
        const cashVerifiedProfit = (r.bankIncome || 0) - (r.mediaPaid || 0) - (r.supplierPaid || 0) - (r.opex || 0);
        const profitGap = (r.reportedProfit || 0) - cashVerifiedProfit;
        const status = Math.abs(revenueGap) < 100 ? 'OK' : revenueGap > 0 ? 'Short Paid' : 'Over Paid';
        return { ...r, revenueGap, cashVerifiedProfit, profitGap, status };
      });

      // Buyer Payment Verification Table
      const byBuyer = {};
      arInvoices.forEach(inv => {
        const b = inv.buyer_name || 'Unknown';
        if (!byBuyer[b]) byBuyer[b] = { buyer: b, bookedRevenue: 0, paid: 0, lastPayment: null };
        byBuyer[b].bookedRevenue += (inv.total_amount || 0);
        if (inv.status === 'Paid') byBuyer[b].paid += (inv.total_amount || 0);
        if (inv.payment_date && (!byBuyer[b].lastPayment || inv.payment_date > byBuyer[b].lastPayment)) byBuyer[b].lastPayment = inv.payment_date;
      });
      bankTxns.filter(t => t.cash_type === 'Buyer Collection').forEach(t => {
        const b = t.counterparty || 'Unknown';
        if (!byBuyer[b]) byBuyer[b] = { buyer: b, bookedRevenue: 0, paid: 0, lastPayment: null };
        byBuyer[b].paid += (t.amount || 0);
        if (t.date && (!byBuyer[b].lastPayment || t.date > byBuyer[b].lastPayment)) byBuyer[b].lastPayment = t.date;
      });
      const buyerData = Object.values(byBuyer).map(r => {
        const unpaid = r.bookedRevenue - r.paid;
        const status = unpaid <= 0 ? 'OK' : unpaid > r.bookedRevenue * 0.5 ? 'Missing' : unpaid > r.bookedRevenue * 0.2 ? 'Short Paid' : 'Verify';
        return { ...r, unpaid, status, action: status === 'OK' ? '—' : 'Chase' };
      });

      // Cost Verification Table
      const byCost = {};
      apEntries.forEach(e => {
        const s = e.supplier_name || 'Unknown';
        if (!byCost[s]) byCost[s] = { vendor: s, accrued: 0, paid: 0 };
        if (e.entry_type === 'Accrual') byCost[s].accrued += (e.amount || 0);
        if (e.entry_type === 'Payment') byCost[s].paid += (e.amount || 0);
      });
      const platformSpend = { vendor: 'Media Spend (Platform)', accrued: mediaSpendTracked, paid: mediaSpendPaid };
      const costData = [
        ...Object.values(byCost).map(r => {
          const gap = r.accrued - r.paid;
          const status = Math.abs(gap) < 100 ? 'OK' : gap > 0 ? 'Verify' : 'Over Paid';
          return { ...r, gap, status, action: status === 'OK' ? '—' : 'Verify' };
        }),
        { vendor: 'Media Spend (Platform)', accrued: mediaSpendTracked, paid: mediaSpendPaid, gap: mediaSpendTracked - mediaSpendPaid, status: Math.abs(mediaSpendTracked - mediaSpendPaid) < 100 ? 'OK' : 'Verify', action: 'Verify' },
      ];

      setData({ cashReceived, bookedRevenue, revenueGap, reportedProfit, cashVerifiedProfit, profitGap, supplierCostAccrued, supplierCostPaid, mediaSpendTracked, mediaSpendPaid, trueCPL, monthlyData, buyerData, costData });
    } catch (err) {
      console.error('FinanceOverview error:', err);
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
        <h1 className="text-xl font-semibold text-foreground">Finance Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Does reported revenue and profit match what actually hit the bank, Xero, and Stripe?</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard title="Cash Received" value={d.cashReceived || 0} label="CASH" />
        <MetricCard title="Booked Revenue" value={d.bookedRevenue || 0} label="BOOKED" />
        <MetricCard title="Revenue Gap" value={d.revenueGap || 0} sublabel="Booked - Cash" />
        <MetricCard title="Reported Profit" value={d.reportedProfit || 0} label="BOOKED" />
        <MetricCard title="Cash-Verified Profit" value={d.cashVerifiedProfit || 0} label="CASH" />
        <MetricCard title="Profit Gap" value={d.profitGap || 0} sublabel="Reported - Cash" />
        <MetricCard title="Supplier Costs Accrued" value={d.supplierCostAccrued || 0} />
        <MetricCard title="Supplier Costs Paid" value={d.supplierCostPaid || 0} label="CASH" />
        <MetricCard title="Media Spend Tracked" value={d.mediaSpendTracked || 0} label="BOOKED" />
        <MetricCard title="Media Spend Paid" value={d.mediaSpendPaid || 0} label="CASH" />
        <MetricCard title="True CPL" value={d.trueCPL || 0} />
        <MetricCard title="Profit Gap %" value={d.reportedProfit > 0 ? `${formatPercent((d.profitGap / d.reportedProfit) * 100)}` : '—'} />
      </div>

      <SectionPanel title="Monthly Financial Truth" subtitle="Booked vs verified income, profit, and costs by month">
        <DataTable
          exportFileName="monthly_financial_truth"
          data={d.monthlyData || []}
          maxHeight="400px"
          columns={[
            { key: 'month', label: 'Month' },
            moneyCol('bookedRevenue'),
            moneyCol('bankIncome'),
            moneyCol('revenueGap'),
            moneyCol('reportedProfit'),
            moneyCol('cashVerifiedProfit'),
            moneyCol('profitGap'),
            moneyCol('mediaTracked'),
            moneyCol('mediaPaid'),
            moneyCol('supplierAccrued'),
            moneyCol('supplierPaid'),
            moneyCol('opex'),
            { key: 'status', label: 'Status' },
          ]}
        />
      </SectionPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title="Buyer Payment Verification" subtitle="Booked revenue vs bank/Xero/Stripe payments by buyer">
          <DataTable
            exportFileName="buyer_payment_verification"
            data={d.buyerData || []}
            maxHeight="350px"
            columns={[
              { key: 'buyer', label: 'Buyer' },
              moneyCol('bookedRevenue'),
              moneyCol('paid'),
              moneyCol('unpaid'),
              { key: 'lastPayment', label: 'Last Payment' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: 'Action' },
            ]}
          />
        </SectionPanel>
        <SectionPanel title="Cost Verification" subtitle="Accrued vs paid costs by supplier/vendor/platform">
          <DataTable
            exportFileName="cost_verification"
            data={d.costData || []}
            maxHeight="350px"
            columns={[
              { key: 'vendor', label: 'Supplier / Vendor / Platform' },
              moneyCol('accrued'),
              moneyCol('paid'),
              moneyCol('gap'),
              { key: 'status', label: 'Status' },
              { key: 'action', label: 'Action' },
            ]}
          />
        </SectionPanel>
      </div>
    </div>
  );
}