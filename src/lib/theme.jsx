// Theme context — dark mode has been removed (light only), kept as a thin
// shim so components that still read `dark` from useTheme() don't break.
import { createContext, useContext } from 'react';

const ThemeContext = createContext({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }) {
  return (
    <ThemeContext.Provider value={{ dark: false, toggle: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
