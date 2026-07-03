import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import WarningBanner from '@/components/shared/WarningBanner';
import { formatMoney, moneyColor } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Upload, Link2, Users, FileText, CreditCard, Landmark, AlertTriangle } from 'lucide-react';

export default function XeroPage() {
  const [connection, setConnection] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bankTxns, setBankTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [conns, ctcs, invs, pmts, btxns] = await Promise.all([
        base44.entities.XeroConnection.list(undefined, 1),
        base44.entities.XeroContact.list(),
        base44.entities.XeroInvoice.list('-issue_date', 100),
        base44.entities.XeroPayment.list('-date', 100),
        base44.entities.XeroBankTransaction.list('-date', 100),
      ]);
      setConnection(conns[0] || null);
      setContacts(ctcs);
      setInvoices(invs);
      setPayments(pmts);
      setBankTxns(btxns);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const accrec = invoices.filter(i => i.type === 'ACCREC');
  const accpay = invoices.filter(i => i.type === 'ACCPAY');
  const arTotal = accrec.reduce((s, i) => s + (i.amount_due || 0), 0);
  const apTotal = accpay.reduce((s, i) => s + (i.amount_due || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Xero Integration</h1>
        <p className="text-xs text-muted-foreground mt-1">Accounting data sync and CSV fallback imports</p>
      </div>

      {/* Connection Card */}
      <SectionPanel title="Xero Connection" actions={
        <Button size="sm" className="text-xs gap-1 bg-[#13B5EA] hover:bg-[#13B5EA]/80">
          <Link2 className="w-3.5 h-3.5" /> Connect to Xero
        </Button>
      }>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#13B5EA]/10 flex items-center justify-center">
            <span className="text-[#13B5EA] font-bold text-lg">X</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{connection?.tenant_name || 'Not Connected'}</span>
              <StatusBadge status={connection?.connection_status || 'Not Connected'} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {connection?.last_synced_at ? `Last synced: ${new Date(connection.last_synced_at).toLocaleString()}` : 'No sync history'}
            </p>
          </div>
        </div>
        {!connection || connection.connection_status !== 'Connected' ? (
          <WarningBanner type="warning">
            Xero is not connected. Use CSV fallback imports below, or configure OAuth in Settings to enable live sync.
          </WarningBanner>
        ) : null}
      </SectionPanel>

      {/* Sync Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: 'Contacts', icon: Users, count: contacts.length },
          { label: 'Invoices (AR)', icon: FileText, count: accrec.length },
          { label: 'Bills (AP)', icon: CreditCard, count: accpay.length },
          { label: 'Payments', icon: Landmark, count: payments.length },
          { label: 'Bank Txns', icon: Landmark, count: bankTxns.length },
          { label: 'Chart of Accounts', icon: FileText, count: 0 },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="rounded-lg border border-border p-3 text-center" style={{ background: '#14171C' }}>
              <Icon className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-[11px] font-medium">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.count} records</p>
              <Button variant="outline" size="sm" className="mt-2 text-[10px] h-6 w-full gap-1">
                <RefreshCw className="w-3 h-3" /> Sync
              </Button>
            </div>
          );
        })}
      </div>

      {/* Xero Data Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList className="bg-secondary">
          <TabsTrigger value="invoices" className="text-xs">Invoices (ACCREC)</TabsTrigger>
          <TabsTrigger value="bills" className="text-xs">Bills (ACCPAY)</TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs">Contact Mapping</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
          <TabsTrigger value="csv" className="text-xs">CSV Fallback</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <SectionPanel title={`Receivable Invoices · AR Total: ${formatMoney(arTotal)}`} subtitle={`${accrec.length} invoices`}>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3">Invoice #</th>
                  <th className="pb-2 pr-3">Contact</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Issue Date</th>
                  <th className="pb-2 pr-3">Due Date</th>
                  <th className="pb-2 pr-3 text-right">Total</th>
                  <th className="pb-2 pr-3 text-right">Due</th>
                  <th className="pb-2 text-right">Paid</th>
                </tr>
              </thead>
              <tbody>
                {accrec.map((inv, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2 pr-3 font-medium">{inv.invoice_number}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{inv.contact_name}</td>
                    <td className="py-2 pr-3"><StatusBadge status={inv.status} /></td>
                    <td className="py-2 pr-3 text-muted-foreground tabular-nums">{inv.issue_date}</td>
                    <td className="py-2 pr-3 text-muted-foreground tabular-nums">{inv.due_date}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(inv.total)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums font-medium ${moneyColor(inv.amount_due > 0 ? -1 : 0)}`}>
                      {formatMoney(inv.amount_due)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-emerald-400">{formatMoney(inv.amount_paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionPanel>
        </TabsContent>

        <TabsContent value="bills">
          <SectionPanel title={`Payable Bills · AP Total: ${formatMoney(apTotal)}`} subtitle={`${accpay.length} bills`}>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3">Invoice #</th>
                  <th className="pb-2 pr-3">Contact</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Due Date</th>
                  <th className="pb-2 pr-3 text-right">Total</th>
                  <th className="pb-2 text-right">Due</th>
                </tr>
              </thead>
              <tbody>
                {accpay.map((inv, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2 pr-3 font-medium">{inv.invoice_number}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{inv.contact_name}</td>
                    <td className="py-2 pr-3"><StatusBadge status={inv.status} /></td>
                    <td className="py-2 pr-3 text-muted-foreground tabular-nums">{inv.due_date}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(inv.total)}</td>
                    <td className="py-2 text-right tabular-nums text-orange-400 font-medium">{formatMoney(inv.amount_due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionPanel>
        </TabsContent>

        <TabsContent value="contacts">
          <SectionPanel title="Xero Contact Mapping" subtitle="Map contacts to Buyers or Suppliers">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Email</th>
                  <th className="pb-2 pr-3">Type</th>
                  <th className="pb-2 pr-3">Mapped To</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2 pr-3 font-medium">{c.name}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.email}</td>
                    <td className="py-2 pr-3"><StatusBadge status={c.type} /></td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.mapped_buyer_id || c.mapped_supplier_id || 'Unmapped'}</td>
                    <td className="py-2">{c.status}</td>
                  </tr>
                ))}
                {contacts.length === 0 && <tr><td colSpan={5} className="py-4 text-muted-foreground text-center">No contacts imported. Use CSV fallback or sync from Xero.</td></tr>}
              </tbody>
            </table>
          </SectionPanel>
        </TabsContent>

        <TabsContent value="payments">
          <SectionPanel title="Xero Payments" subtitle={`${payments.length} payments`}>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3">Date</th>
                  <th className="pb-2 pr-3">Contact</th>
                  <th className="pb-2 pr-3 text-right">Amount</th>
                  <th className="pb-2 pr-3">Account</th>
                  <th className="pb-2">Matched</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2 pr-3 tabular-nums">{p.date}</td>
                    <td className="py-2 pr-3">{p.contact_name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{formatMoney(p.amount)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{p.account_name}</td>
                    <td className="py-2">{p.matched_bank_transaction_id ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionPanel>
        </TabsContent>

        <TabsContent value="csv">
          <SectionPanel title="CSV Fallback Imports" subtitle="Import Xero data from exported CSV files">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['Contacts', 'Invoices', 'Bills', 'Payments', 'Bank Transactions'].map(type => (
                <div key={type} className="rounded-lg border border-border p-4 text-center" style={{ background: '#1A1E24' }}>
                  <Upload className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs font-medium mb-2">Import {type} CSV</p>
                  <Button variant="outline" size="sm" className="text-[10px] h-7">
                    <Upload className="w-3 h-3 mr-1" /> Upload
                  </Button>
                </div>
              ))}
            </div>
          </SectionPanel>
        </TabsContent>
      </Tabs>

      {/* Xero → Monday Number Impact */}
      <WarningBanner type="info">
        Xero feeds Monday Number: Unpaid ACCREC invoices ({formatMoney(arTotal)}) increase AR. Unpaid ACCPAY bills ({formatMoney(apTotal)}) increase AP. Payments reduce AR/AP after matching.
      </WarningBanner>
    </div>
  );
}