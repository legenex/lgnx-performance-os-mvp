import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor } from '@/lib/formatters';
import { DollarSign, TrendingUp, TrendingDown, Crosshair, Clock, Wallet } from 'lucide-react';
import moment from 'moment';

export default function RealityBar() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [bankTxns, truthMetrics] = await Promise.all([
        base44.entities.BankTransaction.list().catch(() => []),
        base44.entities.CampaignTruthMetric.list().catch(() => []),
      ]);

      const now = moment();
      const monthStr = now.format('YYYY-MM');

      const monthBankTxns = bankTxns.filter(t => t.date && moment(t.date).format('YYYY-MM') === monthStr);
      const monthTruth = truthMetrics.filter(m => m.date && moment(m.date).format('YYYY-MM') === monthStr);

      const cashReceivedMTD = monthBankTxns
        .filter(t => t.amount > 0 && (t.cash_type === 'Buyer Collection' || (t.amount > 0 && t.category?.toLowerCase().includes('income'))))
        .reduce((s, t) => s + (t.amount || 0), 0);

      const bookedRevenueMTD = monthTruth.reduce((s, m) => s + (m.total_booked_revenue || 0), 0);
      const reportedProfitMTD = monthTruth.reduce((s, m) => s + (m.true_gross_margin || 0), 0);
      const callRevenueMTD = monthTruth.reduce((s, m) => s + (m.call_revenue || 0), 0);

      const mediaPaidMTD = monthBankTxns.filter(t => t.cash_type === 'Media Spend').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const supplierPaidMTD = monthBankTxns.filter(t => t.cash_type === 'Supplier Payout').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const opexMTD = monthBankTxns.filter(t => ['Payroll', 'Tool', 'Contractor', 'Fee'].includes(t.cash_type)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const cashVerifiedProfitMTD = cashReceivedMTD - mediaPaidMTD - supplierPaidMTD - opexMTD;

      const reportedVsPaidGap = bookedRevenueMTD - cashReceivedMTD;

      const totalLeads = monthTruth.reduce((s, m) => s + (m.web_lead_count || 0), 0);
      const totalCost = mediaPaidMTD + supplierPaidMTD;
      const trueCPL = totalLeads > 0 ? totalCost / totalLeads : 0;

      // Runway
      const allBankTxns = bankTxns;
      const outflows = allBankTxns.filter(t => t.amount < 0);
      const totalOut = outflows.reduce((s, t) => s + Math.abs(t.amount), 0);
      const weeklyBurn = outflows.length > 0 ? totalOut / 26 : 1;
      const bankAccounts = await base44.entities.BankAccount.list().catch(() => []);
      const cash = bankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);
      const runway = cash > 0 ? Math.round((cash / weeklyBurn) * 10) / 10 : 0;

      setData({ cashReceivedMTD, bookedRevenueMTD, reportedProfitMTD, cashVerifiedProfitMTD, reportedVsPaidGap, trueCPL, runway, callRevenueMTD });
    } catch (err) {
      console.error('RealityBar error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="h-14 border-b border-border flex items-center px-6 bg-sidebar flex-shrink-0">
        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const d = data;
  const metrics = [
    { icon: DollarSign, label: 'Cash Received MTD', value: d.cashReceivedMTD, color: moneyColor(d.cashReceivedMTD) },
    { icon: TrendingUp, label: 'Booked Revenue MTD', value: d.bookedRevenueMTD, color: moneyColor(d.bookedRevenueMTD) },
    { icon: TrendingDown, label: 'Reported Profit MTD', value: d.reportedProfitMTD, color: moneyColor(d.reportedProfitMTD) },
    { icon: Wallet, label: 'Cash-Verified Profit MTD', value: d.cashVerifiedProfitMTD, color: moneyColor(d.cashVerifiedProfitMTD) },
    { icon: Crosshair, label: 'Reported vs Paid Gap', value: d.reportedVsPaidGap, color: moneyColor(d.reportedVsPaidGap) },
    { icon: Crosshair, label: 'True CPL', value: d.trueCPL, color: 'text-foreground', isMoney: true },
    { icon: Clock, label: 'Runway', value: null, display: `${d.runway} wks`, color: d.runway < 4 ? 'text-critical' : d.runway < 8 ? 'text-warning' : 'text-success' },
  ];

  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-sidebar flex-shrink-0 overflow-x-auto">
      <div className="flex items-center gap-5">
        {metrics.map((m, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="w-px h-6 bg-border flex-shrink-0" />}
            <div className="flex items-center gap-2 flex-shrink-0">
              <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium whitespace-nowrap">{m.label}</span>
              <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${m.color}`}>
                {m.value !== null ? formatMoney(m.value, { compact: true }) : m.display}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}