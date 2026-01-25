'use client';

import { colors } from '@/lib/colors';
import { useColors } from '@/lib/theme-context';
import { useState, useEffect } from 'react';
import { account, AppwriteService } from '@/lib/appwrite';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface EditUsernameModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onSuccess: (newName: string) => void;
}

export default function EditUsernameModal({
  isOpen,
  currentName,
  onClose,
  onSuccess,
}: EditUsernameModalProps) {
  const dynamicColors = useColors();
  const [newName, setNewName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNewName(currentName);
      setIsAvailable(null);
      setError(null);
      return;
    }

    if (newName.trim() === currentName || !newName.trim()) {
      setIsAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      const available = await AppwriteService.checkUsernameAvailability(newName.trim());
      setIsAvailable(available);
      setChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [newName, isOpen, currentName]);

  const handleUpdate = async () => {
    if (!newName.trim()) {
      setError('Username cannot be empty');
      return;
    }

    if (newName.trim() === currentName) {
      onClose();
      return;
    }

    if (isAvailable === false) {
      setError('This username is already taken');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Update the account name
      await account.updateName(newName.trim());
      
      // 2. Update the username and last_username_edit timestamp in prefs
      // This allows all apps in the ecosystem to resolve the username instantly via account.get()
      const currentPrefs = await account.getPrefs();
      const updatedPrefs = {
        ...currentPrefs,
        username: newName.trim().toLowerCase(),
        last_username_edit: new Date().toISOString(),
      };
      await account.updatePrefs(updatedPrefs);

      // 3. Sync to global directory
      const user = await account.get();
      await AppwriteService.syncGlobalProfile(user, updatedPrefs);

      onSuccess(newName.trim());
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundColor: dynamicColors.secondary,
          backgroundImage: 'none',
          borderRadius: '1rem',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }}
    >
      <DialogTitle sx={{ color: 'white', fontWeight: 700 }}>
        Edit Username
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography sx={{ color: dynamicColors.foreground, mb: 2, fontSize: '0.875rem' }}>
            Choose a new username for your account. This name will be visible to other users.
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            value={newName}
            onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/\s/g, ''))}
            disabled={loading}
            autoFocus
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {checking && <CircularProgress size={20} sx={{ color: dynamicColors.primary }} />}
                  {!checking && isAvailable === true && <CheckCircleIcon sx={{ color: '#10b981' }} />}
                  {!checking && isAvailable === false && <ErrorIcon sx={{ color: '#ef4444' }} />}
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': {
                  borderColor: isAvailable === false ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
                },
                '&:hover fieldset': {
                  borderColor: isAvailable === false ? '#ef4444' : 'rgba(255, 255, 255, 0.3)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: isAvailable === false ? '#ef4444' : dynamicColors.primary,
                },
              },
              '& .MuiInputLabel-root': {
                color: dynamicColors.foreground,
                '&.Mui-focused': {
                  color: isAvailable === false ? '#ef4444' : dynamicColors.primary,
                },
              },
            }}
          />
          {isAvailable === false && (
            <Typography sx={{ color: '#ef4444', fontSize: '0.75rem', mt: 0.5, ml: 1 }}>
              This username is already taken.
            </Typography>
          )}
          {isAvailable === true && (
            <Typography sx={{ color: '#10b981', fontSize: '0.75rem', mt: 0.5, ml: 1 }}>
              Username is available!
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={onClose}
          sx={{
            color: 'white',
            textTransform: 'none',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpdate}
          variant="contained"
          disabled={loading || checking || !newName.trim() || newName === currentName || isAvailable === false}
          sx={{
            backgroundColor: dynamicColors.primary,
            color: dynamicColors.secondary,
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: '0.5rem',
            px: 3,
            '&:hover': { backgroundColor: '#ffd633' },
            '&.Mui-disabled': {
              backgroundColor: 'rgba(249, 200, 6, 0.3)',
              color: 'rgba(0, 0, 0, 0.3)',
            },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
