// Financial formatting utilities for PerformanceOS

export function formatMoney(value, opts = {}) {
  const { showSign = false, label = null, compact = false } = opts;
  if (value === null || value === undefined || isNaN(value)) return '—';
  
  const num = Number(value);
  const isNeg = num < 0;
  const abs = Math.abs(num);
  
  let formatted;
  if (compact && abs >= 1000000) {
    formatted = `$${(abs / 1000000).toFixed(1)}M`;
  } else if (compact && abs >= 1000) {
    formatted = `$${(abs / 1000).toFixed(1)}k`;
  } else {
    formatted = `$${abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  
  if (isNeg) {
    formatted = `(${formatted})`;
  } else if (showSign && num > 0) {
    formatted = `+${formatted}`;
  }
  
  if (label) {
    formatted = `${formatted}`;
  }
  
  return formatted;
}

export function moneyColor(value) {
  if (value === null || value === undefined) return 'text-muted-foreground';
  const num = Number(value);
  if (num < 0) return 'text-red-400';
  if (num === 0) return 'text-muted-foreground';
  return 'text-emerald-400';
}

export function negativeColor(value) {
  if (value === null || value === undefined) return '';
  return Number(value) < 0 ? 'text-red-400' : '';
}

export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${Number(value).toFixed(decimals)}%`;
}

export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return Number(value).toLocaleString('en-US');
}

export function cashLabel(type) {
  return type === 'cash' ? 'CASH' : 'BOOKED';
}

export function getStatusColor(status) {
  const colors = {
    'Critical': 'bg-red-500/20 text-red-400 border-red-500/30',
    'High': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'Medium': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Low': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Open': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Resolved': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Ignored': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'STAR': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'OK': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'REVIEW TERMS': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'PAUSE': 'bg-red-500/20 text-red-400 border-red-500/30',
    'SCALE': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'WATCH': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'CUT': 'bg-red-500/20 text-red-400 border-red-500/30',
    'UNKNOWN': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'Active': 'bg-emerald-500/20 text-emerald-400',
    'Paused': 'bg-yellow-500/20 text-yellow-400',
    'Lost': 'bg-red-500/20 text-red-400',
    'Review': 'bg-orange-500/20 text-orange-400',
    'Paid': 'bg-emerald-500/20 text-emerald-400',
    'Overdue': 'bg-red-500/20 text-red-400',
    'Sent': 'bg-blue-500/20 text-blue-400',
    'Draft': 'bg-gray-500/20 text-gray-400',
    'Connected': 'bg-emerald-500/20 text-emerald-400',
    'Not Connected': 'bg-gray-500/20 text-gray-400',
    'Error': 'bg-red-500/20 text-red-400',
    'Expired': 'bg-orange-500/20 text-orange-400',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400';
}