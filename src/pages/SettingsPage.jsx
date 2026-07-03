import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, FileText, Tag, Shield } from 'lucide-react';

export default function SettingsPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [rules, setRules] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [supps, byrs, rls, bdgs] = await Promise.all([
        base44.entities.Supplier.list(),
        base44.entities.Buyer.list(),
        base44.entities.CategorizationRule.list(),
        base44.entities.WeeklyBudget.list('-week_start', 10),
      ]);
      setSuppliers(supps);
      setBuyers(byrs);
      setRules(rls);
      setBudgets(bdgs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">Configuration, rules, budgets, and mappings</p>
      </div>

      <Tabs defaultValue="suppliers">
        <TabsList className="bg-secondary">
          <TabsTrigger value="suppliers" className="text-xs">Supplier Rules</TabsTrigger>
          <TabsTrigger value="buyers" className="text-xs">Buyer Terms</TabsTrigger>
          <TabsTrigger value="budgets" className="text-xs">Weekly Budgets</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs">Categorization Rules</TabsTrigger>
          <TabsTrigger value="xero" className="text-xs">Xero Connection</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <SectionPanel title="Supplier Payout Rules" subtitle={`${suppliers.length} suppliers`}>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">SID</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Payout Model</th>
                  <th className="pb-2 pr-3 text-right">Payout Value</th>
                  <th className="pb-2 pr-3">Clawback</th>
                  <th className="pb-2">Terms</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                    <td className="py-2 pr-3 font-medium">{s.name}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{s.sid}</td>
                    <td className="py-2 pr-3"><StatusBadge status={s.status} /></td>
                    <td className="py-2 pr-3 text-muted-foreground">{s.payout_model}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.payout_value}%</td>
                    <td className="py-2 pr-3">{s.clawback_on_return ? '✓' : '—'}</td>
                    <td className="py-2 text-muted-foreground">{s.payment_terms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionPanel>
        </TabsContent>

        <TabsContent value="buyers">
          <SectionPanel title="Buyer Billing Terms" subtitle={`${buyers.length} buyers`}>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Billing Terms</th>
                  <th className="pb-2 pr-3 text-right">Payment Days</th>
                  <th className="pb-2">Contact</th>
                </tr>
              </thead>
              <tbody>
                {buyers.map((b, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2 pr-3 font-medium">{b.name}</td>
                    <td className="py-2 pr-3"><StatusBadge status={b.status} /></td>
                    <td className="py-2 pr-3 text-muted-foreground">{b.billing_terms}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{b.payment_terms_days}</td>
                    <td className="py-2 text-muted-foreground">{b.contact_email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionPanel>
        </TabsContent>

        <TabsContent value="budgets">
          <SectionPanel title="Weekly Budgets" subtitle={`${budgets.length} weeks`}>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3">Week Start</th>
                  <th className="pb-2 pr-3 text-right">Media</th>
                  <th className="pb-2 pr-3 text-right">Owner Draw</th>
                  <th className="pb-2 pr-3 text-right">Supplier Paydown</th>
                  <th className="pb-2 pr-3 text-right">Payroll</th>
                  <th className="pb-2 text-right">Tools</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((b, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2 pr-3 tabular-nums">{b.week_start}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">${b.media_budget?.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">${b.owner_draw_budget?.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">${b.supplier_paydown_budget?.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">${b.payroll_budget?.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums">${b.tools_budget?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionPanel>
        </TabsContent>

        <TabsContent value="rules">
          <SectionPanel title="Bank Categorization Rules" subtitle={`${rules.length} rules`}>
            {rules.length === 0 ? (
              <p className="text-xs text-muted-foreground">No rules created yet. Edit a transaction category on the Cash page to create rules.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="pb-2 pr-3">Pattern</th>
                    <th className="pb-2 pr-3">Category</th>
                    <th className="pb-2 pr-3">Cash Type</th>
                    <th className="pb-2 pr-3 text-right">Priority</th>
                    <th className="pb-2">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-2 pr-3 font-mono text-xs">{r.pattern}</td>
                      <td className="py-2 pr-3">{r.category}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.cash_type}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.priority}</td>
                      <td className="py-2">{r.active ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionPanel>
        </TabsContent>

        <TabsContent value="xero">
          <SectionPanel title="Xero Connection Settings">
            <div className="space-y-3 max-w-md">
              <p className="text-xs text-muted-foreground mb-4">
                Configure Xero OAuth credentials. Client ID and Secret should be set as environment variables for security.
              </p>
              <div>
                <label className="text-xs text-muted-foreground">Tenant Name</label>
                <Input className="mt-1 h-8 text-xs bg-secondary" placeholder="Your Xero Organization" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Redirect URI</label>
                <Input className="mt-1 h-8 text-xs bg-secondary" placeholder="https://your-app.base44.app/xero/callback" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Scopes</label>
                <Input className="mt-1 h-8 text-xs bg-secondary" defaultValue="openid profile email accounting.transactions accounting.contacts" />
              </div>
              <Button size="sm" className="text-xs">Save Xero Settings</Button>
            </div>
          </SectionPanel>
        </TabsContent>

        <TabsContent value="roles">
          <SectionPanel title="Access Roles" subtitle="View permissions by role">
            <div className="space-y-3">
              {[
                { role: 'Owner', desc: 'Full access to all screens and data', screens: 'All' },
                { role: 'Ops', desc: 'Import, reconciliation, and data management', screens: 'Cash, Xero, Receivables, Payables, Supplier Ledger, Reconciliation, Data Imports' },
                { role: 'Media Buyer', desc: 'Campaign and lead performance', screens: 'Campaign True Margin, Lead Economics, Media Gap' },
                { role: 'Finance', desc: 'Cash, accounting, and reconciliation', screens: 'Cash, Xero, Receivables, Payables, Reconciliation' },
              ].map((r, i) => (
                <div key={i} className="p-3 rounded" style={{ background: '#1A1E24' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold">{r.role}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{r.desc}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Screens: {r.screens}</p>
                </div>
              ))}
            </div>
          </SectionPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}