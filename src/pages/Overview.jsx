import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor, formatPercent, formatNumber } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import { AlertTriangle, DollarSign, TrendingUp, TrendingDown, Crosshair, Activity, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import moment from 'moment';

export default function Overview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [bankTxns, truthMetrics, alerts, arInvoices, apEntries] = await Promise.all([
        base44.entities.BankTransaction.list().catch(() => []),
        base44.entities.CampaignTruthMetric.list().catch(() => []),
        base44.entities.Alert.list().catch(() => []),
        base44.entities.ARInvoice.list().catch(() => []),
        base44.entities.APEntry.list().catch(() => []),
      ]);

      const now = moment();
      const monthStr = now.format('YYYY-MM');
      const monthTruth = truthMetrics.filter(m => m.date && moment(m.date).format('YYYY-MM') === monthStr);
      const monthBank = bankTxns.filter(t => t.date && moment(t.date).format('YYYY-MM') === monthStr);

      const bookedRevenue = monthTruth.reduce((s, m) => s + (m.total_booked_revenue || 0), 0);
      const cashReceived = monthBank.filter(t => t.amount > 0 && (t.cash_type === 'Buyer Collection' || t.category?.toLowerCase().includes('income'))).reduce((s, t) => s + (t.amount || 0), 0);
      const revenueGap = bookedRevenue - cashReceived;
      const reportedProfit = monthTruth.reduce((s, m) => s + (m.true_gross_margin || 0), 0);
      const mediaPaid = monthBank.filter(t => t.cash_type === 'Media Spend').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const supplierPaid = monthBank.filter(t => t.cash_type === 'Supplier Payout').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const opex = monthBank.filter(t => ['Payroll', 'Tool', 'Contractor', 'Fee'].includes(t.cash_type)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const cashVerifiedProfit = cashReceived - mediaPaid - supplierPaid - opex;
      const profitGap = reportedProfit - cashVerifiedProfit;
      const callRevenue = monthTruth.reduce((s, m) => s + (m.call_revenue || 0), 0);

      const totalLeads = monthTruth.reduce((s, m) => s + (m.web_lead_count || 0), 0);
      const totalSold = monthTruth.reduce((s, m) => s + (m.sold_leads || 0), 0);
      const totalDQ = monthTruth.reduce((s, m) => s + (m.dq_leads || 0), 0);
      const totalReturned = monthTruth.reduce((s, m) => s + (m.returned_leads || 0), 0);
      const soldRate = totalLeads > 0 ? (totalSold / totalLeads) * 100 : 0;
      const dqRate = totalLeads > 0 ? (totalDQ / totalLeads) * 100 : 0;
      const returnRate = totalSold > 0 ? (totalReturned / totalSold) * 100 : 0;

      const totalCost = mediaPaid + supplierPaid;
      const trueCPL = totalLeads > 0 ? totalCost / totalLeads : 0;
      const grossMargin = bookedRevenue > 0 ? (reportedProfit / bookedRevenue) * 100 : 0;
      const netMargin = bookedRevenue > 0 ? (cashVerifiedProfit / bookedRevenue) * 100 : 0;

      // Top 5 actions
      const actions = [];

      // Chase buyer payment gap
      const buyerGaps = {};
      arInvoices.forEach(inv => {
        const b = inv.buyer_name || 'Unknown';
        if (!buyerGaps[b]) buyerGaps[b] = { buyer: b, booked: 0, collected: 0 };
        buyerGaps[b].booked += (inv.total_amount || 0);
        if (inv.status === 'Paid') buyerGaps[b].collected += (inv.total_amount || 0);
      });
      const worstBuyerGap = Object.values(buyerGaps).sort((a, b) => (b.booked - b.collected) - (a.booked - a.collected))[0];
      if (worstBuyerGap && worstBuyerGap.booked - worstBuyerGap.collected > 0) {
        actions.push({ icon: DollarSign, title: 'Chase buyer payment gap', desc: `${worstBuyerGap.buyer}: ${formatMoney(worstBuyerGap.booked - worstBuyerGap.collected)} unpaid`, link: '/finances/reported-vs-paid' });
      }

      // Verify supplier cost variance
      const supplierGaps = {};
      apEntries.forEach(e => {
        const s = e.supplier_name || 'Unknown';
        if (!supplierGaps[s]) supplierGaps[s] = { supplier: s, accrued: 0, paid: 0 };
        if (e.entry_type === 'Accrual') supplierGaps[s].accrued += (e.amount || 0);
        if (e.entry_type === 'Payment') supplierGaps[s].paid += (e.amount || 0);
      });
      const worstSupplierGap = Object.values(supplierGaps).sort((a, b) => (b.accrued - b.paid) - (a.accrued - a.paid))[0];
      if (worstSupplierGap && worstSupplierGap.accrued - worstSupplierGap.paid > 0) {
        actions.push({ icon: AlertTriangle, title: 'Verify supplier cost variance', desc: `${worstSupplierGap.supplier}: ${formatMoney(worstSupplierGap.accrued - worstSupplierGap.paid)} unpaid`, link: '/finances/costs-payables' });
      }

      // Reconcile media spend gap
      const spendTracked = monthTruth.reduce((s, m) => s + (m.spend_tracked || 0), 0);
      const mediaGap = spendTracked - mediaPaid;
      if (Math.abs(mediaGap) > 100) {
        actions.push({ icon: Crosshair, title: 'Reconcile media spend gap', desc: `${formatMoney(Math.abs(mediaGap))} ${mediaGap > 0 ? 'tracked but not paid' : 'paid but not tracked'}`, link: '/finances/media-spend-check' });
      }

      // Review campaigns with good booked profit but poor cash margin
      const profitConflicts = truthMetrics.filter(m => (m.true_gross_margin || 0) > 0 && (m.cash_margin || 0) < 0);
      if (profitConflicts.length > 0) {
        actions.push({ icon: TrendingDown, title: 'Review booked profit vs cash margin', desc: `${profitConflicts.length} campaign(s) with positive booked but negative cash margin`, link: '/ads/campaign-profitability' });
      }

      // Review high CPL / low quality suppliers
      const bySupplier = {};
      truthMetrics.forEach(m => {
        const s = m.supplier_sid || 'Unknown';
        if (!bySupplier[s]) bySupplier[s] = { supplier: s, leads: 0, cost: 0, sold: 0, dq: 0 };
        bySupplier[s].leads += (m.web_lead_count || 0);
        bySupplier[s].cost += (m.spend_tracked || 0) + (m.supplier_payout_accrued || 0);
        bySupplier[s].sold += (m.sold_leads || 0);
        bySupplier[s].dq += (m.dq_leads || 0);
      });
      const badSuppliers = Object.values(bySupplier).filter(s => {
        const cpl = s.leads > 0 ? s.cost / s.leads : 0;
        const dqRate = s.leads > 0 ? (s.dq / s.leads) * 100 : 0;
        return cpl > 50 && dqRate > 15;
      });
      if (badSuppliers.length > 0) {
        actions.push({ icon: Activity, title: 'Review high CPL / low quality suppliers', desc: `${badSuppliers.length} supplier(s) with high CPL and high DQ rate`, link: '/performance/suppliers' });
      }

      // Fill remaining slots with alerts
      const topAlerts = (alerts || []).filter(a => a.status === 'Open').slice(0, 5 - actions.length);
      topAlerts.forEach(a => {
        actions.push({ icon: AlertTriangle, title: a.message || a.title || 'Alert', desc: `${a.category || 'General'} · ${a.severity || 'Medium'}`, link: null });
      });

      setData({ bookedRevenue, cashReceived, revenueGap, reportedProfit, cashVerifiedProfit, profitGap, trueCPL, grossMargin, netMargin, totalLeads, soldRate, dqRate, returnRate, callRevenue, actions: actions.slice(0, 5) });
    } catch (err) {
      console.error('Overview error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;
  const d = data || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Business Reality Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">True profit, revenue verification, and key performance metrics at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <MetricCard title="Booked Revenue" value={d.bookedRevenue || 0} label="BOOKED" />
        <MetricCard title="Cash Received" value={d.cashReceived || 0} label="CASH" />
        <MetricCard title="Revenue Gap" value={d.revenueGap || 0} sublabel="Booked - Cash" />
        <MetricCard title="Reported Profit" value={d.reportedProfit || 0} label="BOOKED" />
        <MetricCard title="Cash-Verified Profit" value={d.cashVerifiedProfit || 0} label="CASH" />
        <MetricCard title="Profit Gap" value={d.profitGap || 0} sublabel="Reported - Cash" />
        <MetricCard title="True CPL" value={d.trueCPL || 0} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <MetricCard title="Gross Margin" value={`${formatPercent(d.grossMargin || 0)}`} />
        <MetricCard title="Net Margin" value={`${formatPercent(d.netMargin || 0)}`} />
        <MetricCard title="Lead Volume" value={formatNumber(d.totalLeads || 0)} />
        <MetricCard title="Sold Rate" value={`${formatPercent(d.soldRate || 0)}`} />
        <MetricCard title="DQ Rate" value={`${formatPercent(d.dqRate || 0)}`} />
        <MetricCard title="Return Rate" value={`${formatPercent(d.returnRate || 0)}`} />
        <MetricCard title="Calls Revenue" value={d.callRevenue || 0} />
      </div>

      <SectionPanel title="Top 5 Actions" subtitle="Priority items needing attention now">
        {d.actions && d.actions.length > 0 ? (
          <div className="space-y-2">
            {d.actions.map((action, i) => {
              const content = (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <action.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{action.title}</p>
                    <p className="text-[11px] text-muted-foreground">{action.desc}</p>
                  </div>
                  {action.link && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              );
              return action.link ? (
                <Link key={i} to={action.link} className="block p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">{content}</Link>
              ) : (
                <div key={i} className="p-3 rounded-lg bg-accent/30">{content}</div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No critical actions. All systems nominal.</p>
        )}
      </SectionPanel>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/finances', icon: DollarSign, title: 'Finances', desc: 'Revenue verification, costs, gaps' },
          { to: '/performance', icon: TrendingUp, title: 'Performance', desc: 'Leads, buyers, suppliers, campaigns' },
          { to: '/ads', icon: Activity, title: 'Ad Intelligence', desc: 'Profitability, spend, cut/watch/scale' },
          { to: '/settings', icon: Crosshair, title: 'Settings', desc: 'Data sources, validation, ad accounts' },
        ].map(link => (
          <Link key={link.to} to={link.to} className="block p-4 rounded-[10px] border border-border bg-card hover:border-primary/30 transition-colors group">
            <link.icon className="w-5 h-5 text-primary mb-2" />
            <h3 className="text-sm font-semibold text-foreground">{link.title}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}