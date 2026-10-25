// Light and dark mode. The choice is remembered on this device; the first visit starts in light.
import { createContext, useContext, useEffect, useState } from 'react';

const KEY = 'pp_theme';
const ThemeContext = createContext({ dark: false, toggle: () => {} });

function initial() {
  let t = null;
  try { t = localStorage.getItem(KEY); } catch { /* storage blocked */ }
  if (t === 'dark' || t === 'light') return t === 'dark';
  return false;
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(initial);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch { /* storage blocked */ }
  }, [dark]);
  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
