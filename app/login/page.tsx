'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Client, Account, OAuthProvider } from 'appwrite';
import { Box, Typography, Stack, TextField, Button, Alert, CircularProgress, IconButton, Tabs, Tab, useMediaQuery, useTheme } from '@mui/material';
import { Visibility, VisibilityOff, Close, VpnKey, Wallet } from '@mui/icons-material';
import { safeCreateSession, safeDeleteCurrentSession } from '@/lib/safe-session';
import { checkSession } from '@/lib/check-session';
import { useColors } from '@/lib/theme-context';
import { useSource } from '@/lib/source-context';

const client = new Client();
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) client.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_APPWRITE_PROJECT) client.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT);
const account = new Account(client);

function bufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string) {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function publicKeyCredentialToJSON(pubKeyCred: unknown): unknown {
  if (Array.isArray(pubKeyCred)) return (pubKeyCred as unknown[]).map(publicKeyCredentialToJSON);
  if (pubKeyCred instanceof ArrayBuffer) return bufferToBase64Url(pubKeyCred);
  if (pubKeyCred && typeof pubKeyCred === 'object') {
    const obj: Record<string, unknown> = {};
    const cred = pubKeyCred as Record<string, unknown>;

    for (const key in cred) {
      try {
        const val = cred[key];
        obj[key] = publicKeyCredentialToJSON(val);
      } catch (e) {
        // Skip properties that can't be serialized (e.g., password manager proxy methods)
        // This allows credentials from problematic password managers to still be processed
      }
    }
    return obj;
  }
  return pubKeyCred;
}

const IDM_AUTH_SUCCESS_EVENT = 'idm:auth-success';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}>
        <CircularProgress sx={{ color: '#00F5FF' }} />
      </Box>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const dynamicColors = useColors();
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { source, setSource, getBackUrl } = useSource();
  const hasNotifiedRef = useRef(false);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [authMethod, setAuthMethod] = useState(0);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);


  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'auth';

  const notifyOpenerAuthSuccess = useCallback((payload: Record<string, unknown> = {}) => {
    if (hasNotifiedRef.current) return;
    if (typeof window === 'undefined') return;
    const opener = window.opener;
    if (!opener || opener.closed) return;
    opener.postMessage({ type: IDM_AUTH_SUCCESS_EVENT, ...payload }, '*');
    hasNotifiedRef.current = true;
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const source = searchParams.get('source');
        if (source) {
          setSource(source);
        }

        const user = await checkSession();
        if (user) {
          notifyOpenerAuthSuccess({ userId: user.$id });
          // User is already logged in
          const source = searchParams.get('source');
          if (source && !window.opener) {
            const url = new URL(source.startsWith('http') ? source : `https://${source}`);
            url.searchParams.set('auth', 'success');
            const redirectUrl = url.toString();
            router.replace(redirectUrl);
          } else {
            setIsSuccess(true);
          }
          return;
        }

      } catch (error) {
        // Session check failed, allow page to load for retry
        console.error('Session check error:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkExistingSession();
  }, [router, searchParams, setSource, notifyOpenerAuthSuccess]);

  // Initialize source from URL (takes priority over localStorage)
  useEffect(() => {
    const source = searchParams.get('source');
    if (source) {
      setSource(source);
    }
  }, [searchParams, setSource]);

  const isValidEmail = useCallback((email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);

    if (typingTimeout) clearTimeout(typingTimeout);

    const isValid = isValidEmail(newEmail);
    const delay = isValid ? 200 : 500;

    const timeout = setTimeout(() => {
      setEmailValid(isValid);
    }, delay);

    setTypingTimeout(timeout);
  };

  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed' && !message) {
      setMessage('OAuth login failed. Please try again.');
    }
  }, [searchParams, message]);

  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setLoading(true);
    setMessage(null);
    try {
      await safeDeleteCurrentSession();

      const source = searchParams.get('source');
      const success = source ? `${window.location.origin}/?source=${encodeURIComponent(source)}` : `${window.location.origin}/`;
      const failure = `${window.location.origin}/login?error=oauth_failed`;
      await account.createOAuth2Session({
        provider,
        success,
        failure,
      });
    } catch (err: any) {
      setMessage(err.message || 'OAuth login failed');
      setLoading(false);
    }
  };

  // Capture session after OAuth returns
  useEffect(() => {
    const captureOAuthSession = async () => {
      try {
        const session = await account.getSession('current');
        const user = await account.get();
        if (session && user) {
          notifyOpenerAuthSuccess({ userId: user.$id });
          // OAuth session established
        }
      } catch (e) {
        // Session not yet established or OAuth in progress
      }
    };

    // Give OAuth a moment to complete
    const timer = setTimeout(captureOAuthSession, 500);
    return () => clearTimeout(timer);
  }, [notifyOpenerAuthSuccess]);

  // Handle password login
  const handlePasswordLogin = async () => {
    if (!emailValid || !password.trim()) {
      setMessage('Please enter a valid email and password');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await safeDeleteCurrentSession();
      const session = await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      if (session && user) {
        notifyOpenerAuthSuccess({ userId: user.$id });
        const source = searchParams.get('source');
        if (source && !window.opener) {
          const url = new URL(source.startsWith('http') ? source : `https://${source}`);
          url.searchParams.set('auth', 'success');
          const redirectUrl = url.toString();
          
          setIsSuccess(true);
          // Give the browser a moment to settle cookies before redirecting
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 800);
        } else {
          setIsSuccess(true);
        }
      }

    } catch (err: any) {
      setMessage(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletLogin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const urlSource = searchParams.get('source');
      if (urlSource && !source) {
        setSource(urlSource);
      }

      if (!window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask.');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      const address = accounts[0];

      const message = `auth-${Date.now()}`;
      const fullMessage = `Sign this message to authenticate: ${message}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [fullMessage, address]
      });

      const { functions } = await import('@/lib/appwrite');
      const execution = await functions.createExecution(
        process.env.NEXT_PUBLIC_FUNCTION_ID!,
        JSON.stringify({ email, address, signature, message }),
        false
      );

      const response = JSON.parse(execution.responseBody);

      if (execution.responseStatusCode !== 200) {
        throw new Error(response.error || 'Authentication failed');
      }

      const { account } = await import('@/lib/appwrite');
      await safeCreateSession(response.userId, response.secret);
      notifyOpenerAuthSuccess({ userId: response.userId || address });

      const rawBackUrl = getBackUrl();
      if (rawBackUrl && !window.opener) {
        const url = new URL(rawBackUrl.startsWith('http') ? rawBackUrl : `https://${rawBackUrl}`);
        url.searchParams.set('auth', 'success');
        const backUrl = url.toString();
        
        setIsSuccess(true);
        setTimeout(() => {
          window.location.href = backUrl;
        }, 800);
      } else {
        setIsSuccess(true);
      }

    } catch (error: any) {
      setMessage(error.message || 'Wallet authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const continueWithPasskey = async () => {
    setMessage(null);
    if (!('credentials' in navigator)) {
      setMessage('WebAuthn is not supported in this browser');
      return;
    }

    const urlSource = searchParams.get('source');
    if (urlSource && !source) {
      setSource(urlSource);
    }

    setLoading(true);
    try {
      const optRes = await fetch('/api/webauthn/auth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: email }),
      });

      if (optRes.status === 429) {
        const retryAfter = optRes.headers.get('Retry-After') || '';
        setMessage(`Too many attempts. Retry after ${retryAfter || 'a moment'}.`);
        return;
      }
      if (optRes.status === 403) {
        const body = await optRes.json().catch(() => ({}));
        setMessage(body?.error || 'Account already connected with wallet');
        return;
      }

      let doRegister = false;
      let authOptions: any = null;
      if (optRes.ok) {
        authOptions = await optRes.json();
        if (!Array.isArray(authOptions.allowCredentials) || authOptions.allowCredentials.length === 0) {
          doRegister = true;
        }
      } else {
        doRegister = true;
      }

      if (!doRegister) {
        const publicKey: any = { ...authOptions };
        publicKey.challenge = base64UrlToBuffer(authOptions.challenge as string);
        if (publicKey.allowCredentials) {
          publicKey.allowCredentials = publicKey.allowCredentials.map((c: any) => ({
            ...c,
            id: base64UrlToBuffer(c.id),
          }));
        }

        try {
          const assertion = await navigator.credentials.get({ publicKey });
          const json = publicKeyCredentialToJSON(assertion);
          const verifyRes = await fetch('/api/webauthn/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: email, assertion: json, challenge: authOptions.challenge, challengeToken: authOptions.challengeToken }),
          });
          const verifyJson = await verifyRes.json();
          if (!verifyRes.ok) {
            if (verifyRes.status === 400 && (verifyJson?.error?.includes('Unknown credential') || verifyJson?.error?.includes('WebAuthn'))) {
              doRegister = true;
            } else if (verifyRes.status === 403) {
              setMessage(verifyJson?.error || 'Account already connected with wallet');
              return;
            } else {
              setMessage(verifyJson?.error || 'Sign-in failed');
              return;
            }
          } else {
            if (verifyJson.token?.secret) {
              await safeCreateSession(verifyJson.token.userId || email, verifyJson.token.secret);
              notifyOpenerAuthSuccess({ userId: verifyJson.token.userId || email });
              const rawBackUrl = getBackUrl();
              if (rawBackUrl && !window.opener) {
                const url = new URL(rawBackUrl.startsWith('http') ? rawBackUrl : `https://${rawBackUrl}`);
                url.searchParams.set('auth', 'success');
                const backUrl = url.toString();
                
                setIsSuccess(true);
                setTimeout(() => {
                  window.location.href = backUrl;
                }, 800);
              } else {
                setIsSuccess(true);
              }
              return;

            }
            setMessage('Sign-in verified. No token returned.');
            return;
          }
        } catch (e) {
          doRegister = true;
        }
      }

      const regRes = await fetch('/api/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: email, userName: email.split('@')[0] || email }),
      });
      if (regRes.status === 429) {
        const retryAfter = regRes.headers.get('Retry-After') || '';
        setMessage(`Too many attempts. Retry after ${retryAfter || 'a moment'}.`);
        return;
      }
      if (regRes.status === 403) {
        const body = await regRes.json().catch(() => ({}));
        setMessage(body?.error || 'Account already connected with wallet');
        return;
      }
      const regOpt = await regRes.json();
      if (!regRes.ok || regOpt?.error) {
        setMessage(regOpt?.error || 'Could not start registration');
        return;
      }

      const regPK: any = { ...regOpt };
      regPK.challenge = base64UrlToBuffer(regOpt.challenge as string);
      if (regPK.user?.id) regPK.user.id = base64UrlToBuffer(regOpt.user.id as string);
      if (regPK.excludeCredentials) {
        regPK.excludeCredentials = regPK.excludeCredentials.map((c: any) => ({ ...c, id: base64UrlToBuffer(c.id) }));
      }

      const created = await navigator.credentials.create({ publicKey: regPK });
      let createdJson: any;
      try {
        const anyCred: any = created as any;
        const toJSON = anyCred?.toJSON;
        createdJson = typeof toJSON === 'function' ? Reflect.apply(toJSON, anyCred, []) : publicKeyCredentialToJSON(created);
      } catch {
        createdJson = publicKeyCredentialToJSON(created);
      }
      const regVerify = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: email, attestation: createdJson, challenge: regOpt.challenge, challengeToken: regOpt.challengeToken }),
      });
      const regVerifyJson = await regVerify.json();
      if (!regVerify.ok) {
        setMessage(regVerifyJson?.error || 'Registration failed');
        return;
      }
      if (regVerifyJson.token?.secret) {
        await safeCreateSession(regVerifyJson.token.userId || email, regVerifyJson.token.secret);
        notifyOpenerAuthSuccess({ userId: regVerifyJson.token.userId || email });
        const rawBackUrl = getBackUrl();
        if (rawBackUrl && !window.opener) {
          const url = new URL(rawBackUrl.startsWith('http') ? rawBackUrl : `https://${rawBackUrl}`);
          url.searchParams.set('auth', 'success');
          const backUrl = url.toString();
          
          setIsSuccess(true);
          setTimeout(() => {
            window.location.href = backUrl;
          }, 800);
        } else {
          setIsSuccess(true);
        }
        return;

      }
      setMessage('Registration successful. You can now sign in.');
    } catch (err) {
      setMessage((err as Error)?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking session
  if (isCheckingSession) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}>
        <CircularProgress sx={{ color: '#00F5FF' }} />
      </Box>
    );
  }

  if (isSuccess) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          p: 2,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 448,
            borderRadius: '1rem',
            backgroundColor: dynamicColors.secondary,
            p: 6,
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          }}
        >
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: dynamicColors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VpnKey sx={{ color: dynamicColors.secondary, fontSize: '2rem' }} />
            </Box>
          </Box>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 900, mb: 2 }}>
            Authenticated
          </Typography>
          <Typography sx={{ color: dynamicColors.foreground, mb: 4 }}>
            Successfully signed in to {appName}. You can now return to the app.
          </Typography>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              if (window.opener) {
                window.close();
              } else {
                const source = searchParams.get('source');
                const redirectUrl = source ? (source.startsWith('http') ? source : `https://${source}`) : '/';
                window.location.href = redirectUrl;
              }
            }}
            sx={{
              height: 56,
              borderRadius: '0.75rem',
              backgroundColor: dynamicColors.primary,
              color: dynamicColors.secondary,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '1.1rem',
              '&:hover': { backgroundColor: dynamicColors.primary, opacity: 0.9 },
            }}
          >
            {window.opener ? 'Close Window' : 'Back to App'}
          </Button>
        </Box>
      </Box>
    );
  }

  return (

    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        p: 2,
      }}
    >
      {/* Modal */}
      <Box
        sx={{
          width: '100%',
          maxWidth: isDesktop ? 560 : 448,
          borderRadius: '0.75rem',
          backgroundColor: dynamicColors.secondary,
          p: 4,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <IconButton
            onClick={() => {
              const source = searchParams.get('source');
              router.push(source ? `/?source=${encodeURIComponent(source)}` : '/');
            }}
            sx={{
              color: dynamicColors.foreground,
              '&:hover': { color: 'white' },
            }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Title */}
        <Box sx={{ mb: 5, textAlign: 'center' }}>
          <Typography
            sx={{
              color: 'white',
              fontSize: { xs: '1.75rem', md: '2rem' },
              fontWeight: 900,
              lineHeight: 1.2,
              letterSpacing: '-0.033em',
              textTransform: 'capitalize',
            }}
          >
            {step === 1 ? `Continue with ${appName}:` : `Sign in to ${appName}`}
          </Typography>
        </Box>

        {/* Step 1: OAuth & Email */}
        {step === 1 ? (
          <Box
            sx={{
              animation: 'fadeIn 0.3s ease-in-out',
              '@keyframes fadeIn': {
                from: { opacity: 0 },
                to: { opacity: 1 },
              },
            }}
          >
            {/* OAuth Buttons - Side by side on desktop, centered */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: isDesktop ? 2 : 3, flexDirection: isDesktop ? 'row' : 'column', mb: 5, width: '100%' }}>
              {/* Google */}
              <Button
                onClick={() => handleOAuthLogin(OAuthProvider.Google)}
                disabled={loading}
                fullWidth={!isDesktop}
                sx={{
                  width: isDesktop ? 120 : '100%',
                  backgroundColor: '#fff',
                  color: '#1f2937',
                  height: 48,
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  border: '1px solid #d1d5db',
                  '&:hover:not(:disabled)': { backgroundColor: '#f3f4f6' },
                  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1.5,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </Button>

              {/* GitHub */}
              <Button
                onClick={() => handleOAuthLogin(OAuthProvider.Github)}
                disabled={loading}
                fullWidth={!isDesktop}
                sx={{
                  width: isDesktop ? 120 : '100%',
                  backgroundColor: '#1f2937',
                  color: '#fff',
                  height: 48,
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  border: '1px solid #111827',
                  '&:hover:not(:disabled)': { backgroundColor: '#111827' },
                  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1.5,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub
              </Button>
            </Box>

            {/* Divider */}
            <Box sx={{ display: 'flex', alignItems: 'center', my: 4, gap: 2 }}>
              <Box sx={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
              <Typography sx={{ fontSize: '0.875rem', color: dynamicColors.foreground, whiteSpace: 'nowrap' }}>or enter email</Typography>
              <Box sx={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
            </Box>

            {/* Email & Options - Center aligned */}
            <Stack spacing={3} sx={{ mb: 5, display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box sx={{ width: '100%' }}>
                <TextField
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="your@email.com"
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      height: '3rem',
                      borderRadius: '0.5rem',
                      backgroundColor: dynamicColors.secondary,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      '&:hover': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      '&.Mui-focused': { borderColor: dynamicColors.primary },
                      '& fieldset': { border: 'none' },
                    },
                    '& .MuiOutlinedInput-input::placeholder': {
                      color: dynamicColors.foreground,
                      opacity: 1,
                    },
                  }}
                />
              </Box>

              {/* Passkey Option */}
              <Box sx={{ width: '100%' }}>
                <Button
                  onClick={continueWithPasskey}
                  disabled={!emailValid || loading}
                  fullWidth
                  sx={{
                    backgroundColor: emailValid ? dynamicColors.primary : 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff !important',
                    height: 48,
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    border: 'none',
                    cursor: !emailValid ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    '& svg': { color: '#ffffff !important' },
                    '&:hover:not(:disabled)': { backgroundColor: dynamicColors.primary, opacity: 0.9 },
                  }}
                >
                  <VpnKey sx={{ fontSize: '1.2rem' }} />
                  Passkey
                </Button>
              </Box>

              {/* Wallet Option */}
              <Box sx={{ width: '100%' }}>
                <Button
                  onClick={handleWalletLogin}
                  disabled={!emailValid || loading}
                  fullWidth
                  sx={{
                    backgroundColor: emailValid ? dynamicColors.primary : 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff !important',
                    height: 48,
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    border: 'none',
                    cursor: !emailValid ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    '& svg': { color: '#ffffff !important' },
                    '&:hover:not(:disabled)': { backgroundColor: dynamicColors.primary, opacity: 0.9 },
                  }}
                >
                  <Wallet sx={{ fontSize: '1.2rem' }} />
                  Wallet
                </Button>
              </Box>

              {/* Continue with Other Methods */}
              <Box sx={{ width: '100%', textAlign: 'center' }}>
                <Button
                  onClick={() => setStep(2)}
                  disabled={false}
                  sx={{
                    textTransform: 'none',
                    color: dynamicColors.primary,
                    '&:hover': { color: dynamicColors.primary, textDecoration: 'underline', opacity: 0.9 },
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    textDecoration: 'underline',
                    p: 0,
                    cursor: 'pointer',
                  }}
                >
                  Continue with other methods
                </Button>
              </Box>
            </Stack>
          </Box>
        ) : (
          <Box
            sx={{
              animation: 'fadeIn 0.3s ease-in-out',
              '@keyframes fadeIn': {
                from: { opacity: 0 },
                to: { opacity: 1 },
              },
            }}
          >
            {/* Step 2: Choose Auth Method */}
            {/* Email Display with Edit Button - Can click pencil or directly edit email */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 4, pb: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <TextField
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="your@email.com"
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      backgroundColor: dynamicColors.secondary,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      '&:hover': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      '&.Mui-focused': { borderColor: dynamicColors.primary },
                      '& fieldset': { border: 'none' },
                      textAlign: 'center',
                    },
                    '& .MuiOutlinedInput-input': {
                      textAlign: 'center',
                    },
                    '& .MuiOutlinedInput-input::placeholder': {
                      color: dynamicColors.foreground,
                      opacity: 1,
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Auth Method Tabs */}
            <Box sx={{ mb: 4, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Tabs
                value={authMethod}
                onChange={(e, newValue) => setAuthMethod(newValue)}
                sx={{
                  '& .MuiTab-root': {
                    color: dynamicColors.foreground,
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    '&.Mui-selected': { color: dynamicColors.primary },
                  },
                  '& .MuiTabs-indicator': { backgroundColor: dynamicColors.primary },
                }}
              >
                <Tab label="Password" />
                <Tab label="OTP" />
              </Tabs>
            </Box>

            {/* Tab Content */}
            <Stack spacing={3} sx={{ mb: 5, display: 'flex', alignItems: 'center', width: '100%' }}>
              {authMethod === 0 ? (
                <>
                  {/* Password Fields */}
                  <Box sx={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <TextField
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      fullWidth
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: 'white',
                          height: '3rem',
                          borderRadius: '0.5rem',
                          backgroundColor: dynamicColors.secondary,
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          '&:hover': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                          '&.Mui-focused': { borderColor: dynamicColors.primary },
                          '& fieldset': { border: 'none' },
                        },
                        '& .MuiOutlinedInput-input::placeholder': {
                          color: dynamicColors.foreground,
                          opacity: 1,
                        },
                      }}
                    />
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{
                        position: 'absolute',
                        right: 12,
                        color: dynamicColors.foreground,
                        '&:hover': { color: 'white' },
                      }}
                    >
                      {showPassword ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                    </IconButton>
                  </Box>

                  {/* Forgot Password Link */}
                  <Box sx={{ width: '100%', textAlign: 'center' }}>
                    <Button
                      href="#"
                      sx={{
                        textTransform: 'none',
                        color: dynamicColors.primary,
                        '&:hover': { color: dynamicColors.primary, textDecoration: 'underline', opacity: 0.9 },
                        fontSize: '0.85rem',
                        p: 0,
                      }}
                    >
                      Forgot password?
                    </Button>
                  </Box>

                  {/* Sign In Button */}
                  <Box sx={{ width: '100%' }}>
                    <Button
                      onClick={handlePasswordLogin}
                      disabled={!password.trim() || loading}
                      fullWidth
                      sx={{
                        backgroundColor: dynamicColors.primary,
                        color: dynamicColors.secondary,
                        height: 48,
                        borderRadius: '0.5rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        '&:hover:not(:disabled)': { backgroundColor: dynamicColors.primary, opacity: 0.9 },
                        '&:disabled': { cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                      }}
                    >
                      Sign in
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  {/* OTP Field */}
                  <Box sx={{ width: '100%' }}>
                    <TextField
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      fullWidth
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: 'white',
                          height: '3rem',
                          borderRadius: '0.5rem',
                          backgroundColor: dynamicColors.secondary,
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          '&:hover': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                          '&.Mui-focused': { borderColor: dynamicColors.primary },
                          '& fieldset': { border: 'none' },
                        },
                        '& .MuiOutlinedInput-input::placeholder': {
                          color: dynamicColors.foreground,
                          opacity: 1,
                        },
                      }}
                    />
                  </Box>

                  {/* Verify OTP Button */}
                  <Box sx={{ width: '100%' }}>
                    <Button
                      onClick={() => { }}
                      disabled={otp.length !== 6 || loading}
                      fullWidth
                      sx={{
                        backgroundColor: dynamicColors.primary,
                        color: dynamicColors.secondary,
                        height: 48,
                        borderRadius: '0.5rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        '&:hover:not(:disabled)': { backgroundColor: dynamicColors.primary, opacity: 0.9 },
                        '&:disabled': { cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                      }}
                    >
                      Verify OTP
                    </Button>
                  </Box>
                </>
              )}
            </Stack>
          </Box>
        )}

        {/* Message Alert */}
        {message && (
          <Alert severity={message.toLowerCase().includes('error') ? 'error' : 'warning'} sx={{ mt: 3 }}>
            {message}
          </Alert>
        )}
      </Box>
    </Box>
  );
}
