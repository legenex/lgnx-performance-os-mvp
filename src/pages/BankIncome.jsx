import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import moment from 'moment';

export default function BankIncome() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const bankTxns = await base44.entities.BankTransaction.list().catch(() => []);

      const incomeTxns = bankTxns.filter(t => t.amount > 0 && (t.cash_type === 'Buyer Collection' || t.category?.toLowerCase().includes('income') || t.cash_type === 'Other Income'));

      const totalIncome = incomeTxns.reduce((s, t) => s + (t.amount || 0), 0);
      const matched = incomeTxns.filter(t => t.match_status !== 'Unmatched' && t.match_status !== 'Ignored');
      const unmatched = incomeTxns.filter(t => t.match_status === 'Unmatched');
      const matchedTotal = matched.reduce((s, t) => s + (t.amount || 0), 0);
      const unmatchedTotal = unmatched.reduce((s, t) => s + (t.amount || 0), 0);

      // By month
      const byMonth = {};
      incomeTxns.forEach(t => {
        if (!t.date) return;
        const m = moment(t.date).format('YYYY-MM');
        if (!byMonth[m]) byMonth[m] = { month: m, income: 0, matched: 0, unmatched: 0, count: 0 };
        byMonth[m].income += (t.amount || 0);
        byMonth[m].count++;
        if (t.match_status === 'Unmatched') byMonth[m].unmatched += (t.amount || 0);
        else byMonth[m].matched += (t.amount || 0);
      });
      const monthData = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month));

      // By buyer/counterparty
      const byBuyer = {};
      incomeTxns.forEach(t => {
        const b = t.counterparty || 'Unknown';
        if (!byBuyer[b]) byBuyer[b] = { buyer: b, income: 0, count: 0, lastPayment: null, matched: 0 };
        byBuyer[b].income += (t.amount || 0);
        byBuyer[b].count++;
        if (t.match_status !== 'Unmatched') byBuyer[b].matched += (t.amount || 0);
        if (t.date && (!byBuyer[b].lastPayment || t.date > byBuyer[b].lastPayment)) byBuyer[b].lastPayment = t.date;
      });
      const buyerData = Object.values(byBuyer).map(r => ({
        ...r,
        unmatched: r.income - r.matched,
        status: r.matched / r.income > 0.9 ? 'OK' : r.matched / r.income > 0.5 ? 'Partial' : 'Unmatched',
      })).sort((a, b) => b.income - a.income);

      // Unmatched income
      const unmatchedData = unmatched.map(t => ({
        date: t.date,
        counterparty: t.counterparty || 'Unknown',
        amount: t.amount,
        description: t.description || '—',
        category: t.category || '—',
        source: t.source || '—',
      })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      // Matching candidates (unmatched income that might match a buyer)
      const matchCandidates = unmatched.map(t => ({
        date: t.date,
        amount: t.amount,
        counterparty: t.counterparty || 'Unknown',
        description: t.description || '—',
        possibleMatch: t.counterparty || '—',
        source: t.source || '—',
      })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      setData({ totalIncome, matchedTotal, unmatchedTotal, monthData, buyerData, unmatchedData, matchCandidates });
    } catch (err) {
      console.error('BankIncome error:', err);
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
        <h1 className="text-xl font-semibold text-foreground">Bank Income</h1>
        <p className="text-sm text-muted-foreground mt-1">Actual income received — bank, Xero, and Stripe transactions categorized by buyer and month.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Income" value={d.totalIncome || 0} label="CASH" />
        <MetricCard title="Matched Income" value={d.matchedTotal || 0} label="CASH" sublabel="Matched to buyer" />
        <MetricCard title="Unmatched Income" value={d.unmatchedTotal || 0} sublabel="Needs matching" />
        <MetricCard title="Match Rate" value={d.totalIncome > 0 ? `${((d.matchedTotal / d.totalIncome) * 100).toFixed(1)}%` : '—'} />
      </div>

      <SectionPanel title="Bank Income by Month" subtitle="Income received and match status by month">
        <DataTable
          exportFileName="bank_income_by_month"
          data={d.monthlyData || []}
          columns={[
            { key: 'month', label: 'Month' },
            moneyCol('income'),
            moneyCol('matched'),
            moneyCol('unmatched'),
            { key: 'count', label: 'Transactions', align: 'right' },
          ]}
        />
      </SectionPanel>

      <SectionPanel title="Bank Income by Buyer / Counterparty" subtitle="Income attributed to each buyer or counterparty">
        <DataTable
          exportFileName="bank_income_by_buyer"
          data={d.buyerData || []}
          maxHeight="400px"
          columns={[
            { key: 'buyer', label: 'Buyer / Counterparty' },
            moneyCol('income'),
            moneyCol('matched'),
            moneyCol('unmatched'),
            { key: 'count', label: 'Transactions', align: 'right' },
            { key: 'lastPayment', label: 'Last Payment' },
            { key: 'status', label: 'Status' },
          ]}
        />
      </SectionPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title="Unmatched Income" subtitle="Income not yet matched to a buyer or invoice">
          <DataTable
            exportFileName="unmatched_income"
            data={d.unmatchedData || []}
            maxHeight="350px"
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'counterparty', label: 'Counterparty' },
              moneyCol('amount'),
              { key: 'description', label: 'Description' },
              { key: 'source', label: 'Source' },
            ]}
            emptyMessage="All income matched"
          />
        </SectionPanel>
        <SectionPanel title="Payment Matching Candidates" subtitle="Potential buyer matches for unmatched income">
          <DataTable
            exportFileName="matching_candidates"
            data={d.matchCandidates || []}
            maxHeight="350px"
            columns={[
              { key: 'date', label: 'Date' },
              moneyCol('amount'),
              { key: 'counterparty', label: 'Counterparty' },
              { key: 'possibleMatch', label: 'Possible Match' },
              { key: 'source', label: 'Source' },
            ]}
            emptyMessage="No unmatched income to match"
          />
        </SectionPanel>
      </div>
    </div>
  );
}