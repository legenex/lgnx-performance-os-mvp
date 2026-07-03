import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatMoney } from '@/lib/formatters';
import { Plug, RefreshCw, AlertCircle, CheckCircle2, Database, ArrowRight } from 'lucide-react';

const SOURCES = [
  { name: 'Mercury Bank', type: 'Banking', entity: 'BankTransaction', icon: '🏦' },
  { name: 'Xero', type: 'Accounting', entity: 'XeroInvoice', icon: '📊' },
  { name: 'LeadByte', type: 'Lead Platform', entity: 'Lead', icon: '📋' },
  { name: 'BigQuery / Masterview', type: 'Reference', entity: 'Lead', icon: '🗄️' },
  { name: 'Meta Ads', type: 'Ad Platform', entity: 'AdDailyMetric', icon: '📘' },
  { name: 'Google Ads', type: 'Ad Platform', entity: 'AdDailyMetric', icon: '🔍' },
  { name: 'YouTube Ads', type: 'Ad Platform', entity: 'AdDailyMetric', icon: '▶️' },
  { name: 'Taboola', type: 'Ad Platform', entity: 'AdDailyMetric', icon: '📰' },
  { name: 'Ringba', type: 'Call Tracking', entity: 'Call', icon: '📞' },
  { name: 'Walker / TrueCall', type: 'Call Tracking', entity: 'Call', icon: '☎️' },
  { name: 'Supplier Statements', type: 'AP', entity: 'SupplierStatement', icon: '📝' },
  { name: 'Buyer Feedback', type: 'AR', entity: 'Lead', icon: '💬' },
  { name: 'Lead Gateway', type: 'Ingestion', entity: 'GatewayLead', icon: '🌐' },
  { name: 'CAPI Logs', type: 'Tracking', entity: 'EventTrackingLog', icon: '⚡' },
  { name: 'TrustedForm / Jornaya', type: 'Compliance', entity: 'ComplianceRecord', icon: '🛡️' },
];

export default function SourceConnections() {
  const [loading, setLoading] = useState(true);
  const [sourceData, setSourceData] = useState({});
  const [batches, setBatches] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const importBatches = await base44.entities.ImportBatch.list('-imported_at', 50).catch(() => []);
      setBatches(importBatches || []);
      const dataByEntity = {};
      for (const source of SOURCES) {
        try {
          const records = await base44.entities[source.entity].list('-created_date', 1).catch(() => []);
          dataByEntity[source.name] = { count: records?.length || 0, lastRecord: records?.[0] };
        } catch { dataByEntity[source.name] = { count: 0 }; }
      }
      setSourceData(dataByEntity);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Source Connections</h1>
        <p className="text-xs text-muted-foreground mt-1">Monitor data source connections, sync status, and import health</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SOURCES.map(source => {
          const info = sourceData[source.name] || { count: 0 };
          const lastBatch = batches.find(b => b.source?.includes(source.name));
          const isConnected = info.count > 0;
          const status = isConnected ? 'Connected' : 'Not Connected';
          const lastSync = lastBatch?.imported_at ? new Date(lastBatch.imported_at).toLocaleString() : info.lastRecord?.created_date ? new Date(info.lastRecord.created_date).toLocaleString() : 'Never';
          const errors = lastBatch?.rows_failed || 0;

          return (
            <div key={source.name} className="rounded-xl border border-border p-4" style={{ background: 'hsl(213, 17%, 20%)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{source.icon}</span>
                  <div>
                    <p className="text-xs font-semibold">{source.name}</p>
                    <p className="text-[10px] text-muted-foreground">{source.type}</p>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Last sync:</span><span className="font-medium">{lastSync}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Records:</span><span className="font-medium tabular-nums">{info.count || 'UNKNOWN'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Errors:</span><span className={`font-medium tabular-nums ${errors > 0 ? 'text-critical' : 'text-success'}`}>{errors}</span></div>
              </div>
              <div className="mt-3 flex gap-1.5">
                <button className="flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                  <RefreshCw className="w-3 h-3" /> Sync
                </button>
                <button className="flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                  <ArrowRight className="w-3 h-3" /> Configure
                </button>
              </div>
              <p className="text-[9px] text-muted-foreground mt-2">Next action: {isConnected ? 'Schedule recurring sync' : 'Connect source'}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}