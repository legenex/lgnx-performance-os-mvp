import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, formatNumber, formatPercent } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';

export default function GatewayMain() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [leads, deliveryLogs, errors, compliance, capiEvents] = await Promise.all([
        base44.entities.GatewayLead.list().catch(() => []),
        base44.entities.BuyerDeliveryLog.list().catch(() => []),
        base44.entities.GatewayError.list().catch(() => []),
        base44.entities.ComplianceRecord.list().catch(() => []),
        base44.entities.EventTrackingLog.list().catch(() => []),
      ]);

      const statusCounts = {};
      leads.forEach(l => { statusCounts[l.lead_status] = (statusCounts[l.lead_status] || 0) + 1; });
      const funnel = ['Received', 'Validated', 'Posted', 'Sold', 'Unsold', 'Disqualified', 'Returned', 'Fake', 'Error'].map(s => ({ stage: s, count: statusCounts[s] || 0 }));

      const deliveryErrors = deliveryLogs.filter(l => ['Failed', 'Timeout', 'Rejected', 'Error'].includes(l.status));
      const complianceMissing = compliance.filter(c => c.trustedform_status === 'Missing' || c.jornaya_status === 'Missing' || c.tcpa_status === 'Failed');
      const capiFailed = capiEvents.filter(e => e.status === 'Failed');
      const openErrors = errors.filter(e => e.status === 'Open');
      const leadbyteMismatch = leads.filter(l => l.source_system === 'LeadByte' && !l.leadbyte_id);

      setData({ funnel, deliveryErrors, complianceMissing, capiFailed, openErrors, leadbyteMismatch, totalLeads: leads.length });
    } catch (err) {
      console.error('GatewayMain error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;
  const d = data || {};

  const funnelMax = Math.max(...(d.funnel || []).map(f => f.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Lead Gateway</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitoring and reconciliation only — this does not replace the production gateway.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Total Leads" value={d.totalLeads || 0} />
        <MetricCard title="Delivery Errors" value={d.deliveryErrors?.length || 0} />
        <MetricCard title="Compliance Missing" value={d.complianceMissing?.length || 0} />
        <MetricCard title="CAPI Failed" value={d.capiFailed?.length || 0} />
        <MetricCard title="Open Errors" value={d.openErrors?.length || 0} />
        <MetricCard title="LeadByte Mismatch" value={d.leadbyteMismatch?.length || 0} />
      </div>

      <SectionPanel title="Lead Flow Funnel" subtitle="Lead status distribution from intake to resolution">
        <div className="space-y-2">
          {(d.funnel || []).map(f => (
            <div key={f.stage} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{f.stage}</span>
              <div className="flex-1 bg-muted rounded-md h-7 overflow-hidden">
                <div className="h-full bg-primary/60 rounded-md flex items-center px-2" style={{ width: `${(f.count / funnelMax) * 100}%`, minWidth: f.count > 0 ? '40px' : '0' }}>
                  {f.count > 0 && <span className="text-[11px] font-medium text-white">{formatNumber(f.count)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title="Delivery Errors" subtitle="Failed buyer deliveries">
          <DataTable exportFileName="delivery_errors" data={d.deliveryErrors?.slice(0, 50) || []} maxHeight="300px"
            columns={[{ key: 'buyer_name', label: 'Buyer' }, { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> }, { key: 'delivery_method', label: 'Method' }, { key: 'error_message', label: 'Error' }, { key: 'attempted_at', label: 'Attempted' }]}
            emptyMessage="No delivery errors" />
        </SectionPanel>
        <SectionPanel title="Open Gateway Errors" subtitle="System errors requiring attention">
          <DataTable exportFileName="gateway_errors" data={d.openErrors?.slice(0, 50) || []} maxHeight="300px"
            columns={[{ key: 'severity', label: 'Severity', render: (v) => <StatusBadge status={v} /> }, { key: 'category', label: 'Category' }, { key: 'message', label: 'Message' }, { key: 'recommended_action', label: 'Action' }]}
            emptyMessage="No open errors" />
        </SectionPanel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title="Compliance Missing" subtitle="Leads with missing or invalid compliance evidence">
          <DataTable exportFileName="compliance_missing" data={d.complianceMissing?.slice(0, 50) || []} maxHeight="300px"
            columns={[{ key: 'lead_key', label: 'Lead Key' }, { key: 'trustedform_status', label: 'TrustedForm', render: (v) => <StatusBadge status={v} /> }, { key: 'jornaya_status', label: 'Jornaya', render: (v) => <StatusBadge status={v} /> }, { key: 'tcpa_status', label: 'TCPA', render: (v) => <StatusBadge status={v} /> }, { key: 'compliance_risk', label: 'Risk', render: (v) => <StatusBadge status={v} /> }]}
            emptyMessage="No compliance issues" />
        </SectionPanel>
        <SectionPanel title="CAPI Failed Events" subtitle="Failed conversion tracking events">
          <DataTable exportFileName="capi_failed" data={d.capiFailed?.slice(0, 50) || []} maxHeight="300px"
            columns={[{ key: 'platform', label: 'Platform' }, { key: 'event_name', label: 'Event' }, { key: 'lead_key', label: 'Lead Key' }, { key: 'error_message', label: 'Error' }, { key: 'retry_count', label: 'Retries', align: 'right' }]}
            emptyMessage="No failed CAPI events" />
        </SectionPanel>
      </div>
    </div>
  );
}