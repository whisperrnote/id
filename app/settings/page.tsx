'use client';

import { colors, colorsDark } from '@/lib/colors';
import { useColors, useTheme } from '@/lib/theme-context';
import { useEffect, useState, Suspense } from 'react';
import { account, AppwriteService } from '@/lib/appwrite';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSource } from '@/lib/source-context';
import Topbar from '@/app/components/Topbar';
import { LogoutDialog } from '@/app/components/LogoutDialog';
import PasskeyList from '@/app/components/PasskeyList';
import AddPasskeyModal from '@/app/components/AddPasskeyModal';
import RenamePasskeyModal from '@/app/components/RenamePasskeyModal';
import EditUsernameModal from '@/app/components/EditUsernameModal';
import WalletManager from '@/app/components/WalletManager';
import PreferencesManager from '@/app/components/PreferencesManager';
import SessionsManager from '@/app/components/SessionsManager';
import ActivityLogs from '@/app/components/ActivityLogs';
import ConnectedIdentities from '@/app/components/ConnectedIdentities';
import MasterPassManager from '@/app/components/MasterPassManager';
import { listPasskeys } from '@/lib/passkey-client-utils';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Stack,
  Grid,
  Alert,
  AlertTitle,
  Switch,
  Divider,
  IconButton,
  Drawer,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Person, Lock, Settings as SettingsIcon, AccountBalanceWallet, Fingerprint, History, Link, ArrowBack, Menu as MenuIcon, InfoOutlined } from '@mui/icons-material';

interface UserData {
  email: string;
  name: string;
  userId: string;
  lastUsernameEdit?: string;
}

