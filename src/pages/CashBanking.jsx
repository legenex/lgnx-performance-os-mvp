import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import { formatMoney, moneyColor } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Landmark, Upload, Tag, Filter, Download } from 'lucide-react';

const CATEGORIES = [
  'Buyer Collections', 'Meta Ads', 'Google Ads', 'Taboola Ads', 'LeadFlow',
  'Supplier Payouts', 'Payroll / Influxx SA', 'Tools / SaaS', 'Contractors',
  'Owner Draw / Revolut', 'Investments', 'Personal Card Spend',
  'House Build / Next Consulting', 'Fees', 'Transfers', 'Other Income', 'Unknown'
];

const CASH_TYPES = [
  'Buyer Collection', 'Media Spend', 'Supplier Payout', 'Payroll', 'Tool',
  'Contractor', 'Owner Draw', 'Personal', 'House Build', 'Investment',
  'Fee', 'Transfer', 'Other Income', 'Unknown'
];

export default function CashBanking() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [accs, txns] = await Promise.all([
        base44.entities.BankAccount.list(),
        base44.entities.BankTransaction.list('-date', 200),
      ]);
      setAccounts(accs);
      setTransactions(txns);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function updateCategory(txn, category, cashType) {
    await base44.entities.BankTransaction.update(txn.id, { category, cash_type: cashType });
    setTransactions(prev => prev.map(t => t.id === txn.id ? { ...t, category, cash_type: cashType } : t));
  }

  const totalCash = accounts.reduce((s, a) => s + (a.current_balance || 0), 0);
  const uncategorized = transactions.filter(t => !t.category || t.category === 'Unknown').length;

  // Filter
  let filtered = transactions;
  if (filterCat !== 'all') filtered = filtered.filter(t => t.category === filterCat);
  if (filterMonth !== 'all') filtered = filtered.filter(t => t.date && t.date.startsWith(filterMonth));
  if (search) filtered = filtered.filter(t => 
    (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.counterparty || '').toLowerCase().includes(search.toLowerCase())
  );

  // Monthly matrix
  const months = [...new Set(transactions.map(t => t.date ? t.date.substring(0, 7) : null).filter(Boolean))].sort();
  const matrixData = {};
  CATEGORIES.forEach(cat => {
    matrixData[cat] = {};
    months.forEach(m => { matrixData[cat][m] = 0; });
  });
  transactions.forEach(t => {
    const m = t.date ? t.date.substring(0, 7) : null;
    const cat = t.category || 'Unknown';
    if (m && matrixData[cat] && matrixData[cat][m] !== undefined) {
      matrixData[cat][m] += (t.amount || 0);
    }
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Cash & Banking</h1>
          <p className="text-xs text-muted-foreground mt-1">Bank accounts, transactions, and categorization</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1">
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </Button>
        </div>
      </div>

      {/* Bank Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {accounts.map((a, i) => (
          <MetricCard key={i} title={a.account_name} value={a.current_balance} label="CASH" sublabel={`${a.institution} · ${a.account_type || 'Checking'}`} />
        ))}
        <MetricCard title="Total Cash" value={totalCash} label="CASH" className="border-[#E4262C]/20" />
      </div>

      {/* Uncategorized counter */}
      {uncategorized > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <Tag className="w-4 h-4 text-orange-400" />
          <span className="text-xs text-orange-300">{uncategorized} uncategorized transactions require attention</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input placeholder="Search description or counterparty..." value={search} onChange={e => setSearch(e.target.value)} className="w-64 h-8 text-xs bg-secondary" />
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-44 h-8 text-xs bg-secondary"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-36 h-8 text-xs bg-secondary"><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Transaction Table */}
      <SectionPanel title="Transactions" subtitle={`${filtered.length} records`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Description</th>
                <th className="pb-2 pr-3">Counterparty</th>
                <th className="pb-2 pr-3 text-right">Amount</th>
                <th className="pb-2 pr-3">Category</th>
                <th className="pb-2 pr-3">Type</th>
                <th className="pb-2">Match</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((txn, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-2 pr-3 text-muted-foreground tabular-nums">{txn.date}</td>
                  <td className="py-2 pr-3 max-w-48 truncate">{txn.description}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{txn.counterparty}</td>
                  <td className={`py-2 pr-3 text-right tabular-nums font-medium ${moneyColor(txn.amount)}`}>
                    {formatMoney(txn.amount)}
                  </td>
                  <td className="py-2 pr-3">
                    <Select value={txn.category || 'Unknown'} onValueChange={(v) => updateCategory(txn, v, txn.cash_type)}>
                      <SelectTrigger className="h-6 text-[10px] w-36 bg-secondary border-none"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2 pr-3">
                    <Select value={txn.cash_type || 'Unknown'} onValueChange={(v) => updateCategory(txn, txn.category, v)}>
                      <SelectTrigger className="h-6 text-[10px] w-32 bg-secondary border-none"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CASH_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      txn.match_status === 'Unmatched' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>{txn.match_status || 'Unmatched'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Cash Flow Matrix */}
      {months.length > 0 && (
        <SectionPanel title="Cash Flow Matrix" subtitle="Category × Month">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3 sticky left-0" style={{ background: '#14171C' }}>Category</th>
                  {months.map(m => <th key={m} className="pb-2 pr-3 text-right tabular-nums">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.filter(cat => months.some(m => matrixData[cat][m] !== 0)).map(cat => (
                  <tr key={cat} className="border-b border-border/30">
                    <td className="py-1.5 pr-3 text-muted-foreground sticky left-0" style={{ background: '#14171C' }}>{cat}</td>
                    {months.map(m => (
                      <td key={m} className={`py-1.5 pr-3 text-right tabular-nums ${moneyColor(matrixData[cat][m])}`}>
                        {matrixData[cat][m] !== 0 ? formatMoney(matrixData[cat][m]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      )}
    </div>
  );
}