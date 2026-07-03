import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { Trash2, Eye, Download } from 'lucide-react';

export default function ImportHistory() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);

  useEffect(() => { loadBatches(); }, []);

  async function loadBatches() {
    try {
      const b = await base44.entities.ImportBatch.list('-imported_at', 100);
      setBatches(b || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function deleteBatch(id) {
    try {
      await base44.entities.ImportBatch.delete(id);
      setBatches(prev => prev.filter(b => b.id !== id));
    } catch (err) { console.error(err); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Import History</h1>
        <p className="text-xs text-muted-foreground mt-1">All import batches with status, row counts, and actions</p>
      </div>

      <SectionPanel title={`Import Batches (${batches.length})`}>
        {batches.length === 0 ? (
          <p className="text-xs text-muted-foreground">No imports yet. Upload data from the Data Imports page.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3">Source</th>
                  <th className="pb-2 pr-3">File Name</th>
                  <th className="pb-2 pr-3">Imported At</th>
                  <th className="pb-2 pr-3 text-right">Rows Imported</th>
                  <th className="pb-2 pr-3 text-right">Rows Failed</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Notes</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b border-border/30 hover:bg-accent/30">
                    <td className="py-2 pr-3 font-medium">{b.source || '—'}</td>
                    <td className="py-2 pr-3 text-muted-foreground max-w-32 truncate">{b.file_name || '—'}</td>
                    <td className="py-2 pr-3 text-muted-foreground tabular-nums">{b.imported_at ? new Date(b.imported_at).toLocaleString() : '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-success">{b.rows_imported ?? 'UNKNOWN'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-critical">{b.rows_failed || 0}</td>
                    <td className="py-2 pr-3"><StatusBadge status={b.status} /></td>
                    <td className="py-2 pr-3 text-muted-foreground max-w-40 truncate">{b.notes || '—'}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <button className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="View details"><Eye className="w-3 h-3" /></button>
                        <button className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Download"><Download className="w-3 h-3" /></button>
                        <button onClick={() => deleteBatch(b.id)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-critical" title="Delete batch"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>
    </div>
  );
}