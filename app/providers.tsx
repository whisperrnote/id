'use client';

import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { SourceProvider } from '@/lib/source-context';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/lib/theme-context';

const getDesignTokens = (isDark: boolean): any => ({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00F0FF', // Electric Teal
      contrastText: '#000000',
    },
    secondary: {
      main: '#F2F2F2', // Titanium
    },
    background: {
      default: '#000000', // The Void
      paper: '#0A0A0A',   // The Surface
    },
    text: {
      primary: '#F2F2F2',   // Titanium
      secondary: '#A1A1AA', // Gunmetal
      disabled: '#404040',  // Carbon
    },
    divider: '#222222', // Subtle Border
  },
  typography: {
    fontFamily: '"Satoshi", "Inter", sans-serif',
    h1: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '32px',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#F2F2F2',
    },
    h2: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '24px',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    button: {
      fontFamily: '"Space Grotesk", sans-serif',
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#000000',
          color: '#F2F2F2',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '1px solid #222222',
          '&:hover': {
            borderColor: '#404040',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        containedPrimary: {
          backgroundColor: '#00F0FF',
          color: '#000000',
          border: 'none',
          '&:hover': {
            backgroundColor: 'rgba(0, 240, 255, 0.8)',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#0A0A0A',
          backgroundImage: 'none',
          border: '1px solid #222222',
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
