import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import CashBookedPill from '@/components/shared/CashBookedPill';
import { formatMoney, formatPercent, moneyColor } from '@/lib/formatters';
import { Sparkles, TrendingDown, AlertTriangle, Lightbulb, Shield } from 'lucide-react';

export default function CreativeIntelligence() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await base44.entities.CreativeInsight.list(undefined, 500);
      setInsights(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const winners = useMemo(() => insights.filter(i => i.verdict === 'Winner').sort((a, b) => b.margin - a.margin), [insights]);
  const fatiguing = useMemo(() => insights.filter(i => i.verdict === 'Fatiguing' || i.fatigue_score > 6), [insights]);
  const highCtrLowQuality = useMemo(() => insights.filter(i => i.ctr > 1.5 && i.quality_score < 5), [insights]);
  const lowCtrHighValue = useMemo(() => insights.filter(i => i.ctr < 1.0 && i.revenue > 2000 && i.margin > 0), [insights]);
  const testIdeas = useMemo(() => insights.filter(i => i.next_test_idea), [insights]);
  const complianceRisk = useMemo(() => insights.filter(i => i.verdict === 'Kill' || i.dq_rate > 0.3), [insights]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Creative Intelligence</h1>
        <p className="text-xs text-muted-foreground mt-1">Which hooks, angles, and creatives produce profitable, high-quality leads</p>
      </div>

      {/* Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Winners */}
        <SectionPanel title="Winning Hooks & Creatives" subtitle={`${winners.length} winners`} actions={<Sparkles className="w-4 h-4 text-emerald-400" />}>
          {winners.length === 0 ? <Empty msg="No winners yet" /> : (
            <div className="space-y-2">
              {winners.map((c, i) => (
                <CreativeRow key={i} c={c} highlight="emerald" />
              ))}
            </div>
          )}
        </SectionPanel>

        {/* Fatiguing */}
        <SectionPanel title="Fatiguing Creatives" subtitle={`${fatiguing.length} fatiguing`} actions={<TrendingDown className="w-4 h-4 text-orange-400" />}>
          {fatiguing.length === 0 ? <Empty msg="No fatiguing creatives" /> : (
            <div className="space-y-2">
              {fatiguing.map((c, i) => (
                <CreativeRow key={i} c={c} highlight="orange" />
              ))}
            </div>
          )}
        </SectionPanel>

        {/* High CTR, Low Quality */}
        <SectionPanel title="High CTR but Low Lead Quality" subtitle={`${highCtrLowQuality.length} flagged`} actions={<AlertTriangle className="w-4 h-4 text-yellow-400" />}>
          {highCtrLowQuality.length === 0 ? <Empty msg="None detected" /> : (
            <div className="space-y-2">
              {highCtrLowQuality.map((c, i) => (
                <CreativeRow key={i} c={c} highlight="yellow" />
              ))}
            </div>
          )}
        </SectionPanel>

        {/* Low CTR, High Value */}
        <SectionPanel title="Low CTR but High Buyer Value" subtitle={`${lowCtrHighValue.length} hidden gems`} actions={<Lightbulb className="w-4 h-4 text-blue-400" />}>
          {lowCtrHighValue.length === 0 ? <Empty msg="None found" /> : (
            <div className="space-y-2">
              {lowCtrHighValue.map((c, i) => (
                <CreativeRow key={i} c={c} highlight="blue" />
              ))}
            </div>
          )}
        </SectionPanel>
      </div>

      {/* Creative Ideas to Test */}
      <SectionPanel title="Creative Ideas to Test Next" subtitle={`${testIdeas.length} ideas`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {testIdeas.map((c, i) => (
            <div key={i} className="p-3 rounded border border-border" style={{ background: '#1A1E24' }}>
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                <span className="text-xs font-medium truncate">{c.creative_name}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">Hook: {c.hook} · Angle: {c.angle}</p>
              <p className="text-[11px] text-foreground"><span className="text-yellow-400 font-medium">Test:</span> {c.next_test_idea}</p>
            </div>
          ))}
        </div>
      </SectionPanel>

      {/* Compliance Risk */}
      {complianceRisk.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <Shield className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-red-300 font-medium">{complianceRisk.length} creatives with compliance or quality risk</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">High DQ rate or Kill verdict — review landing page and ad claims for compliance.</p>
          </div>
        </div>
      )}

      {/* Full Creative Table */}
      <SectionPanel title="All Creatives" subtitle={`${insights.length} creatives`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-2">Creative</th>
                <th className="pb-2 pr-2">Hook</th>
                <th className="pb-2 pr-2">Angle</th>
                <th className="pb-2 pr-2">Type</th>
                <th className="pb-2 pr-2 text-right">Spend</th>
                <th className="pb-2 pr-2 text-right">CTR</th>
                <th className="pb-2 pr-2 text-right">CPL</th>
                <th className="pb-2 pr-2 text-right">Leads</th>
                <th className="pb-2 pr-2 text-right">Sold</th>
                <th className="pb-2 pr-2 text-right">DQ%</th>
                <th className="pb-2 pr-2 text-right">Ret%</th>
                <th className="pb-2 pr-2 text-right">Call Rev</th>
                <th className="pb-2 pr-2 text-right">Revenue</th>
                <th className="pb-2 pr-2 text-right">Margin</th>
                <th className="pb-2 pr-2 text-right">Qual</th>
                <th className="pb-2 pr-2 text-right">Fatigue</th>
                <th className="pb-2 pr-2">Verdict</th>
                <th className="pb-2">Next Test</th>
              </tr>
            </thead>
            <tbody>
              {insights.map((c, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-1.5 pr-2 font-medium max-w-32 truncate">{c.creative_name}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground max-w-28 truncate">{c.hook || '—'}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground max-w-24 truncate">{c.angle || '—'}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground">{c.creative_type}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-orange-400">{formatMoney(c.spend)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatPercent(c.ctr * 100)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(c.cpl)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{c.leads}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-emerald-400">{c.sold_leads}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-red-400">{formatPercent(c.dq_rate * 100)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatPercent(c.return_rate * 100)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{c.call_revenue > 0 ? formatMoney(c.call_revenue) : <span className="text-red-400/50">—</span>}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(c.revenue)}</td>
                  <td className={`py-1.5 pr-2 text-right tabular-nums font-bold ${moneyColor(c.margin)}`}>{formatMoney(c.margin)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{c.quality_score.toFixed(1)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    <span className={c.fatigue_score > 7 ? 'text-red-400' : c.fatigue_score > 4 ? 'text-yellow-400' : 'text-emerald-400'}>
                      {c.fatigue_score.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2"><StatusBadge status={c.verdict} /></td>
                  <td className="py-1.5 text-[10px] text-muted-foreground max-w-32 truncate">{c.next_test_idea || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
}

function CreativeRow({ c, highlight }) {
  const borders = {
    emerald: 'border-l-emerald-500',
    orange: 'border-l-orange-500',
    yellow: 'border-l-yellow-500',
    blue: 'border-l-blue-500',
  };
  return (
    <div className={`p-3 rounded border border-border border-l-2 ${borders[highlight] || ''}`} style={{ background: '#1A1E24' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium truncate flex-1">{c.creative_name}</span>
        <StatusBadge status={c.verdict} />
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">Hook: {c.hook} · Angle: {c.angle}</p>
      <div className="flex items-center gap-4 text-[11px]">
        <span className="text-muted-foreground">Spend: <span className="text-orange-400 tabular-nums">{formatMoney(c.spend)}</span></span>
        <span className="text-muted-foreground">Leads: <span className="tabular-nums">{c.leads}</span></span>
        <span className="text-muted-foreground">Margin: <span className={`tabular-nums font-medium ${moneyColor(c.margin)}`}>{formatMoney(c.margin)}</span></span>
        <span className="text-muted-foreground">Qual: <span className="tabular-nums">{c.quality_score.toFixed(1)}</span></span>
      </div>
      {c.insight_summary && <p className="text-[10px] text-muted-foreground mt-2 italic">{c.insight_summary}</p>}
    </div>
  );
}

function Empty({ msg }) {
  return <p className="text-xs text-muted-foreground">{msg}</p>;
}