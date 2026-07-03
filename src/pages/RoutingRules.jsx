import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import TestLeadSimulator from '@/components/shared/TestLeadSimulator';
import { Button } from '@/components/ui/button';
import { AlertTriangle, GripVertical, Save } from 'lucide-react';

export default function RoutingRules() {
  const [rules, setRules] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [rls, byrs] = await Promise.all([
        base44.entities.RoutingRule.list(),
        base44.entities.Buyer.list(),
      ]);
      setRules(rls.sort((a, b) => (a.priority || 99) - (b.priority || 99)));
      setBuyers(byrs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function updateRule(id, data) {
    try {
      await base44.entities.RoutingRule.update(id, data);
      await loadData();
    } catch (err) { console.error(err); }
  }

  async function saveEdit() {
    if (!editing) return;
    await updateRule(editing.id, editing);
    setEditing(null);
  }

  // State matrix: buyer → allowed states
  const stateMatrix = useMemo(() => {
    const matrix = {};
    rules.filter(r => r.active && r.allowed_states).forEach(r => {
      const states = r.allowed_states.split(',').map(s => s.trim());
      if (!matrix[r.buyer_name]) matrix[r.buyer_name] = new Set();
      states.forEach(s => matrix[r.buyer_name].add(s));
    });
    return Object.fromEntries(Object.entries(matrix).map(([k, v]) => [k, [...v]]));
  }, [rules]);

  // Overlap detection
  const overlaps = useMemo(() => {
    const stateBuyers = {};
    rules.filter(r => r.active && r.allowed_states).forEach(r => {
      r.allowed_states.split(',').map(s => s.trim()).forEach(s => {
        if (!stateBuyers[s]) stateBuyers[s] = [];
        stateBuyers[s].push(r.buyer_name);
      });
    });
    return Object.entries(stateBuyers).filter(([_, buyers]) => buyers.length > 1);
  }, [rules]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Routing Rules</h1>
        <p className="text-xs text-muted-foreground mt-1">Lead routing configuration · Drafts require gateway deployment</p>
      </div>

      {/* Warnings */}
      {overlaps.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-yellow-300 font-medium">Overlapping state rules detected</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {overlaps.map(([state, byrs]) => `${state}: ${byrs.join(', ')}`).join(' · ')}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Priority order determines which buyer receives the lead first.</p>
          </div>
        </div>
      )}

      {/* Rules Table */}
      <SectionPanel title="Routing Rules" subtitle={`${rules.length} rules · priority order`} actions={
        <Button variant="outline" size="sm" className="text-xs gap-1">Export Config</Button>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-2">Priority</th>
                <th className="pb-2 pr-2">Rule Name</th>
                <th className="pb-2 pr-2">Active</th>
                <th className="pb-2 pr-2">Vertical</th>
                <th className="pb-2 pr-2">Buyer</th>
                <th className="pb-2 pr-2">Allowed States</th>
                <th className="pb-2 pr-2">Blocked States</th>
                <th className="pb-2 pr-2 text-right">Min Price</th>
                <th className="pb-2 pr-2 text-right">Daily Cap</th>
                <th className="pb-2 pr-2 text-right">Today</th>
                <th className="pb-2 pr-2">Method</th>
                <th className="pb-2 pr-2">Fallback</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-2 pr-2"><div className="flex items-center gap-1"><GripVertical className="w-3 h-3 text-muted-foreground/30" /><span className="tabular-nums">{r.priority || '—'}</span></div></td>
                  <td className="py-2 pr-2 font-medium">{r.rule_name}</td>
                  <td className="py-2 pr-2"><StatusBadge status={r.active ? 'Active' : 'Paused'} /></td>
                  <td className="py-2 pr-2 text-muted-foreground">{r.vertical}</td>
                  <td className="py-2 pr-2 font-medium">{r.buyer_name}</td>
                  <td className="py-2 pr-2 text-muted-foreground text-[10px]">{r.allowed_states || '—'}</td>
                  <td className="py-2 pr-2 text-critical text-[10px]">{r.blocked_states || '—'}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">${r.min_price || 0}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{r.max_daily_cap || '—'}</td>
                  <td className={`py-2 pr-2 text-right tabular-nums ${r.max_daily_cap > 0 && (r.current_daily_count || 0) >= r.max_daily_cap ? 'text-critical font-bold' : 'text-muted-foreground'}`}>{r.current_daily_count || 0}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{r.delivery_method}</td>
                  <td className="py-2 pr-2 text-muted-foreground text-[10px]">{r.fallback_buyer_name || '—'}</td>
                  <td className="py-2">
                    {editing?.id === r.id ? (
                      <Button variant="default" size="sm" className="text-[9px] h-6 gap-1" onClick={saveEdit}><Save className="w-3 h-3" />Save</Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-[9px] h-6" onClick={() => setEditing(r)}>Edit</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Edit Panel */}
      {editing && (
        <SectionPanel title={`Edit Rule: ${editing.rule_name}`} subtitle="Draft — requires gateway deployment">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <EditField label="Priority" type="number" value={editing.priority} onChange={v => setEditing({ ...editing, priority: Number(v) })} />
            <EditField label="Buyer Name" type="text" value={editing.buyer_name} onChange={v => setEditing({ ...editing, buyer_name: v })} />
            <EditField label="Vertical" type="select" value={editing.vertical} onChange={v => setEditing({ ...editing, vertical: v })} options={['MVA', 'WC', 'All']} />
            <EditField label="Active" type="select" value={editing.active ? 'true' : 'false'} onChange={v => setEditing({ ...editing, active: v === 'true' })} options={['true', 'false']} />
            <EditField label="Allowed States" type="text" value={editing.allowed_states || ''} onChange={v => setEditing({ ...editing, allowed_states: v })} />
            <EditField label="Blocked States" type="text" value={editing.blocked_states || ''} onChange={v => setEditing({ ...editing, blocked_states: v })} />
            <EditField label="Min Price" type="number" value={editing.min_price} onChange={v => setEditing({ ...editing, min_price: Number(v) })} />
            <EditField label="Daily Cap" type="number" value={editing.max_daily_cap} onChange={v => setEditing({ ...editing, max_daily_cap: Number(v) })} />
            <EditField label="Attorney Allowed" type="select" value={editing.attorney_allowed ? 'true' : 'false'} onChange={v => setEditing({ ...editing, attorney_allowed: v === 'true' })} options={['true', 'false']} />
            <EditField label="Insurance Required" type="select" value={editing.insurance_required ? 'true' : 'false'} onChange={v => setEditing({ ...editing, insurance_required: v === 'true' })} options={['true', 'false']} />
            <EditField label="Delivery Method" type="select" value={editing.delivery_method} onChange={v => setEditing({ ...editing, delivery_method: v })} options={['API', 'LeadByte', 'Webhook', 'Email', 'Manual']} />
            <EditField label="Fallback Buyer" type="text" value={editing.fallback_buyer_name || ''} onChange={v => setEditing({ ...editing, fallback_buyer_name: v })} />
            <div className="col-span-2 md:col-span-4">
              <EditField label="Delivery Endpoint" type="text" value={editing.delivery_endpoint || ''} onChange={v => setEditing({ ...editing, delivery_endpoint: v })} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" className="text-xs gap-1" onClick={saveEdit}><Save className="w-3 h-3" />Save Draft</Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditing(null)}>Cancel</Button>
            <span className="text-[10px] text-muted-foreground self-center">Changes saved as draft. Deploy to gateway to apply.</span>
          </div>
        </SectionPanel>
      )}

      {/* State Matrix */}
      <SectionPanel title="State Matrix by Buyer" subtitle="Which buyers accept which states">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3">Buyer</th>
                <th className="pb-2 pr-3">States</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stateMatrix).map(([buyer, states], i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="py-2 pr-3 font-medium">{buyer}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {states.map(s => <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{s}</span>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Test Simulator */}
      <TestLeadSimulator routingRules={rules} buyers={buyers} />
    </div>
  );
}

function EditField({ label, type, value, onChange, options }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground">{label}</label>
      {type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full h-8 mt-1 px-2 text-xs rounded border border-input bg-secondary">
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className="w-full h-8 mt-1 px-2 text-xs rounded border border-input bg-secondary" />
      )}
    </div>
  );
}