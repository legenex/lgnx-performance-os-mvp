import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import GatewayLeadDrawer from '@/components/shared/GatewayLeadDrawer';
import { formatMoney, formatNumber } from '@/lib/formatters';
import { Zap, AlertTriangle, RefreshCw, Eye } from 'lucide-react';

export default function CapiEventTracking() {
  const [events, setEvents] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({ platform: '', status: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [evts, lds] = await Promise.all([
        base44.entities.EventTrackingLog.list('-event_time', 500),
        base44.entities.GatewayLead.list(undefined, 500),
      ]);
      setEvents(evts);
      setLeads(lds);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Sold leads without CAPI Sold_Lead event
  const soldWithoutCapi = useMemo(() => {
    return leads.filter(l => l.lead_status === 'Sold').map(l => {
      const capiEvents = events.filter(e => e.gateway_lead_id === l.gateway_lead_id && e.event_name === 'Sold_Lead' && e.status === 'Sent');
      return { lead: l, hasCapi: capiEvents.length > 0 };
    }).filter(({ hasCapi }) => !hasCapi);
  }, [events, leads]);

  // CAPI events sent without matching lead status
  const capiWithoutLead = useMemo(() => {
    return events.filter(e => {
      if (e.status !== 'Sent') return false;
      const lead = leads.find(l => l.gateway_lead_id === e.gateway_lead_id);
      if (!lead) return true;
      if (e.event_name === 'Sold_Lead' && lead.lead_status !== 'Sold') return true;
      return false;
    });
  }, [events, leads]);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (filter.platform && e.platform !== filter.platform) return false;
      if (filter.status && e.status !== filter.status) return false;
      return true;
    });
  }, [events, filter]);

  const stats = useMemo(() => {
    const total = events.length;
    const sent = events.filter(e => e.status === 'Sent').length;
    const failed = events.filter(e => e.status === 'Failed').length;
    const queued = events.filter(e => e.status === 'Queued').length;
    const soldEvents = events.filter(e => e.event_name === 'Sold_Lead').length;
    return { total, sent, failed, queued, soldEvents };
  }, [events]);

  async function retryEvent(evt) {
    try {
      await base44.entities.EventTrackingLog.update(evt.id, { status: 'Retried', retry_count: (evt.retry_count || 0) + 1 });
      await loadData();
    } catch (err) { console.error(err); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">CAPI / Event Tracking</h1>
        <p className="text-xs text-muted-foreground mt-1">Meta CAPI, Google Ads, GA4, Taboola event logs</p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <CapiCard title="Total Events" value={formatNumber(stats.total)} />
        <CapiCard title="Sent" value={formatNumber(stats.sent)} color="text-success" />
        <CapiCard title="Failed" value={formatNumber(stats.failed)} color="text-critical" icon={AlertTriangle} />
        <CapiCard title="Queued" value={formatNumber(stats.queued)} color="text-yellow-400" />
        <CapiCard title="Sold_Lead Events" value={formatNumber(stats.soldEvents)} color="text-blue-400" icon={Zap} />
      </div>

      {/* Alerts */}
      {soldWithoutCapi.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-orange-300 font-medium">{soldWithoutCapi.length} sold lead(s) missing CAPI Sold_Lead event</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              These leads were sold but no Sold_Lead event was sent to the ad platform. Ad platform optimization is incomplete.
            </p>
          </div>
        </div>
      )}

      {capiWithoutLead.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-yellow-300 font-medium">{capiWithoutLead.length} CAPI event(s) sent without matching lead status</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Events fired for leads that are not sold or not found in gateway. Possible tracking misconfiguration.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <select value={filter.platform} onChange={e => setFilter({ ...filter, platform: e.target.value })} className="h-8 px-2 text-xs rounded border border-input bg-secondary">
          <option value="">All Platforms</option>
          {['Meta CAPI', 'Google Ads', 'GA4', 'Taboola', 'LeadByte', 'Other'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })} className="h-8 px-2 text-xs rounded border border-input bg-secondary">
          <option value="">All Statuses</option>
          {['Sent', 'Failed', 'Queued', 'Retried', 'Ignored'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Failed Event Retry Queue */}
      <SectionPanel title="Failed Event Retry Queue" subtitle={`${events.filter(e => e.status === 'Failed').length} failed events`}>
        {events.filter(e => e.status === 'Failed').length === 0 ? (
          <p className="text-xs text-success">No failed events.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-2">Platform</th>
                <th className="pb-2 pr-2">Event</th>
                <th className="pb-2 pr-2">Lead Key</th>
                <th className="pb-2 pr-2">Dedupe Key</th>
                <th className="pb-2 pr-2">Error</th>
                <th className="pb-2 pr-2 text-center">Retries</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.filter(e => e.status === 'Failed').slice(0, 50).map((e, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-1.5 pr-2">{e.platform}</td>
                  <td className="py-1.5 pr-2 font-medium">{e.event_name}</td>
                  <td className="py-1.5 pr-2 font-mono text-[10px]">{e.lead_key || '—'}</td>
                  <td className="py-1.5 pr-2 font-mono text-[10px] text-muted-foreground">{e.dedupe_key || '—'}</td>
                  <td className="py-1.5 pr-2 text-critical text-[10px] max-w-48 truncate">{e.error_message || '—'}</td>
                  <td className="py-1.5 pr-2 text-center tabular-nums">{e.retry_count || 0}</td>
                  <td className="py-1.5 pr-2">
                    <button onClick={() => retryEvent(e)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionPanel>

      {/* All Events Table */}
      <SectionPanel title="Event Tracking Logs" subtitle={`${formatNumber(filtered.length)} events`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-2">Event Time</th>
                <th className="pb-2 pr-2">Platform</th>
                <th className="pb-2 pr-2">Event Name</th>
                <th className="pb-2 pr-2">Lead Key</th>
                <th className="pb-2 pr-2">Event ID</th>
                <th className="pb-2 pr-2">Dedupe Key</th>
                <th className="pb-2 pr-2">Pixel ID</th>
                <th className="pb-2 pr-2 text-right">Value</th>
                <th className="pb-2 pr-2">Status</th>
                <th className="pb-2 pr-2 text-center">Retries</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((e, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-1.5 pr-2 text-muted-foreground whitespace-nowrap">{e.event_time ? new Date(e.event_time).toLocaleString() : '—'}</td>
                  <td className="py-1.5 pr-2">{e.platform}</td>
                  <td className="py-1.5 pr-2 font-medium">{e.event_name}</td>
                  <td className="py-1.5 pr-2 font-mono text-[10px]">{e.lead_key || '—'}</td>
                  <td className="py-1.5 pr-2 font-mono text-[10px] text-muted-foreground">{e.event_id || '—'}</td>
                  <td className="py-1.5 pr-2 font-mono text-[10px] text-muted-foreground">{e.dedupe_key || '—'}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground text-[10px]">{e.pixel_id || '—'}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(e.event_value)}</td>
                  <td className="py-1.5 pr-2"><EventStatusBadge status={e.status} /></td>
                  <td className="py-1.5 pr-2 text-center tabular-nums">{e.retry_count || 0}</td>
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelected(leads.find(l => l.gateway_lead_id === e.gateway_lead_id))} className="text-muted-foreground hover:text-foreground"><Eye className="w-3 h-3" /></button>
                      {e.status === 'Failed' && <button onClick={() => retryEvent(e)} className="text-blue-400 hover:text-blue-300"><RefreshCw className="w-3 h-3" /></button>}
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

function CapiCard({ title, value, color, icon: Icon }) {
  return (
    <div className="rounded-lg border border-border p-3" style={{ background: 'hsl(213, 17%, 20%)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
      <div className={`text-lg font-bold tabular-nums ${color || 'text-foreground'}`}>{value}</div>
    </div>
  );
}

function EventStatusBadge({ status }) {
  const colors = {
    'Sent': 'bg-emerald-500/20 text-success',
    'Failed': 'bg-red-500/20 text-critical',
    'Queued': 'bg-yellow-500/20 text-yellow-400',
    'Retried': 'bg-blue-500/20 text-blue-400',
    'Ignored': 'bg-gray-500/20 text-gray-400',
  };
  return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>{status}</span>;
}