import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatMoney, moneyColor, formatNumber } from '@/lib/formatters';
import { Download, UserPlus, CheckSquare, FileText, Edit3 } from 'lucide-react';

export default function CutWatchScaleQueue() {
  const [truthMetrics, setTruthMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await base44.entities.CampaignTruthMetric.list(undefined, 500);
      setTruthMetrics(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Aggregate by campaign
  const queue = useMemo(() => {
    const groups = {};
    truthMetrics.forEach(t => {
      const key = `${t.campaign_name}|${t.adset_name || ''}|${t.ad_name || ''}`;
      if (!groups[key]) groups[key] = {
        campaign_name: t.campaign_name,
        adset_name: t.adset_name,
        ad_name: t.ad_name,
        platform: t.platform,
        buyer_name: t.buyer_name,
        supplier_sid: t.supplier_sid,
        spend_tracked: 0, true_gross_margin: 0, cash_margin: 0,
        dq_rate: 0, return_rate: 0, lead_quality_score: 0,
        data_quality: t.data_quality,
        decision: t.decision,
        decision_reason: t.decision_reason,
        row_count: 0,
        has_cash: false,
      };
      const g = groups[key];
      g.spend_tracked += t.spend_tracked || 0;
      g.true_gross_margin += t.true_gross_margin || 0;
      g.cash_margin += t.cash_margin || 0;
      g.dq_rate = Math.max(g.dq_rate, t.dq_rate || 0);
      g.return_rate = Math.max(g.return_rate, t.return_rate || 0);
      g.lead_quality_score = Math.max(g.lead_quality_score, t.lead_quality_score || 0);
      if (t.buyer_collected_cash > 0) g.has_cash = true;
      g.row_count++;
    });

    return Object.values(groups).filter(g => g.decision && g.decision !== 'UNKNOWN').map(g => {
      const financialImpact = g.true_gross_margin;
      const risk = g.decision === 'CUT' ? 'Low (cut stops bleed)' : g.decision === 'SCALE' ? 'Medium (scale risk)' : 'Low';
      return { ...g, financialImpact, risk };
    }).sort((a, b) => {
      const order = { CUT: 0, SCALE: 1, WATCH: 2, HOLD: 3 };
      return (order[a.decision] || 9) - (order[b.decision] || 9);
    });
  }, [truthMetrics]);

  const cutCount = queue.filter(q => q.decision === 'CUT').length;
  const scaleCount = queue.filter(q => q.decision === 'SCALE').length;
  const watchCount = queue.filter(q => q.decision === 'WATCH').length;

  function overrideDecision(row, newDecision) {
    setOverrides(prev => ({ ...prev, [`${row.campaign_name}|${row.adset_name}|${row.ad_name}`]: newDecision }));
  }

  function exportCSV() {
    const headers = ['Campaign', 'Ad Set', 'Ad', 'Platform', 'Decision', 'Reason', 'Spend', 'True Margin', 'Cash Margin', 'DQ Rate', 'Return Rate', 'Quality Score', 'Risk', 'Data Quality'];
    const rows = queue.map(q => [
      q.campaign_name, q.adset_name || '', q.ad_name || '', q.platform,
      overrides[`${q.campaign_name}|${q.adset_name}|${q.ad_name}`] || q.decision,
      q.decision_reason || '', q.spend_tracked, q.true_gross_margin, q.cash_margin,
      q.dq_rate, q.return_rate, q.lead_quality_score, q.risk, q.data_quality
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cut-watch-scale-queue.csv';
    a.click();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Cut / Watch / Scale Queue</h1>
        <p className="text-xs text-muted-foreground mt-1">Action list for Nick and the media buyer</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-red-500/20 p-4" style={{ background: '#14171C' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">To Cut</span>
            <span className="text-2xl font-bold text-critical tabular-nums">{cutCount}</span>
          </div>
        </div>
        <div className="rounded-lg border border-yellow-500/20 p-4" style={{ background: '#14171C' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">To Watch</span>
            <span className="text-2xl font-bold text-warning tabular-nums">{watchCount}</span>
          </div>
        </div>
        <div className="rounded-lg border border-emerald-500/20 p-4" style={{ background: '#14171C' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">To Scale</span>
            <span className="text-2xl font-bold text-success tabular-nums">{scaleCount}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={exportCSV}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      {/* Queue Table */}
      <SectionPanel title="Action Queue" subtitle={`${queue.length} items`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-2">Campaign / Ad Set / Ad</th>
                <th className="pb-2 pr-2">Decision</th>
                <th className="pb-2 pr-2">Reason</th>
                <th className="pb-2 pr-2 text-right">Financial Impact</th>
                <th className="pb-2 pr-2">Risk</th>
                <th className="pb-2 pr-2">Data</th>
                <th className="pb-2 pr-2">Owner</th>
                <th className="pb-2 pr-2">Due</th>
                <th className="pb-2 pr-2">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((r, i) => {
                const key = `${r.campaign_name}|${r.adset_name}|${r.ad_name}`;
                const currentDecision = overrides[key] || r.decision;
                return (
                  <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                    <td className="py-2 pr-2">
                      <div className="font-medium text-xs">{r.campaign_name}</div>
                      <div className="text-[10px] text-muted-foreground">{r.adset_name || '—'} / {r.ad_name || '—'}</div>
                    </td>
                    <td className="py-2 pr-2"><StatusBadge status={currentDecision} /></td>
                    <td className="py-2 pr-2 text-[10px] text-muted-foreground max-w-48">{r.decision_reason || '—'}</td>
                    <td className={`py-2 pr-2 text-right tabular-nums font-bold ${moneyColor(r.financialImpact)}`}>{formatMoney(r.financialImpact)}</td>
                    <td className="py-2 pr-2 text-[10px] text-muted-foreground">{r.risk}</td>
                    <td className="py-2 pr-2"><StatusBadge status={r.data_quality} /></td>
                    <td className="py-2 pr-2">
                      <select className="bg-secondary text-[10px] rounded px-1 py-0.5 border border-border">
                        <option value="">Unassigned</option>
                        <option value="Nick">Nick</option>
                        <option value="Media Buyer">Media Buyer</option>
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input type="date" className="bg-secondary text-[10px] rounded px-1 py-0.5 border border-border" />
                    </td>
                    <td className="py-2 pr-2">
                      <select className="bg-secondary text-[10px] rounded px-1 py-0.5 border border-border">
                        <option value="open">Open</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" title="Mark reviewed"><CheckSquare className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" title="Assign"><UserPlus className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" title="Create task"><FileText className="w-3 h-3" /></Button>
                        <select
                          className="bg-secondary text-[9px] rounded px-1 py-0.5 border border-border"
                          value=""
                          onChange={e => { if (e.target.value) overrideDecision(r, e.target.value); }}
                          title="Override decision"
                        >
                          <option value="">Override</option>
                          <option value="SCALE">→ SCALE</option>
                          <option value="WATCH">→ WATCH</option>
                          <option value="CUT">→ CUT</option>
                          <option value="HOLD">→ HOLD</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Decision Rules */}
      <SectionPanel title="Decision Rules" subtitle="Automatic SCALE / WATCH / CUT logic">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded border border-emerald-500/20" style={{ background: '#1A1E24' }}>
            <p className="font-semibold text-success mb-1">SCALE when</p>
            <ul className="text-muted-foreground space-y-0.5 text-[11px]">
              <li>• Positive true gross margin</li>
              <li>• Positive or improving cash margin</li>
              <li>• Acceptable DQ and return rate</li>
              <li>• Calls included or not material</li>
              <li>• Buyer feedback acceptable</li>
            </ul>
          </div>
          <div className="p-3 rounded border border-yellow-500/20" style={{ background: '#1A1E24' }}>
            <p className="font-semibold text-warning mb-1">WATCH when</p>
            <ul className="text-muted-foreground space-y-0.5 text-[11px]">
              <li>• Booked margin positive but cash unclear</li>
              <li>• Calls missing</li>
              <li>• Buyer feedback missing</li>
              <li>• Spend too low for confidence</li>
              <li>• Early positive trend</li>
            </ul>
          </div>
          <div className="p-3 rounded border border-red-500/20" style={{ background: '#1A1E24' }}>
            <p className="font-semibold text-critical mb-1">CUT when</p>
            <ul className="text-muted-foreground space-y-0.5 text-[11px]">
              <li>• Negative true margin after enough spend</li>
              <li>• High DQ / fake / return rate</li>
              <li>• Buyer feedback poor</li>
              <li>• Spend gap or tracking broken</li>
              <li>• Cash margin strongly negative</li>
            </ul>
          </div>
          <div className="p-3 rounded border border-border" style={{ background: '#1A1E24' }}>
            <p className="font-semibold text-muted-foreground mb-1">UNKNOWN when</p>
            <ul className="text-muted-foreground space-y-0.5 text-[11px]">
              <li>• Spend, calls, or lead mapping missing</li>
              <li>• Cannot make any confident decision</li>
              <li>• Import data before acting</li>
            </ul>
          </div>
        </div>
      </SectionPanel>
    </div>
  );
}