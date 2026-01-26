'use client';

import { useState, useEffect } from 'react';
import { account, AppwriteService, client } from '@/lib/appwrite';
import { useColors, useTheme } from '@/lib/theme-context';
import { Storage, ID } from 'appwrite';
import {
  Box,
  Typography,
  Avatar,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Stack,
  alpha,
  IconButton,
  Paper,
  Tooltip
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  InfoOutlined as InfoIcon,
  PhotoCamera as PhotoCameraIcon
} from "@mui/icons-material";

const storage = new Storage(client);
const AVATAR_BUCKET_ID = 'profile_pictures';

export default function ProfileManager() {
  const dynamicColors = useColors();
  const { isDark } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [isRemovingPic, setIsRemovingPic] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const userData = await account.get();
      setUser(userData);
      setName(userData.name || '');
      setUsername(userData.prefs?.username || '');
      
      const picId = userData.prefs?.profilePicId;
      if (picId) {
        try {
          const url = storage.getFilePreview(AVATAR_BUCKET_ID, picId, 320, 320);
          setProfilePicUrl(url.toString());
        } catch (e) {
          console.warn('Failed to load avatar preview');
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePic(file);
      setProfilePicUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePic = async () => {
    if (!user?.prefs?.profilePicId) return;
    
    setIsRemovingPic(true);
    setError(null);
    try {
      const oldId = user.prefs.profilePicId;
      
      // Update prefs first
      const newPrefs = { ...user.prefs, profilePicId: null };
      await account.updatePrefs(newPrefs);
      
      // Attempt to delete from storage (best effort)
      try {
        await storage.deleteFile(AVATAR_BUCKET_ID, oldId);
      } catch (e) {
        console.warn('Failed to delete old avatar from storage');
      }
      
      setProfilePicUrl(null);
      setProfilePic(null);
      setUser({ ...user, prefs: newPrefs });
      setSuccess('Profile picture removed');
      
      // Sync to global directory
      await AppwriteService.ensureGlobalProfile({ ...user, prefs: newPrefs }, true);
    } catch (err) {
      setError('Failed to remove profile picture');
    } finally {
      setIsRemovingPic(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      let currentPrefs = { ...(user.prefs || {}) };
      let updatedUser = { ...user };

      // 1. Handle Profile Picture Upload
      if (profilePic) {
        try {
          const uploadedFile = await storage.createFile(AVATAR_BUCKET_ID, ID.unique(), profilePic);
          const oldId = currentPrefs.profilePicId;
          
          currentPrefs.profilePicId = uploadedFile.$id;
          await account.updatePrefs(currentPrefs);
          
          if (oldId) {
            try { await storage.deleteFile(AVATAR_BUCKET_ID, oldId); } catch (e) {}
          }
        } catch (e) {
          throw new Error('Failed to upload profile picture');
        }
      }

      // 2. Handle Name Update
      if (name !== user.name) {
        await account.updateName(name);
        updatedUser.name = name;
      }

      // 3. Handle Username Update
      const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
      if (cleanUsername !== (user.prefs?.username || '')) {
        currentPrefs.username = cleanUsername;
        currentPrefs.last_username_edit = new Date().toISOString();
        await account.updatePrefs(currentPrefs);
      }

      const finalUser = { ...updatedUser, prefs: currentPrefs };
      setUser(finalUser);
      setProfilePic(null);
      
      // 4. Force sync to global directory (WhisperrConnect)
      await AppwriteService.ensureGlobalProfile(finalUser, true);
      
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} sx={{ color: dynamicColors.primary }} />
      </Box>
    );
  }

  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : user?.email?.[0].toUpperCase();

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={6} alignItems={{ xs: 'center', md: 'flex-start' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ position: 'relative', mb: 3 }}>
            <Avatar
              src={profilePicUrl || undefined}
              sx={{
                width: 160,
                height: 160,
                border: `4px solid ${dynamicColors.primary}`,
                boxShadow: `0 0 30px ${alpha(dynamicColors.primary, 0.2)}`,
                bgcolor: dynamicColors.primary,
                color: dynamicColors.secondary,
                fontSize: '3rem',
                fontWeight: 900
              }}
            >
              {!profilePicUrl && initials}
            </Avatar>
            <IconButton
              component="label"
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'white',
                color: 'black',
                '&:hover': { bgcolor: '#f0f0f0' },
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <input hidden accept="image/*" type="file" onChange={handleFileChange} />
              <PhotoCameraIcon />
            </IconButton>
          </Box>

          <Stack direction="row" spacing={1} justifyContent="center">
            {user?.prefs?.profilePicId && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleRemovePic}
                disabled={isRemovingPic || saving}
                sx={{ borderRadius: '8px', textTransform: 'none' }}
              >
                Remove
              </Button>
            )}
          </Stack>
        </Box>

        <Stack spacing={4} sx={{ flex: 1, width: '100%' }}>
          <TextField
            label="Display Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                borderRadius: '12px',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                '&:hover fieldset': { borderColor: dynamicColors.primary },
              },
              '& .MuiInputLabel-root': { color: dynamicColors.foreground }
            }}
          />

          <Box>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              fullWidth
              variant="outlined"
              placeholder="username"
              InputProps={{
                startAdornment: <Typography sx={{ color: 'rgba(255, 255, 255, 0.3)', mr: 0.5 }}>@</Typography>
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  borderRadius: '12px',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover fieldset': { borderColor: dynamicColors.primary },
                },
                '& .MuiInputLabel-root': { color: dynamicColors.foreground }
              }}
            />
            {user?.prefs?.last_username_edit && (
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <InfoIcon sx={{ fontSize: '0.875rem' }} />
                Last changed on {new Date(user.prefs.last_username_edit).toLocaleDateString()}
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving || (name === user.name && username === (user.prefs?.username || '') && !profilePic)}
            sx={{
              py: 1.5,
              borderRadius: '12px',
              bgcolor: dynamicColors.primary,
              color: dynamicColors.secondary,
              fontWeight: 900,
              textTransform: 'none',
              '&:hover': { bgcolor: alpha(dynamicColors.primary, 0.8) }
            }}
          >
            {saving ? 'Saving Changes...' : 'Save Profile'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
