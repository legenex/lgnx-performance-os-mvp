import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor } from '@/lib/formatters';
import { DollarSign, Wallet, TrendingDown, Clock } from 'lucide-react';

export default function RealityBar() {
  const [data, setData] = useState({ cash: 0, netCollectable: 0, profitGap: 0, runway: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [bankAccounts, arInvoices, apEntries, xeroInvoices, bankTxns, truthMetrics] = await Promise.all([
        base44.entities.BankAccount.list().catch(() => []),
        base44.entities.ARInvoice.list().catch(() => []),
        base44.entities.APEntry.list().catch(() => []),
        base44.entities.XeroInvoice.list().catch(() => []),
        base44.entities.BankTransaction.list().catch(() => []),
        base44.entities.CampaignTruthMetric.list().catch(() => []),
      ]);

      const cash = bankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);

      const buyerIncomeDue = arInvoices
        .filter(i => !['Paid', 'Draft'].includes(i.status))
        .reduce((s, i) => s + (i.outstanding_amount || 0), 0);

      const apFromEntries = apEntries.reduce((s, e) => s + (e.amount || 0), 0);
      const apFromXero = xeroInvoices
        .filter(x => x.type === 'ACCPAY' && x.amount_due > 0)
        .reduce((s, x) => s + (x.amount_due || 0), 0);
      const payables = apFromEntries + apFromXero;

      const netCollectable = cash + buyerIncomeDue - payables;

      const reportedProfit = truthMetrics.reduce((s, m) => s + (m.true_gross_margin || 0), 0);
      const buyerCashCollected = bankTxns
        .filter(t => t.cash_type === 'Buyer Collection' || (t.amount > 0 && t.category?.toLowerCase().includes('income')))
        .reduce((s, t) => s + (t.amount || 0), 0);
      const mediaPaid = bankTxns.filter(t => t.cash_type === 'Media Spend').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const supplierPaid = bankTxns.filter(t => t.cash_type === 'Supplier Payout').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const opex = bankTxns
        .filter(t => ['Payroll', 'Tool', 'Contractor', 'Fee', 'Owner Draw', 'Personal'].includes(t.cash_type))
        .reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const cashAdjustedProfit = buyerCashCollected - mediaPaid - supplierPaid - opex;
      const profitGap = reportedProfit - cashAdjustedProfit;

      const outflows = bankTxns.filter(t => t.amount < 0);
      const totalOut = outflows.reduce((s, t) => s + Math.abs(t.amount), 0);
      const weeklyBurn = outflows.length > 0 ? totalOut / 26 : 1;
      const runway = cash > 0 ? Math.round((cash / weeklyBurn) * 10) / 10 : 0;

      setData({ cash, netCollectable, profitGap, runway });
    } catch (err) {
      console.error('RealityBar error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-14 border-b border-border flex items-center px-6 bg-sidebar">
        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const metrics = [
    { icon: DollarSign, label: 'Cash Position', value: data.cash, color: moneyColor(data.cash) },
    { icon: Wallet, label: 'Net Collectable', value: data.netCollectable, color: moneyColor(data.netCollectable) },
    { icon: TrendingDown, label: 'Profit Gap', value: data.profitGap, color: moneyColor(data.profitGap) },
    { icon: Clock, label: 'Runway', value: null, display: `${data.runway} wks`, color: data.runway < 4 ? 'text-critical' : data.runway < 8 ? 'text-warning' : 'text-success' },
  ];

  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-sidebar flex-shrink-0">
      <div className="flex items-center gap-6">
        {metrics.map((m, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="w-px h-6 bg-border" />}
            <div className="flex items-center gap-2">
              <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{m.label}</span>
              <span className={`text-sm font-semibold tabular-nums ${m.color}`}>
                {m.value !== null ? formatMoney(m.value, { compact: true }) : m.display}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}