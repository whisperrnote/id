'use client';

import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { SourceProvider } from '@/lib/source-context';
import { ThemeProvider as AppThemeProvider } from '@/lib/theme-context';

const theme = createTheme({
  palette: {
    mode: 'dark', // Identity hub looks better in dark mode
    primary: {
      main: '#FFC700',
      contrastText: '#1a1a1a',
    },
    secondary: {
      main: '#6B5B4F',
    },
    background: {
      default: '#0F0F0F',
      paper: '#1A1A1A',
    },
    text: {
      primary: '#FAF8F6',
      secondary: '#A69080',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 12,
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppThemeProvider>
        <SourceProvider>
          {children}
        </SourceProvider>
      </AppThemeProvider>
    </ThemeProvider>
  );
}
