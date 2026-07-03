import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import StatusBadge from '@/components/shared/StatusBadge';
import WarningBanner from '@/components/shared/WarningBanner';
import { formatMoney, moneyColor } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { FileText, PhoneCall, Check, Link2 } from 'lucide-react';

export default function Receivables() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [invs, pmts, byrs] = await Promise.all([
        base44.entities.ARInvoice.list('-due_date', 100),
        base44.entities.ARPayment.list('-payment_date', 100),
        base44.entities.Buyer.list(),
      ]);
      setInvoices(invs);
      setPayments(pmts);
      setBuyers(byrs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const totalBooked = invoices.reduce((s, i) => s + (i.booked_amount || 0), 0);
  const totalCollected = invoices.reduce((s, i) => s + (i.collected_amount || 0), 0);
  const totalOutstanding = invoices.filter(i => !['Paid', 'Draft'].includes(i.status)).reduce((s, i) => s + (i.outstanding_amount || 0), 0);
  const overdue = invoices.filter(i => i.status === 'Overdue');

  // Buyer summary
  const buyerSummary = {};
  invoices.forEach(inv => {
    const b = inv.buyer_name;
    if (!buyerSummary[b]) buyerSummary[b] = { booked: 0, collected: 0, outstanding: 0, current: 0, d30: 0, d60: 0, d60plus: 0 };
    buyerSummary[b].booked += (inv.booked_amount || 0);
    buyerSummary[b].collected += (inv.collected_amount || 0);
    if (!['Paid', 'Draft'].includes(inv.status)) {
      buyerSummary[b].outstanding += (inv.outstanding_amount || 0);
      if (inv.due_date) {
        const days = Math.floor((new Date() - new Date(inv.due_date)) / 86400000);
        if (days <= 0) buyerSummary[b].current += (inv.outstanding_amount || 0);
        else if (days <= 30) buyerSummary[b].d30 += (inv.outstanding_amount || 0);
        else if (days <= 60) buyerSummary[b].d60 += (inv.outstanding_amount || 0);
        else buyerSummary[b].d60plus += (inv.outstanding_amount || 0);
      }
    }
  });

  // Top debtor
  const topDebtor = Object.entries(buyerSummary).sort((a, b) => b[1].outstanding - a[1].outstanding)[0];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Receivables</h1>
        <p className="text-xs text-muted-foreground mt-1">Buyer AR, invoicing, payment matching</p>
      </div>

      <WarningBanner>Booked revenue is not collected cash. Outstanding amounts below are BOOKED until matched to bank deposits.</WarningBanner>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Booked" value={totalBooked} label="BOOKED" />
        <MetricCard title="Total Collected" value={totalCollected} label="CASH" />
        <MetricCard title="Outstanding" value={totalOutstanding} label="BOOKED" />
        <MetricCard title="Overdue Invoices" value={overdue.length.toString()} sublabel={overdue.length > 0 ? `${formatMoney(overdue.reduce((s, i) => s + (i.outstanding_amount || 0), 0))} at risk` : 'None'} />
      </div>

      {/* Top Debtor */}
      {topDebtor && topDebtor[1].outstanding > 0 && (
        <SectionPanel title="Top Debtor" subtitle="Highest outstanding balance">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{topDebtor[0]}</p>
              <p className="text-xs text-muted-foreground">Outstanding: <span className="text-red-400 font-medium">{formatMoney(topDebtor[1].outstanding)}</span></p>
            </div>
            <Button size="sm" className="text-xs gap-1 bg-[#E4262C] hover:bg-[#E4262C]/80">
              <PhoneCall className="w-3.5 h-3.5" /> Chase
            </Button>
          </div>
        </SectionPanel>
      )}

      {/* Buyer Table */}
      <SectionPanel title="Buyer AR Summary" subtitle="Aging buckets">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="pb-2 pr-3">Buyer</th>
              <th className="pb-2 pr-3 text-right">Booked <span className="text-[9px] text-blue-400">BOOKED</span></th>
              <th className="pb-2 pr-3 text-right">Collected <span className="text-[9px] text-emerald-400">CASH</span></th>
              <th className="pb-2 pr-3 text-right">Outstanding</th>
              <th className="pb-2 pr-3 text-right">Current</th>
              <th className="pb-2 pr-3 text-right">1-30d</th>
              <th className="pb-2 pr-3 text-right">31-60d</th>
              <th className="pb-2 text-right">61+d</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(buyerSummary).sort((a, b) => b[1].outstanding - a[1].outstanding).map(([buyer, data], i) => (
              <tr key={i} className="border-b border-border/30">
                <td className="py-2 pr-3 font-medium">{buyer}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(data.booked)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{formatMoney(data.collected)}</td>
                <td className={`py-2 pr-3 text-right tabular-nums font-medium ${data.outstanding > 0 ? 'text-red-400' : ''}`}>{formatMoney(data.outstanding)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(data.current)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-yellow-400">{data.d30 > 0 ? formatMoney(data.d30) : '—'}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-orange-400">{data.d60 > 0 ? formatMoney(data.d60) : '—'}</td>
                <td className="py-2 text-right tabular-nums text-red-400">{data.d60plus > 0 ? formatMoney(data.d60plus) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionPanel>

      {/* Invoice Table */}
      <SectionPanel title="Invoices" subtitle={`${invoices.length} invoices`} actions={
        <Button size="sm" variant="outline" className="text-xs gap-1"><FileText className="w-3.5 h-3.5" /> Generate Invoice</Button>
      }>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="pb-2 pr-3">Invoice #</th>
              <th className="pb-2 pr-3">Buyer</th>
              <th className="pb-2 pr-3">Period</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2 pr-3">Due</th>
              <th className="pb-2 pr-3 text-right">Booked</th>
              <th className="pb-2 pr-3 text-right">Collected</th>
              <th className="pb-2 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                <td className="py-2 pr-3 font-medium">{inv.invoice_number}</td>
                <td className="py-2 pr-3">{inv.buyer_name}</td>
                <td className="py-2 pr-3 text-muted-foreground tabular-nums">{inv.period_start} – {inv.period_end}</td>
                <td className="py-2 pr-3"><StatusBadge status={inv.status} /></td>
                <td className="py-2 pr-3 tabular-nums text-muted-foreground">{inv.due_date}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(inv.booked_amount)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{formatMoney(inv.collected_amount)}</td>
                <td className={`py-2 text-right tabular-nums font-medium ${moneyColor(-(inv.outstanding_amount || 0))}`}>
                  {formatMoney(inv.outstanding_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionPanel>
    </div>
  );
}