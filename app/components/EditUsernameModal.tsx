'use client';

import { colors } from '@/lib/colors';
import { useColors } from '@/lib/theme-context';
import { useState } from 'react';
import { account } from '@/lib/appwrite';
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
} from '@mui/material';

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
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    if (!newName.trim()) {
      setError('Username cannot be empty');
      return;
    }

    if (newName.trim() === currentName) {
      onClose();
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
      await account.updatePrefs({
        ...currentPrefs,
        username: newName.trim().toLowerCase(),
        last_username_edit: new Date().toISOString(),
      });

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
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: dynamicColors.primary,
                },
              },
              '& .MuiInputLabel-root': {
                color: dynamicColors.foreground,
                '&.Mui-focused': {
                  color: dynamicColors.primary,
                },
              },
            }}
          />
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
          disabled={loading || !newName.trim() || newName === currentName}
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
