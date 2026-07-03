import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import StatusBadge from '@/components/shared/StatusBadge';
import WarningBanner from '@/components/shared/WarningBanner';
import { formatMoney, moneyColor, getStatusColor } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Shield, Upload, CreditCard } from 'lucide-react';

export default function Payables() {
  const [apEntries, setApEntries] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [xeroInvoices, setXeroInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [aps, supps, xinvs] = await Promise.all([
        base44.entities.APEntry.list('-date', 200),
        base44.entities.Supplier.list(),
        base44.entities.XeroInvoice.filter({ type: 'ACCPAY' }),
      ]);
      setApEntries(aps);
      setSuppliers(supps);
      setXeroInvoices(xinvs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Supplier balances
  const supplierBals = {};
  apEntries.forEach(e => {
    if (!supplierBals[e.supplier_name]) supplierBals[e.supplier_name] = { balance: 0, entries: [] };
    supplierBals[e.supplier_name].balance += (e.amount || 0);
    supplierBals[e.supplier_name].entries.push(e);
  });

  const totalAP = Object.values(supplierBals).reduce((s, v) => s + v.balance, 0);
  const xeroAP = xeroInvoices.reduce((s, i) => s + (i.amount_due || 0), 0);

  // Risk labels
  function getRiskLabel(name, bal) {
    if (name === 'Inbounds Survey' && bal > 50000) return 'Critical';
    if (bal > 20000) return 'High';
    if (bal > 5000) return 'Medium';
    return 'Low';
  }

  const sorted = Object.entries(supplierBals).sort((a, b) => b[1].balance - a[1].balance);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Payables</h1>
        <p className="text-xs text-muted-foreground mt-1">Supplier and media AP, repayment scheduling</p>
      </div>

      <WarningBanner>Accrued supplier payout is not paid supplier payout. Balances below are BOOKED until paid from bank.</WarningBanner>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total AP (Suppliers)" value={totalAP} label="BOOKED" />
        <MetricCard title="Xero AP (Bills)" value={xeroAP} label="BOOKED" />
        <MetricCard title="Combined AP" value={totalAP + xeroAP} label="BOOKED" />
        <MetricCard title="Suppliers" value={sorted.length.toString()} />
      </div>

      {/* Supplier Balances */}
      <SectionPanel title="Supplier Balances" subtitle="From AP entries" actions={
        <Button size="sm" variant="outline" className="text-xs gap-1"><Upload className="w-3.5 h-3.5" /> Import Statement</Button>
      }>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="pb-2 pr-3">Supplier</th>
              <th className="pb-2 pr-3">Risk</th>
              <th className="pb-2 pr-3 text-right">Balance <span className="text-[9px] text-blue-400">BOOKED</span></th>
              <th className="pb-2 pr-3 text-right">Entries</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(([name, data], i) => {
              const risk = getRiskLabel(name, data.balance);
              return (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-2.5 pr-3 font-medium">{name}</td>
                  <td className="py-2.5 pr-3"><StatusBadge status={risk} /></td>
                  <td className={`py-2.5 pr-3 text-right tabular-nums font-medium ${data.balance > 0 ? 'text-warning' : 'text-success'}`}>
                    {formatMoney(data.balance)}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-muted-foreground">{data.entries.length}</td>
                  <td className="py-2.5">
                    <Button variant="ghost" size="sm" className="text-[10px] h-6">
                      <Shield className="w-3 h-3 mr-1" /> Pay
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionPanel>

      {/* Xero Bills */}
      {xeroInvoices.length > 0 && (
        <SectionPanel title="Xero Bills (ACCPAY)" subtitle={`${xeroInvoices.length} bills`}>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3">Invoice #</th>
                <th className="pb-2 pr-3">Contact</th>
                <th className="pb-2 pr-3">Due Date</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3 text-right">Total</th>
                <th className="pb-2 text-right">Amount Due</th>
              </tr>
            </thead>
            <tbody>
              {xeroInvoices.map((inv, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="py-2 pr-3 font-medium">{inv.invoice_number}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{inv.contact_name}</td>
                  <td className="py-2 pr-3 tabular-nums text-muted-foreground">{inv.due_date}</td>
                  <td className="py-2 pr-3"><StatusBadge status={inv.status} /></td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(inv.total)}</td>
                  <td className="py-2 text-right tabular-nums text-warning font-medium">{formatMoney(inv.amount_due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionPanel>
      )}

      {/* AP Entry Ledger */}
      <SectionPanel title="AP Entry Ledger" subtitle={`${apEntries.length} entries`}>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="pb-2 pr-3">Date</th>
              <th className="pb-2 pr-3">Supplier</th>
              <th className="pb-2 pr-3">Type</th>
              <th className="pb-2 pr-3 text-right">Amount</th>
              <th className="pb-2">Ref</th>
            </tr>
          </thead>
          <tbody>
            {apEntries.slice(0, 30).map((e, i) => (
              <tr key={i} className="border-b border-border/30">
                <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{e.date}</td>
                <td className="py-1.5 pr-3">{e.supplier_name}</td>
                <td className="py-1.5 pr-3"><StatusBadge status={e.entry_type} /></td>
                <td className={`py-1.5 pr-3 text-right tabular-nums ${moneyColor(e.amount)}`}>{formatMoney(e.amount)}</td>
                <td className="py-1.5 text-muted-foreground">{e.ref || e.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionPanel>
    </div>
  );
}