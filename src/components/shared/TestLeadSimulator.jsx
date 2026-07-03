import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function TestLeadSimulator({ routingRules, buyers }) {
  const [form, setForm] = useState({
    state: 'TX',
    vertical: 'MVA',
    injury_type: 'Whiplash',
    treatment: 'Ongoing',
    attorney: 'No',
    fault: 'Other Driver',
    insurance: 'Yes',
    supplier_sid: 'S001',
  });
  const [result, setResult] = useState(null);

  function simulate() {
    const activeRules = routingRules
      .filter(r => r.active)
      .sort((a, b) => (a.priority || 99) - (b.priority || 99));

    const matched = [];
    const rejected = [];

    for (const rule of activeRules) {
      const reasons = [];
      if (rule.vertical !== 'All' && rule.vertical !== form.vertical) {
        reasons.push(`Vertical ${form.vertical} does not match rule ${rule.vertical}`);
      }
      if (rule.allowed_states) {
        const allowed = rule.allowed_states.split(',').map(s => s.trim().toUpperCase());
        if (!allowed.includes(form.state.toUpperCase())) {
          reasons.push(`State ${form.state} not in allowed list (${rule.allowed_states})`);
        }
      }
      if (rule.blocked_states) {
        const blocked = rule.blocked_states.split(',').map(s => s.trim().toUpperCase());
        if (blocked.includes(form.state.toUpperCase())) {
          reasons.push(`State ${form.state} is blocked`);
        }
      }
      if (rule.attorney_allowed === false && form.attorney === 'Yes') {
        reasons.push('Attorney not allowed by this buyer');
      }
      if (rule.insurance_required === true && form.insurance !== 'Yes') {
        reasons.push('Insurance required but not provided');
      }
      if (rule.max_daily_cap > 0 && (rule.current_daily_count || 0) >= rule.max_daily_cap) {
        reasons.push(`Daily cap reached (${rule.current_daily_count}/${rule.max_daily_cap})`);
      }

      if (reasons.length === 0) {
        matched.push({ rule, reason: 'All criteria met' });
      } else {
        rejected.push({ rule, reasons });
      }
    }

    const primary = matched[0];
    const fallback = primary ? null : activeRules.find(r => r.fallback_buyer_name);

    setResult({
      primary,
      fallback,
      matched,
      rejected,
      allRejected: matched.length === 0,
    });
  }

  return (
    <div className="rounded-lg border border-border p-4" style={{ background: 'hsl(213, 17%, 20%)' }}>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Play className="w-4 h-4 text-[#E4262C]" />
        Test Lead Simulator
        <span className="text-[10px] text-muted-foreground font-normal">(Simulate · does not change live routing)</span>
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <FormField label="State" value={form.state} onChange={v => setForm({ ...form, state: v })} options={['TX', 'FL', 'CA', 'NY', 'GA', 'OH', 'IL', 'PA']} />
        <FormField label="Vertical" value={form.vertical} onChange={v => setForm({ ...form, vertical: v })} options={['MVA', 'WC', 'Other']} />
        <FormField label="Injury Type" value={form.injury_type} onChange={v => setForm({ ...form, injury_type: v })} options={['Whiplash', 'Broken Bone', 'Head Injury', 'Back Injury', 'Soft Tissue', 'None']} />
        <FormField label="Treatment" value={form.treatment} onChange={v => setForm({ ...form, treatment: v })} options={['Ongoing', 'Completed', 'None', 'Hospital', 'Chiropractor']} />
        <FormField label="Attorney" value={form.attorney} onChange={v => setForm({ ...form, attorney: v })} options={['Yes', 'No']} />
        <FormField label="Fault" value={form.fault} onChange={v => setForm({ ...form, fault: v })} options={['Other Driver', 'Self', 'Shared', 'Unknown']} />
        <FormField label="Insurance" value={form.insurance} onChange={v => setForm({ ...form, insurance: v })} options={['Yes', 'No', 'Unknown']} />
        <FormField label="Supplier SID" value={form.supplier_sid} onChange={v => setForm({ ...form, supplier_sid: v })} options={['S001', 'S003', 'S005', 'S006']} />
      </div>

      <Button size="sm" className="text-xs gap-1.5" onClick={simulate}>
        <Play className="w-3 h-3" />
        Simulate Routing
      </Button>

      {result && (
        <div className="mt-4 space-y-3">
          {result.allRejected ? (
            <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-300 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                No buyer matched — lead would be Unsold
              </p>
            </div>
          ) : (
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-300 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Primary Buyer: {result.primary.rule.buyer_name}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Rule: {result.primary.rule.rule_name} · Priority {result.primary.rule.priority} · Method: {result.primary.rule.delivery_method}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Endpoint: {result.primary.rule.delivery_endpoint || '—'}
              </p>
              {result.matched.length > 1 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Also matched: {result.matched.slice(1).map(m => m.rule.buyer_name).join(', ')}
                </p>
              )}
            </div>
          )}

          {result.rejected.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rejected By</p>
              {result.rejected.map((r, i) => (
                <div key={i} className="p-2 rounded" style={{ background: '#1A1E24' }}>
                  <p className="text-xs font-medium">{r.rule.buyer_name}</p>
                  {r.reasons.map((reason, j) => (
                    <p key={j} className="text-[10px] text-red-400 mt-0.5">• {reason}</p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-8 mt-1 px-2 text-xs rounded border border-input bg-secondary text-foreground"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}