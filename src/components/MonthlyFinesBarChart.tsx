import React, { useState } from 'react';
import { Library, inr } from '../types/library.ts';

interface MonthlyFinesBarChartProps {
  lib: Library;
}

interface MonthData {
  key: string; // YYYY-MM
  label: string; // "May"
  year: number;
  fullLabel: string; // "May 2026"
  amount: number;
  count: number;
  isCurrentMonth: boolean;
}

export function MonthlyFinesBarChart({ lib }: MonthlyFinesBarChartProps) {
  const [rangeMonths, setRangeMonths] = useState<6 | 12>(6);
  const [hoveredMonth, setHoveredMonth] = useState<MonthData | null>(null);
  const [showTable, setShowTable] = useState(false);

  // Generate continuous month buckets leading to the current simulated date
  const now = new Date(lib.now);
  const months: MonthData[] = [];

  for (let i = rangeMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-GB', { month: 'short' });
    const fullLabel = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

    months.push({
      key,
      label,
      year: y,
      fullLabel,
      amount: 0,
      count: 0,
      isCurrentMonth: i === 0,
    });
  }

  // Aggregate fines collected for paid loans
  const monthMap = new Map<string, MonthData>();
  months.forEach((m) => monthMap.set(m.key, m));

  lib.loans.forEach((l) => {
    if (l.paid && (l.fine || 0) > 0) {
      const payTime = l.paidOn || l.returnedOn || l.dueOn || l.issuedOn;
      const pd = new Date(payTime);
      const pKey = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthMap.get(pKey);
      if (bucket) {
        bucket.amount += l.fine;
        bucket.count += 1;
      }
    }
  });

  // Calculate totals and statistics
  const totalCollected = months.reduce((sum, m) => sum + m.amount, 0);
  const currentMonthData = months[months.length - 1];
  const monthlyAverage = Math.round(totalCollected / rangeMonths);
  const peakMonth = months.reduce((max, m) => (m.amount > max.amount ? m : max), months[0]);

  // Chart dimensions & scaling
  const maxVal = Math.max(...months.map((m) => m.amount), 500);
  // Round up to clean step (e.g. step of 500 or 1000)
  const step = maxVal > 2000 ? 500 : maxVal > 1000 ? 250 : 100;
  const yMax = Math.ceil(maxVal / step) * step;

  const chartWidth = 560;
  const chartHeight = 170;
  const paddingLeft = 52;
  const paddingRight = 16;
  const paddingTop = 26;
  const paddingBottom = 32;

  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;
  const barWidth = Math.min(38, Math.max(18, Math.floor((usableWidth / rangeMonths) * 0.62)));

  // Y-axis ticks
  const yTicks = [0, yMax * 0.5, yMax];

  return (
    <div
      className="panel"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
      }}
    >
      {/* Header & Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '14px',
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📊</span> Fines Collected per Month
          </h4>
          <small style={{ color: 'var(--mute)' }}>
            Audit of settled student fine revenues and collection trends
          </small>
        </div>

        {/* Range Selector: 6 vs 12 Months */}
        <div style={{ display: 'inline-flex', background: 'var(--bg)', borderRadius: '6px', padding: '2px', border: '1px solid var(--line)' }}>
          <button
            type="button"
            className="btn"
            style={{
              padding: '3px 10px',
              fontSize: '12px',
              background: rangeMonths === 6 ? 'var(--brand)' : 'transparent',
              color: rangeMonths === 6 ? '#ffffff' : 'var(--ink)',
              border: 'none',
              boxShadow: 'none',
            }}
            onClick={() => setRangeMonths(6)}
          >
            Last 6 Months
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '3px 10px',
              fontSize: '12px',
              background: rangeMonths === 12 ? 'var(--brand)' : 'transparent',
              color: rangeMonths === 12 ? '#ffffff' : 'var(--ink)',
              border: 'none',
              boxShadow: 'none',
            }}
            onClick={() => setRangeMonths(12)}
          >
            Last 12 Months
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <div style={{ background: 'var(--brand2)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(14, 124, 83, 0.15)' }}>
          <small style={{ fontSize: '11px', color: 'var(--mute)', display: 'block' }}>Total Collected</small>
          <b style={{ fontSize: '15px', color: 'var(--brand)' }}>{inr(totalCollected)}</b>
        </div>
        <div style={{ background: 'var(--brand2)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(14, 124, 83, 0.15)' }}>
          <small style={{ fontSize: '11px', color: 'var(--mute)', display: 'block' }}>This Month</small>
          <b style={{ fontSize: '15px' }}>{inr(currentMonthData?.amount || 0)}</b>
        </div>
        <div style={{ background: 'var(--brand2)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(14, 124, 83, 0.15)' }}>
          <small style={{ fontSize: '11px', color: 'var(--mute)', display: 'block' }}>Monthly Average</small>
          <b style={{ fontSize: '15px' }}>{inr(monthlyAverage)}/mo</b>
        </div>
        <div style={{ background: 'var(--brand2)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(14, 124, 83, 0.15)' }}>
          <small style={{ fontSize: '11px', color: 'var(--mute)', display: 'block' }}>Peak Month</small>
          <b style={{ fontSize: '13px' }} title={`${peakMonth?.fullLabel}: ${inr(peakMonth?.amount || 0)}`}>
            {peakMonth ? `${peakMonth.label} (${inr(peakMonth.amount)})` : 'None'}
          </b>
        </div>
      </div>

      {/* Interactive SVG Bar Chart */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          overflowX: 'auto',
          background: 'var(--bg)',
          borderRadius: '8px',
          border: '1px solid var(--line)',
          padding: '10px 0',
        }}
      >
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', height: 'auto', display: 'block', minWidth: '460px' }}
        >
          <defs>
            <linearGradient id="barGradientNormal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#0e7c53" />
            </linearGradient>
            <linearGradient id="barGradientCurrent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="barGradientZero" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>

          {/* Gridlines & Y-axis labels */}
          {yTicks.map((val, idx) => {
            const yPos = paddingTop + usableHeight - (val / yMax) * usableHeight;
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={chartWidth - paddingRight}
                  y2={yPos}
                  stroke="var(--line)"
                  strokeDasharray={val === 0 ? '0' : '3 3'}
                  strokeWidth="1"
                  opacity="0.8"
                />
                <text
                  x={paddingLeft - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--mute)"
                  fontFamily="system-ui, sans-serif"
                >
                  {inr(val)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {months.map((m, idx) => {
            const xSlot = paddingLeft + (idx + 0.5) * (usableWidth / rangeMonths);
            const x = xSlot - barWidth / 2;
            const bHeight = m.amount > 0 ? Math.max(6, (m.amount / yMax) * usableHeight) : 3;
            const y = paddingTop + usableHeight - bHeight;
            const isHovered = hoveredMonth?.key === m.key;

            return (
              <g
                key={m.key}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredMonth(m)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {/* Background hover highlight column */}
                <rect
                  x={paddingLeft + idx * (usableWidth / rangeMonths)}
                  y={paddingTop}
                  width={usableWidth / rangeMonths}
                  height={usableHeight}
                  fill={isHovered ? 'rgba(14, 124, 83, 0.08)' : 'transparent'}
                  rx="4"
                />

                {/* Vertical Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={bHeight}
                  fill={
                    m.amount === 0
                      ? 'url(#barGradientZero)'
                      : m.isCurrentMonth
                      ? 'url(#barGradientCurrent)'
                      : 'url(#barGradientNormal)'
                  }
                  rx="4"
                  ry="4"
                  stroke={m.isCurrentMonth ? '#047857' : isHovered ? '#0e7c53' : 'none'}
                  strokeWidth={m.isCurrentMonth || isHovered ? 1.5 : 0}
                  opacity={isHovered ? 1 : 0.92}
                  style={{ transition: 'all 0.2s ease' }}
                />

                {/* Amount Label on top of bar */}
                {m.amount > 0 && (
                  <text
                    x={xSlot}
                    y={Math.max(12, y - 5)}
                    textAnchor="middle"
                    fontSize={rangeMonths === 12 ? '9' : '10'}
                    fontWeight="600"
                    fill={m.isCurrentMonth ? 'var(--brand)' : 'var(--ink)'}
                    fontFamily="system-ui, sans-serif"
                  >
                    {inr(m.amount)}
                  </text>
                )}

                {/* X-axis Month Label */}
                <text
                  x={xSlot}
                  y={chartHeight - paddingBottom + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={m.isCurrentMonth ? '700' : '500'}
                  fill={m.isCurrentMonth ? 'var(--brand)' : 'var(--ink)'}
                  fontFamily="system-ui, sans-serif"
                >
                  {m.label}
                </text>

                {/* Sub-label for year or current indicator */}
                <text
                  x={xSlot}
                  y={chartHeight - paddingBottom + 27}
                  textAnchor="middle"
                  fontSize="9"
                  fill={m.isCurrentMonth ? 'var(--brand)' : 'var(--mute)'}
                  fontFamily="system-ui, sans-serif"
                >
                  {m.isCurrentMonth ? 'Now' : `'${String(m.year).slice(2)}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Floating Tooltip */}
        {hoveredMonth && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '12px',
              background: 'var(--ink)',
              color: 'var(--bg)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              lineHeight: 1.3,
              boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <b>{hoveredMonth.fullLabel}</b>
            <div>Fines Collected: <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{inr(hoveredMonth.amount)}</span></div>
            <div>Receipts: {hoveredMonth.count} fine{hoveredMonth.count === 1 ? '' : 's'} settled</div>
          </div>
        )}
      </div>

      {/* Toggle Monthly Ledger Breakdown Table */}
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          className="btn alt"
          style={{ fontSize: '12px', padding: '4px 10px' }}
          onClick={() => setShowTable(!showTable)}
        >
          {showTable ? '▲ Hide Monthly Table' : '▼ Show Monthly Table Breakdown'}
        </button>

        <span style={{ fontSize: '11px', color: 'var(--mute)' }}>
          Formula: Daily doubling fine up to ₹1,000 cap
        </span>
      </div>

      {/* Breakdown Data Table */}
      {showTable && (
        <div style={{ marginTop: '10px', overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                <th style={{ padding: '6px' }}>Month</th>
                <th style={{ padding: '6px' }}>Fines Collected</th>
                <th style={{ padding: '6px' }}>Paid Loans</th>
                <th style={{ padding: '6px' }}>Avg / Fine</th>
                <th style={{ padding: '6px' }}>Share of Total</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const share = totalCollected > 0 ? Math.round((m.amount / totalCollected) * 100) : 0;
                const avgFine = m.count > 0 ? Math.round(m.amount / m.count) : 0;
                return (
                  <tr
                    key={m.key}
                    style={{
                      borderBottom: '1px solid var(--line)',
                      background: m.isCurrentMonth ? 'rgba(14, 124, 83, 0.06)' : undefined,
                    }}
                  >
                    <td style={{ padding: '6px' }}>
                      <b>{m.fullLabel}</b> {m.isCurrentMonth && <span className="tag ok" style={{ fontSize: '10px', padding: '1px 4px' }}>Active</span>}
                    </td>
                    <td style={{ padding: '6px', fontWeight: 600 }}>{inr(m.amount)}</td>
                    <td style={{ padding: '6px' }}>{m.count}</td>
                    <td style={{ padding: '6px' }}>{avgFine > 0 ? inr(avgFine) : '—'}</td>
                    <td style={{ padding: '6px' }}>{share}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
