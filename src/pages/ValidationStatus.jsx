import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function ValidationStatus() {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([]);
  const [leads, setLeads] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [validationRules, gatewayLeads] = await Promise.all([
        base44.entities.ValidationRule.list().catch(() => []),
        base44.entities.GatewayLead.list('-received_at', 200).catch(() => []),
      ]);
      setRules(validationRules || []);
      setLeads(gatewayLeads || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  const passed = leads.filter(l => l.validation_status === 'Passed').length;
  const failed = leads.filter(l => l.validation_status === 'Failed').length;
  const warnings = leads.filter(l => l.validation_status === 'Warning').length;
  const notRun = leads.filter(l => l.validation_status === 'Not Run' || !l.validation_status).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Validation Status</h1>
        <p className="text-xs text-muted-foreground mt-1">Lead validation results and rule configuration</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border p-3" style={{ background: 'hsl(213, 17%, 20%)' }}>
          <div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-3 h-3 text-success" /><span className="text-[10px] uppercase text-muted-foreground">Passed</span></div>
          <p className="text-base font-bold tabular-nums text-success">{passed}</p>
        </div>
        <div className="rounded-xl border border-border p-3" style={{ background: 'hsl(213, 17%, 20%)' }}>
          <div className="flex items-center gap-1.5 mb-1"><XCircle className="w-3 h-3 text-critical" /><span className="text-[10px] uppercase text-muted-foreground">Failed</span></div>
          <p className="text-base font-bold tabular-nums text-critical">{failed}</p>
        </div>
        <div className="rounded-xl border border-border p-3" style={{ background: 'hsl(213, 17%, 20%)' }}>
          <div className="flex items-center gap-1.5 mb-1"><AlertCircle className="w-3 h-3 text-warning" /><span className="text-[10px] uppercase text-muted-foreground">Warnings</span></div>
          <p className="text-base font-bold tabular-nums text-warning">{warnings}</p>
        </div>
        <div className="rounded-xl border border-border p-3" style={{ background: 'hsl(213, 17%, 20%)' }}>
          <div className="flex items-center gap-1.5 mb-1"><span className="text-[10px] uppercase text-muted-foreground">Not Run</span></div>
          <p className="text-base font-bold tabular-nums text-muted-foreground">{notRun}</p>
        </div>
      </div>

      <SectionPanel title={`Validation Rules (${rules.length})`}>
        {rules.length === 0 ? (
          <p className="text-xs text-muted-foreground">No validation rules configured. <span className="text-primary">Add rules in Settings →</span></p>
        ) : (
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="pb-2">Rule</th><th className="pb-2">Type</th><th className="pb-2">Vertical</th><th className="pb-2">Severity</th><th className="pb-2">Status</th></tr></thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} className="border-b border-border/30">
                  <td className="py-2 font-medium">{r.rule_name}</td>
                  <td className="py-2 text-muted-foreground">{r.rule_type}</td>
                  <td className="py-2">{r.vertical || 'All'}</td>
                  <td className="py-2"><StatusBadge status={r.severity} /></td>
                  <td className="py-2"><StatusBadge status={r.active ? 'Active' : 'Paused'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionPanel>
    </div>
  );
}