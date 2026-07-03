import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatNumber } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { Landmark, RefreshCw, Radio, Database, Megaphone, Phone, Users, FileText, Zap, Shield, Plug } from 'lucide-react';

const SOURCES = [
  { key: 'bank', name: 'Bank / Mercury', icon: Landmark, entity: 'BankTransaction' },
  { key: 'xero', name: 'Xero', icon: RefreshCw, entity: 'XeroInvoice' },
  { key: 'leadbyte', name: 'LeadByte', icon: Radio, entity: 'GatewayLead' },
  { key: 'bigquery', name: 'BigQuery / Masterview', icon: Database, entity: 'CampaignTruthMetric' },
  { key: 'meta', name: 'Meta / Google / Taboola', icon: Megaphone, entity: 'AdDailyMetric' },
  { key: 'calls', name: 'Ringba / Walker / Calls', icon: Phone, entity: 'Call' },
  { key: 'supplier', name: 'Supplier Statements', icon: Users, entity: 'SupplierStatement' },
  { key: 'buyer', name: 'Buyer Feedback', icon: FileText, entity: 'BuyerDeliveryLog' },
  { key: 'gateway', name: 'Lead Gateway', icon: Radio, entity: 'GatewayWebhookEvent' },
  { key: 'capi', name: 'CAPI Logs', icon: Zap, entity: 'EventTrackingLog' },
  { key: 'trustedform', name: 'TrustedForm / Jornaya', icon: Shield, entity: 'ComplianceRecord' },
  { key: 'connections', name: 'Source Connections', icon: Plug, entity: 'ImportBatch' },
];

export default function DataSources() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const importBatches = await base44.entities.ImportBatch.list().catch(() => []);
      const results = await Promise.all(SOURCES.map(async src => {
        let count = 0;
        let lastImport = null;
        let errors = 0;
        try {
          const records = await base44.entities[src.entity].list();
          count = records.length;
        } catch { count = 0; }
        const batches = importBatches.filter(b => b.source?.toLowerCase().includes(src.key) || b.entity_type === src.entity);
        if (batches.length > 0) {
          lastImport = batches[0].created_date || batches[0].import_date;
          errors = batches.filter(b => b.status === 'error' || b.status === 'failed').length;
        }
        const status = count > 0 ? 'Connected' : 'Not Connected';
        return { ...src, count, lastImport, errors, status };
      }));
      setSources(results);
    } catch (err) {
      console.error('DataSources error:', err);
      setSources(SOURCES.map(s => ({ ...s, count: 0, lastImport: null, errors: 0, status: 'Not Connected' })));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Data Sources</h1>
        <p className="text-sm text-muted-foreground mt-1">All data connections, import status, and row counts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map(src => (
          <div key={src.key} className="bg-card border border-border rounded-[10px] p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                  <src.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{src.name}</h3>
              </div>
              <StatusBadge status={src.status} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Rows</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">{formatNumber(src.count)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Last Import</span>
                <span className="text-[11px] text-muted-foreground">{src.lastImport ? new Date(src.lastImport).toLocaleDateString() : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Errors</span>
                <span className={`text-[11px] font-medium ${src.errors > 0 ? 'text-critical' : 'text-muted-foreground'}`}>{src.errors}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SectionPanel title="Connection Notes" subtitle="Xero is a backend data source only, not a standalone workflow">
        <div className="space-y-2 text-[13px] text-muted-foreground">
          <p>• <span className="text-foreground font-medium">Xero</span> — syncs invoices, bank transactions, and contacts as a data source. Used inside Income Check, Payables, and Reconciliation.</p>
          <p>• <span className="text-foreground font-medium">Bank / Mercury</span> — bank transactions are imported and categorized for cash flow analysis.</p>
          <p>• <span className="text-foreground font-medium">LeadByte</span> — lead data synced from the gateway for reconciliation against performance metrics.</p>
          <p>• <span className="text-foreground font-medium">Meta / Google / Taboola</span> — ad spend and performance metrics imported via CSV or API.</p>
          <p>• <span className="text-foreground font-medium">Ringba / Walker</span> — call tracking data for call revenue attribution.</p>
        </div>
      </SectionPanel>
    </div>
  );
}