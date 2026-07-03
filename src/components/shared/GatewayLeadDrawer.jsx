import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney } from '@/lib/formatters';
import { X, Phone, Mail, MapPin, User, Shield, Activity, Truck } from 'lucide-react';

export default function GatewayLeadDrawer({ lead, onClose }) {
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!lead?.gateway_lead_id) return;
    (async () => {
      try {
        const [logs, comp, evts] = await Promise.all([
          base44.entities.BuyerDeliveryLog.filter({ gateway_lead_id: lead.gateway_lead_id }),
          base44.entities.ComplianceRecord.filter({ gateway_lead_id: lead.gateway_lead_id }),
          base44.entities.EventTrackingLog.filter({ gateway_lead_id: lead.gateway_lead_id }),
        ]);
        setDeliveryLogs(logs);
        setCompliance(comp[0] || null);
        setEvents(evts);
      } catch (err) { console.error(err); }
    })();
  }, [lead?.gateway_lead_id]);

  if (!lead) return null;

  const tabs = ['overview', 'payload', 'validation', 'routing', 'compliance', 'events'];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-2xl h-full overflow-y-auto" style={{ background: '#1a1d21' }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-5 py-3 border-b border-border z-10" style={{ background: '#1a1d21' }}>
          <div>
            <h2 className="text-sm font-bold">Lead {lead.lead_key || lead.gateway_lead_id}</h2>
            <p className="text-[10px] text-muted-foreground">{lead.first_name} {lead.last_name} · {lead.accident_state || lead.geo_state || '—'}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex gap-1 px-5 py-2 border-b border-border">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-2.5 py-1 text-[11px] rounded ${tab === t ? 'bg-[#E4262C]/10 text-[#E4262C]' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === 'overview' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status" value={lead.lead_status} />
                <Field label="Validation" value={lead.validation_status} />
                <Field label="Routing" value={lead.routing_status} />
                <Field label="Vertical" value={lead.lead_vertical} />
                <Field label="Source" value={lead.source_system} />
                <Field label="Buyer" value={lead.buyer_name || '—'} />
                <Field label="Supplier SID" value={lead.supplier_sid || '—'} />
                <Field label="Revenue" value={formatMoney(lead.lead_revenue)} />
                <Field label="Net Revenue" value={formatMoney(lead.lead_net_revenue)} />
                <Field label="Supplier Payout" value={formatMoney(lead.supplier_payout)} />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <Field label="Phone" value={lead.phone || '—'} icon={Phone} />
                <Field label="Email" value={lead.email || '—'} icon={Mail} />
                <Field label="State" value={lead.accident_state || lead.geo_state || '—'} icon={MapPin} />
                <Field label="ZIP" value={lead.zip_code || '—'} />
                <Field label="Injured" value={lead.injured || '—'} />
                <Field label="Injury Type" value={lead.injury_type || '—'} />
                <Field label="Treatment" value={lead.treatment || '—'} />
                <Field label="Attorney" value={lead.attorney || '—'} />
                <Field label="Fault" value={lead.fault || '—'} />
                <Field label="Insurance" value={lead.insurance || '—'} />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <Field label="UTM Source" value={lead.utm_source || '—'} />
                <Field label="UTM Campaign" value={lead.utm_campaign || '—'} />
                <Field label="UTM Medium" value={lead.utm_medium || '—'} />
                <Field label="UTM Content" value={lead.utm_content || '—'} />
              </div>
              {lead.rejection_reason && (
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                  <p className="text-[10px] text-red-400 font-medium">Rejection Reason</p>
                  <p className="text-xs text-red-300 mt-1">{lead.rejection_reason}</p>
                </div>
              )}
              {lead.validation_errors && (
                <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20">
                  <p className="text-[10px] text-orange-400 font-medium">Validation Errors</p>
                  <p className="text-xs text-orange-300 mt-1">{lead.validation_errors}</p>
                </div>
              )}
              {lead.buyer_response_summary && (
                <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                  <p className="text-[10px] text-blue-400 font-medium">Buyer Response</p>
                  <p className="text-xs text-blue-300 mt-1">{lead.buyer_response_summary}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'payload' && (
            <div className="space-y-3">
              <PayloadBlock label="Source Payload" json={lead.source_payload_json} />
              <PayloadBlock label="Normalized Payload" json={lead.normalized_payload_json} />
            </div>
          )}

          {tab === 'validation' && (
            <div className="space-y-2">
              <Field label="Validation Status" value={lead.validation_status} />
              {lead.validation_errors ? (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-300">{lead.validation_errors}</p>
                </div>
              ) : lead.validation_status === 'Passed' ? (
                <p className="text-xs text-emerald-400">All validation rules passed.</p>
              ) : (
                <p className="text-xs text-muted-foreground">No validation errors recorded.</p>
              )}
            </div>
          )}

          {tab === 'routing' && (
            <div className="space-y-2">
              <Field label="Routing Status" value={lead.routing_status} />
              <Field label="Buyer" value={lead.buyer_name || '—'} />
              <Field label="Buyer ID" value={lead.buyer_id || '—'} />
              {deliveryLogs.length > 0 ? (
                <div className="pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Delivery Attempts ({deliveryLogs.length})</p>
                  {deliveryLogs.map((d, i) => (
                    <div key={i} className="p-2 rounded mb-1.5" style={{ background: 'hsl(214, 18%, 23%)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{d.buyer_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${d.status === 'Sold' ? 'bg-emerald-500/20 text-emerald-400' : d.status === 'Failed' || d.status === 'Timeout' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>{d.status}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{d.endpoint || '—'} · {d.response_time_ms || 0}ms · {d.http_status || '—'}</p>
                      {d.error_message && <p className="text-[10px] text-red-400 mt-1">{d.error_message}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No delivery attempts.</p>
              )}
            </div>
          )}

          {tab === 'compliance' && (
            <div className="space-y-2">
              {compliance ? (
                <>
                  <Field label="TrustedForm Status" value={compliance.trustedform_status} />
                  {compliance.trustedform_url && <a href={compliance.trustedform_url} target="_blank" className="text-xs text-blue-400 hover:underline break-all">{compliance.trustedform_url}</a>}
                  <Field label="Jornaya Status" value={compliance.jornaya_status} />
                  {compliance.jornaya_token && <p className="text-[10px] font-mono text-muted-foreground">{compliance.jornaya_token}</p>}
                  <Field label="TCPA Status" value={compliance.tcpa_status} />
                  <Field label="Compliance Risk" value={compliance.compliance_risk} />
                  <Field label="Opt-in URL" value={compliance.optin_url || '—'} />
                  <Field label="IP Address" value={compliance.ip_address || '—'} />
                  <Field label="User Agent" value={compliance.user_agent || '—'} />
                  {compliance.consent_text && (
                    <div className="p-2 rounded" style={{ background: 'hsl(214, 18%, 23%)' }}>
                      <p className="text-[10px] text-muted-foreground mb-1">Consent Text</p>
                      <p className="text-[10px] text-foreground">{compliance.consent_text}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No compliance record found for this lead.</p>
              )}
            </div>
          )}

          {tab === 'events' && (
            <div className="space-y-2">
              {events.length > 0 ? events.map((e, i) => (
                <div key={i} className="p-2 rounded" style={{ background: 'hsl(214, 18%, 23%)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{e.platform} · {e.event_name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.status === 'Sent' ? 'bg-emerald-500/20 text-emerald-400' : e.status === 'Failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{e.status}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Event ID: {e.event_id || '—'} · Dedupe: {e.dedupe_key || '—'}</p>
                  {e.error_message && <p className="text-[10px] text-red-400 mt-1">{e.error_message}</p>}
                </div>
              )) : <p className="text-xs text-muted-foreground">No CAPI/event tracking logs.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, icon: Icon }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3 text-muted-foreground" />}
        {value || '—'}
      </p>
    </div>
  );
}

function PayloadBlock({ label, json }) {
  let parsed = null;
  try { parsed = json ? JSON.parse(json) : null; } catch {}
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      {parsed ? (
        <pre className="text-[10px] font-mono p-3 rounded overflow-x-auto max-h-60" style={{ background: 'hsl(214, 18%, 23%)' }}>
          {JSON.stringify(parsed, null, 2)}
        </pre>
      ) : (
        <p className="text-xs text-muted-foreground">No payload recorded.</p>
      )}
    </div>
  );
}