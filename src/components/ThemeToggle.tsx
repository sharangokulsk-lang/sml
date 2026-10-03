import React from 'react';
import { AppTheme } from '../utils/storage.ts';

interface ThemeToggleProps {
  theme: AppTheme;
  onThemeChange: (newTheme: AppTheme) => void;
}

export function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme preference selector"
      title={`Current mode: ${theme.toUpperCase()} (Manual Override). Click to switch.`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.18)',
        borderRadius: '24px',
        padding: '3px',
        border: '1px solid rgba(255, 255, 255, 0.22)',
      }}
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        aria-label="Switch to Light mode"
        onClick={() => onThemeChange('light')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          border: 'none',
          borderRadius: '18px',
          padding: '4px 9px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          background: theme === 'light' ? 'var(--surface)' : 'transparent',
          color: theme === 'light' ? 'var(--ink)' : 'rgba(255, 255, 255, 0.85)',
          boxShadow: theme === 'light' ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
          transition: 'all 0.18s ease',
        }}
      >
        <span>☀️</span>
        <span>Light</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        aria-label="Switch to Dark mode"
        onClick={() => onThemeChange('dark')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          border: 'none',
          borderRadius: '18px',
          padding: '4px 9px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          background: theme === 'dark' ? 'var(--surface)' : 'transparent',
          color: theme === 'dark' ? 'var(--ink)' : 'rgba(255, 255, 255, 0.85)',
          boxShadow: theme === 'dark' ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
          transition: 'all 0.18s ease',
        }}
      >
        <span>🌙</span>
        <span>Dark</span>
      </button>
    </div>
  );
}
