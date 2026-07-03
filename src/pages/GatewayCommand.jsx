import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import GatewayFunnel from '@/components/shared/GatewayFunnel';
import { formatMoney, moneyColor, formatNumber } from '@/lib/formatters';
import { AlertTriangle, Activity, Truck, Shield, Radio, Copy, Zap, FileX, Wrench, Clock } from 'lucide-react';

export default function GatewayCommand() {
  const [leads, setLeads] = useState([]);
  const [errors, setErrors] = useState([]);
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [feedHealth, setFeedHealth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [lds, errs, dl, fh] = await Promise.all([
        base44.entities.GatewayLead.list(undefined, 500),
        base44.entities.GatewayError.filter({ status: 'Open' }),
        base44.entities.BuyerDeliveryLog.list(undefined, 200),
        base44.entities.SupplierFeedHealth.list(undefined, 100),
      ]);
      setLeads(lds);
      setErrors(errs);
      setDeliveryLogs(dl);
      setFeedHealth(fh);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLeads = leads.filter(l => (l.received_at || '').startsWith(today));
    const allToday = todayLeads.length > 0 ? todayLeads : leads;
    const received = allToday.length;
    const validated = allToday.filter(l => l.validation_status === 'Passed').length;
    const posted = allToday.filter(l => ['Posted', 'Sold', 'Unsold', 'Disqualified', 'Returned'].includes(l.lead_status)).length;
    const sold = allToday.filter(l => l.lead_status === 'Sold').length;
    const unsold = allToday.filter(l => l.lead_status === 'Unsold').length;
    const dq = allToday.filter(l => l.lead_status === 'Disqualified').length;
    const rejected = allToday.filter(l => l.lead_status === 'Rejected').length;
    const error = allToday.filter(l => l.lead_status === 'Error').length;
    const deliveryErrors = deliveryLogs.filter(d => ['Failed', 'Timeout', 'Rejected'].includes(d.status)).length;
    const revenue = allToday.filter(l => l.lead_status === 'Sold').reduce((s, l) => s + (l.lead_revenue || 0), 0);
    const payout = allToday.reduce((s, l) => s + (l.supplier_payout || 0), 0);
    const grossMargin = revenue - payout;
    return { received, validated, posted, sold, unsold, dq, rejected, error, deliveryErrors, revenue, payout, grossMargin };
  }, [leads, deliveryLogs]);

  const criticalAlerts = useMemo(() => {
    const alerts = [];
    const buyerFailures = deliveryLogs.filter(d => ['Failed', 'Timeout'].includes(d.status));
    if (buyerFailures.length > 0) alerts.push({ icon: Truck, severity: 'High', msg: `${buyerFailures.length} buyer delivery failures`, action: 'Review delivery logs' });
    const feedCritical = feedHealth.filter(f => f.status === 'Critical');
    if (feedCritical.length > 0) alerts.push({ icon: AlertTriangle, severity: 'Critical', msg: `${feedCritical.length} supplier feed(s) at critical status`, action: 'Check Supplier Feed Health' });
    const dupErrors = errors.filter(e => e.category === 'Duplicate');
    if (dupErrors.length > 0) alerts.push({ icon: Copy, severity: 'High', msg: `${dupErrors.length} duplicate lead(s) detected`, action: 'Review Error Queue' });
    const capiErrors = errors.filter(e => e.category === 'CAPI');
    if (capiErrors.length > 0) alerts.push({ icon: Zap, severity: 'High', msg: `${capiErrors.length} CAPI failure(s)`, action: 'Check CAPI Event Tracking' });
    const complianceErrors = errors.filter(e => e.category === 'Compliance');
    if (complianceErrors.length > 0) alerts.push({ icon: Shield, severity: 'Medium', msg: `${complianceErrors.length} compliance warning(s)`, action: 'Review Compliance & Consent' });
    const routingErrors = errors.filter(e => e.category === 'Routing');
    if (routingErrors.length > 0) alerts.push({ icon: Radio, severity: 'High', msg: `${routingErrors.length} routing issue(s)`, action: 'Review Routing Rules' });
    const leadbyteErrors = errors.filter(e => e.category === 'LeadByte');
    if (leadbyteErrors.length > 0) alerts.push({ icon: FileX, severity: 'High', msg: `${leadbyteErrors.length} LeadByte status mismatch(es)`, action: 'Run Gateway Reconciliation' });
    return alerts;
  }, [errors, deliveryLogs, feedHealth]);

  const actions = [
    { label: 'Fix Failed Deliveries', path: '/gateway/buyer-delivery', icon: Truck, count: deliveryLogs.filter(d => ['Failed', 'Timeout'].includes(d.status)).length },
    { label: 'Review Rejected Leads', path: '/gateway/lead-intake', icon: FileX, count: leads.filter(l => l.lead_status === 'Rejected').length },
    { label: 'Reconcile LeadByte Statuses', path: '/gateway/reconciliation', icon: Activity, count: errors.filter(e => e.category === 'LeadByte').length },
    { label: 'Review Missing Consent', path: '/gateway/compliance', icon: Shield, count: errors.filter(e => e.category === 'Compliance').length },
    { label: 'Check Supplier Quality Drop', path: '/gateway/supplier-feeds', icon: AlertTriangle, count: feedHealth.filter(f => f.status === 'Watch' || f.status === 'Critical').length },
    { label: 'Check CAPI Failed Events', path: '/gateway/capi-events', icon: Zap, count: errors.filter(e => e.category === 'CAPI').length },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Gateway Command</h1>
        <p className="text-xs text-muted-foreground mt-1">Operational command center for lead flow · {formatNumber(leads.length)} total leads in system</p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card title="Received Today" value={formatNumber(stats.received)} icon={Radio} color="text-blue-400" />
        <Card title="Validated" value={formatNumber(stats.validated)} color="text-cyan-400" />
        <Card title="Posted" value={formatNumber(stats.posted)} color="text-indigo-400" />
        <Card title="Sold" value={formatNumber(stats.sold)} color="text-emerald-400" />
        <Card title="Unsold" value={formatNumber(stats.unsold)} color="text-gray-400" />
        <Card title="DQ" value={formatNumber(stats.dq)} color="text-orange-400" />
        <Card title="Rejected" value={formatNumber(stats.rejected)} color="text-red-400" />
        <Card title="Delivery Errors" value={formatNumber(stats.deliveryErrors)} color="text-red-400" icon={Truck} />
        <Card title="CAPI Failures" value={formatNumber(errors.filter(e => e.category === 'CAPI').length)} color="text-red-400" icon={Zap} />
        <Card title="Compliance Warnings" value={formatNumber(errors.filter(e => e.category === 'Compliance').length)} color="text-yellow-400" icon={Shield} />
        <Card title="Revenue (BOOKED)" value={formatMoney(stats.revenue)} color={moneyColor(stats.revenue)} pill="BOOKED" />
        <Card title="Gross Margin (BOOKED)" value={formatMoney(stats.grossMargin)} color={moneyColor(stats.grossMargin)} pill="BOOKED" />
      </div>

      {/* Funnel */}
      <SectionPanel title="Lead Flow Funnel" subtitle="Received → Validated → Posted → Sold / Unsold / DQ / Rejected / Error">
        <GatewayFunnel data={stats} />
      </SectionPanel>

      {/* Critical Alerts + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionPanel title="Critical Gateway Alerts" subtitle={`${criticalAlerts.length} active`}>
          {criticalAlerts.length === 0 ? (
            <p className="text-xs text-emerald-400">All clear — no critical alerts.</p>
          ) : (
            <div className="space-y-2">
              {criticalAlerts.map((a, i) => {
                const Icon = a.icon;
                return (
                  <div key={i} className="flex items-start gap-2 p-2 rounded" style={{ background: '#22272e' }}>
                    <Icon className={`w-4 h-4 mt-0.5 ${a.severity === 'Critical' ? 'text-red-400' : a.severity === 'High' ? 'text-orange-400' : 'text-yellow-400'}`} />
                    <div className="flex-1">
                      <p className="text-xs text-foreground">{a.msg}</p>
                      <p className="text-[10px] text-muted-foreground">{a.action}</p>
                    </div>
                    <StatusBadge status={a.severity} />
                  </div>
                );
              })}
            </div>
          )}
        </SectionPanel>

        <SectionPanel title="Today's Gateway Actions" subtitle="Prioritized tasks">
          <div className="space-y-2">
            {actions.map((a, i) => {
              const Icon = a.icon;
              return (
                <Link key={i} to={a.path} className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors" style={{ background: '#22272e' }}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-foreground">{a.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">{a.count}</span>}
                    <span className="text-[10px] text-muted-foreground">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionPanel>
      </div>

      {/* Open Errors Summary */}
      <SectionPanel title="Open Gateway Errors" subtitle={`${errors.length} total`}>
        {errors.length === 0 ? (
          <p className="text-xs text-emerald-400">No open errors.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3">Severity</th>
                <th className="pb-2 pr-3">Category</th>
                <th className="pb-2 pr-3">Message</th>
                <th className="pb-2 pr-3">Lead Key</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {errors.slice(0, 10).map((e, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="py-2 pr-3"><StatusBadge status={e.severity} /></td>
                  <td className="py-2 pr-3 text-muted-foreground">{e.category}</td>
                  <td className="py-2 pr-3 max-w-48 truncate">{e.message}</td>
                  <td className="py-2 pr-3 text-muted-foreground font-mono text-[10px]">{e.lead_key || '—'}</td>
                  <td className="py-2 text-[10px] text-muted-foreground">{e.recommended_action || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionPanel>
    </div>
  );
}

function Card({ title, value, color, icon: Icon, pill }) {
  return (
    <div className="rounded-lg border border-border p-3" style={{ background: '#1c2128' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
        {pill && <span className="text-[8px] px-1 py-0.5 rounded bg-secondary text-muted-foreground font-medium">{pill}</span>}
      </div>
      <div className={`text-lg font-bold tabular-nums ${color || 'text-foreground'}`}>{value}</div>
    </div>
  );
}