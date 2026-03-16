import { createContext, useContext } from "react";

export const ThemeCtx = createContext<{ isDark: boolean; toggleTheme: () => void }>({
  isDark: true,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeCtx);
