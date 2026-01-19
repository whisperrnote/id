'use client';

import React from 'react';

import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { SourceProvider } from '@/lib/source-context';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/lib/theme-context';
import { useEcosystemNode } from '@/lib/use-ecosystem-node';

const getDesignTokens = (isDark: boolean): any => ({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00F5FF', // Electric Teal
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
    divider: 'rgba(255, 255, 255, 0.1)', // Subtle Border
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h1: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '3.5rem',
      fontWeight: 900,
      letterSpacing: '-0.04em',
      color: '#F2F2F2',
    },
    h2: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '2.5rem',
      fontWeight: 900,
      letterSpacing: '-0.03em',
    },
    h3: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '2rem',
      fontWeight: 900,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '1.5rem',
      fontWeight: 900,
    },
    button: {
      fontFamily: '"Space Grotesk", sans-serif',
      textTransform: 'none',
      fontWeight: 700,
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
          borderRadius: '12px',
          padding: '10px 24px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:hover': {
            borderColor: 'rgba(0, 245, 255, 0.5)',
            backgroundColor: 'rgba(0, 245, 255, 0.05)',
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        containedPrimary: {
          backgroundColor: '#00F5FF',
          color: '#000000',
          border: 'none',
          '&:hover': {
            backgroundColor: 'rgba(0, 245, 255, 0.8)',
            boxShadow: '0 0 20px rgba(0, 245, 255, 0.4)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(25px) saturate(180%)',
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          backgroundColor: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(25px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundImage: 'none',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        },
      },
    },
  },
});

function MuiThemeWrapper({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  useEcosystemNode('id');
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
