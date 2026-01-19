'use client';
import { useColors } from '@/lib/theme-context';

import { useState, useEffect } from 'react';
import { account } from '@/lib/appwrite';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Models } from 'appwrite';

type Identity = Models.Identity;

interface ConnectedIdentitiesProps {
  onIdentitiesLoaded?: (count: number) => void;
}

const PROVIDER_LOGOS: Record<string, string> = {
  google: '🔵',
  github: '⚫',
  facebook: '👍',
  apple: '🍎',
  discord: '💜',
  twitter: '🐦',
  microsoft: '💻',
  linkedin: '💼',
  amazon: '🛒',
  reddit: '🔴',
  twitch: '💬',
  spotify: '🎵',
};

const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  facebook: 'Facebook',
  apple: 'Apple',
  discord: 'Discord',
  twitter: 'Twitter/X',
  microsoft: 'Microsoft',
  linkedin: 'LinkedIn',
  amazon: 'Amazon',
  reddit: 'Reddit',
  twitch: 'Twitch',
  spotify: 'Spotify',
};

export default function ConnectedIdentities({ onIdentitiesLoaded }: ConnectedIdentitiesProps) {
  const dynamicColors = useColors();
  const [loading, setLoading] = useState(true);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState<Identity | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadIdentities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadIdentities = async () => {
    try {
      setLoading(true);
      setError(null);
      const identityList = await account.listIdentities();
      setIdentities(identityList.identities || []);
      onIdentitiesLoaded?.((identityList.identities || []).length);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (identity: Identity) => {
    setSelectedIdentity(identity);
    setDeleteDialogOpen(true);
  };

  const handleDeleteIdentity = async () => {
    if (!selectedIdentity) return;
    try {
      setDeleting(true);
      setError(null);
      await account.deleteIdentity(selectedIdentity.$id);
      setIdentities(identities.filter((i) => i.$id !== selectedIdentity.$id));
      setDeleteDialogOpen(false);
      setSelectedIdentity(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const getProviderLogo = (provider: string): string => {
    return PROVIDER_LOGOS[provider] || '🔗';
  };

  const getProviderName = (provider: string): string => {
    return PROVIDER_NAMES[provider] || provider;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading && identities.length === 0) {
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

      {identities.length === 0 ? (
        <Box
          sx={{
            backgroundColor: dynamicColors.secondary,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.75rem',
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ color: dynamicColors.foreground }}>
            No connected identities. Connect a social account to link your profile.
          </Typography>
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography sx={{ color: dynamicColors.foreground, fontSize: '0.875rem' }}>
              {identities.length} connected {identities.length === 1 ? 'identity' : 'identities'}
            </Typography>
            <Button
              onClick={loadIdentities}
              disabled={loading}
              startIcon={<RefreshIcon />}
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                fontSize: '0.75rem',
                fontWeight: 500,
                textTransform: 'none',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '&:hover': { borderColor: 'rgba(255, 255, 255, 0.3)' },
              }}
            >
              Refresh
            </Button>
          </Box>

          <Stack spacing={2}>
            {identities.map((identity) => (
              <Box
                key={identity.$id}
                sx={{
                  backgroundColor: dynamicColors.secondary,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.75rem',
                  p: 3,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: '0.5rem',
                        backgroundColor: 'rgba(249, 200, 6, 0.1)',
                        fontSize: '1.5rem',
                      }}
                    >
                      {getProviderLogo(identity.provider)}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'white' }}>
                        {getProviderName(identity.provider)}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: dynamicColors.foreground }}>
                        {identity.providerEmail || identity.providerUid}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.65rem', color: dynamicColors.foreground, textTransform: 'uppercase' }}>
                        Connected
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'white' }}>
                        {formatDate(identity.createdAt)}
                      </Typography>
                    </Box>
                    {identity.providerAccessTokenExpiry && (
                      <Box>
                        <Typography sx={{ fontSize: '0.65rem', color: dynamicColors.foreground, textTransform: 'uppercase' }}>
                          Token Expires
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'white' }}>
                          {formatDate(identity.providerAccessTokenExpiry)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Button
                  onClick={() => handleDeleteClick(identity)}
                  startIcon={<DeleteIcon />}
                  sx={{
                    color: '#ef4444',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      borderColor: 'rgba(239, 68, 68, 0.5)',
                    },
                  }}
                >
                  Disconnect
                </Button>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: dynamicColors.secondary,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.75rem',
          },
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>Disconnect Identity</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: dynamicColors.foreground, mt: 2 }}>
            Are you sure you want to disconnect{' '}
            <Typography component="span" sx={{ color: 'white', fontWeight: 500 }}>
              {selectedIdentity && getProviderName(selectedIdentity.provider)}
            </Typography>
            ? You will no longer be able to login with this account.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: dynamicColors.foreground }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteIdentity}
            disabled={deleting}
            variant="contained"
            sx={{
              backgroundColor: '#ef4444',
              color: 'white',
              '&:hover': { backgroundColor: '#dc2626' },
            }}
          >
            {deleting ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
