import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import DataTable from '@/components/shared/DataTable';
import { FileBarChart, Download } from 'lucide-react';

const REPORT_TYPES = [
  { key: 'daily', label: 'Daily Performance', entity: 'GatewayLead' },
  { key: 'supplier', label: 'Supplier Summary', entity: 'GatewayLead' },
  { key: 'buyer', label: 'Buyer Summary', entity: 'GatewayLead' },
  { key: 'campaign', label: 'Campaign Summary', entity: 'CampaignTruthMetric' },
  { key: 'financial', label: 'Financial Summary', entity: 'BankTransaction' },
];

export default function ReportBuilder() {
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState('daily');
  const [data, setData] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  async function runReport() {
    setLoading(true);
    try {
      const report = REPORT_TYPES.find(r => r.key === selectedReport);
      const records = await base44.entities[report.entity].list('-created_date', 200).catch(() => []);
      setData(records || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const columns = data.length > 0
    ? Object.keys(data[0]).filter(k => !['id', 'created_date', 'updated_date', 'created_by_id'].includes(k)).slice(0, 12).map(k => ({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), align: typeof data[0][k] === 'number' ? 'right' : 'left' }))
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Report Builder</h1>
        <p className="text-xs text-muted-foreground mt-1">Build and export custom reports from any data source</p>
      </div>

      <SectionPanel title="Report Configuration">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={selectedReport} onChange={e => setSelectedReport(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground">
            {REPORT_TYPES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground" />
          <button onClick={runReport} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'hsl(358, 78%, 52%)' }}>
            <FileBarChart className="w-3 h-3" /> Run Report
          </button>
        </div>
      </SectionPanel>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>
      ) : data.length > 0 ? (
        <DataTable exportFileName={selectedReport} data={data} columns={columns} maxHeight="600px" />
      ) : (
        <SectionPanel title="Results">
          <p className="text-xs text-muted-foreground">Select a report type and click "Run Report" to generate data.</p>
        </SectionPanel>
      )}
    </div>
  );
}