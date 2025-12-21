'use client';

import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { SourceProvider } from '@/lib/source-context';
import { ThemeProvider as AppThemeProvider } from '@/lib/theme-context';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FFC107', // Tungsten Sun
      contrastText: '#1B1C20',
    },
    background: {
      default: '#1B1C20', // The Void
      paper: '#2D2421',   // The Matter
    },
    text: {
      primary: '#FAF8F6',
      secondary: '#A69080',
    },
    divider: '#3D3D3D',
  },
  typography: {
    fontFamily: 'var(--font-inter), "Inter", sans-serif',
    h1: {
      fontFamily: 'var(--font-mono), monospace',
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: 'var(--font-mono), monospace',
      fontWeight: 700,
    },
    button: {
      fontFamily: 'var(--font-mono), monospace',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: '4px 4px 0 rgba(26, 35, 126, 0.8)',
          '&:hover': {
            transform: 'translate(-2px, -2px)',
            boxShadow: '6px 6px 0 rgba(26, 35, 126, 0.9)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '8px 12px 20px rgba(26, 35, 126, 0.4)',
        },
      },
    },
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
