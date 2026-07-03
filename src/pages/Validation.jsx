import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';

export default function Validation() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [bankTxns, truthMetrics, apEntries, adMetrics, calls, deliveryLogs, arInvoices] = await Promise.all([
        base44.entities.BankTransaction.list().catch(() => []),
        base44.entities.CampaignTruthMetric.list().catch(() => []),
        base44.entities.APEntry.list().catch(() => []),
        base44.entities.AdDailyMetric.list().catch(() => []),
        base44.entities.Call.list().catch(() => []),
        base44.entities.BuyerDeliveryLog.list().catch(() => []),
        base44.entities.ARInvoice.list().catch(() => []),
      ]);

      const bankIncome = bankTxns.filter(t => t.amount > 0 && (t.cash_type === 'Buyer Collection' || t.category?.toLowerCase().includes('income'))).reduce((s, t) => s + (t.amount || 0), 0);
      const bookedRevenue = truthMetrics.reduce((s, m) => s + (m.total_booked_revenue || 0), 0);
      const revenueGap = Math.abs(bookedRevenue - bankIncome);
      const unmatchedIncome = bankTxns.filter(t => t.amount > 0 && t.match_status === 'Unmatched').reduce((s, t) => s + (t.amount || 0), 0);
      const supplierCostAccrued = apEntries.filter(e => e.entry_type === 'Accrual').reduce((s, e) => s + (e.amount || 0), 0);
      const supplierCostPaid = apEntries.filter(e => e.entry_type === 'Payment').reduce((s, e) => s + (e.amount || 0), 0);
      const costGap = Math.abs(supplierCostAccrued - supplierCostPaid);
      const campaignsWithSpend = truthMetrics.filter(m => (m.spend_tracked || 0) > 0).length;
      const campaignsMapped = truthMetrics.filter(m => m.campaign_name && m.campaign_name !== 'Unknown').length;
      const campaignsTotal = truthMetrics.length;
      const callsJoined = calls.filter(c => c.campaign_name || c.utm_campaign).length;

      const results = [
        { name: 'Bank income loaded', status: bankTxns.length > 0 ? 'pass' : 'fail', detail: `${bankTxns.length} transactions, ${formatMoney(bankIncome)} income` },
        { name: 'Xero income loaded', status: 'warn', detail: 'Verify in Data Sources' },
        { name: 'Stripe income loaded', status: 'warn', detail: 'Verify in Data Sources' },
        { name: 'Lead performance loaded', status: truthMetrics.length > 0 ? 'pass' : 'fail', detail: `${truthMetrics.length} truth metric records` },
        { name: 'Supplier costs loaded', status: apEntries.length > 0 ? 'pass' : 'fail', detail: `${apEntries.length} AP entries, ${formatMoney(supplierCostAccrued)} accrued` },
        { name: 'Media spend loaded', status: adMetrics.length > 0 || truthMetrics.some(m => m.spend_tracked > 0) ? 'pass' : 'fail', detail: `${adMetrics.length} ad daily metrics` },
        { name: 'Calls loaded', status: calls.length > 0 ? 'pass' : 'fail', detail: `${calls.length} call records` },
        { name: 'Buyer feedback loaded', status: deliveryLogs.length > 0 ? 'pass' : 'fail', detail: `${deliveryLogs.length} delivery logs` },
        { name: 'Reported vs paid reconciled', status: revenueGap < 1000 ? 'pass' : revenueGap < 10000 ? 'warn' : 'fail', detail: `Gap: ${formatMoney(revenueGap)}` },
        { name: 'No major unmapped income', status: unmatchedIncome < 1000 ? 'pass' : unmatchedIncome < 10000 ? 'warn' : 'fail', detail: `Unmatched: ${formatMoney(unmatchedIncome)}` },
        { name: 'No major unmapped costs', status: costGap < 1000 ? 'pass' : costGap < 10000 ? 'warn' : 'fail', detail: `Cost gap: ${formatMoney(costGap)}` },
        { name: 'Campaigns have spend and lead mapping', status: campaignsWithSpend > 0 && campaignsMapped / campaignsTotal > 0.8 ? 'pass' : campaignsMapped / campaignsTotal > 0.5 ? 'warn' : 'fail', detail: `${campaignsWithSpend} with spend, ${campaignsMapped}/${campaignsTotal} mapped` },
        { name: 'Calls joined to campaigns', status: calls.length > 0 && callsJoined / calls.length > 0.5 ? 'pass' : calls.length > 0 ? 'warn' : 'fail', detail: `${callsJoined}/${calls.length} calls joined` },
      ];

      setChecks(results);
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  const passed = checks.filter(c => c.status === 'pass').length;
  const warned = checks.filter(c => c.status === 'warn').length;
  const failed = checks.filter(c => c.status === 'fail').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Validation</h1>
        <p className="text-sm text-muted-foreground mt-1">Data completeness checks — ensure all sources are loaded and reconciled.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-[10px] p-4">
          <div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-3 h-3 text-success" /><span className="text-[10px] uppercase text-muted-foreground">Passed</span></div>
          <p className="text-2xl font-bold tabular-nums text-success">{passed}</p>
        </div>
        <div className="bg-card border border-border rounded-[10px] p-4">
          <div className="flex items-center gap-1.5 mb-1"><AlertCircle className="w-3 h-3 text-warning" /><span className="text-[10px] uppercase text-muted-foreground">Warning</span></div>
          <p className="text-2xl font-bold tabular-nums text-warning">{warned}</p>
        </div>
        <div className="bg-card border border-border rounded-[10px] p-4">
          <div className="flex items-center gap-1.5 mb-1"><XCircle className="w-3 h-3 text-critical" /><span className="text-[10px] uppercase text-muted-foreground">Failed</span></div>
          <p className="text-2xl font-bold tabular-nums text-critical">{failed}</p>
        </div>
      </div>

      <SectionPanel title="Data Completeness Checks" subtitle="Pass / warning / fail status for each data source and reconciliation">
        <div className="space-y-2">
          {checks.map((check, i) => {
            const Icon = check.status === 'pass' ? CheckCircle2 : check.status === 'warn' ? AlertCircle : XCircle;
            const color = check.status === 'pass' ? 'text-success' : check.status === 'warn' ? 'text-warning' : 'text-critical';
            return (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-sm text-foreground font-medium">{check.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground">{check.detail}</span>
                  <StatusBadge status={check.status === 'pass' ? 'Passed' : check.status === 'warn' ? 'Warning' : 'Failed'} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionPanel>
    </div>
  );
}