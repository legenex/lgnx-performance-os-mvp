import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import MetricCard from '@/components/shared/MetricCard';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import WarningBanner from '@/components/shared/WarningBanner';
import MondayDecomposition from '@/components/command/MondayDecomposition';
import AlertsPanel from '@/components/command/AlertsPanel';
import ActionsPanel from '@/components/command/ActionsPanel';
import ImportChecklist from '@/components/command/ImportChecklist';
import AdsIntelligencePanel from '@/components/command/AdsIntelligencePanel';
import { formatMoney, moneyColor } from '@/lib/formatters';
import { DollarSign, FileText, CreditCard, BarChart3, AlertTriangle, TrendingDown, Shield } from 'lucide-react';

export default function CommandCenter() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDecomp, setShowDecomp] = useState(false);

  useEffect(() => { loadMetrics(); }, []);

  async function loadMetrics() {
    try {
      const [bankAccounts, arInvoices, apEntries, xeroInvoices, bankTxns, alerts, adSpend] = await Promise.all([
        base44.entities.BankAccount.list(),
        base44.entities.ARInvoice.list(),
        base44.entities.APEntry.list(),
        base44.entities.XeroInvoice.list(),
        base44.entities.BankTransaction.list(),
        base44.entities.Alert.filter({ status: 'Open' }),
        base44.entities.AdSpend.list(),
      ]);

      const cash = bankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);

      const ar = arInvoices
        .filter(i => !['Paid', 'Draft'].includes(i.status))
        .reduce((s, i) => s + (i.outstanding_amount || 0), 0);

      const apBySupplier = {};
      apEntries.forEach(e => {
        if (!apBySupplier[e.supplier_name]) apBySupplier[e.supplier_name] = 0;
        apBySupplier[e.supplier_name] += (e.amount || 0);
      });
      const ap = Object.values(apBySupplier).reduce((s, v) => s + v, 0);

      const mondayNumber = cash + ar - ap;

      // Collections this week (simplified: buyer collection txns in last 7 days)
      const now = new Date();
      const weekAgo = new Date(now - 7 * 86400000).toISOString().split('T')[0];
      const collectionsThisWeek = bankTxns
        .filter(t => t.cash_type === 'Buyer Collection' && t.date >= weekAgo && t.amount > 0)
        .reduce((s, t) => s + t.amount, 0);

      // Supplier payments due
      const supplierPaymentsDue = Object.entries(apBySupplier)
        .filter(([_, bal]) => bal > 5000)
        .reduce((s, [_, bal]) => s + bal, 0);

      // Owner draw this week
      const ownerDrawWeek = bankTxns
        .filter(t => t.cash_type === 'Owner Draw' && t.date >= weekAgo)
        .reduce((s, t) => s + Math.abs(t.amount), 0);

      // Media gap
      const trackedSpend = adSpend.filter(a => !a.superseded).reduce((s, a) => s + (a.cost || 0), 0);
      const paidMedia = bankTxns
        .filter(t => t.cash_type === 'Media Spend')
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      const mediaGap = trackedSpend - paidMedia;

      // Runway
      const outflows = bankTxns.filter(t => t.amount < 0);
      const totalOut = outflows.reduce((s, t) => s + Math.abs(t.amount), 0);
      const weeklyBurn = outflows.length > 0 ? totalOut / 26 : 1;
      const runway = cash > 0 ? Math.round((cash / weeklyBurn) * 10) / 10 : 0;

      // Critical alerts
      const criticalAlerts = alerts.filter(a => a.severity === 'Critical' || a.severity === 'High');

      setMetrics({
        cash, ar, ap, mondayNumber, collectionsThisWeek, supplierPaymentsDue,
        ownerDrawWeek, mediaGap, runway, alerts, criticalAlerts,
        bankAccounts, arInvoices, apEntries, adSpend, bankTxns
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!metrics) return <div className="text-muted-foreground">Failed to load metrics.</div>;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Command Center</h1>
        <p className="text-xs text-muted-foreground mt-1">Cash truth operating system · Data as of {new Date().toLocaleDateString()}</p>
      </div>

      {/* Warnings */}
      <div className="space-y-2">
        <WarningBanner>
          Looker/masterview profit is not cash profit. Booked revenue ≠ collected cash. Accrued payouts ≠ paid payouts. Tracked spend ≠ paid spend.
        </WarningBanner>
      </div>

      {/* Monday Number Hero */}
      <div 
        className="rounded-lg border border-border p-6 cursor-pointer hover:border-[#E4262C]/30 transition-colors"
        style={{ background: 'linear-gradient(135deg, #14171C 0%, #1A1E24 100%)' }}
        onClick={() => setShowDecomp(true)}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Monday Number</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium uppercase">Cash</span>
            </div>
            <div className={`text-4xl font-bold tabular-nums ${moneyColor(metrics.mondayNumber)}`}>
              {formatMoney(metrics.mondayNumber)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              = {formatMoney(metrics.cash)} cash + {formatMoney(metrics.ar)} AR − {formatMoney(metrics.ap)} AP
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs text-muted-foreground">Runway</span>
              <span className={`text-lg font-bold tabular-nums ${metrics.runway < 4 ? 'text-red-400' : metrics.runway < 8 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {metrics.runway} wks
              </span>
            </div>
            {metrics.runway < 4 && <AlertTriangle className="w-5 h-5 text-red-400 ml-auto animate-pulse" />}
            <p className="text-[10px] text-muted-foreground mt-1">Click to decompose →</p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Cash Balance" value={metrics.cash} label="CASH" icon={DollarSign} onClick={() => {}} />
        <MetricCard title="Receivables" value={metrics.ar} label="BOOKED" icon={FileText} />
        <MetricCard title="Payables" value={metrics.ap} label="BOOKED" icon={CreditCard} />
        <MetricCard title="Media Gap" value={metrics.mediaGap} label="CASH" icon={BarChart3} />
        <MetricCard title="Collections This Wk" value={metrics.collectionsThisWeek} label="CASH" />
        <MetricCard title="Owner Draw This Wk" value={-metrics.ownerDrawWeek} label="CASH" />
      </div>

      {/* Critical Alerts + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlertsPanel alerts={metrics.criticalAlerts} />
        <ActionsPanel metrics={metrics} />
      </div>

      {/* Ads Intelligence */}
      <AdsIntelligencePanel />

      {/* Import Checklist + Validation */}
      <ImportChecklist />

      {/* Monday Number Decomposition Drawer */}
      {showDecomp && (
        <MondayDecomposition 
          metrics={metrics} 
          onClose={() => setShowDecomp(false)} 
        />
      )}
    </div>
  );
}