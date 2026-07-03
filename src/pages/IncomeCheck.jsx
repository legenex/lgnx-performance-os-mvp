import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import moment from 'moment';

export default function IncomeCheck() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [arInvoices, bankTxns, xeroInvoices] = await Promise.all([
        base44.entities.ARInvoice.list().catch(() => []),
        base44.entities.BankTransaction.list().catch(() => []),
        base44.entities.XeroInvoice.list().catch(() => []),
      ]);

      const totalBooked = arInvoices.filter(i => !['Draft'].includes(i.status)).reduce((s, i) => s + (i.total_amount || 0), 0);
      const totalCollected = arInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.total_amount || 0), 0);
      const totalUnpaid = arInvoices.filter(i => !['Paid', 'Draft'].includes(i.status)).reduce((s, i) => s + (i.outstanding_amount || 0), 0);
      const bankIncome = bankTxns.filter(t => t.cash_type === 'Buyer Collection' || (t.amount > 0 && t.category?.toLowerCase().includes('income'))).reduce((s, t) => s + (t.amount || 0), 0);
      const incomeGap = totalBooked - bankIncome;

      // By Buyer
      const byBuyer = {};
      arInvoices.forEach(inv => {
        const b = inv.buyer_name || 'Unknown';
        if (!byBuyer[b]) byBuyer[b] = { buyer: b, booked: 0, collected: 0, unpaid: 0, lastPayment: null, status: 'OK' };
        if (inv.status !== 'Draft') byBuyer[b].booked += (inv.total_amount || 0);
        if (inv.status === 'Paid') byBuyer[b].collected += (inv.total_amount || 0);
        else byBuyer[b].unpaid += (inv.outstanding_amount || 0);
      });
      bankTxns.filter(t => t.cash_type === 'Buyer Collection').forEach(t => {
        const b = t.counterparty || 'Unknown';
        if (!byBuyer[b]) byBuyer[b] = { buyer: b, booked: 0, collected: 0, unpaid: 0, lastPayment: null, status: 'OK' };
        byBuyer[b].collected += (t.amount || 0);
        if (t.date && (!byBuyer[b].lastPayment || t.date > byBuyer[b].lastPayment)) byBuyer[b].lastPayment = t.date;
      });
      const buyerData = Object.values(byBuyer).map(r => ({
        ...r,
        gap: r.booked - r.collected,
        status: r.unpaid > 0 && r.lastPayment ? (moment().diff(moment(r.lastPayment), 'days') > 30 ? 'Overdue' : 'Outstanding') : r.unpaid > 0 ? 'Unpaid' : 'Current',
      }));

      // By Month
      const byMonth = {};
      arInvoices.forEach(inv => {
        if (!inv.invoice_date || inv.status === 'Draft') return;
        const m = moment(inv.invoice_date).format('YYYY-MM');
        if (!byMonth[m]) byMonth[m] = { month: m, booked: 0, collected: 0 };
        byMonth[m].booked += (inv.total_amount || 0);
        if (inv.status === 'Paid') byMonth[m].collected += (inv.total_amount || 0);
      });
      bankTxns.filter(t => t.cash_type === 'Buyer Collection').forEach(t => {
        if (!t.date) return;
        const m = moment(t.date).format('YYYY-MM');
        if (!byMonth[m]) byMonth[m] = { month: m, booked: 0, collected: 0 };
        byMonth[m].collected += (t.amount || 0);
      });
      const monthlyData = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12).map(r => ({ ...r, gap: r.booked - r.collected }));

      // Chase List
      const chaseList = arInvoices
        .filter(i => !['Paid', 'Draft'].includes(i.status) && (i.outstanding_amount || 0) > 0)
        .sort((a, b) => (b.outstanding_amount || 0) - (a.outstanding_amount || 0))
        .slice(0, 50)
        .map(i => ({
          buyer: i.buyer_name || 'Unknown',
          invoice_number: i.invoice_number || i.id || '—',
          amount: i.outstanding_amount || 0,
          invoice_date: i.invoice_date || '—',
          due_date: i.due_date || '—',
          status: i.status || 'Outstanding',
          action: 'Chase',
        }));

      setData({ totalBooked, totalCollected, totalUnpaid, bankIncome, incomeGap, buyerData, monthlyData, chaseList });
    } catch (err) {
      console.error('IncomeCheck error:', err);
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
        <h1 className="text-xl font-semibold text-foreground">Income Check</h1>
        <p className="text-sm text-muted-foreground mt-1">What lead reports say was earned vs what banks actually received.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Booked Revenue" value={d.totalBooked || 0} label="BOOKED" />
        <MetricCard title="Bank Income" value={d.bankIncome || 0} label="CASH" />
        <MetricCard title="Income Gap" value={d.incomeGap || 0} />
        <MetricCard title="Unpaid Confirmed" value={d.totalUnpaid || 0} />
        <MetricCard title="Collected" value={d.totalCollected || 0} label="CASH" />
      </div>

      <SectionPanel title="Buyer Income Reconciliation" subtitle="Booked vs collected by buyer">
        <DataTable exportFileName="buyer_income_recon" data={d.buyerData || []}
          columns={[{ key: 'buyer', label: 'Buyer' }, moneyCol('booked'), moneyCol('collected'), moneyCol('unpaid'), moneyCol('gap'), { key: 'lastPayment', label: 'Last Payment' }, { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> }]} />
      </SectionPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title="Booked vs Collected by Month" subtitle="Monthly income reality">
          <DataTable exportFileName="monthly_income_recon" data={d.monthlyData || []} maxHeight="350px"
            columns={[{ key: 'month', label: 'Month' }, moneyCol('booked'), moneyCol('collected'), moneyCol('gap')]} />
        </SectionPanel>
        <SectionPanel title="Payment Chase List" subtitle="Unpaid confirmed buyer income — sorted by amount">
          <DataTable exportFileName="payment_chase_list" data={d.chaseList || []} maxHeight="350px"
            columns={[{ key: 'buyer', label: 'Buyer' }, { key: 'invoice_number', label: 'Invoice' }, moneyCol('amount'), { key: 'invoice_date', label: 'Inv Date' }, { key: 'due_date', label: 'Due' }, { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> }, { key: 'action', label: 'Action' }]} />
        </SectionPanel>
      </div>
    </div>
  );
}