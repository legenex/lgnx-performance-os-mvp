import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { AlertTriangle, DollarSign, TrendingUp, Activity, Radio, Database, ArrowRight } from 'lucide-react';

export default function Overview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [bankAccounts, arInvoices, apEntries, xeroInvoices, bankTxns, truthMetrics, alerts] = await Promise.all([
        base44.entities.BankAccount.list().catch(() => []),
        base44.entities.ARInvoice.list().catch(() => []),
        base44.entities.APEntry.list().catch(() => []),
        base44.entities.XeroInvoice.list().catch(() => []),
        base44.entities.BankTransaction.list().catch(() => []),
        base44.entities.CampaignTruthMetric.list().catch(() => []),
        base44.entities.Alert.list().catch(() => []),
      ]);

      const cashPosition = bankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);
      const buyerIncomeDue = arInvoices.filter(i => !['Paid', 'Draft'].includes(i.status)).reduce((s, i) => s + (i.outstanding_amount || 0), 0);
      const apFromEntries = apEntries.reduce((s, e) => s + (e.amount || 0), 0);
      const apFromXero = xeroInvoices.filter(x => x.type === 'ACCPAY' && x.amount_due > 0).reduce((s, x) => s + (x.amount_due || 0), 0);
      const confirmedPayables = apFromEntries + apFromXero;
      const netCollectable = cashPosition + buyerIncomeDue - confirmedPayables;

      const reportedProfit = truthMetrics.reduce((s, m) => s + (m.true_gross_margin || 0), 0);
      const buyerCashCollected = bankTxns.filter(t => t.cash_type === 'Buyer Collection' || (t.amount > 0 && t.category?.toLowerCase().includes('income'))).reduce((s, t) => s + (t.amount || 0), 0);
      const mediaPaid = bankTxns.filter(t => t.cash_type === 'Media Spend').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const supplierPaid = bankTxns.filter(t => t.cash_type === 'Supplier Payout').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const opex = bankTxns.filter(t => ['Payroll', 'Tool', 'Contractor', 'Fee', 'Owner Draw', 'Personal'].includes(t.cash_type)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const cashAdjustedProfit = buyerCashCollected - mediaPaid - supplierPaid - opex;
      const profitGap = reportedProfit - cashAdjustedProfit;

      const outflows = bankTxns.filter(t => t.amount < 0);
      const totalOut = outflows.reduce((s, t) => s + Math.abs(t.amount), 0);
      const weeklyBurn = outflows.length > 0 ? totalOut / 26 : 1;
      const runway = cashPosition > 0 ? Math.round((cashPosition / weeklyBurn) * 10) / 10 : 0;

      const topAlerts = (alerts || []).slice(0, 5);

      setData({ cashPosition, buyerIncomeDue, confirmedPayables, netCollectable, reportedProfit, cashAdjustedProfit, profitGap, runway, topAlerts });
    } catch (err) {
      console.error('Overview error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  const d = data || {};
  const quickLinks = [
    { to: '/finances', icon: DollarSign, title: 'Finances', desc: 'Cash, income, payables, reconciliation' },
    { to: '/performance', icon: TrendingUp, title: 'Performance', desc: 'Leads, buyers, suppliers, campaigns' },
    { to: '/ads', icon: Activity, title: 'Ad Intelligence', desc: 'Creative, spend, cut/watch/scale' },
    { to: '/gateway', icon: Radio, title: 'Lead Gateway', desc: 'Intake, routing, delivery, compliance' },
    { to: '/system', icon: Database, title: 'Data & System', desc: 'Sources, imports, validation, settings' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Financial reality and key business metrics at a glance.</p>
      </div>

      <SectionPanel title="Financial Reality" subtitle="Actual cash, confirmed income, confirmed debt, and profit gap">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Cash Position" value={d.cashPosition || 0} label="CASH" sublabel="Actual bank balance" />
          <MetricCard title="Buyer Income Due" value={d.buyerIncomeDue || 0} label="BOOKED" sublabel="Confirmed unpaid buyer income" />
          <MetricCard title="Confirmed Payables" value={d.confirmedPayables || 0} sublabel="Supplier/vendor debt" />
          <MetricCard title="Net Collectable" value={d.netCollectable || 0} sublabel="Cash + Income - Payables" />
          <MetricCard title="Reported Profit" value={d.reportedProfit || 0} label="BOOKED" sublabel="From campaign/lead reports" />
          <MetricCard title="Cash-Adjusted Profit" value={d.cashAdjustedProfit || 0} label="CASH" sublabel="Cash in minus cash out" />
          <MetricCard title="Profit Gap" value={d.profitGap || 0} sublabel="Reported - Cash-Adjusted" />
          <MetricCard title="Runway" value={`${d.runway || 0} wks`} sublabel="Cash / trailing net burn" />
        </div>
      </SectionPanel>

      <SectionPanel title="Top Actions" subtitle="Priority items needing attention today">
        {d.topAlerts && d.topAlerts.length > 0 ? (
          <div className="space-y-2">
            {d.topAlerts.map((alert, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                  <div>
                    <p className="text-sm text-foreground">{alert.message || alert.title || 'Alert'}</p>
                    <p className="text-[11px] text-muted-foreground">{alert.category || 'General'} · {alert.severity || 'Medium'}</p>
                  </div>
                </div>
                <StatusBadge status={alert.status || 'Open'} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No critical actions. All systems nominal.</p>
        )}
      </SectionPanel>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {quickLinks.map(link => (
          <Link key={link.to} to={link.to} className="block p-4 rounded-[10px] border border-border bg-card hover:border-primary/30 transition-colors group">
            <link.icon className="w-5 h-5 text-primary mb-2" />
            <h3 className="text-sm font-semibold text-foreground">{link.title}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{link.desc}</p>
            <ArrowRight className="w-3 h-3 text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}