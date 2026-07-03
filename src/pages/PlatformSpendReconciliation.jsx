import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import CashBookedPill from '@/components/shared/CashBookedPill';
import { formatMoney, moneyColor } from '@/lib/formatters';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function PlatformSpendReconciliation() {
  const [adSpend, setAdSpend] = useState([]);
  const [bankTxns, setBankTxns] = useState([]);
  const [xeroBank, setXeroBank] = useState([]);
  const [adAlerts, setAdAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [ads, bank, xbank, alerts] = await Promise.all([
        base44.entities.AdSpend.list(undefined, 500),
        base44.entities.BankTransaction.list(undefined, 500),
        base44.entities.XeroBankTransaction.list(undefined, 500),
        base44.entities.AdAlert.filter({ status: 'Open' }),
      ]);
      setAdSpend(ads.filter(a => !a.superseded));
      setBankTxns(bank);
      setXeroBank(xbank);
      setAdAlerts(alerts.filter(a => a.alert_type === 'Cash Gap' || a.alert_type === 'Platform Discrepancy'));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const reconData = useMemo(() => {
    // Group by platform + month
    const groups = {};

    // Platform reported spend from AdSpend (tracked)
    adSpend.forEach(a => {
      const month = a.date?.substring(0, 7);
      if (!month) return;
      const key = `${a.platform}|${month}`;
      if (!groups[key]) groups[key] = {
        platform: a.platform, month,
        platform_reported: 0, csv_api_total: 0, bank_paid: 0, leadflow_paid: 0, xero_paid: 0,
        account_name: a.account_name,
      };
      groups[key].platform_reported += a.cost || 0;
      groups[key].csv_api_total += a.cost || 0;
    });

    // Bank paid media
    bankTxns.forEach(t => {
      if (t.cash_type !== 'Media Spend') return;
      const month = t.date?.substring(0, 7);
      if (!month) return;
      const platform = detectPlatform(t);
      const key = `${platform}|${month}`;
      if (!groups[key]) groups[key] = {
        platform, month,
        platform_reported: 0, csv_api_total: 0, bank_paid: 0, leadflow_paid: 0, xero_paid: 0,
        account_name: '—',
      };
      if (t.counterparty === 'LeadFlow') {
        groups[key].leadflow_paid += Math.abs(t.amount);
      } else {
        groups[key].bank_paid += Math.abs(t.amount);
      }
    });

    // Xero paid
    xeroBank.forEach(t => {
      const desc = (t.description || t.reference || '').toLowerCase();
      if (!desc.includes('ad') && !desc.includes('media') && !desc.includes('facebook') && !desc.includes('google')) return;
      const month = t.date?.substring(0, 7);
      if (!month) return;
      const platform = desc.includes('google') ? 'Google' : desc.includes('facebook') || desc.includes('meta') ? 'Meta' : 'Other';
      const key = `${platform}|${month}`;
      if (!groups[key]) groups[key] = {
        platform, month,
        platform_reported: 0, csv_api_total: 0, bank_paid: 0, leadflow_paid: 0, xero_paid: 0,
        account_name: '—',
      };
      groups[key].xero_paid += Math.abs(t.amount || 0);
    });

    return Object.values(groups).map(g => {
      const totalPaid = g.bank_paid + g.leadflow_paid + g.xero_paid;
      const gap = g.platform_reported - totalPaid;
      let status = 'OK';
      let recommended = 'Spend reconciled. No action needed.';
      if (Math.abs(gap) > 2000) {
        status = 'Critical';
        recommended = gap > 0
          ? `Platform reports ${formatMoney(g.platform_reported)} but only ${formatMoney(totalPaid)} paid. ${formatMoney(gap)} unexplained. Verify invoices and payment timing.`
          : `Bank/Xero shows ${formatMoney(Math.abs(gap))} more than platform reports. Possible miscoded transaction — verify category.`;
      } else if (Math.abs(gap) > 500) {
        status = 'Review';
        recommended = `Small gap of ${formatMoney(gap)} — verify payment timing or invoice cutoff.`;
      }
      return { ...g, totalPaid, gap, status, recommended };
    }).sort((a, b) => b.gap - a.gap);
  }, [adSpend, bankTxns, xeroBank]);

  const totalReported = reconData.reduce((s, r) => s + r.platform_reported, 0);
  const totalPaid = reconData.reduce((s, r) => s + r.totalPaid, 0);
  const totalGap = totalReported - totalPaid;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Platform Spend Reconciliation</h1>
        <p className="text-xs text-muted-foreground mt-1">Platform-reported spend vs bank/Xero cash paid — find the gap</p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card title="Platform Reported" value={formatMoney(totalReported)} pill="BOOKED" />
        <Card title="Bank/Xero Paid" value={formatMoney(totalPaid)} pill="CASH" />
        <Card title="Unexplained Gap" value={formatMoney(totalGap)} color={Math.abs(totalGap) > 2000 ? 'text-red-400' : 'text-muted-foreground'} />
        <Card title="LeadFlow Payments" value={formatMoney(reconData.reduce((s, r) => s + r.leadflow_paid, 0))} pill="CASH" />
        <Card title="Critical Gaps" value={reconData.filter(r => r.status === 'Critical').length} color="text-red-400" />
      </div>

      {/* Alerts */}
      {adAlerts.length > 0 && (
        <div className="space-y-1.5">
          {adAlerts.map((a, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-foreground">{a.message}</p>
                {a.recommended_action && <p className="text-[11px] text-muted-foreground mt-0.5">→ {a.recommended_action}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reconciliation Table */}
      <SectionPanel title="Spend Reconciliation by Platform / Month" subtitle={`${reconData.length} rows`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3">Platform</th>
                <th className="pb-2 pr-3">Month</th>
                <th className="pb-2 pr-3">Account</th>
                <th className="pb-2 pr-3 text-right">Platform Reported</th>
                <th className="pb-2 pr-3 text-right">CSV/API Total</th>
                <th className="pb-2 pr-3 text-right">Bank Paid</th>
                <th className="pb-2 pr-3 text-right">Xero Paid</th>
                <th className="pb-2 pr-3 text-right">LeadFlow Paid</th>
                <th className="pb-2 pr-3 text-right">Total Paid</th>
                <th className="pb-2 pr-3 text-right">Gap</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2">Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              {reconData.map((r, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-2 pr-3 font-medium">{r.platform}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.month}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.account_name}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(r.platform_reported)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(r.csv_api_total)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(r.bank_paid)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(r.xero_paid)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-blue-400">{formatMoney(r.leadflow_paid)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-medium">{formatMoney(r.totalPaid)}</td>
                  <td className={`py-2 pr-3 text-right tabular-nums font-bold ${Math.abs(r.gap) > 2000 ? 'text-red-400' : r.gap > 500 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {formatMoney(r.gap)}
                  </td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={r.status === 'OK' ? 'OK' : r.status === 'Review' ? 'WATCH' : 'PAUSE'} />
                  </td>
                  <td className="py-2 text-[10px] text-muted-foreground max-w-48">
                    <div className="flex items-start gap-1">
                      <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#E4262C]" />
                      <span>{r.recommended}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Rules */}
      <SectionPanel title="Reconciliation Rules" subtitle="Automatic gap detection">
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>• Gap &gt; <strong className="text-foreground">$2,000</strong> → AdAlert + ReconciliationItem created automatically</p>
          <p>• Platform spend exists but no bank/Xero payment → marked <strong className="text-yellow-400">Unpaid / Needs Verification</strong></p>
          <p>• Bank/Xero payment exists but no platform spend → marked <strong className="text-orange-400">Possible Miscoded Transaction</strong></p>
          <p>• LeadFlow / media-biller payments shown separately, never hidden in platform spend</p>
        </div>
      </SectionPanel>
    </div>
  );
}

function detectPlatform(t) {
  const desc = ((t.description || '') + ' ' + (t.counterparty || '')).toLowerCase();
  if (desc.includes('google')) return 'Google';
  if (desc.includes('facebook') || desc.includes('meta')) return 'Meta';
  if (desc.includes('youtube')) return 'YouTube';
  if (desc.includes('taboola')) return 'Taboola';
  if (desc.includes('leadflow')) return 'Meta'; // LeadFlow bills for Meta primarily
  return 'Other';
}

function Card({ title, value, pill, color }) {
  return (
    <div className="rounded-lg border border-border p-3" style={{ background: '#14171C' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</span>
        {pill && <CashBookedPill type={pill} />}
      </div>
      <div className={`text-lg font-bold tabular-nums ${color || 'text-foreground'}`}>{value}</div>
    </div>
  );
}