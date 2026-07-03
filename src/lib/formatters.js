export function formatMoney(value, opts = {}) {
  const { showSign = false, compact = false } = opts;
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
  if (isNeg) formatted = `(${formatted})`;
  else if (showSign && num > 0) formatted = `+${formatted}`;
  return formatted;
}

export function moneyColor(value) {
  if (value === null || value === undefined) return 'text-muted-foreground';
  const num = Number(value);
  if (num < 0) return 'text-critical';
  if (num === 0) return 'text-muted-foreground';
  return 'text-success';
}

export function negativeColor(value) {
  if (value === null || value === undefined) return '';
  return Number(value) < 0 ? 'text-critical' : '';
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
    'Critical': 'bg-critical/15 text-critical border-critical/30',
    'High': 'bg-warning/15 text-warning border-warning/30',
    'Medium': 'bg-warning/15 text-warning border-warning/30',
    'Low': 'bg-info/15 text-info border-info/30',
    'Open': 'bg-warning/15 text-warning border-warning/30',
    'Resolved': 'bg-success/15 text-success border-success/30',
    'Ignored': 'bg-muted/30 text-muted-foreground border-border',
    'STAR': 'bg-success/15 text-success border-success/30',
    'OK': 'bg-info/15 text-info border-info/30',
    'REVIEW TERMS': 'bg-warning/15 text-warning border-warning/30',
    'PAUSE': 'bg-critical/15 text-critical border-critical/30',
    'SCALE': 'bg-success/15 text-success border-success/30',
    'WATCH': 'bg-warning/15 text-warning border-warning/30',
    'CUT': 'bg-critical/15 text-critical border-critical/30',
    'HOLD': 'bg-info/15 text-info border-info/30',
    'UNKNOWN': 'bg-muted/30 text-muted-foreground border-border',
    'Active': 'bg-success/15 text-success',
    'Paused': 'bg-warning/15 text-warning',
    'Lost': 'bg-critical/15 text-critical',
    'Review': 'bg-warning/15 text-warning',
    'Paid': 'bg-success/15 text-success',
    'Overdue': 'bg-critical/15 text-critical',
    'Sent': 'bg-info/15 text-info',
    'Draft': 'bg-muted/30 text-muted-foreground',
    'Connected': 'bg-success/15 text-success',
    'Not Connected': 'bg-muted/30 text-muted-foreground',
    'Error': 'bg-critical/15 text-critical',
    'Expired': 'bg-warning/15 text-warning',
    'Healthy': 'bg-success/15 text-success',
    'Watch': 'bg-warning/15 text-warning',
    'Passed': 'bg-success/15 text-success',
    'Failed': 'bg-critical/15 text-critical',
    'Warning': 'bg-warning/15 text-warning',
    'Success': 'bg-success/15 text-success',
    'Timeout': 'bg-critical/15 text-critical',
    'Rejected': 'bg-critical/15 text-critical',
    'Sold': 'bg-success/15 text-success',
    'Unsold': 'bg-muted/30 text-muted-foreground',
  };
  return colors[status] || 'bg-muted/30 text-muted-foreground border-border';
}