import { createContext } from 'react';

export type Theme = 'dark' | 'light' | 'system';

export type ThemeProviderContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'dark' | 'light'; // El tema que realmente se está aplicando
};

export const ThemeProviderContext = createContext<ThemeProviderContextType | undefined>(undefined);
