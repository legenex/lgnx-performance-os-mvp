import React from 'react';
import { X, TrendingUp, Phone, DollarSign, ArrowRight, AlertTriangle } from 'lucide-react';
import CashBookedPill from '@/components/shared/CashBookedPill';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatMoney, formatPercent, moneyColor, formatNumber } from '@/lib/formatters';

export default function AdDetailDrawer({ row, onClose }) {
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xl h-full overflow-y-auto border-l border-border" style={{ background: '#1a1d21' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border" style={{ background: '#1a1d21' }}>
          <div>
            <h2 className="text-sm font-bold text-foreground">{row.campaign_name}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {row.platform} · {row.adset_name || '—'} · {row.ad_name || '—'}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-5">
          {/* Decision */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border" style={{ background: '#14171C' }}>
            <StatusBadge status={row.decision || 'UNKNOWN'} size="md" />
            <span className="text-xs text-muted-foreground flex-1">{row.decision_reason || 'No reason recorded'}</span>
          </div>

          {/* Data Quality */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Data Quality</h3>
            <div className="flex items-center gap-2">
              <StatusBadge status={row.data_quality || 'Incomplete'} />
              {row.data_quality !== 'Complete' && (
                <span className="text-[10px] text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Missing data — do not treat unknowns as zero
                </span>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Financial Truth</h3>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Spend Tracked" value={formatMoney(row.spend_tracked)} pill="BOOKED" />
              <Metric label="Spend Paid" value={formatMoney(row.spend_paid)} pill="CASH" />
              <Metric label="Booked Revenue" value={formatMoney(row.total_booked_revenue)} pill="BOOKED" />
              <Metric label="Cash Collected" value={row.buyer_collected_cash != null ? formatMoney(row.buyer_collected_cash) : 'UNKNOWN'} pill="CASH" />
              <Metric label="Web Lead Revenue" value={formatMoney(row.web_lead_revenue)} pill="BOOKED" />
              <Metric label="Call Revenue" value={row.call_revenue != null && row.call_count > 0 ? formatMoney(row.call_revenue) : <span className="text-red-400/60">MISSING</span>} pill="BOOKED" />
              <Metric label="Supplier Accrued" value={formatMoney(row.supplier_payout_accrued)} pill="BOOKED" />
              <Metric label="Supplier Paid" value={formatMoney(row.supplier_payout_paid)} pill="CASH" />
              <Metric label="True Gross Margin" value={formatMoney(row.true_gross_margin)} color={moneyColor(row.true_gross_margin)} />
              <Metric label="Cash Margin" value={row.buyer_collected_cash != null ? formatMoney(row.cash_margin) : <span className="text-red-400/60">UNKNOWN</span>} color={moneyColor(row.cash_margin)} />
              <Metric label="Booked ROAS" value={row.booked_roas ? `${row.booked_roas.toFixed(2)}x` : '—'} />
              <Metric label="Cash ROAS" value={row.cash_roas ? `${row.cash_roas.toFixed(2)}x` : <span className="text-red-400/60">UNKNOWN</span>} />
            </div>
          </div>

          {/* Lead Quality */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Lead Quality</h3>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Web Leads" value={formatNumber(row.web_lead_count)} />
              <Metric label="Sold Leads" value={formatNumber(row.sold_leads)} />
              <Metric label="DQ Leads" value={formatNumber(row.dq_leads)} />
              <Metric label="Returned" value={formatNumber(row.returned_leads)} />
              <Metric label="DQ Rate" value={formatPercent(row.dq_rate * 100)} />
              <Metric label="Return Rate" value={formatPercent(row.return_rate * 100)} />
              <Metric label="Buyer Conv." value={formatPercent(row.buyer_conversion_rate * 100)} />
              <Metric label="Quality Score" value={`${(row.lead_quality_score || 0).toFixed(1)}/10`} />
            </div>
          </div>

          {/* Calls */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <Phone className="w-3 h-3" /> Call Data
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Call Count" value={row.call_count > 0 ? formatNumber(row.call_count) : <span className="text-red-400/60">MISSING</span>} />
              <Metric label="Converted Calls" value={row.converted_calls > 0 ? formatNumber(row.converted_calls) : <span className="text-red-400/60">—</span>} />
            </div>
          </div>

          {/* Recommended Action */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Recommended Action</h3>
            <div className="p-3 rounded-lg border border-border" style={{ background: '#14171C' }}>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-[#E4262C] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-foreground">{getRecommendedAction(row)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, pill, color }) {
  return (
    <div className="p-2.5 rounded border border-border" style={{ background: '#14171C' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        {pill && <CashBookedPill type={pill} />}
      </div>
      <div className={`text-sm font-semibold tabular-nums ${color || 'text-foreground'}`}>{value}</div>
    </div>
  );
}

function getRecommendedAction(row) {
  if (row.decision === 'SCALE') return 'Scale budget. This campaign is producing positive true margin with acceptable lead quality and cash signal. Increase spend 20-30%.';
  if (row.decision === 'CUT') return 'Cut immediately. Negative true margin after sufficient spend or poor buyer feedback. Reallocate budget to SCALE campaigns.';
  if (row.decision === 'WATCH') return 'Watch. Booked margin positive but cash signal unclear, calls missing, or buyer feedback incomplete. Do not scale until data is complete.';
  if (row.decision === 'HOLD') return 'Hold spend. Data incomplete or conflicting. Verify call tracking and buyer feedback before making changes.';
  return 'UNKNOWN. Missing spend, calls, or lead mapping. Import data before making any decision.';
}