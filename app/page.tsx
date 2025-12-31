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
          const redirectUrl = source.startsWith('http://') || source.startsWith('https://')
            ? source
            : `https://${source}`;
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
      <Box sx={{ minHeight: '100vh', backgroundColor: dynamicColors.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: dynamicColors.primary }} />
      </Box>
    );
  }

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
        <Typography sx={{ color: dynamicColors.foreground }}>
          If things still look stale, refresh the application window you came from as a last resort.
        </Typography>
      </Box>
    </Box>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: '100vh', backgroundColor: '#181711', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#f9c806' }} />
      </Box>
    }>
      <HomeContent />
    </Suspense>
  );
}
