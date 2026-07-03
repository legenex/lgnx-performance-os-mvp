import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatMoney, formatNumber, moneyColor } from '@/lib/formatters';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export default function GatewayReconciliation() {
  const [gatewayLeads, setGatewayLeads] = useState([]);
  const [leads, setLeads] = useState([]);
  const [arInvoices, setArInvoices] = useState([]);
  const [apEntries, setApEntries] = useState([]);
  const [compliance, setCompliance] = useState([]);
  const [capiEvents, setCapiEvents] = useState([]);
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [adMetrics, setAdMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [gl, lds, ar, ap, comp, capi, dl, am] = await Promise.all([
        base44.entities.GatewayLead.list(undefined, 500),
        base44.entities.Lead.list(undefined, 500),
        base44.entities.ARInvoice.list(),
        base44.entities.APEntry.list(),
        base44.entities.ComplianceRecord.list(undefined, 500),
        base44.entities.EventTrackingLog.list(undefined, 500),
        base44.entities.BuyerDeliveryLog.list(undefined, 500),
        base44.entities.AdDailyMetric.list(undefined, 500),
      ]);
      setGatewayLeads(gl);
      setLeads(lds);
      setArInvoices(ar);
      setApEntries(ap);
      setCompliance(comp);
      setCapiEvents(capi);
      setDeliveryLogs(dl);
      setAdMetrics(am);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const checks = useMemo(() => {
    const results = [];

    // 1. Gateway sold vs LeadByte sold
    const gwSold = gatewayLeads.filter(l => l.lead_status === 'Sold');
    const leadSold = leads.filter(l => l.lead_status === 'Sold');
    const gwSoldKeys = new Set(gwSold.map(l => l.lead_key).filter(Boolean));
    const leadSoldKeys = new Set(leadSold.map(l => l.lead_key).filter(Boolean));
    const missingInLead = gwSold.filter(l => l.lead_key && !leadSoldKeys.has(l.lead_key));
    results.push({
      name: 'Gateway Sold vs Lead Records',
      sourceCount: gwSold.length,
      targetCount: leadSold.length,
      variance: gwSold.length - leadSold.length,
      severity: missingInLead.length > 0 ? 'Critical' : 'OK',
      detail: missingInLead.length > 0 ? `${missingInLead.length} sold gateway leads missing Lead records` : 'All sold leads have matching Lead records',
      status: missingInLead.length > 0 ? 'Open' : 'Matched',
    });

    // 2. Buyer delivery sold price vs Lead.lead_revenue
    const soldDeliveries = deliveryLogs.filter(d => d.sold && d.buyer_price);
    const priceMismatches = soldDeliveries.filter(d => {
      const lead = leads.find(l => l.lead_key === d.lead_key);
      return lead && Math.abs((lead.lead_revenue || 0) - (d.buyer_price || 0)) > 1;
    });
    results.push({
      name: 'Buyer Delivery Price vs Lead Revenue',
      sourceCount: soldDeliveries.length,
      targetCount: soldDeliveries.length - priceMismatches.length,
      variance: priceMismatches.length,
      severity: priceMismatches.length > 0 ? 'High' : 'OK',
      detail: priceMismatches.length > 0 ? `${priceMismatches.length} delivery prices mismatch Lead revenue` : 'All delivery prices match Lead revenue',
      status: priceMismatches.length > 0 ? 'Open' : 'Matched',
    });

    // 3. Lead.supplier_payout vs APEntry accrual
    const totalPayout = leads.reduce((s, l) => s + (l.supplier_payout || 0), 0);
    const totalAP = apEntries.filter(e => e.entry_type === 'Accrual').reduce((s, e) => s + (e.amount || 0), 0);
    const payoutVariance = totalPayout - totalAP;
    results.push({
      name: 'Lead Supplier Payout vs AP Accrual',
      sourceValue: totalPayout,
      targetValue: totalAP,
      variance: payoutVariance,
      severity: Math.abs(payoutVariance) > 500 ? 'High' : 'OK',
      detail: `Leads payout ${formatMoney(totalPayout)} vs AP accrual ${formatMoney(totalAP)}`,
      status: Math.abs(payoutVariance) > 500 ? 'Open' : 'Matched',
    });

    // 4. Sold leads included in ARInvoice
    const soldLeadCount = leadSold.length;
    const invoiceLeadCount = arInvoices.reduce((s, inv) => s + (inv.lead_count || 0), 0);
    results.push({
      name: 'Sold Leads vs AR Invoice Coverage',
      sourceCount: soldLeadCount,
      targetCount: invoiceLeadCount,
      variance: soldLeadCount - invoiceLeadCount,
      severity: soldLeadCount > invoiceLeadCount ? 'High' : 'OK',
      detail: `${soldLeadCount} sold leads vs ${invoiceLeadCount} invoiced leads`,
      status: soldLeadCount > invoiceLeadCount ? 'Open' : 'Matched',
    });

    // 5. Sold leads with CAPI event
    const soldWithCapi = leadSold.filter(l => {
      const gw = gatewayLeads.find(g => g.lead_key === l.lead_key);
      if (!gw) return true;
      return capiEvents.some(e => e.gateway_lead_id === gw.gateway_lead_id && e.event_name === 'Sold_Lead' && e.status === 'Sent');
    });
    const soldWithoutCapi = leadSold.length - soldWithCapi.length;
    results.push({
      name: 'Sold Leads with CAPI Sold_Lead Event',
      sourceCount: leadSold.length,
      targetCount: soldWithCapi.length,
      variance: soldWithoutCapi,
      severity: soldWithoutCapi > 0 ? 'Medium' : 'OK',
      detail: soldWithoutCapi > 0 ? `${soldWithoutCapi} sold leads missing CAPI event` : 'All sold leads have CAPI events',
      status: soldWithoutCapi > 0 ? 'Open' : 'Matched',
    });

    // 6. Sold leads missing compliance evidence
    const soldMissingComp = leadSold.filter(l => {
      const gw = gatewayLeads.find(g => g.lead_key === l.lead_key);
      if (!gw) return true;
      const comp = compliance.find(c => c.gateway_lead_id === gw.gateway_lead_id);
      return !comp || comp.trustedform_status === 'Missing' || comp.jornaya_status === 'Missing';
    });
    results.push({
      name: 'Sold Leads Missing Compliance Evidence',
      sourceCount: leadSold.length,
      targetCount: leadSold.length - soldMissingComp.length,
      variance: soldMissingComp.length,
      severity: soldMissingComp.length > 0 ? 'High' : 'OK',
      detail: soldMissingComp.length > 0 ? `${soldMissingComp.length} sold leads missing TrustedForm/Jornaya` : 'All sold leads have compliance evidence',
      status: soldMissingComp.length > 0 ? 'Open' : 'Matched',
    });

    // 7. Duplicate leads allowed through
    const dupes = gatewayLeads.filter((l, i) => {
      return gatewayLeads.slice(i + 1).some(l2 => l.phone && l2.phone && l.phone === l2.phone && l.lead_status === 'Sold' && l2.lead_status === 'Sold');
    });
    results.push({
      name: 'Duplicate Sold Leads',
      sourceCount: leadSold.length,
      targetCount: leadSold.length - dupes.length,
      variance: dupes.length,
      severity: dupes.length > 0 ? 'Critical' : 'OK',
      detail: dupes.length > 0 ? `${dupes.length} duplicate sold leads detected` : 'No duplicate sold leads',
      status: dupes.length > 0 ? 'Open' : 'Matched',
    });

    // 8. Campaign/utm mapping to Smart Ad Reporting
    const gwCampaigns = new Set(gatewayLeads.map(l => l.utm_campaign).filter(Boolean));
    const adCampaigns = new Set(adMetrics.map(a => a.campaign_name).filter(Boolean));
    const gwOnlyCampaigns = [...gwCampaigns].filter(c => !adCampaigns.has(c));
    results.push({
      name: 'Gateway UTM Campaigns vs Ad Metrics',
      sourceCount: gwCampaigns.size,
      targetCount: adCampaigns.size,
      variance: gwOnlyCampaigns.length,
      severity: gwOnlyCampaigns.length > 0 ? 'Medium' : 'OK',
      detail: gwOnlyCampaigns.length > 0 ? `${gwOnlyCampaigns.length} gateway campaigns missing from ad metrics (Attribution Missing)` : 'All gateway campaigns mapped to ad metrics',
      status: gwOnlyCampaigns.length > 0 ? 'Open' : 'Matched',
    });

    // 9. Campaign with ad spend but no gateway leads (Tracking Broken)
    const adOnlyCampaigns = [...adCampaigns].filter(c => !gwCampaigns.has(c));
    results.push({
      name: 'Ad Spend Campaigns Missing Gateway Leads',
      sourceCount: adCampaigns.size,
      targetCount: adCampaigns.size - adOnlyCampaigns.length,
      variance: adOnlyCampaigns.length,
      severity: adOnlyCampaigns.length > 0 ? 'High' : 'OK',
      detail: adOnlyCampaigns.length > 0 ? `${adOnlyCampaigns.length} campaigns with ad spend but no gateway leads (Tracking Broken)` : 'All ad campaigns have gateway leads',
      status: adOnlyCampaigns.length > 0 ? 'Open' : 'Matched',
    });

    // 10. Supplier feed counts vs Lead records
    const gwBySupplier = {};
    gatewayLeads.forEach(l => {
      if (l.supplier_sid) gwBySupplier[l.supplier_sid] = (gwBySupplier[l.supplier_sid] || 0) + 1;
    });
    const leadBySupplier = {};
    leads.forEach(l => {
      if (l.supplier_sid) leadBySupplier[l.supplier_sid] = (leadBySupplier[l.supplier_sid] || 0) + 1;
    });
    const supplierVariances = Object.keys(gwBySupplier).filter(s => Math.abs(gwBySupplier[s] - (leadBySupplier[s] || 0)) > 0);
    results.push({
      name: 'Supplier Feed Counts vs Lead Records',
      sourceCount: Object.keys(gwBySupplier).length,
      targetCount: Object.keys(leadBySupplier).length,
      variance: supplierVariances.length,
      severity: supplierVariances.length > 0 ? 'Medium' : 'OK',
      detail: supplierVariances.length > 0 ? `${supplierVariances.length} suppliers with count mismatches` : 'All supplier counts match',
      status: supplierVariances.length > 0 ? 'Open' : 'Matched',
    });

    return results;
  }, [gatewayLeads, leads, arInvoices, apEntries, compliance, capiEvents, deliveryLogs, adMetrics]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  const openCount = checks.filter(c => c.status === 'Open').length;
  const criticalCount = checks.filter(c => c.severity === 'Critical' && c.status === 'Open').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Gateway Reconciliation</h1>
        <p className="text-xs text-muted-foreground mt-1">Operational lead events joined to PerformanceOS financial truth</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ReconCard title="Total Checks" value={formatNumber(checks.length)} />
        <ReconCard title="Open Issues" value={formatNumber(openCount)} color={openCount > 0 ? 'text-yellow-400' : 'text-emerald-400'} icon={openCount > 0 ? AlertTriangle : CheckCircle2} />
        <ReconCard title="Critical" value={formatNumber(criticalCount)} color={criticalCount > 0 ? 'text-red-400' : 'text-emerald-400'} icon={criticalCount > 0 ? XCircle : CheckCircle2} />
        <ReconCard title="Matched" value={formatNumber(checks.filter(c => c.status === 'Matched').length)} color="text-emerald-400" icon={CheckCircle2} />
      </div>

      {/* Reconciliation Table */}
      <SectionPanel title="Reconciliation Checks" subtitle={`${checks.length} checks`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-2">Check Name</th>
                <th className="pb-2 pr-2 text-right">Source Count/Value</th>
                <th className="pb-2 pr-2 text-right">Target Count/Value</th>
                <th className="pb-2 pr-2 text-right">Variance</th>
                <th className="pb-2 pr-2">Severity</th>
                <th className="pb-2 pr-2">Detail</th>
                <th className="pb-2 pr-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-2 pr-2 font-medium">{c.name}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {c.sourceValue !== undefined ? formatMoney(c.sourceValue) : formatNumber(c.sourceCount || 0)}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {c.targetValue !== undefined ? formatMoney(c.targetValue) : formatNumber(c.targetCount || 0)}
                  </td>
                  <td className={`py-2 pr-2 text-right tabular-nums font-medium ${c.variance !== 0 && c.severity !== 'OK' ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {c.sourceValue !== undefined ? formatMoney(c.variance) : formatNumber(c.variance || 0)}
                  </td>
                  <td className="py-2 pr-2">{c.severity === 'OK' ? <span className="text-[9px] text-emerald-400">OK</span> : <StatusBadge status={c.severity} />}</td>
                  <td className="py-2 pr-2 text-[10px] text-muted-foreground max-w-64">{c.detail}</td>
                  <td className="py-2 pr-2"><StatusBadge status={c.status === 'Matched' ? 'OK' : 'Open'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Rules */}
      <SectionPanel title="Reconciliation Rules" subtitle="Automatic checks and error generation">
        <div className="space-y-2 text-xs text-muted-foreground">
          <RuleRow rule="Sold delivery without Lead record" action="Creates Critical GatewayError" />
          <RuleRow rule="Sold Lead without AR invoice" action="Creates AR reconciliation item" />
          <RuleRow rule="Sold Lead without supplier payout accrual" action="Creates AP reconciliation item" />
          <RuleRow rule="LeadByte status mismatch" action="Creates GatewayError and ReconciliationItem" />
          <RuleRow rule="Missing TrustedForm on sold lead" action="Creates Compliance warning" />
          <RuleRow rule="CAPI failed on Sold lead" action="Creates EventTracking alert" />
          <RuleRow rule="Duplicate sold lead" action="Creates Critical warning" />
        </div>
      </SectionPanel>
    </div>
  );
}

function ReconCard({ title, value, color, icon: Icon }) {
  return (
    <div className="rounded-lg border border-border p-3" style={{ background: '#1c2128' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
      <div className={`text-lg font-bold tabular-nums ${color || 'text-foreground'}`}>{value}</div>
    </div>
  );
}

function RuleRow({ rule, action }) {
  return (
    <div className="flex items-center justify-between p-2 rounded" style={{ background: '#22272e' }}>
      <span className="text-foreground">{rule}</span>
      <span className="text-[10px] text-orange-400">{action}</span>
    </div>
  );
}