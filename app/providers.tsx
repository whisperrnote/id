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
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 24px',
          fontWeight: 800,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isDark
            ? '0px 2px 4px rgba(0, 0, 0, 0.4), 0px 8px 16px rgba(26, 35, 126, 0.2), inset 0px 1px 0px rgba(255, 193, 7, 0.2)'
            : '0px 2px 4px rgba(26, 35, 126, 0.2), 0px 8px 16px rgba(26, 35, 126, 0.1), inset 0px 1px 0px rgba(255, 193, 7, 0.2)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: isDark
              ? '0px 4px 8px rgba(0, 0, 0, 0.6), 0px 12px 24px rgba(26, 35, 126, 0.4), inset 0px 1px 0px rgba(255, 193, 7, 0.2)'
              : '0px 4px 8px rgba(26, 35, 126, 0.4), 0px 12px 24px rgba(26, 35, 126, 0.2), inset 0px 1px 0px rgba(255, 193, 7, 0.2)',
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: 'none',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: isDark
            ? '0px 2px 4px rgba(0, 0, 0, 0.4), 0px 8px 16px rgba(26, 35, 126, 0.2), inset 0px 1px 0px rgba(255, 193, 7, 0.2)'
            : '0px 2px 4px rgba(26, 35, 126, 0.2), 0px 8px 16px rgba(26, 35, 126, 0.1), inset 0px 1px 0px rgba(255, 193, 7, 0.2)',
        },
      },
    },
  },
});

function MuiThemeWrapper({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const theme = createTheme(getDesignTokens(isDark));

  React.useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
    localStorage.setItem('id-theme-mode', isDark ? 'dark' : 'light');
  }, [isDark]);

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
