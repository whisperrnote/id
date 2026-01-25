'use client';
import { useColors, useTheme } from '@/lib/theme-context';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@/lib/colors';
import { useSource } from '@/lib/source-context';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Stack,
  Typography,
  Divider,
  alpha,
} from '@mui/material';
import { Logout, Settings, ArrowBack, Fingerprint, History, Apps } from '@mui/icons-material';
import EcosystemPortal from './EcosystemPortal';
import { useEffect } from 'react';

interface TopbarProps {
  userName?: string;
  userEmail?: string;
  onManageAccount?: () => void;
  onSignOut?: () => void;
  onSessionsClick?: () => void;
  onActivityClick?: () => void;
}

export default function Topbar({ userName, userEmail, onManageAccount, onSignOut, onSessionsClick, onActivityClick }: TopbarProps) {
  const dynamicColors = useColors();
  const { isDark } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        setIsPortalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const { getBackUrl } = useSource();
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Auth System';
  
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const hoverBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const hoverBgStrong = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const textColor = isDark ? 'white' : '#333333';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleManageAccount = () => {
    handleMenuClose();
    if (onManageAccount) {
      onManageAccount();
    } else {
      router.push('/settings');
    }
  };

  const handleBackToApp = () => {
    handleMenuClose();
    const backUrl = getBackUrl();
    if (backUrl) {
      window.location.href = backUrl;
    }
  };

  const handleSignOut = () => {
    handleMenuClose();
    if (onSignOut) {
      onSignOut();
    }
  };

  const handleSessions = () => {
    handleMenuClose();
    if (onSessionsClick) {
      onSessionsClick();
    }
  };

  const handleActivity = () => {
    handleMenuClose();
    if (onActivityClick) {
      onActivityClick();
    }
  };

  // Get initials for avatar
  const getInitials = () => {
    if (userName) {
      return userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();
    }
    if (userEmail) {
      return userEmail[0].toUpperCase();
    }
    return '?';
  };

  const avatarColor = (email: string) => {
    const colors = ['#00F0FF', '#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <Box
      sx={{
        backgroundColor: dynamicColors.background,
        borderBottom: `1px solid ${borderColor}`,
        p: '0.75rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {/* App Name */}
      <Stack direction="row" spacing={2} alignItems="center">
        <IconButton 
          onClick={() => setIsPortalOpen(true)}
          sx={{ 
            color: dynamicColors.primary,
            bgcolor: alpha(dynamicColors.primary, 0.05),
            border: `1px solid ${alpha(dynamicColors.primary, 0.1)}`,
            borderRadius: '10px'
          }}
        >
          <Apps sx={{ fontSize: 20 }} />
        </IconButton>
        <Typography
          sx={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: dynamicColors.primary,
            cursor: 'pointer',
            fontFamily: 'var(--font-space-grotesk)',
            letterSpacing: '-0.02em'
          }}
          onClick={() => router.push('/')}
        >
          {appName.toUpperCase()}
        </Typography>
      </Stack>

      {/* Account Menu */}
      <Box>
        <IconButton
          onClick={handleMenuOpen}
          sx={{
            p: '0.5rem',
            '&:hover': { backgroundColor: hoverBgStrong },
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              backgroundColor: avatarColor(userEmail || 'user'),
              fontSize: '0.875rem',
              fontWeight: 800,
              borderRadius: '10px'
            }}
          >
            {getInitials()}
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            '& .MuiPaper-root': {
              backgroundColor: 'rgba(10, 10, 10, 0.95)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${borderColor}`,
              borderRadius: '20px',
              mt: 1,
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            },
          }}
        >
          {/* Current Account Display */}
          {userName && userEmail && (
            <>
              <Box sx={{ px: 2, py: 1.5 }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: avatarColor(userEmail),
                      fontSize: '1rem',
                      fontWeight: 800,
                      borderRadius: '10px'
                    }}
                  >
                    {getInitials()}
                  </Avatar>
                  <Stack spacing={0.5}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 800, color: textColor }}>
                      {userName}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                      {userEmail}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
              <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)', my: 1 }} />
            </>
          )}

          {/* Menu Items */}
          {getBackUrl() && (
            <MenuItem
              onClick={handleBackToApp}
              sx={{
                color: dynamicColors.primary,
                fontSize: '0.875rem',
                fontWeight: 600,
                py: 1.25,
                '&:hover': { backgroundColor: hoverBg },
              }}
            >
              <ArrowBack sx={{ mr: 1, fontSize: '1.25rem' }} />
              Back to App
            </MenuItem>
          )}

          <MenuItem
            onClick={handleManageAccount}
            sx={{
              color: textColor,
              fontSize: '0.875rem',
              fontWeight: 600,
              py: 1.25,
              '&:hover': { backgroundColor: hoverBg },
            }}
          >
            <Settings sx={{ mr: 1, fontSize: '1.25rem' }} />
            Manage Account
          </MenuItem>

          <MenuItem
            onClick={handleSessions}
            sx={{
              color: textColor,
              fontSize: '0.875rem',
              fontWeight: 600,
              py: 1.25,
              '&:hover': { backgroundColor: hoverBg },
            }}
          >
            <Fingerprint sx={{ mr: 1, fontSize: '1.25rem' }} />
            Sessions
          </MenuItem>

          <MenuItem
            onClick={handleActivity}
            sx={{
              color: textColor,
              fontSize: '0.875rem',
              fontWeight: 600,
              py: 1.25,
              '&:hover': { backgroundColor: hoverBg },
            }}
          >
            <History sx={{ mr: 1, fontSize: '1.25rem' }} />
            Activity
          </MenuItem>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)', my: 1 }} />

          <MenuItem
            onClick={handleSignOut}
            sx={{
              color: '#ef4444',
              fontSize: '0.875rem',
              fontWeight: 800,
              py: 1.25,
              '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
            }}
          >
            <Logout sx={{ mr: 1, fontSize: '1.25rem' }} />
            Sign Out
          </MenuItem>
        </Menu>

        <EcosystemPortal 
          open={isPortalOpen} 
          onClose={() => setIsPortalOpen(false)} 
        />
      </Box>
    </Box>
  );
}
