import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import GatewayLeadDrawer from '@/components/shared/GatewayLeadDrawer';
import { formatNumber } from '@/lib/formatters';
import { Shield, AlertTriangle, ExternalLink, Eye } from 'lucide-react';

export default function ComplianceConsent() {
  const [records, setRecords] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [comps, lds] = await Promise.all([
        base44.entities.ComplianceRecord.list(undefined, 500),
        base44.entities.GatewayLead.list(undefined, 500),
      ]);
      setRecords(comps);
      setLeads(lds);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Missing TrustedForm spike: count by date
  const missingTrustedFormByDate = useMemo(() => {
    const groups = {};
    records.filter(r => r.trustedform_status === 'Missing' || r.trustedform_status === 'Invalid').forEach(r => {
      const lead = leads.find(l => l.gateway_lead_id === r.gateway_lead_id);
      const date = lead?.received_at ? new Date(lead.received_at).toISOString().split('T')[0] : 'Unknown';
      groups[date] = (groups[date] || 0) + 1;
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [records, leads]);

  const soldLeadsMissingCompliance = useMemo(() => {
    return leads.filter(l => l.lead_status === 'Sold').map(l => {
      const comp = records.find(r => r.gateway_lead_id === l.gateway_lead_id);
      return { lead: l, compliance: comp };
    }).filter(({ compliance }) => !compliance || compliance.trustedform_status === 'Missing' || compliance.jornaya_status === 'Missing');
  }, [records, leads]);

  const filtered = useMemo(() => {
    if (!filter) return records;
    return records.filter(r => r.trustedform_status === filter || r.jornaya_status === filter || r.compliance_risk === filter || r.tcpa_status === filter);
  }, [records, filter]);

  // Stats
  const stats = useMemo(() => {
    const total = records.length;
    const tfMissing = records.filter(r => r.trustedform_status === 'Missing').length;
    const tfPresent = records.filter(r => r.trustedform_status === 'Present').length;
    const jMissing = records.filter(r => r.jornaya_status === 'Missing').length;
    const highRisk = records.filter(r => r.compliance_risk === 'High').length;
    const tcpaFail = records.filter(r => r.tcpa_status === 'Failed').length;
    return { total, tfMissing, tfPresent, jMissing, highRisk, tcpaFail };
  }, [records]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Compliance & Consent</h1>
        <p className="text-xs text-muted-foreground mt-1">TrustedForm, Jornaya, TCPA, and consent evidence tracking</p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <CompCard title="Total Records" value={formatNumber(stats.total)} />
        <CompCard title="TrustedForm Present" value={formatNumber(stats.tfPresent)} color="text-emerald-400" />
        <CompCard title="TrustedForm Missing" value={formatNumber(stats.tfMissing)} color="text-red-400" icon={AlertTriangle} />
        <CompCard title="Jornaya Missing" value={formatNumber(stats.jMissing)} color="text-red-400" />
        <CompCard title="High Risk" value={formatNumber(stats.highRisk)} color="text-red-400" />
        <CompCard title="TCPA Failed" value={formatNumber(stats.tcpaFail)} color="text-red-400" />
      </div>

      {/* Missing TrustedForm Spike */}
      {missingTrustedFormByDate.length > 0 && (
        <SectionPanel title="Missing TrustedForm by Date" subtitle="Spike detection">
          <div className="flex items-end gap-1 h-20">
            {missingTrustedFormByDate.slice(-30).map(([date, count]) => {
              const max = Math.max(...missingTrustedFormByDate.map(([, c]) => c), 1);
              const height = Math.max((count / max) * 60, 4);
              return (
                <div key={date} className="flex flex-col items-center flex-1" title={`${date}: ${count} missing`}>
                  <div className="w-full bg-red-500/60 rounded-t" style={{ height: `${height}px` }} />
                  <span className="text-[8px] text-muted-foreground mt-0.5 rotate-45 origin-left">{date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </SectionPanel>
      )}

      {/* Sold Leads Missing Compliance */}
      {soldLeadsMissingCompliance.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-red-300 font-medium">{soldLeadsMissingCompliance.length} sold lead(s) missing TrustedForm/Jornaya evidence</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              These leads were sold to buyers without compliance evidence. Risk of chargebacks or legal exposure.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="h-8 px-2 text-xs rounded border border-input bg-secondary">
          <option value="">All Records</option>
          <option value="Missing">TrustedForm Missing</option>
          <option value="Present">TrustedForm Present</option>
          <option value="High">High Risk</option>
          <option value="Failed">TCPA Failed</option>
        </select>
      </div>

      {/* Compliance Table */}
      <SectionPanel title="Compliance Records" subtitle={`${formatNumber(filtered.length)} records`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-2">Lead Key</th>
                <th className="pb-2 pr-2">TrustedForm</th>
                <th className="pb-2 pr-2">Jornaya</th>
                <th className="pb-2 pr-2">TCPA</th>
                <th className="pb-2 pr-2">Risk</th>
                <th className="pb-2 pr-2">IP</th>
                <th className="pb-2 pr-2">Opt-in URL</th>
                <th className="pb-2 pr-2">Evidence</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((r, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-1.5 pr-2 font-mono text-[10px]">{r.lead_key || '—'}</td>
                  <td className="py-1.5 pr-2"><ComplianceBadge status={r.trustedform_status} /></td>
                  <td className="py-1.5 pr-2"><ComplianceBadge status={r.jornaya_status} /></td>
                  <td className="py-1.5 pr-2"><ComplianceBadge status={r.tcpa_status} /></td>
                  <td className="py-1.5 pr-2"><RiskBadge risk={r.compliance_risk} /></td>
                  <td className="py-1.5 pr-2 text-muted-foreground text-[10px]">{r.ip_address || '—'}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground text-[10px] max-w-32 truncate">{r.optin_url || '—'}</td>
                  <td className="py-1.5 pr-2 text-[10px] text-muted-foreground max-w-48 truncate">{r.evidence_summary || '—'}</td>
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-1">
                      {r.trustedform_url && <a href={r.trustedform_url} target="_blank" className="text-blue-400 hover:text-blue-300"><ExternalLink className="w-3 h-3" /></a>}
                      <button onClick={() => setSelected(leads.find(l => l.gateway_lead_id === r.gateway_lead_id))} className="text-muted-foreground hover:text-foreground"><Eye className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {selected && <GatewayLeadDrawer lead={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CompCard({ title, value, color, icon: Icon }) {
  return (
    <div className="rounded-lg border border-border p-3" style={{ background: '#14171C' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
      <div className={`text-lg font-bold tabular-nums ${color || 'text-foreground'}`}>{value}</div>
    </div>
  );
}

function ComplianceBadge({ status }) {
  const colors = {
    'Present': 'bg-emerald-500/20 text-emerald-400',
    'Missing': 'bg-red-500/20 text-red-400',
    'Invalid': 'bg-red-500/20 text-red-400',
    'Expired': 'bg-orange-500/20 text-orange-400',
    'Passed': 'bg-emerald-500/20 text-emerald-400',
    'Warning': 'bg-yellow-500/20 text-yellow-400',
    'Failed': 'bg-red-500/20 text-red-400',
    'Unknown': 'bg-gray-500/20 text-gray-400',
  };
  return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${colors[status] || colors['Unknown']}`}>{status}</span>;
}

function RiskBadge({ risk }) {
  const colors = { 'Low': 'bg-emerald-500/20 text-emerald-400', 'Medium': 'bg-yellow-500/20 text-yellow-400', 'High': 'bg-red-500/20 text-red-400', 'Unknown': 'bg-gray-500/20 text-gray-400' };
  return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${colors[risk] || colors['Unknown']}`}>{risk}</span>;
}