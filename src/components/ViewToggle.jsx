import { useEffect, useState } from 'react';

const KEY = 'antigallery-view';

// The view choice ('flowers' or 'grid'), remembered in this browser.
// A custom hook: it works like useState, but also saves the value.
export function useViewMode() {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(KEY) === 'grid' ? 'grid' : 'flowers';
    } catch {
      return 'flowers';
    }
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, mode); } catch { /* private browsing: ignore */ }
  }, [mode]);

  return [mode, setMode];
}

const OPTIONS = [
  ['flowers', '✿ flowerbed'],
  ['grid', '▦ grid'],
];

// Two-option switch with a sliding pill behind the active one
export default function ViewToggle({ mode, onChange }) {
  return (
    <div className="view-toggle-wrap">
      <div className="view-toggle" data-mode={mode} role="radiogroup" aria-label="view">
        {OPTIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            className={mode === value ? 'active' : ''}
            onClick={() => onChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}