interface Passkey {
  id: string;
  name: string;
  createdAt: number;
  lastUsedAt: number | null;
  status: 'active' | 'disabled' | 'compromised';
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: '100vh', backgroundColor: colorsDark.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: colorsDark.primary }} />
      </Box>
    }>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const dynamicColors = useColors();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadingPasskeys, setLoadingPasskeys] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editUsernameModalOpen, setEditUsernameModalOpen] = useState(false);
  const [selectedPasskey, setSelectedPasskey] = useState<Passkey | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'sessions' | 'activity' | 'identities' | 'preferences' | 'account'>('profile');
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ label: string, color: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSource, getBackUrl } = useSource();
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Auth System';

  useEffect(() => {
    if (user?.userId) {
      checkInitialStatus();
    }
  }, [user?.userId, user?.name]);

  const checkInitialStatus = async () => {
    try {
      const status = await AppwriteService.getGlobalProfileStatus(user!.userId);
      if (!status.exists) {
        const suggestion = user!.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
        setProfileStatus({ 
          label: `Profile missing from directory. Clicking below will link you as @${suggestion}.`, 
          color: dynamicColors.primary 
        });
      } else {
        setProfileStatus({ 
          label: `Correctly linked in directory as @${status.profile.username}`, 
          color: '#10b981' 
        });
      }
    } catch (e) {
      setProfileStatus({ label: 'Unable to verify directory status.', color: '#ef4444' });
    }
  };

  const handleFixDiscoverability = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    setError(null);
    try {
      const userData = await account.get();
      const result = await AppwriteService.ensureGlobalProfile(userData);
      setSyncSuccess(true);
      setProfileStatus({ 
        label: `Successfully synced! Your global username is now @${result.username}`, 
        color: '#10b981' 
      });
      // Refresh user to update the UI username field immediately
      setUser(prev => prev ? { ...prev, name: result.username } : null);
      setTimeout(() => setSyncSuccess(false), 5000);
    } catch (err: any) {
      console.error('Manual sync failed:', err);
      setError(`Sync failed: ${err.message || 'Check your connection.'}`);
    } finally {
      setSyncing(false);
    }
  };
  
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const hoverBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const hoverBgStrong = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const textColor = isDark ? 'white' : '#333333';

  const loadPasskeys = async (email: string) => {
    setLoadingPasskeys(true);
    setError(null);
    try {
      const data = await listPasskeys(email);
      setPasskeys(data);
    } catch (err) {
      setError((err as Error).message);
      setPasskeys([]);
    } finally {
      setLoadingPasskeys(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function initializeSettings() {
      try {
        const source = searchParams.get('source');
        if (source) {
          setSource(source);
        }

        const userData = await account.get();
        if (mounted) {
          setUser({
            email: userData.email,
            name: userData.prefs?.username || userData.name || userData.email.split('@')[0],
            userId: userData.$id,
            lastUsernameEdit: userData.prefs?.last_username_edit,
          });
          
          setWalletAddress(userData.prefs?.walletEth || null);
          
          await loadPasskeys(userData.email);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setLoading(false);
          const source = searchParams.get('source');
          router.replace('/login' + (source ? `?source=${encodeURIComponent(source)}` : ''));
        }
      }
    }
    initializeSettings();
    return () => { mounted = false; };
  }, [router, searchParams, setSource]);

  const handleAddPasskeySuccess = async () => {
    if (user) {
      await loadPasskeys(user.email);
    }
  };

  const handleRenameClick = (passkey: Passkey) => {
    setSelectedPasskey(passkey);
    setRenameModalOpen(true);
  };

  const handleRenameSuccess = async () => {
    if (user) {
      await loadPasskeys(user.email);
    }
  };

  const handleSignOut = async () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutComplete = () => {
    localStorage.removeItem('id_redirect_source');
    const source = searchParams.get('source');
    if (source) {
      router.replace(`/login?source=${encodeURIComponent(source)}`);
    } else {
      router.replace('/login');
    }
  };

  if (loading || !user) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: dynamicColors.background,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ color: dynamicColors.primary }} />
          <Typography sx={{ mt: 2, color: dynamicColors.foreground }}>Loading settings...</Typography>
        </Box>
      </Box>
    );
  }

  const sidebarContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        p: 3,
        backgroundColor: dynamicColors.background,
        height: '100%',
      }}
    >
          {/* User Profile Card */}
          <Box
            sx={{
              p: 2,
              borderRadius: '0.75rem',
              backgroundColor: dynamicColors.secondary,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
              mb: 4,
            }}
          >
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: dynamicColors.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: dynamicColors.primary,
                  fontSize: '20px',
                  flexShrink: 0,
                }}
              >
                👤
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 500, color: textColor }}>
                  {user.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    color: dynamicColors.foreground,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.email}
                </Typography>
              </Box>
            </Box>

            {/* Navigation Items */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 3 }}>
              {/* Back to App */}
              {getBackUrl() && (
                <>
                  <Box
                    onClick={() => {
                      const backUrl = getBackUrl();
                      if (backUrl) window.location.href = backUrl;
                    }}
                    sx={{
                      display: 'flex',
                      gap: 2,
                      alignItems: 'center',
                      p: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      '&:hover': { 
                        backgroundColor: hoverBg,
                      },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <ArrowBack sx={{ color: dynamicColors.primary, fontSize: 20 }} />
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: dynamicColors.primary,
                      }}
                    >
                      Back to App
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 1, borderColor: borderColor }} />
                </>
              )}

              {[
                { id: 'profile', label: 'Profile', icon: Person },
                { id: 'security', label: 'Security', icon: Lock },
                { id: 'sessions', label: 'Sessions', icon: Fingerprint },
                { id: 'activity', label: 'Activity', icon: History },
                { id: 'identities', label: 'Identities', icon: Link },
                { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
                { id: 'account', label: 'Account', icon: AccountBalanceWallet },
              ].map(({ id, label, icon: Icon }) => (
                <Box
                  key={id}
                  onClick={() => {
                    setActiveTab(id as any);
                    setMobileSidebarOpen(false);
                  }}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                    p: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    backgroundColor: activeTab === id ? 'rgba(249, 200, 6, 0.2)' : 'transparent',
                    boxShadow: activeTab === id ? '0 1px 2px 0 rgb(0 0 0 / 0.2)' : 'none',
                    '&:hover': { 
                      backgroundColor: activeTab === id ? 'rgba(249, 200, 6, 0.2)' : hoverBg,
                    },
                    transition: 'background-color 0.2s, box-shadow 0.2s',
                  }}
                >
                  <Icon sx={{ color: activeTab === id ? dynamicColors.primary : 'white', fontSize: 20 }} />
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: activeTab === id ? dynamicColors.primary : 'white',
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: dynamicColors.background, color: textColor, display: 'flex', flexDirection: 'column' }}>
      <Topbar
        userName={user.name}
        userEmail={user.email}
        onManageAccount={() => {}}
        onSignOut={handleSignOut}
        onSessionsClick={() => setActiveTab('sessions')}
        onActivityClick={() => setActiveTab('activity')}
      />
      
      {/* Mobile Menu Button */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          p: 2,
          borderBottom: `1px solid ${borderColor}`,
          backgroundColor: dynamicColors.background,
        }}
      >
        <IconButton
          onClick={() => setMobileSidebarOpen(true)}
          sx={{
            color: textColor,
            '&:hover': { backgroundColor: hoverBgStrong },
          }}
        >
          <MenuIcon />
        </IconButton>
        <Typography sx={{ ml: 2, lineHeight: '40px', fontSize: '1.125rem', fontWeight: 600, color: textColor }}>
          {activeTab === 'profile' && 'Profile'}
          {activeTab === 'security' && 'Security'}
          {activeTab === 'sessions' && 'Sessions'}
          {activeTab === 'activity' && 'Activity'}
          {activeTab === 'identities' && 'Identities'}
          {activeTab === 'preferences' && 'Preferences'}
          {activeTab === 'account' && 'Account'}
        </Typography>
      </Box>

      {/* Main Container */}
      <Box sx={{ display: 'flex', flex: 1 }}>
        {/* Desktop Sidebar */}
        <Box
          sx={{
            width: { xs: '0', md: '25%' },
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            borderRight: `1px solid ${borderColor}`,
            backgroundColor: dynamicColors.background,
            maxHeight: '100vh',
            overflowY: 'auto',
          }}
        >
          {sidebarContent}
        </Box>

        {/* Mobile Sidebar Drawer */}
        <Drawer
          anchor="left"
          open={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: '80%',
              maxWidth: '320px',
              backgroundColor: dynamicColors.background,
              overflowY: 'auto',
            },
          }}
        >
          {sidebarContent}
        </Drawer>

        {/* Main Content */}
        <Box sx={{ flex: 1, p: { xs: 2, md: 4 }, backgroundColor: dynamicColors.background }}>
          {/* Header */}
          <Box sx={{ mb: 6, display: { xs: 'none', md: 'block' } }}>
            <Typography
              sx={{
                fontSize: '2.25rem',
                fontWeight: 900,
                color: textColor,
                lineHeight: 1.2,
                letterSpacing: '-0.033em',
              }}
            >
              Account Settings
            </Typography>
          </Box>

          {/* Profile Section */}
          {activeTab === 'profile' && (
            <Box>
              <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.375rem' }, fontWeight: 700, mb: 1 }}>Username</Typography>
              <Typography sx={{ fontSize: '0.875rem', color: dynamicColors.foreground, mb: 2 }}>
                This is your public identifier across the ecosystem.
              </Typography>
              <Box
                sx={{
                  backgroundColor: dynamicColors.secondary,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.75rem',
                  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: '1rem',
                    minHeight: '3.5rem',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    <Typography sx={{ fontSize: '1rem', color: textColor, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.name || user.email.split('@')[0]}
                    </Typography>
                  </Box>
                  <Button
                    onClick={() => setEditUsernameModalOpen(true)}
                    sx={{
                      color: dynamicColors.primary,
                      fontSize: '1rem',
                      fontWeight: 500,
                      textTransform: 'none',
                      borderRadius: '0.5rem',
                      '&:hover': { backgroundColor: 'rgba(249, 200, 6, 0.1)', textDecoration: 'underline' },
                    }}
                  >
                    Edit
                  </Button>
                </Box>
              </Box>
              
              {user.lastUsernameEdit && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, ml: 1 }}>
                  <Tooltip title="This is when you last updated your public name." arrow>
                    <InfoOutlined sx={{ fontSize: '0.875rem', color: dynamicColors.foreground, cursor: 'help' }} />
                  </Tooltip>
                  <Typography sx={{ fontSize: '0.75rem', color: dynamicColors.foreground }}>
                    Last edited on {new Date(user.lastUsernameEdit).toLocaleDateString()} at {new Date(user.lastUsernameEdit).toLocaleTimeString()}
                  </Typography>
                </Box>
              )}

              <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.375rem' }, fontWeight: 700, mb: 3, mt: 6 }}>Email</Typography>
              <Box
                sx={{
                  backgroundColor: dynamicColors.secondary,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.75rem',
                  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                  overflow: 'hidden',
                  p: 2,
                }}
              >
                <Typography sx={{ fontSize: '1rem', color: textColor }}>
                  {user.email}
                </Typography>
              </Box>

              <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.375rem' }, fontWeight: 700, mb: 3, mt: 6 }}>User ID</Typography>
              <Box
                sx={{
                  backgroundColor: dynamicColors.secondary,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.75rem',
                  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                  overflow: 'hidden',
                  p: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      color: dynamicColors.foreground,
                      fontFamily: 'monospace',
                      flex: 1,
                      wordBreak: 'break-all',
                    }}
                  >
                    {user.userId}
                  </Typography>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(user.userId);
                    }}
                    variant="contained"
                    sx={{
                      backgroundColor: dynamicColors.primary,
                      color: dynamicColors.secondary,
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      borderRadius: '0.5rem',
                      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                      whiteSpace: 'nowrap',
                      '&:hover': { 
                        backgroundColor: '#ffd633',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
                      },
                    }}
                  >
                    Copy
                  </Button>
                </Box>
              </Box>

              <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.375rem' }, fontWeight: 700, mb: 3, mt: 6 }}>Ecosystem Discoverability</Typography>
              <Box
                sx={{
                  backgroundColor: dynamicColors.secondary,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.75rem',
                  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                  overflow: 'hidden',
                  p: 3,
                }}
              >
                <Typography sx={{ fontSize: '1rem', color: textColor, mb: 1, fontWeight: 600 }}>
                  Global Profile Status
                </Typography>
                
                {profileStatus && (
                  <Typography sx={{ fontSize: '0.875rem', color: profileStatus.color, mb: profileStatus.label.includes('Correctly linked') ? 0 : 2, fontWeight: 700 }}>
                    {profileStatus.label}
                  </Typography>
                )}

                {!profileStatus?.label.includes('Correctly linked') && (
                  <>
                    <Typography sx={{ fontSize: '0.875rem', color: dynamicColors.foreground, mb: 3 }}>
                      If other users cannot find you in Note or Connect, use this to force a refresh of your global ecosystem profile.
                    </Typography>
                    <Button
                      onClick={handleFixDiscoverability}
                      disabled={syncing}
                      variant="outlined"
                      sx={{
                        borderColor: syncSuccess ? '#10b981' : dynamicColors.primary,
                        color: syncSuccess ? '#10b981' : dynamicColors.primary,
                        fontWeight: 700,
                        '&:hover': {
                          borderColor: syncSuccess ? '#059669' : '#ffd633',
                          backgroundColor: 'rgba(249, 200, 6, 0.05)',
                        }
                      }}
                    >
                      {syncing ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                      {syncSuccess ? 'Profile Synced!' : 'Fix Discoverability'}
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          )}

          {/* Security Section */}
          {activeTab === 'security' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Master Pass Central */}
              <Box>
                <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.375rem' }, fontWeight: 700, mb: 3 }}>
                  Global Encryption Control
                </Typography>
                <Box
                  sx={{
                    backgroundColor: dynamicColors.secondary,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    p: 3,
                  }}
                >
                  <MasterPassManager userId={user.userId} />
                </Box>
              </Box>

              {/* Passkeys */}
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'stretch', sm: 'center' },
                    gap: 2,
                    mb: 3,
                  }}
                >
                  <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.375rem' }, fontWeight: 700 }}>Passkeys</Typography>
                  <Button
                    onClick={() => setAddModalOpen(true)}
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{
                      backgroundColor: dynamicColors.primary,
                      color: dynamicColors.secondary,
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      borderRadius: '0.5rem',
                      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                      '&:hover': { 
                        backgroundColor: '#ffd633',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
                      },
                    }}
                  >
                    Add Passkey
                  </Button>
                </Box>

                {loadingPasskeys && (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <CircularProgress size={40} sx={{ color: dynamicColors.primary }} />
                    <Typography sx={{ mt: 2, color: dynamicColors.foreground }}>Loading passkeys...</Typography>
                  </Box>
                )}

                {!loadingPasskeys && passkeys.length === 0 && !error && (
                  <Box
                    sx={{
                      backgroundColor: dynamicColors.secondary,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.75rem',
                      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                      p: 3,
                      textAlign: 'center',
                    }}
                  >
                    <Typography sx={{ color: dynamicColors.foreground }}>No passkeys yet. Add one to get started.</Typography>
                  </Box>
                )}

                {passkeys.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <PasskeyList
                      passkeys={passkeys}
                      email={user.email}
                      onUpdate={() => loadPasskeys(user.email)}
                      onRenameClick={handleRenameClick}
                    />
                  </Box>
                )}

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    <AlertTitle>Error</AlertTitle>
                    {error}
                  </Alert>
                )}
              </Box>

              {/* Wallets */}
              <Box>
                <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.375rem' }, fontWeight: 700, mb: 3 }}>
                  Connected Wallet
                </Typography>
                <Box
                  sx={{
                    backgroundColor: dynamicColors.secondary,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    p: 3,
                  }}
                >
                  {user && (
                    <WalletManager
                      userId={user.userId}
                      connectedWallet={walletAddress || undefined}
                      onWalletConnected={(address) => {
                        setWalletAddress(address);
                      }}
                      onWalletDisconnected={() => {
                        setWalletAddress(null);
                      }}
                    />
                  )}
                </Box>
              </Box>

              {/* MFA */}
              <Box>
                <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.375rem' }, fontWeight: 700, mb: 3 }}>Multi-Factor Authentication (MFA)</Typography>
                <Box
                  sx={{
                    backgroundColor: dynamicColors.secondary,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                    p: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: '1rem', fontWeight: 500, color: textColor }}>
                        Multi-Factor Authentication (MFA)
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: dynamicColors.foreground, mt: 0.5 }}>
                        Add an extra layer of security to your account.
                      </Typography>
                    </Box>
                    <Switch
                      checked={mfaEnabled}
                      onChange={(e) => setMfaEnabled(e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: dynamicColors.primary,
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: dynamicColors.primary,
                        },
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* Sessions Section */}
          {activeTab === 'sessions' && (
            <Box sx={{ space: 4 }}>
              <Box sx={{ mb: 6 }}>
                <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.375rem' }, fontWeight: 700, mb: 3 }}>
                  Active Sessions
                </Typography>
                <Box
                  sx={{
                    backgroundColor: dynamicColors.secondary,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                    p: 3,
                  }}
                >
                  <SessionsManager />
                </Box>
              </Box>
            </Box>
          )}

          {/* Activity Section */}
          {activeTab === 'activity' && (
            <Box sx={{ space: 4 }}>
              <Box sx={{ mb: 6 }}>
                <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.375rem' }, fontWeight: 700, mb: 3 }}>
                  Activity Logs
                </Typography>
                <Box
                  sx={{
                    backgroundColor: dynamicColors.secondary,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                    p: 3,
                  }}
                >
                  <ActivityLogs />
                </Box>
              </Box>
            </Box>
          )}

          {/* Connected Identities Section */}
          {activeTab === 'identities' && (
            <Box sx={{ space: 4 }}>
              <Box sx={{ mb: 6 }}>
                <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.375rem' }, fontWeight: 700, mb: 3 }}>
                  Connected Identities
                </Typography>
                <Box
                  sx={{
                    backgroundColor: dynamicColors.secondary,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                    p: 3,
                  }}
                >
                  <ConnectedIdentities />
                </Box>
              </Box>
            </Box>
          )}

          {/* Preferences Section */}
          {activeTab === 'preferences' && (
            <Box sx={{ space: 4 }}>
              <Box sx={{ mb: 6 }}>
                <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.375rem' }, fontWeight: 700, mb: 3 }}>
                  Preferences
                </Typography>
                <Box
                  sx={{
                    backgroundColor: dynamicColors.secondary,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                    p: 3,
                  }}
                >
                  <PreferencesManager />
                </Box>
              </Box>
            </Box>
          )}

          {/* Account Section */}
          {activeTab === 'account' && (
            <Box>
              <Typography sx={{ fontSize: { xs: '1.125rem', md: '1.375rem' }, fontWeight: 700, mb: 3 }}>Account</Typography>
              
              <Box
                sx={{
                  backgroundColor: dynamicColors.secondary,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.75rem',
                  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
                  overflow: 'hidden',
                  divide: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography sx={{ fontSize: '1rem', fontWeight: 500, color: textColor }}>
                        Export Data
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: dynamicColors.foreground, mt: 0.5 }}>
                        Download a copy of your account data.
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      sx={{
                        color: textColor,
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textTransform: 'none',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.2)',
                        '&:hover': { 
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                          boxShadow: '0 2px 4px 0 rgb(0 0 0 / 0.3)',
                        },
                      }}
                    >
                      Export
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography sx={{ fontSize: '1rem', fontWeight: 500, color: textColor }}>
                        Delete Account
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: dynamicColors.foreground, mt: 0.5 }}>
                        Permanently delete your account and all associated data.
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      sx={{
                        color: '#ef4444',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textTransform: 'none',
                        borderRadius: '0.5rem',
                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.2)',
                        '&:hover': {
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          borderColor: 'rgba(239, 68, 68, 0.5)',
                          boxShadow: '0 2px 4px 0 rgb(0 0 0 / 0.3)',
                        },
                      }}
                    >
                      Delete Account
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Modals */}
      <AddPasskeyModal
        isOpen={addModalOpen}
        email={user?.email || ''}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleAddPasskeySuccess}
      />

      <RenamePasskeyModal
        isOpen={renameModalOpen}
        passkey={selectedPasskey}
        email={user?.email || ''}
        onClose={() => {
          setRenameModalOpen(false);
          setSelectedPasskey(null);
        }}
        onSuccess={handleRenameSuccess}
      />

      <EditUsernameModal
        isOpen={editUsernameModalOpen}
        currentName={user?.name || ''}
        onClose={() => setEditUsernameModalOpen(false)}
        onSuccess={(newName) => {
          setUser(prev => prev ? { 
            ...prev, 
            name: newName,
            lastUsernameEdit: new Date().toISOString()
          } : null);
        }}
      />

      <LogoutDialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        onLogoutComplete={handleLogoutComplete}
      />
    </Box>
  );
}
