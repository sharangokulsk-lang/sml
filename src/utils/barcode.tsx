import React from 'react';

// Code 128 bar and space widths (indices 0 to 106)
const PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112', // 100-106 (104=Start B, 106=Stop)
];

const START_B = 104;
const STOP = 106;

export interface BarcodeProps {
  value: string;
  name?: string;
  sublabel?: string;
  height?: number;
  barWidth?: number;
  className?: string;
  onClick?: () => void;
}

export function generateCode128Modules(text: string): boolean[] {
  // Filter to printable ASCII
  const clean = text.replace(/[^\x20-\x7E]/g, '');
  const codes: number[] = [START_B];
  let checkSum = START_B;

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    codes.push(code);
    checkSum += code * (i + 1);
  }

  const checkDigit = checkSum % 103;
  codes.push(checkDigit);
  codes.push(STOP);

  // Convert codes to boolean modules (true = black bar, false = white space)
  const modules: boolean[] = [];

  // Quiet zone: 10 units
  for (let q = 0; q < 10; q++) modules.push(false);

  for (const c of codes) {
    const pattern = PATTERNS[c] || PATTERNS[0];
    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      for (let w = 0; w < width; w++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }
  }

  // Final stop pattern has 13 modules, plus quiet zone: 10 units
  for (let q = 0; q < 10; q++) modules.push(false);

  return modules;
}

export function Barcode({
  value,
  name,
  sublabel,
  height = 70,
  barWidth = 1.8,
  className = '',
  onClick,
}: BarcodeProps) {
  const modules = React.useMemo(() => generateCode128Modules(value), [value]);
  const totalWidth = modules.length * barWidth;

  // Build rects for black bars
  const rects: React.ReactElement[] = [];
  let barStart = -1;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i]) {
      if (barStart === -1) barStart = i;
    } else {
      if (barStart !== -1) {
        const x = barStart * barWidth;
        const w = (i - barStart) * barWidth;
        rects.push(
          <rect
            key={barStart}
            x={x}
            y={0}
            width={w}
            height={height}
            fill="#000000"
          />
        );
        barStart = -1;
      }
    }
  }

  if (barStart !== -1) {
    const x = barStart * barWidth;
    const w = (modules.length - barStart) * barWidth;
    rects.push(
      <rect
        key={barStart}
        x={x}
        y={0}
        width={w}
        height={height}
        fill="#000000"
      />
    );
  }

  return (
    <div
      className={`barcode-container ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 14px',
        background: '#ffffff',
        color: '#000000',
        borderRadius: '6px',
        border: '1px solid #d9e2e0',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        maxWidth: '100%',
      }}
    >
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        style={{
          width: '100%',
          maxWidth: `${Math.min(totalWidth, 280)}px`,
          height: `${height}px`,
          display: 'block',
        }}
      >
        <rect x={0} y={0} width={totalWidth} height={height} fill="#ffffff" />
        {rects}
      </svg>

      <div
        style={{
          textAlign: 'center',
          marginTop: '6px',
          fontFamily: '"Public Sans", monospace, sans-serif',
        }}
      >
        {name && (
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.2px',
              color: '#000000',
              lineHeight: 1.2,
            }}
          >
            {name}
          </div>
        )}
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '1px',
            color: '#14282b',
            marginTop: '2px',
          }}
        >
          {sublabel || value}
        </div>
      </div>
    </div>
  );
}
