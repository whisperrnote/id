'use client';

import { useEffect, Suspense, useState } from 'react';
import { account } from '@/lib/appwrite';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSource } from '@/lib/source-context';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { colors } from '@/lib/colors';
import { useColors } from '@/lib/theme-context';

function HomeContent() {
  const dynamicColors = useColors();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSource } = useSource();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let hasResolved = false;

    const markReady = () => {
      if (!hasResolved && isMounted) {
        hasResolved = true;
        setIsChecking(false);
      }
    };

    const checkAuth = async () => {
      try {
        const source = searchParams.get('source');
        if (source) {
          setSource(source);
        }

        const userData = await account.get();
        if (userData && source) {
          const url = new URL(source.startsWith('http') ? source : `https://${source}`);
          url.searchParams.set('auth', 'success');
          const redirectUrl = url.toString();
          
          markReady();
          router.replace(redirectUrl);
          return;
        }

        if (!userData) {
          // If not logged in, go to login page
          const loginUrl = source ? `/login?source=${encodeURIComponent(source)}` : '/login';
          router.replace(loginUrl);
          return;
        }

      } catch (error) {
        console.error('IDM auth check failed:', error);
        // If error (usually 401), redirect to login
        const source = searchParams.get('source');
        const loginUrl = source ? `/login?source=${encodeURIComponent(source)}` : '/login';
        router.replace(loginUrl);
      } finally {
        markReady();
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams, setSource]);

  if (isChecking) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: dynamicColors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
        <CircularProgress sx={{ color: dynamicColors.primary }} />
        <Typography sx={{ color: dynamicColors.foreground }}>Verifying session...</Typography>
      </Box>
    );
  }

  const source = searchParams.get('source');
  const redirectUrl = source ? (source.startsWith('http') ? source : `https://${source}`) : null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: dynamicColors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 520,
          textAlign: 'center',
          p: 4,
          borderRadius: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}

      >
        <Typography variant="h4" sx={{ color: dynamicColors.primary, mb: 2, fontWeight: 700 }}>
          Authentication finished
        </Typography>
        <Typography sx={{ color: dynamicColors.foreground, mb: 1.5 }}>
          You can close this window or tab now and return to the application.
        </Typography>
        
        {redirectUrl && (
          <Button
            variant="contained"
            onClick={() => window.location.href = redirectUrl}
            sx={{
              mt: 2,
              mb: 3,
              backgroundColor: dynamicColors.primary,
              color: dynamicColors.secondary,
              fontWeight: 600,
              '&:hover': { backgroundColor: dynamicColors.primary, opacity: 0.9 }
            }}
          >
            Continue to Application
          </Button>
        )}

        <Typography sx={{ color: dynamicColors.foreground, fontSize: '0.875rem', opacity: 0.8 }}>
          If things still look stale, refresh the application window you came from as a last resort.
        </Typography>
      </Box>
    </Box>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: '100vh', backgroundColor: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#00F5FF' }} />
      </Box>
    }>
      <HomeContent />
    </Suspense>
  );
}
