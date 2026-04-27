import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeContext.jsx';

export default function ThemeToggle({ style }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Use dark theme' : 'Use light theme'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '8px 14px',
        backgroundColor: 'var(--bg-muted)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-strong)',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: 500,
        ...style,
      }}
    >
      {isLight ? <Moon size={18} strokeWidth={2} /> : <Sun size={18} strokeWidth={2} />}
      <span>{isLight ? 'Dark' : 'Light'}</span>
    </button>
  );
}
