import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { LogIn, Fingerprint } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import api from '../lib/api';

function formatApiError(detail) {
  if (detail == null) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(" ");
  if (detail?.msg) return detail.msg;
  return String(detail);
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const { login, setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if WebAuthn is available on this device
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
        .then(available => setBiometricAvailable(available))
        .catch(() => {});
    }
    // Restore saved email for biometric
    const savedEmail = localStorage.getItem('fabrictrack_biometric_email');
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!email) { setError('Enter your email first'); return; }
    setError('');
    setBiometricLoading(true);
    try {
      // Get authentication options
      const optRes = await api.post('/auth/biometric/login-options', { email });
      const options = optRes.data;
      // Start biometric authentication
      const authResp = await startAuthentication({ optionsJSON: options });
      // Complete authentication
      const completeRes = await api.post('/auth/biometric/login-complete', authResp);
      if (completeRes.data.user) {
        setUser(completeRes.data.user);
        localStorage.setItem('fabrictrack_biometric_email', email);
        navigate('/');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Biometric login failed';
      if (msg.includes('No biometric credentials')) {
        setError('No biometric set up for this account. Login with password first, then set up biometric in settings.');
      } else {
        setError(typeof msg === 'string' ? msg : 'Biometric login failed');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 relative" data-testid="login-page">
      <div
        className="absolute inset-0 opacity-20 bg-cover bg-center"
        style={{ backgroundImage: `url(https://static.prod-images.emergentagent.com/jobs/d6e2cb86-b645-48e5-932a-9b381cfe43d2/images/913026981f17ff6eb4cf5ecfa9e079d72ce0a081457fded64da8cb5217bae5a7.png)` }}
      />
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white border border-zinc-200 rounded-md p-8 space-y-6">
          <div className="flex flex-col items-center space-y-3">
            <img
              src="https://static.prod-images.emergentagent.com/jobs/d6e2cb86-b645-48e5-932a-9b381cfe43d2/images/1be397fb5f6cb07765db6f4dea6c53ff41f9668b669bd581409e7b6125d29a4f.png"
              alt="Logo"
              className="h-12 w-12"
            />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">FabricTrack</h1>
            <p className="text-sm text-zinc-500">Sign in to your account</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-sm" data-testid="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs tracking-wide uppercase font-semibold text-zinc-500">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                data-testid="login-email-input"
                className="border-zinc-200 focus:ring-1 focus:ring-zinc-900 focus:ring-offset-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs tracking-wide uppercase font-semibold text-zinc-500">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                data-testid="login-password-input"
                className="border-zinc-200 focus:ring-1 focus:ring-zinc-900 focus:ring-offset-1"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              data-testid="login-submit-button"
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white transition-colors duration-200"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {biometricAvailable && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-zinc-400">or</span></div>
            </div>
          )}

          {biometricAvailable && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
              data-testid="biometric-login-button"
              className="w-full border-zinc-200 hover:bg-zinc-50 text-zinc-700"
            >
              <Fingerprint className="w-5 h-5 mr-2" />
              {biometricLoading ? 'Verifying...' : 'Sign in with Fingerprint / Face ID'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
