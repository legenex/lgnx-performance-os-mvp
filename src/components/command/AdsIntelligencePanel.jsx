import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, TrendingUp, TrendingDown, Scissors, Rocket, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor } from '@/lib/formatters';

export default function AdsIntelligencePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [truthMetrics, adAlerts, adSpend, bankTxns] = await Promise.all([
        base44.entities.CampaignTruthMetric.list(undefined, 500),
        base44.entities.AdAlert.filter({ status: 'Open' }),
        base44.entities.AdSpend.list(undefined, 500),
        base44.entities.BankTransaction.list(undefined, 500),
      ]);

      const toCut = truthMetrics.filter(t => t.decision === 'CUT');
      const toScale = truthMetrics.filter(t => t.decision === 'SCALE');
      const criticalAlerts = adAlerts.filter(a => a.severity === 'Critical' || a.severity === 'High');

      // Spend gap this month
      const now = new Date();
      const monthPrefix = now.toISOString().substring(0, 7);
      const trackedThisMonth = adSpend
        .filter(a => !a.superseded && a.date && a.date.startsWith(monthPrefix))
        .reduce((s, a) => s + (a.cost || 0), 0);
      const paidThisMonth = bankTxns
        .filter(t => t.cash_type === 'Media Spend' && t.date && t.date.startsWith(monthPrefix))
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      const spendGap = trackedThisMonth - paidThisMonth;

      // Booked profit but negative cash margin
      const bookedPositiveCashNegative = truthMetrics.filter(t =>
        t.true_gross_margin > 0 && t.cash_margin < 0
      );

      // Missing call revenue
      const missingCalls = truthMetrics.filter(t =>
        t.data_quality === 'Missing Calls' || (t.call_count === 0 && t.spend_tracked > 0)
      );

      setData({
        toCut: toCut.length,
        toScale: toScale.length,
        criticalAlerts,
        spendGap,
        bookedPositiveCashNegative: bookedPositiveCashNegative.length,
        missingCalls: missingCalls.length,
        cutRows: toCut.slice(0, 3),
        scaleRows: toScale.slice(0, 3),
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="rounded-lg border border-border p-4 animate-pulse" style={{ background: '#14171C', height: '200px' }} />;

  if (!data) return null;

  return (
    <div className="rounded-lg border border-border p-4" style={{ background: '#14171C' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ads Intelligence</h3>
        <Link to="/smart-ad-reporting" className="text-[10px] text-[#E4262C] hover:underline">View all →</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <StatCard label="Campaigns to Cut" value={data.toCut} icon={Scissors} color="text-red-400" />
        <StatCard label="Campaigns to Scale" value={data.toScale} icon={Rocket} color="text-emerald-400" />
        <StatCard label="Active Ad Alerts" value={data.criticalAlerts.length} icon={AlertTriangle} color="text-yellow-400" />
        <StatCard label="Spend Gap (Month)" value={formatMoney(data.spendGap)} icon={DollarSign} color={data.spendGap > 2000 ? 'text-red-400' : 'text-muted-foreground'} />
        <StatCard label="Booked+ / Cash−" value={data.bookedPositiveCashNegative} icon={TrendingDown} color="text-orange-400" />
        <StatCard label="Missing Call Rev" value={data.missingCalls} icon={AlertTriangle} color="text-red-400" />
      </div>

      {/* Critical Ad Alerts */}
      {data.criticalAlerts.length > 0 && (
        <div className="space-y-1.5">
          {data.criticalAlerts.slice(0, 3).map((a, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded" style={{ background: '#1A1E24' }}>
              <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${a.severity === 'Critical' ? 'text-red-400' : 'text-orange-400'}`} />
              <div className="flex-1">
                <p className="text-[11px] text-foreground">{a.message}</p>
                {a.recommended_action && <p className="text-[10px] text-muted-foreground mt-0.5">→ {a.recommended_action}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="p-2.5 rounded border border-border" style={{ background: '#0F1115' }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}