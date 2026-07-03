import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor } from '@/lib/formatters';
import { AlertTriangle, TrendingDown, TrendingUp, DollarSign, FileText, CreditCard } from 'lucide-react';

export default function MondayNumberBar() {
  const [data, setData] = useState({ cash: 0, ar: 0, ap: 0, mondayNumber: 0, runway: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [bankAccounts, arInvoices, apEntries, xeroInvoices] = await Promise.all([
        base44.entities.BankAccount.list(),
        base44.entities.ARInvoice.filter({ status: 'Overdue' }).catch(() => []),
        base44.entities.APEntry.list(),
        base44.entities.XeroInvoice.list(),
      ]);

      // Also get non-overdue outstanding invoices
      const allArInvoices = await base44.entities.ARInvoice.list();

      const cash = bankAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
      
      // AR = outstanding from ARInvoice + unmapped ACCREC from Xero
      const arFromInvoices = allArInvoices
        .filter(i => !['Paid', 'Draft'].includes(i.status))
        .reduce((sum, i) => sum + (i.outstanding_amount || 0), 0);
      const mappedXeroIds = new Set(allArInvoices.filter(i => i.xero_invoice_id).map(i => i.xero_invoice_id));
      const arFromXero = xeroInvoices
        .filter(x => x.type === 'ACCREC' && x.amount_due > 0 && !mappedXeroIds.has(x.xero_invoice_id))
        .reduce((sum, x) => sum + (x.amount_due || 0), 0);
      const ar = arFromInvoices + arFromXero;

      // AP = supplier balances from APEntry + unmapped ACCPAY from Xero
      const apBySupplier = {};
      apEntries.forEach(e => {
        const key = e.supplier_name;
        if (!apBySupplier[key]) apBySupplier[key] = 0;
        apBySupplier[key] += (e.amount || 0);
      });
      const apFromEntries = Object.values(apBySupplier).reduce((s, v) => s + v, 0);
      const apFromXero = xeroInvoices
        .filter(x => x.type === 'ACCPAY' && x.amount_due > 0)
        .reduce((sum, x) => sum + (x.amount_due || 0), 0);
      const ap = apFromEntries + apFromXero;

      const mondayNumber = cash + ar - ap;

      // Runway: cash / trailing burn (simplified as weekly avg outflow)
      const bankTxns = await base44.entities.BankTransaction.list();
      const outflows = bankTxns.filter(t => t.amount < 0);
      const totalOut = outflows.reduce((s, t) => s + Math.abs(t.amount), 0);
      const weeklyBurn = outflows.length > 0 ? totalOut / 26 : 1; // ~26 weeks in H1
      const runway = cash > 0 ? Math.round((cash / weeklyBurn) * 10) / 10 : 0;

      setData({ cash, ar, ap, mondayNumber, runway });
    } catch (err) {
      console.error('Monday number calc error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-12 border-b border-border flex items-center px-6" style={{ background: '#1a1d21' }}>
        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-12 border-b border-border flex items-center justify-between px-6" style={{ background: '#1a1d21' }}>
      <div className="flex items-center gap-6">
        {/* Monday Number */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Monday Number</span>
          <span className={`text-lg font-bold tabular-nums ${moneyColor(data.mondayNumber)}`}>
            {formatMoney(data.mondayNumber)}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium uppercase">Cash</span>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Cash */}
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Cash</span>
          <span className={`text-xs font-semibold tabular-nums ${moneyColor(data.cash)}`}>
            {formatMoney(data.cash, { compact: true })}
          </span>
        </div>

        {/* AR */}
        <div className="flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">AR</span>
          <span className="text-xs font-semibold tabular-nums text-blue-400">
            {formatMoney(data.ar, { compact: true })}
          </span>
        </div>

        {/* AP */}
        <div className="flex items-center gap-1.5">
          <CreditCard className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">AP</span>
          <span className="text-xs font-semibold tabular-nums text-orange-400">
            {formatMoney(data.ap, { compact: true })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Runway</span>
          <span className={`text-xs font-semibold tabular-nums ${data.runway < 4 ? 'text-red-400' : data.runway < 8 ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {data.runway} wks
          </span>
        </div>
        {data.runway < 4 && (
          <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
        )}
      </div>
    </div>
  );
}