import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatMoney, moneyColor, formatPercent } from '@/lib/formatters';
import { DollarSign, FileText, CreditCard, TrendingUp, TrendingDown, AlertTriangle, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FinanceCommand() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ cash: 0, ar: 0, ap: 0, mondayNumber: 0, runway: 0, mediaGap: 0, arAging: {}, apBySupplier: {}, cashMatrix: {}, weeklyBudget: null });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [bankAccounts, arInvoices, apEntries, xeroInvoices, adSpend, bankTxns, budgets] = await Promise.all([
        base44.entities.BankAccount.list().catch(() => []),
        base44.entities.ARInvoice.list().catch(() => []),
        base44.entities.APEntry.list().catch(() => []),
        base44.entities.XeroInvoice.list().catch(() => []),
        base44.entities.AdSpend.list().catch(() => []),
        base44.entities.BankTransaction.list().catch(() => []),
        base44.entities.WeeklyBudget.list().catch(() => []),
      ]);
      const cash = bankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);
      const ar = arInvoices.filter(i => !['Paid', 'Draft'].includes(i.status)).reduce((s, i) => s + (i.outstanding_amount || 0), 0);
      const apBySupplier = {};
      apEntries.forEach(e => { apBySupplier[e.supplier_name] = (apBySupplier[e.supplier_name] || 0) + (e.amount || 0); });
      const ap = Object.values(apBySupplier).reduce((s, v) => s + v, 0);
      const mediaGap = adSpend.reduce((s, a) => s + (a.amount || 0), 0) - bankTxns.filter(t => t.cash_type === 'Media Spend').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const outflows = bankTxns.filter(t => t.amount < 0);
      const weeklyBurn = outflows.length > 0 ? outflows.reduce((s, t) => s + Math.abs(t.amount), 0) / 26 : 1;
      const runway = cash > 0 ? Math.round((cash / weeklyBurn) * 10) / 10 : 0;

      // AR Aging
      const arAging = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
      arInvoices.filter(i => !['Paid', 'Draft'].includes(i.status)).forEach(i => {
        const days = i.due_date ? Math.floor((Date.now() - new Date(i.due_date).getTime()) / 86400000) : 0;
        if (days <= 0) arAging.current += i.outstanding_amount || 0;
        else if (days <= 30) arAging['1-30'] += i.outstanding_amount || 0;
        else if (days <= 60) arAging['31-60'] += i.outstanding_amount || 0;
        else if (days <= 90) arAging['61-90'] += i.outstanding_amount || 0;
        else arAging['90+'] += i.outstanding_amount || 0;
      });

      // Cash in/out monthly matrix
      const cashMatrix = {};
      bankTxns.forEach(t => {
        const month = t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : 'Unknown';
        if (!cashMatrix[month]) cashMatrix[month] = { in: 0, out: 0 };
        if (t.amount > 0) cashMatrix[month].in += t.amount;
        else cashMatrix[month].out += Math.abs(t.amount);
      });

      setData({ cash, ar, ap, mondayNumber: cash + ar - ap, runway, mediaGap, arAging, apBySupplier, cashMatrix, weeklyBudget: budgets[0] });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  const apRiskSuppliers = Object.entries(data.apBySupplier).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 8);
  const matrixMonths = Object.entries(data.cashMatrix).slice(-6);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Finance Command</h1>
        <p className="text-xs text-muted-foreground mt-1">Monday Number decomposition, cash flow, AR/AP health, and runway</p>
      </div>

      {/* Monday Number Decomposition */}
      <SectionPanel title="Monday Number Decomposition" subtitle="Cash + AR − AP = Monday Number">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-xl border border-border p-3" style={{ background: 'hsl(214, 18%, 23%)' }}>
            <div className="flex items-center gap-1.5 mb-1"><DollarSign className="w-3 h-3 text-success" /><span className="text-[10px] uppercase text-muted-foreground">Cash</span><span className="text-[8px] text-success">CASH</span></div>
            <p className="text-base font-bold tabular-nums text-success">{formatMoney(data.cash, { compact: true })}</p>
          </div>
          <div className="rounded-xl border border-border p-3" style={{ background: 'hsl(214, 18%, 23%)' }}>
            <div className="flex items-center gap-1.5 mb-1"><FileText className="w-3 h-3 text-info" /><span className="text-[10px] uppercase text-muted-foreground">AR</span><span className="text-[8px] text-info">BOOKED</span></div>
            <p className="text-base font-bold tabular-nums text-info">{formatMoney(data.ar, { compact: true })}</p>
          </div>
          <div className="rounded-xl border border-border p-3" style={{ background: 'hsl(214, 18%, 23%)' }}>
            <div className="flex items-center gap-1.5 mb-1"><CreditCard className="w-3 h-3 text-warning" /><span className="text-[10px] uppercase text-muted-foreground">AP</span><span className="text-[8px] text-warning">ACCRUED</span></div>
            <p className="text-base font-bold tabular-nums text-warning">{formatMoney(data.ap, { compact: true })}</p>
          </div>
          <div className="rounded-xl border border-border p-3" style={{ background: 'hsl(214, 18%, 23%)' }}>
            <div className="flex items-center gap-1.5 mb-1"><TrendingDown className="w-3 h-3 text-critical" /><span className="text-[10px] uppercase text-muted-foreground">Media Gap</span><span className="text-[8px] text-critical">ACCRUED</span></div>
            <p className={`text-base font-bold tabular-nums ${moneyColor(data.mediaGap)}`}>{formatMoney(data.mediaGap, { compact: true })}</p>
          </div>
          <div className="rounded-xl border border-primary/30 p-3" style={{ background: 'hsl(358, 30%, 20%)' }}>
            <div className="flex items-center gap-1.5 mb-1"><span className="text-[10px] uppercase text-foreground">Monday Number</span><span className="text-[8px] text-success">CASH</span></div>
            <p className={`text-base font-bold tabular-nums ${moneyColor(data.mondayNumber)}`}>{formatMoney(data.mondayNumber, { compact: true })}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Runway:</span>
          <span className={`text-sm font-bold tabular-nums ${data.runway < 4 ? 'text-critical' : data.runway < 8 ? 'text-warning' : 'text-success'}`}>{data.runway} weeks</span>
          {data.runway < 4 && <AlertTriangle className="w-4 h-4 text-critical" />}
        </div>
      </SectionPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AR Aging Summary */}
        <SectionPanel title="AR Aging Summary" subtitle="Outstanding receivables by age" actions={<Link to="/receivables" className="text-[11px] text-primary hover:underline">View AR →</Link>}>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="pb-2">Bucket</th><th className="pb-2 text-right">Amount</th><th className="pb-2 text-right">% of AR</th></tr></thead>
            <tbody>
              {Object.entries(data.arAging).map(([bucket, amount]) => (
                <tr key={bucket} className="border-b border-border/30">
                  <td className="py-2">{bucket === 'current' ? 'Current' : `${bucket} days`}</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(amount)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{data.ar > 0 ? formatPercent((amount / data.ar) * 100) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionPanel>

        {/* AP Supplier Risk */}
        <SectionPanel title="AP Supplier Risk" subtitle="Top suppliers by outstanding balance" actions={<Link to="/payables" className="text-[11px] text-primary hover:underline">View AP →</Link>}>
          {apRiskSuppliers.length === 0 ? <p className="text-xs text-muted-foreground">No outstanding supplier balances.</p> : (
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="pb-2">Supplier</th><th className="pb-2 text-right">Amount</th><th className="pb-2 text-right">Action</th></tr></thead>
              <tbody>
                {apRiskSuppliers.map(s => (
                  <tr key={s.name} className="border-b border-border/30">
                    <td className="py-2 font-medium">{s.name}</td>
                    <td className={`py-2 text-right tabular-nums ${moneyColor(s.amount)}`}>{formatMoney(s.amount)}</td>
                    <td className="py-2 text-right"><button className="text-[10px] text-primary hover:underline">Mark Paid</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionPanel>
      </div>

      {/* This Week vs Budget */}
      <SectionPanel title="This Week vs Budget" subtitle="Weekly spend tracking against budget">
        {data.weeklyBudget ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><p className="text-[10px] text-muted-foreground uppercase">Budget</p><p className="text-sm font-bold tabular-nums">{formatMoney(data.weeklyBudget.total_budget)}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Spent</p><p className="text-sm font-bold tabular-nums text-warning">{formatMoney(data.weeklyBudget.total_spent || 0)}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Remaining</p><p className={`text-sm font-bold tabular-nums ${moneyColor((data.weeklyBudget.total_budget || 0) - (data.weeklyBudget.total_spent || 0))}`}>{formatMoney((data.weeklyBudget.total_budget || 0) - (data.weeklyBudget.total_spent || 0))}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">% Used</p><p className="text-sm font-bold tabular-nums">{data.weeklyBudget.total_budget > 0 ? formatPercent(((data.weeklyBudget.total_spent || 0) / data.weeklyBudget.total_budget) * 100) : '—'}</p></div>
          </div>
        ) : <p className="text-xs text-muted-foreground">No weekly budget set. <Link to="/settings" className="text-primary hover:underline">Configure in Settings →</Link></p>}
      </SectionPanel>

      {/* Cash In/Out Monthly Matrix */}
      <SectionPanel title="Cash In/Out Monthly Matrix" subtitle="Last 6 months summary" actions={<Link to="/cash" className="text-[11px] text-primary hover:underline">View Cash →</Link>}>
        {matrixMonths.length === 0 ? <p className="text-xs text-muted-foreground">No bank transactions imported.</p> : (
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="pb-2">Month</th><th className="pb-2 text-right">Cash In</th><th className="pb-2 text-right">Cash Out</th><th className="pb-2 text-right">Net</th></tr></thead>
            <tbody>
              {matrixMonths.map(([month, vals]) => (
                <tr key={month} className="border-b border-border/30">
                  <td className="py-2 font-medium">{month}</td>
                  <td className="py-2 text-right tabular-nums text-success">{formatMoney(vals.in)}</td>
                  <td className="py-2 text-right tabular-nums text-critical">{formatMoney(vals.out)}</td>
                  <td className={`py-2 text-right tabular-nums font-semibold ${moneyColor(vals.in - vals.out)}`}>{formatMoney(vals.in - vals.out)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionPanel>

      {/* Quick Actions */}
      <SectionPanel title="Quick Actions">
        <div className="flex flex-wrap gap-2">
          <Link to="/cash" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent transition-colors"><DollarSign className="w-3 h-3" /> Cash & Banking</Link>
          <Link to="/receivables" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent transition-colors"><FileText className="w-3 h-3" /> Chase AR</Link>
          <Link to="/payables" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent transition-colors"><CreditCard className="w-3 h-3" /> Pay Suppliers</Link>
          <Link to="/reconciliation" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent transition-colors"><ArrowRight className="w-3 h-3" /> Reconcile</Link>
          <Link to="/xero" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent transition-colors"><ArrowRight className="w-3 h-3" /> Link Xero</Link>
        </div>
      </SectionPanel>
    </div>
  );
}