'use client';

import { colors } from '@/lib/colors';
import { useState, useEffect } from 'react';
import { account, AppwriteService } from '@/lib/appwrite';
import { useTheme, useColors } from '@/lib/theme-context';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Switch,
  Alert,
  AlertTitle,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';

interface PrefsData {
  language?: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
  emailNotifications?: boolean;
  sessionReminders?: boolean;
  dataCollection?: boolean;
  marketingEmails?: boolean;
  publicProfile?: boolean;
}

interface PreferencesManagerProps {
  onSave?: () => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'US/Eastern', label: 'Eastern Time' },
  { value: 'US/Central', label: 'Central Time' },
  { value: 'US/Mountain', label: 'Mountain Time' },
  { value: 'US/Pacific', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function PreferencesManager({ onSave }: PreferencesManagerProps) {
  const dynamicColors = useColors();
  const { setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allPrefs, setAllPrefs] = useState<Record<string, any>>({});
  const [prefs, setPrefs] = useState<PrefsData>({
    language: 'en',
    timezone: 'UTC',
    theme: 'system',
    emailNotifications: true,
    sessionReminders: true,
    dataCollection: false,
    marketingEmails: false,
    publicProfile: true,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const appPrefs = await account.getPrefs();
      setAllPrefs(appPrefs || {});
      setPrefs({
        language: appPrefs?.language || 'en',
        timezone: appPrefs?.timezone || 'UTC',
        theme: appPrefs?.theme || 'system',
        emailNotifications: appPrefs?.emailNotifications !== false,
        sessionReminders: appPrefs?.sessionReminders !== false,
        dataCollection: appPrefs?.dataCollection === true,
        marketingEmails: appPrefs?.marketingEmails === true,
        publicProfile: appPrefs?.publicProfile !== false,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof PrefsData, value: any) => {
    try {
      setError(null);
      const updatedUIPrefs = { ...prefs, [key]: value };
      setPrefs(updatedUIPrefs);
      
      // Merge with ALL existing prefs
      const updatedAllPrefs = { ...allPrefs, [key]: value };
      setAllPrefs(updatedAllPrefs);
      
      await account.updatePrefs(updatedAllPrefs);

      // Sync to global directory if discoverability changed
      if (key === 'publicProfile' || key === 'language') {
        const user = await account.get();
        await AppwriteService.syncGlobalProfile(user, updatedAllPrefs);
      }

      onSave?.();
    } catch (err) {
      setError((err as Error).message);
      // Reload from server on error
      loadPreferences();
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    try {
      setError(null);
      const updatedUIPrefs = { ...prefs, theme: newTheme };
      setPrefs(updatedUIPrefs);
      
      // Merge with ALL existing prefs
      const updatedAllPrefs = { ...allPrefs, theme: newTheme };
      setAllPrefs(updatedAllPrefs);
      
      await account.updatePrefs(updatedAllPrefs);
      await setTheme(newTheme);
      onSave?.();
    } catch (err) {
      setError((err as Error).message);
      // Reload from server on error
      loadPreferences();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={40} sx={{ color: dynamicColors.primary }} />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Localization Settings */}
        <Box>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, mb: 2, color: 'white' }}>
            Language & Timezone
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontSize: '0.875rem', color: dynamicColors.foreground, mb: 1 }}>
                Language
              </Typography>
              <Select
                value={prefs.language || 'en'}
                onChange={(e) => updatePreference('language', e.target.value)}
                sx={{
                  backgroundColor: dynamicColors.secondary,
                  color: 'white',
                  borderRadius: '0.5rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: dynamicColors.primary,
                  },
                  '& .MuiSvgIcon-root': {
                    color: dynamicColors.primary,
                  },
                }}
              >
                {LANGUAGES.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Box>
              <Typography sx={{ fontSize: '0.875rem', color: dynamicColors.foreground, mb: 1 }}>
                Timezone
              </Typography>
              <Select
                value={prefs.timezone || 'UTC'}
                onChange={(e) => updatePreference('timezone', e.target.value)}
                sx={{
                  backgroundColor: dynamicColors.secondary,
                  color: 'white',
                  borderRadius: '0.5rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: dynamicColors.primary,
                  },
                  '& .MuiSvgIcon-root': {
                    color: dynamicColors.primary,
                  },
                }}
              >
                {TIMEZONES.map((tz) => (
                  <MenuItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Discoverability Settings */}
        <Box>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, mb: 2, color: 'white' }}>
            Discoverability
          </Typography>
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                backgroundColor: dynamicColors.secondary,
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '0.875rem', color: 'white' }}>
                  Public Profile
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: dynamicColors.foreground }}>
                  Allow other users to find you by name or username
                </Typography>
              </Box>
              <Switch
                checked={prefs.publicProfile !== false}
                onChange={(e) => updatePreference('publicProfile', e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: dynamicColors.primary },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: dynamicColors.primary,
                  },
                }}
              />
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Notification Settings */}
        <Box>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, mb: 2, color: 'white' }}>
            Notifications
          </Typography>
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                backgroundColor: dynamicColors.secondary,
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '0.875rem', color: 'white' }}>
                  Email Notifications
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: dynamicColors.foreground }}>
                  Receive emails about account activity
                </Typography>
              </Box>
              <Switch
                checked={prefs.emailNotifications !== false}
                onChange={(e) => updatePreference('emailNotifications', e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: dynamicColors.primary },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: dynamicColors.primary,
                  },
                }}
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                backgroundColor: dynamicColors.secondary,
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '0.875rem', color: 'white' }}>
                  Session Reminders
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: dynamicColors.foreground }}>
                  Get reminded about active sessions
                </Typography>
              </Box>
              <Switch
                checked={prefs.sessionReminders !== false}
                onChange={(e) => updatePreference('sessionReminders', e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: dynamicColors.primary },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: dynamicColors.primary,
                  },
                }}
              />
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Privacy Settings */}
        <Box>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, mb: 2, color: 'white' }}>
            Privacy & Data
          </Typography>
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                backgroundColor: dynamicColors.secondary,
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '0.875rem', color: 'white' }}>
                  Data Collection
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: dynamicColors.foreground }}>
                  Allow collection of usage analytics
                </Typography>
              </Box>
              <Switch
                checked={prefs.dataCollection === true}
                onChange={(e) => updatePreference('dataCollection', e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: dynamicColors.primary },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: dynamicColors.primary,
                  },
                }}
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                backgroundColor: dynamicColors.secondary,
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '0.875rem', color: 'white' }}>
                  Marketing Emails
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: dynamicColors.foreground }}>
                  Receive promotional and marketing emails
                </Typography>
              </Box>
              <Switch
                checked={prefs.marketingEmails === true}
                onChange={(e) => updatePreference('marketingEmails', e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: dynamicColors.primary },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: dynamicColors.primary,
                  },
                }}
              />
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Box>
    
  );
}
