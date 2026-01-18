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
} from '@mui/material';
import { Logout, Settings, ArrowBack, Fingerprint, History } from '@mui/icons-material';

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
  const router = useRouter();
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
      <Typography
        sx={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: dynamicColors.primary,
          cursor: 'pointer',
        }}
        onClick={() => router.push('/')}
      >
        {appName}
      </Typography>

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
              fontWeight: 600,
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
              backgroundColor: dynamicColors.secondary,
              border: `1px solid ${borderColor}`,
              mt: 1,
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
                      fontWeight: 600,
                    }}
                  >
                    {getInitials()}
                  </Avatar>
                  <Stack spacing={0.5}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: textColor }}>
                      {userName}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: dynamicColors.foreground }}>
                      {userEmail}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
              <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 1 }} />
            </>
          )}

          {/* Menu Items */}
          {getBackUrl() && (
            <MenuItem
              onClick={handleBackToApp}
              sx={{
                color: dynamicColors.primary,
                fontSize: '0.875rem',
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
              '&:hover': { backgroundColor: hoverBg },
            }}
          >
            <History sx={{ mr: 1, fontSize: '1.25rem' }} />
            Activity
          </MenuItem>

          <Divider sx={{ borderColor: borderColor, my: 1 }} />

          <MenuItem
            onClick={handleSignOut}
            sx={{
              color: '#ef4444',
              fontSize: '0.875rem',
              '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
            }}
          >
            <Logout sx={{ mr: 1, fontSize: '1.25rem' }} />
            Sign Out
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
