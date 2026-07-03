import React from 'react';
import { X, DollarSign, FileText, CreditCard, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatMoney, moneyColor } from '@/lib/formatters';

export default function MondayDecomposition({ metrics, onClose }) {
  const { bankAccounts = [], arInvoices = [], apEntries = [], adSpend = [], bankTxns = [] } = metrics;

  // AR by buyer
  const arByBuyer = {};
  arInvoices.filter(i => !['Paid', 'Draft'].includes(i.status)).forEach(i => {
    if (!arByBuyer[i.buyer_name]) arByBuyer[i.buyer_name] = 0;
    arByBuyer[i.buyer_name] += (i.outstanding_amount || 0);
  });

  // AP by supplier
  const apBySupplier = {};
  apEntries.forEach(e => {
    if (!apBySupplier[e.supplier_name]) apBySupplier[e.supplier_name] = 0;
    apBySupplier[e.supplier_name] += (e.amount || 0);
  });

  // Media gap by platform
  const spendByPlatform = {};
  adSpend.filter(a => !a.superseded).forEach(a => {
    if (!spendByPlatform[a.platform]) spendByPlatform[a.platform] = { tracked: 0, paid: 0 };
    spendByPlatform[a.platform].tracked += (a.cost || 0);
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg overflow-y-auto border-l border-border" style={{ background: '#0F1115' }}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold">Monday Number Decomposition</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-6">
          {/* Cash */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold">Cash by Account</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">CASH</span>
            </div>
            {bankAccounts.map((a, i) => (
              <div key={i} className="flex justify-between py-1.5 text-xs border-b border-border/50">
                <span className="text-muted-foreground">{a.account_name}</span>
                <span className={`tabular-nums font-medium ${moneyColor(a.current_balance)}`}>{formatMoney(a.current_balance)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 text-xs font-semibold">
              <span>Total Cash</span>
              <span className={`tabular-nums ${moneyColor(metrics.cash)}`}>{formatMoney(metrics.cash)}</span>
            </div>
            <Link to="/cash" className="text-[11px] text-[#E4262C] hover:underline">View Cash & Banking →</Link>
          </div>

          {/* AR */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold">AR by Buyer</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">BOOKED</span>
            </div>
            {Object.entries(arByBuyer).sort((a, b) => b[1] - a[1]).map(([buyer, amt], i) => (
              <div key={i} className="flex justify-between py-1.5 text-xs border-b border-border/50">
                <span className="text-muted-foreground">{buyer}</span>
                <span className="tabular-nums font-medium text-blue-400">{formatMoney(amt)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 text-xs font-semibold">
              <span>Total AR</span>
              <span className="tabular-nums text-blue-400">{formatMoney(metrics.ar)}</span>
            </div>
            <Link to="/receivables" className="text-[11px] text-[#E4262C] hover:underline">View Receivables →</Link>
          </div>

          {/* AP */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold">AP by Supplier</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium">BOOKED</span>
            </div>
            {Object.entries(apBySupplier).sort((a, b) => b[1] - a[1]).map(([supplier, amt], i) => (
              <div key={i} className="flex justify-between py-1.5 text-xs border-b border-border/50">
                <span className="text-muted-foreground">{supplier}</span>
                <span className="tabular-nums font-medium text-orange-400">{formatMoney(amt)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 text-xs font-semibold">
              <span>Total AP</span>
              <span className="tabular-nums text-orange-400">{formatMoney(metrics.ap)}</span>
            </div>
            <Link to="/payables" className="text-[11px] text-[#E4262C] hover:underline">View Payables →</Link>
          </div>

          {/* Media Gap */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold">Media Gap by Platform</span>
            </div>
            {Object.entries(spendByPlatform).map(([platform, data], i) => (
              <div key={i} className="flex justify-between py-1.5 text-xs border-b border-border/50">
                <span className="text-muted-foreground">{platform}</span>
                <span className="tabular-nums font-medium text-yellow-400">{formatMoney(data.tracked - data.paid)}</span>
              </div>
            ))}
            <Link to="/media-gap" className="text-[11px] text-[#E4262C] hover:underline mt-2 block">View Media Gap →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}