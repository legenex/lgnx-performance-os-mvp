import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatNumber } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { Landmark, RefreshCw, Radio, Database, Megaphone, Phone, Users, FileText } from 'lucide-react';

const SOURCES = [
  { key: 'bank', name: 'Bank / Mercury', icon: Landmark, entity: 'BankTransaction', required: true },
  { key: 'xero', name: 'Xero', icon: RefreshCw, entity: 'XeroInvoice', required: true },
  { key: 'stripe', name: 'Stripe', icon: Landmark, entity: 'BankTransaction', required: false },
  { key: 'leadbyte', name: 'LeadByte', icon: Radio, entity: 'GatewayLead', required: true },
  { key: 'bigquery', name: 'BigQuery / Masterview', icon: Database, entity: 'CampaignTruthMetric', required: true },
  { key: 'meta', name: 'Meta', icon: Megaphone, entity: 'AdDailyMetric', required: true },
  { key: 'google', name: 'Google', icon: Megaphone, entity: 'AdDailyMetric', required: true },
  { key: 'youtube', name: 'YouTube', icon: Megaphone, entity: 'AdDailyMetric', required: false },
  { key: 'taboola', name: 'Taboola', icon: Megaphone, entity: 'AdDailyMetric', required: false },
  { key: 'calls', name: 'Ringba / Walker / TrueCall', icon: Phone, entity: 'Call', required: true },
  { key: 'supplier', name: 'Supplier Statements', icon: Users, entity: 'SupplierStatement', required: true },
  { key: 'buyer', name: 'Buyer Feedback', icon: FileText, entity: 'BuyerDeliveryLog', required: true },
  { key: 'gateway', name: 'Lead Gateway Export', icon: Radio, entity: 'GatewayWebhookEvent', required: false },
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
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Type</span>
                <span className={`text-[11px] font-medium ${src.required ? 'text-critical' : 'text-muted-foreground'}`}>{src.required ? 'Required' : 'Optional'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SectionPanel title="Source Notes" subtitle="All sources feed into the performance truth calculations">
        <div className="space-y-2 text-[13px] text-muted-foreground">
          <p>• <span className="text-foreground font-medium">Bank / Mercury</span> — bank transactions categorized for cash income verification.</p>
          <p>• <span className="text-foreground font-medium">Xero</span> — invoices and payments as a data source for reconciliation.</p>
          <p>• <span className="text-foreground font-medium">Stripe</span> — payment verification for online transactions.</p>
          <p>• <span className="text-foreground font-medium">LeadByte</span> — lead performance data for revenue reporting.</p>
          <p>• <span className="text-foreground font-medium">Meta / Google / YouTube / Taboola</span> — ad spend and performance metrics by platform.</p>
          <p>• <span className="text-foreground font-medium">Ringba / Walker / TrueCall</span> — call tracking for call revenue attribution.</p>
          <p>• <span className="text-foreground font-medium">Supplier Statements</span> — supplier cost data for true CPL calculation.</p>
          <p>• <span className="text-foreground font-medium">Buyer Feedback</span> — delivery logs for DQ, return, and quality metrics.</p>
        </div>
      </SectionPanel>
    </div>
  );
}