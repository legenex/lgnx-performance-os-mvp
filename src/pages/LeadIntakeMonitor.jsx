import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import GatewayLeadDrawer from '@/components/shared/GatewayLeadDrawer';
import { Button } from '@/components/ui/button';
import { formatMoney, formatNumber } from '@/lib/formatters';
import { Search, AlertTriangle, FileX, RefreshCw, Eye } from 'lucide-react';

export default function LeadIntakeMonitor() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => { loadLeads(); }, []);

  async function loadLeads() {
    try {
      const data = await base44.entities.GatewayLead.list('-received_at', 500);
      setLeads(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (filters.status && l.lead_status !== filters.status) return false;
      if (filters.validation && l.validation_status !== filters.validation) return false;
      if (filters.routing && l.routing_status !== filters.routing) return false;
      if (filters.vertical && l.lead_vertical !== filters.vertical) return false;
      if (filters.supplier && l.supplier_sid !== filters.supplier) return false;
      if (filters.buyer && l.buyer_name !== filters.buyer) return false;
      if (filters.state && (l.accident_state || l.geo_state) !== filters.state) return false;
      if (search) {
        const s = search.toLowerCase();
        const match = [l.lead_key, l.gateway_lead_id, l.phone, l.email, l.first_name, l.last_name, l.utm_campaign, l.buyer_name, l.supplier_sid].some(v => (v || '').toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  }, [leads, filters, search]);

  const suppliers = useMemo(() => [...new Set(leads.map(l => l.supplier_sid).filter(Boolean))], [leads]);
  const buyers = useMemo(() => [...new Set(leads.map(l => l.buyer_name).filter(Boolean))], [leads]);
  const states = useMemo(() => [...new Set(leads.map(l => l.accident_state || l.geo_state).filter(Boolean))], [leads]);

  async function createLeadRecord(lead) {
    try {
      const newLead = await base44.entities.Lead.create({
        lead_key: lead.lead_key,
        leadbyte_id: lead.leadbyte_id,
        leadshook_id: lead.leadshook_id,
        tc_id: lead.tc_id,
        date: (lead.received_at || new Date().toISOString()).split('T')[0],
        lead_vertical: lead.lead_vertical,
        lead_status: lead.lead_status === 'Sold' ? 'Sold' : lead.lead_status === 'Disqualified' ? 'Disqualified' : lead.lead_status === 'Returned' ? 'Returned' : lead.lead_status === 'Fake' ? 'Fake' : 'Unsold',
        buyer_name: lead.buyer_name,
        buyer_id: lead.buyer_id,
        supplier_sid: lead.supplier_sid,
        supplier_ssid: lead.supplier_ssid,
        utm_source: lead.utm_source,
        utm_campaign: lead.utm_campaign,
        utm_medium: lead.utm_medium,
        utm_content: lead.utm_content,
        accident_state: lead.accident_state,
        geo_state: lead.geo_state,
        contact_phone: lead.phone,
        contact_email: lead.email,
        injured: lead.injured,
        injury_type: lead.injury_type,
        treatment: lead.treatment,
        fault: lead.fault,
        attorney: lead.attorney,
        insurance: lead.insurance,
        lead_revenue: lead.lead_revenue || 0,
        lead_net_revenue: lead.lead_net_revenue || 0,
        supplier_payout: lead.supplier_payout || 0,
        source_system: 'Lead Gateway',
      });
      await base44.entities.GatewayLead.update(lead.id, { created_lead_record: true });
      await loadLeads();
    } catch (err) { console.error(err); alert('Failed to create Lead: ' + err.message); }
  }

  async function retryRouting(lead) {
    try {
      await base44.entities.GatewayLead.update(lead.id, { routing_status: 'Not Routed', validation_status: 'Not Run' });
      await loadLeads();
    } catch (err) { console.error(err); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Lead Intake Monitor</h1>
        <p className="text-xs text-muted-foreground mt-1">Live gateway lead records · {formatNumber(filtered.length)} of {formatNumber(leads.length)}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border" style={{ background: '#14171C' }}>
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lead key, phone, email..." className="bg-transparent text-xs outline-none w-48" />
        </div>
        <FilterSelect label="Status" value={filters.status} onChange={v => setFilters({ ...filters, status: v })} options={['Received', 'Validated', 'Rejected', 'Posted', 'Sold', 'Unsold', 'Disqualified', 'Returned', 'Fake', 'Error']} />
        <FilterSelect label="Validation" value={filters.validation} onChange={v => setFilters({ ...filters, validation: v })} options={['Passed', 'Failed', 'Warning', 'Not Run']} />
        <FilterSelect label="Routing" value={filters.routing} onChange={v => setFilters({ ...filters, routing: v })} options={['Not Routed', 'Routed', 'Delivery Failed', 'Partial', 'Complete']} />
        <FilterSelect label="Vertical" value={filters.vertical} onChange={v => setFilters({ ...filters, vertical: v })} options={['MVA', 'WC', 'Other']} />
        <FilterSelect label="Supplier" value={filters.supplier} onChange={v => setFilters({ ...filters, supplier: v })} options={suppliers} />
        <FilterSelect label="Buyer" value={filters.buyer} onChange={v => setFilters({ ...filters, buyer: v })} options={buyers} />
        <FilterSelect label="State" value={filters.state} onChange={v => setFilters({ ...filters, state: v })} options={states} />
        {(Object.keys(filters).length > 0 || search) && (
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setFilters({}); setSearch(''); }}>Clear</Button>
        )}
      </div>

      {/* Table */}
      <SectionPanel title="Gateway Leads" subtitle={`${formatNumber(filtered.length)} leads`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-2">Received</th>
                <th className="pb-2 pr-2">Lead Key</th>
                <th className="pb-2 pr-2">Source</th>
                <th className="pb-2 pr-2">Vertical</th>
                <th className="pb-2 pr-2">Status</th>
                <th className="pb-2 pr-2">Validation</th>
                <th className="pb-2 pr-2">Routing</th>
                <th className="pb-2 pr-2">Buyer</th>
                <th className="pb-2 pr-2">Supplier</th>
                <th className="pb-2 pr-2">State</th>
                <th className="pb-2 pr-2">Name</th>
                <th className="pb-2 pr-2">UTM Campaign</th>
                <th className="pb-2 pr-2 text-right">Revenue</th>
                <th className="pb-2 pr-2 text-right">Payout</th>
                <th className="pb-2 pr-2">Lead Record</th>
                <th className="pb-2 pr-2">Missing Fields</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((l, i) => {
                const missing = getMissingFields(l);
                return (
                  <tr key={i} className="border-b border-border/30 hover:bg-white/5 cursor-pointer" onClick={() => setSelected(l)}>
                    <td className="py-1.5 pr-2 text-muted-foreground whitespace-nowrap">{l.received_at ? new Date(l.received_at).toLocaleString() : '—'}</td>
                    <td className="py-1.5 pr-2 font-mono text-[10px]">{l.lead_key || l.gateway_lead_id || '—'}</td>
                    <td className="py-1.5 pr-2 text-muted-foreground text-[11px]">{l.source_system || '—'}</td>
                    <td className="py-1.5 pr-2">{l.lead_vertical || '—'}</td>
                    <td className="py-1.5 pr-2"><LeadStatusBadge status={l.lead_status} /></td>
                    <td className="py-1.5 pr-2"><ValidationBadge status={l.validation_status} /></td>
                    <td className="py-1.5 pr-2"><RoutingBadge status={l.routing_status} /></td>
                    <td className="py-1.5 pr-2 text-muted-foreground">{l.buyer_name || '—'}</td>
                    <td className="py-1.5 pr-2 text-muted-foreground">{l.supplier_sid || '—'}</td>
                    <td className="py-1.5 pr-2 text-muted-foreground">{l.accident_state || l.geo_state || '—'}</td>
                    <td className="py-1.5 pr-2 text-muted-foreground">{[l.first_name, l.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td className="py-1.5 pr-2 text-muted-foreground max-w-32 truncate">{l.utm_campaign || '—'}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(l.lead_revenue)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-orange-400">{formatMoney(l.supplier_payout)}</td>
                    <td className="py-1.5 pr-2">{l.created_lead_record ? <span className="text-[10px] text-emerald-400">✓ Linked</span> : <span className="text-[10px] text-yellow-400">Not created</span>}</td>
                    <td className="py-1.5 pr-2">{missing.length > 0 ? <span className="text-[10px] text-red-400">{missing.join(', ')}</span> : <span className="text-[10px] text-emerald-400">✓</span>}</td>
                    <td className="py-1.5 pr-2" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {!l.created_lead_record && l.lead_status === 'Sold' && (
                          <Button variant="outline" size="sm" className="text-[9px] h-6 px-1.5 gap-1" onClick={() => createLeadRecord(l)}>+ Lead</Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-[9px] h-6 px-1.5" onClick={() => setSelected(l)}><Eye className="w-3 h-3" /></Button>
                        {(l.routing_status === 'Delivery Failed' || l.routing_status === 'Not Routed') && (
                          <Button variant="ghost" size="sm" className="text-[9px] h-6 px-1.5" onClick={() => retryRouting(l)}><RefreshCw className="w-3 h-3" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {selected && <GatewayLeadDrawer lead={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value || undefined)} className="h-8 px-2 text-xs rounded border border-input bg-secondary text-foreground">
      <option value="">{label}: All</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function LeadStatusBadge({ status }) {
  const colors = {
    'Sold': 'bg-emerald-500/20 text-emerald-400',
    'Posted': 'bg-indigo-500/20 text-indigo-400',
    'Validated': 'bg-cyan-500/20 text-cyan-400',
    'Received': 'bg-blue-500/20 text-blue-400',
    'Unsold': 'bg-gray-500/20 text-gray-400',
    'Disqualified': 'bg-orange-500/20 text-orange-400',
    'Rejected': 'bg-red-500/20 text-red-400',
    'Returned': 'bg-yellow-500/20 text-yellow-400',
    'Fake': 'bg-red-600/20 text-red-500',
    'Error': 'bg-red-600/20 text-red-500',
  };
  return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>{status}</span>;
}

function ValidationBadge({ status }) {
  const colors = { 'Passed': 'text-emerald-400', 'Failed': 'text-red-400', 'Warning': 'text-yellow-400', 'Not Run': 'text-muted-foreground' };
  return <span className={`text-[9px] ${colors[status] || 'text-muted-foreground'}`}>{status}</span>;
}

function RoutingBadge({ status }) {
  const colors = { 'Complete': 'text-emerald-400', 'Routed': 'text-blue-400', 'Partial': 'text-yellow-400', 'Delivery Failed': 'text-red-400', 'Not Routed': 'text-muted-foreground' };
  return <span className={`text-[9px] ${colors[status] || 'text-muted-foreground'}`}>{status}</span>;
}

function getMissingFields(l) {
  const required = ['phone', 'email', 'accident_state', 'first_name', 'last_name', 'injury_type'];
  return required.filter(f => !l[f]);
}