import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'sba-theme';        // 'light' | 'dark' | 'system'
const ACCENT_KEY  = 'sba-accent';       // 'purple' | 'blue' | 'green' | 'teal'
const FONT_KEY    = 'sba-fontsize';     // 'normal' | 'large'

/* Accent colour palettes: [from, to] for the gradient */
export const ACCENTS = {
  purple: { from: '#667eea', to: '#764ba2', name: 'Purple' },
  blue:   { from: '#4facfe', to: '#00c6fb', name: 'Blue'   },
  green:  { from: '#43e97b', to: '#38f9d7', name: 'Green'  },
  teal:   { from: '#0fd850', to: '#1cb5e0', name: 'Teal'   },
};

function resolveTheme(pref) {
  if (pref === 'dark')  return 'dark';
  if (pref === 'light') return 'light';
  // system — follow OS
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved, accent, fontSize) {
  const html = document.documentElement;

  // Theme
  html.setAttribute('data-theme', resolved);

  // Accent colours as CSS custom properties
  const a = ACCENTS[accent] || ACCENTS.purple;
  html.style.setProperty('--accent-from', a.from);
  html.style.setProperty('--accent-to',   a.to);

  // Font size
  html.setAttribute('data-fontsize', fontSize);
}

export function ThemeProvider({ children }) {
  const [themePref, setThemePref] = useState(() => localStorage.getItem(STORAGE_KEY) || 'light');
  const [accent,    setAccent]    = useState(() => localStorage.getItem(ACCENT_KEY)  || 'purple');
  const [fontSize,  setFontSize]  = useState(() => localStorage.getItem(FONT_KEY)    || 'normal');

  // resolved = the actual 'dark' or 'light' applied to the DOM
  const [resolved, setResolved] = useState(() => resolveTheme(localStorage.getItem(STORAGE_KEY) || 'light'));

  // Watch OS preference changes when pref === 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (themePref === 'system') {
        const r = mq.matches ? 'dark' : 'light';
        setResolved(r);
        applyTheme(r, accent, fontSize);
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themePref, accent, fontSize]);

  // Apply whenever any pref changes
  useEffect(() => {
    const r = resolveTheme(themePref);
    setResolved(r);
    applyTheme(r, accent, fontSize);
  }, [themePref, accent, fontSize]);

  const updateTheme = (pref) => {
    setThemePref(pref);
    localStorage.setItem(STORAGE_KEY, pref);
  };

  const updateAccent = (a) => {
    setAccent(a);
    localStorage.setItem(ACCENT_KEY, a);
  };

  const updateFontSize = (f) => {
    setFontSize(f);
    localStorage.setItem(FONT_KEY, f);
  };

  return (
    <ThemeContext.Provider value={{ themePref, resolved, accent, fontSize, updateTheme, updateAccent, updateFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
