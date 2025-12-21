'use client';

import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { SourceProvider } from '@/lib/source-context';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/lib/theme-context';

const getDesignTokens = (isDark: boolean): any => ({
  palette: {
    mode: isDark ? 'dark' : 'light',
    primary: {
      main: '#FFC107', // Tungsten Sun
      contrastText: '#1B1C20',
    },
    background: {
      default: isDark ? '#1B1C20' : '#FAF8F6', // Void / Solar
      paper: isDark ? '#2D2421' : '#EADDD3',   // Matter / Sand
    },
    text: {
      primary: isDark ? '#FAF8F6' : '#1B1C20',
      secondary: isDark ? '#A69080' : '#5E4E42',
    },
    divider: isDark ? '#3D3D3D' : 'rgba(26, 35, 126, 0.1)',
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
          boxShadow: isDark
            ? '4px 4px 0 rgba(26, 35, 126, 0.8)'
            : '4px 4px 0 rgba(26, 35, 126, 0.2)',
          '&:hover': {
            transform: 'translate(-2px, -2px)',
            boxShadow: isDark
              ? '6px 6px 0 rgba(26, 35, 126, 0.9)'
              : '6px 6px 0 rgba(26, 35, 126, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: isDark
            ? '8px 12px 20px rgba(26, 35, 126, 0.4)'
            : '4px 8px 16px rgba(26, 35, 126, 0.15)',
        },
      },
    },
  },
});

function MuiThemeWrapper({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const theme = createTheme(getDesignTokens(isDark));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppThemeProvider>
      <MuiThemeWrapper>
        <SourceProvider>
          {children}
        </SourceProvider>
      </MuiThemeWrapper>
    </AppThemeProvider>
  );
}
