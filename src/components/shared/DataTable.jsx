import React, { useState, useMemo } from 'react';
import { Download, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export default function DataTable({
  columns,
  data,
  onRowClick,
  exportFileName,
  totalsRow,
  emptyMessage = 'No data available',
  maxHeight,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const exportCSV = () => {
    const headers = columns.map(c => `"${c.label}"`).join(',');
    const rows = sortedData.map(row =>
      columns.map(c => {
        const val = row[c.key];
        if (val === null || val === undefined || val === '') return 'UNKNOWN';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFileName || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(213, 17%, 20%)' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-[11px] text-muted-foreground">{sortedData.length} rows</span>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Download className="w-3 h-3" />
          Export CSV
        </button>
      </div>
      <div className="overflow-auto" style={{ maxHeight: maxHeight || '500px' }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border" style={{ background: 'hsl(214, 18%, 23%)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap ${col.sortable !== false ? 'cursor-pointer hover:text-foreground' : ''} ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                    {col.label}
                    {col.sortable !== false && (
                      sortKey === col.key ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-40" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-border/40 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onMouseEnter={e => e.currentTarget.style.background = 'hsl(214, 18%, 23%)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-1.5 whitespace-nowrap tabular-nums ${col.align === 'right' ? 'text-right' : ''} ${col.className || ''}`}
                    >
                      {col.render ? col.render(row[col.key], row) : (row[col.key] === null || row[col.key] === undefined ? 'UNKNOWN' : String(row[col.key]))}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {totalsRow && sortedData.length > 0 && (
            <tfoot className="sticky bottom-0">
              <tr className="border-t-2 border-border font-semibold" style={{ background: 'hsl(214, 18%, 23%)' }}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2 whitespace-nowrap tabular-nums ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {totalsRow[col.key] !== undefined ? totalsRow[col.key] : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}