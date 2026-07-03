import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import GatewayLeadDrawer from '@/components/shared/GatewayLeadDrawer';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/formatters';
import { Eye, Wrench } from 'lucide-react';

export default function ErrorQueue() {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({ severity: '', category: '', status: 'Open' });
  const [owner, setOwner] = useState('');

  useEffect(() => { loadErrors(); }, []);

  async function loadErrors() {
    try {
      const data = await base44.entities.GatewayError.list('-created_at', 500);
      setErrors(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    return errors.filter(e => {
      if (filter.severity && e.severity !== filter.severity) return false;
      if (filter.category && e.category !== filter.category) return false;
      if (filter.status && e.status !== filter.status) return false;
      return true;
    });
  }, [errors, filter]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(e => {
      const key = `${e.category}:${e.severity}`;
      if (!groups[key]) groups[key] = { category: e.category, severity: e.severity, count: 0, items: [] };
      groups[key].count++;
      groups[key].items.push(e);
    });
    return Object.values(groups).sort((a, b) => {
      const sevOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return sevOrder[a.severity] - sevOrder[b.severity];
    });
  }, [filtered]);

  async function updateStatus(err, status) {
    try {
      const updates = { status };
      if (status === 'Resolved') updates.resolved_at = new Date().toISOString();
      await base44.entities.GatewayError.update(err.id, updates);
      await loadErrors();
    } catch (err) { console.error(err); }
  }

  async function assignOwner(err) {
    if (!owner) return;
    try {
      await base44.entities.GatewayError.update(err.id, { owner });
      await loadErrors();
    } catch (err) { console.error(err); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Error Queue</h1>
        <p className="text-xs text-muted-foreground mt-1">Gateway errors grouped by category and severity</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filter.severity} onChange={e => setFilter({ ...filter, severity: e.target.value })} className="h-8 px-2 text-xs rounded border border-input bg-secondary">
          <option value="">All Severities</option>
          {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} className="h-8 px-2 text-xs rounded border border-input bg-secondary">
          <option value="">All Categories</option>
          {['Validation', 'Routing', 'Delivery', 'Compliance', 'CAPI', 'LeadByte', 'Buyer', 'Supplier', 'Duplicate', 'Unknown'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })} className="h-8 px-2 text-xs rounded border border-input bg-secondary">
          <option value="">All Statuses</option>
          {['Open', 'In Progress', 'Resolved', 'Ignored'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Grouped Summary */}
      <SectionPanel title="Error Summary" subtitle={`${grouped.length} groups · ${formatNumber(filtered.length)} errors`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {grouped.map((g, i) => (
            <div key={i} className="p-3 rounded" style={{ background: '#1A1E24' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{g.category}</span>
                <StatusBadge status={g.severity} />
              </div>
              <p className="text-2xl font-bold tabular-nums">{g.count}</p>
            </div>
          ))}
        </div>
      </SectionPanel>

      {/* Error Table */}
      <SectionPanel title="Errors" subtitle={`${formatNumber(filtered.length)} errors`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-2">Severity</th>
                <th className="pb-2 pr-2">Category</th>
                <th className="pb-2 pr-2">Message</th>
                <th className="pb-2 pr-2">Lead Key</th>
                <th className="pb-2 pr-2">Root Cause</th>
                <th className="pb-2 pr-2">Recommended Action</th>
                <th className="pb-2 pr-2">Owner</th>
                <th className="pb-2 pr-2">Status</th>
                <th className="pb-2 pr-2">Created</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((e, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-1.5 pr-2"><StatusBadge status={e.severity} /></td>
                  <td className="py-1.5 pr-2 text-muted-foreground">{e.category}</td>
                  <td className="py-1.5 pr-2 max-w-48">{e.message}</td>
                  <td className="py-1.5 pr-2 font-mono text-[10px] text-muted-foreground">{e.lead_key || '—'}</td>
                  <td className="py-1.5 pr-2 text-[10px] text-muted-foreground max-w-32 truncate">{e.root_cause || '—'}</td>
                  <td className="py-1.5 pr-2 text-[10px] text-blue-400 max-w-32 truncate">{e.recommended_action || '—'}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground text-[10px]">{e.owner || <span className="text-yellow-400">Unassigned</span>}</td>
                  <td className="py-1.5 pr-2"><StatusBadge status={e.status} /></td>
                  <td className="py-1.5 pr-2 text-muted-foreground text-[10px]">{e.created_at ? new Date(e.created_at).toLocaleString() : '—'}</td>
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-1">
                      {e.gateway_lead_id && <button onClick={() => setSelected({ gateway_lead_id: e.gateway_lead_id, lead_key: e.lead_key })} className="text-muted-foreground hover:text-foreground"><Eye className="w-3 h-3" /></button>}
                      {e.status === 'Open' && <Button variant="ghost" size="sm" className="text-[9px] h-6 px-1.5" onClick={() => updateStatus(e, 'In Progress')}>Start</Button>}
                      {e.status === 'In Progress' && <Button variant="ghost" size="sm" className="text-[9px] h-6 px-1.5" onClick={() => updateStatus(e, 'Resolved')}>Resolve</Button>}
                      <Button variant="ghost" size="sm" className="text-[9px] h-6 px-1.5" onClick={() => updateStatus(e, 'Ignored')}>Ignore</Button>
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