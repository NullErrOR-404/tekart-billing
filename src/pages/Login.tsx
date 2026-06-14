import React, { useState } from 'react';
import tekartLogo from '../assets/tekart-logo.png';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Sun, Moon, ArrowLeft, CheckCircle2, Shield, Key } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: { id: string; name: string; email: string; role: 'admin' | 'cashier' }) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

type LoginMode = 'login' | 'forgot' | 'verify_2fa' | 'reset_password';

export default function Login({ onLoginSuccess, theme, toggleTheme }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Messaging
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Mode states
  const [mode, setMode] = useState<LoginMode>('login');

  // Recovery variables
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswerInput, setSecurityAnswerInput] = useState('');
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Check Admin/Owner credentials
    let ownerProfile = JSON.parse(localStorage.getItem('tk_owner_profile') || 'null');
    if (!ownerProfile || ownerProfile.email === 'owner@tekart.com') {
      ownerProfile = {
        id: 'owner',
        name: 'Owner',
        email: 'sameen14nmofficial@gmail.com',
        password: 'Mdsameen-2006',
        role: 'admin'
      };
      localStorage.setItem('tk_owner_profile', JSON.stringify(ownerProfile));
    }

    if (cleanEmail === ownerProfile.email.toLowerCase().trim() && password === ownerProfile.password) {
      onLoginSuccess({
        id: 'owner',
        name: ownerProfile.name,
        email: ownerProfile.email,
        role: 'admin'
      });
      return;
    }

    // 2. Check cashier list from database/local storage
    const cashierList = JSON.parse(localStorage.getItem('tk_cashier_list') || '[]');
    const matchedCashier = cashierList.find((c: any) => 
      c.email && c.email.toLowerCase().trim() === cleanEmail && c.password === password
    );

    if (matchedCashier) {
      onLoginSuccess({
        id: matchedCashier.id,
        name: matchedCashier.name,
        email: matchedCashier.email,
        role: matchedCashier.role || 'cashier'
      });
    } else {
      setErrorMsg('Invalid email or password. Please try again.');
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!recoveryEmail.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    const cleanEmail = recoveryEmail.toLowerCase().trim();
    const ownerProfile = JSON.parse(localStorage.getItem('tk_owner_profile') || '{}');

    if (cleanEmail === (ownerProfile.email || '').toLowerCase().trim()) {
      // It's the owner account
      const savedConfig = JSON.parse(localStorage.getItem('tk_owner_2fa_config') || '{}');
      if (savedConfig.enabled) {
        setSecurityQuestion(savedConfig.securityQuestion || 'What was your first school?');
        setMode('verify_2fa');
      } else {
        setErrorMsg('Two-Factor Authentication is not set up on this Owner account. Enter your recovery code or contact terminal administrator.');
        // Fallback: allow inputting recovery code directly
        setSecurityQuestion('MOCK_RECOVERY_CODE_REQUIRED');
        setMode('verify_2fa');
      }
    } else {
      // Check cashiers
      const cashierList = JSON.parse(localStorage.getItem('tk_cashier_list') || '[]');
      const matched = cashierList.find((c: any) => c.email.toLowerCase().trim() === cleanEmail);
      if (matched) {
        setErrorMsg('Please contact your Store Administrator (Owner) to reset your Cashier password.');
      } else {
        setErrorMsg('No user registered with this email address.');
      }
    }
  };

  const handleVerify2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const savedConfig = JSON.parse(localStorage.getItem('tk_owner_2fa_config') || '{}');

    const cleanAnswerInput = securityAnswerInput.trim().toLowerCase();
    const cleanCodeInput = recoveryCodeInput.trim().toUpperCase();

    const expectedAnswer = (savedConfig.securityAnswer || '').toLowerCase().trim();
    const expectedCode = (savedConfig.recoveryCode || '').toUpperCase().trim();

    // Match either the security question answer OR the recovery code
    const isAnswerCorrect = savedConfig.enabled && cleanAnswerInput && cleanAnswerInput === expectedAnswer;
    const isCodeCorrect = cleanCodeInput && cleanCodeInput === expectedCode;

    if (isAnswerCorrect || isCodeCorrect) {
      setMode('reset_password');
    } else {
      setErrorMsg('Incorrect Security Answer or Recovery Code.');
    }
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!resetNewPassword.trim() || !resetConfirmPassword.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    // Reset Owner's password
    const ownerProfile = JSON.parse(localStorage.getItem('tk_owner_profile') || '{}');
    ownerProfile.password = resetNewPassword;
    localStorage.setItem('tk_owner_profile', JSON.stringify(ownerProfile));

    setSuccessMsg('Your password has been reset successfully. Please login.');
    setTimeout(() => {
      setMode('login');
      setEmail(ownerProfile.email);
      setPassword('');
      setRecoveryEmail('');
      setSecurityAnswerInput('');
      setRecoveryCodeInput('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setSuccessMsg('');
    }, 2500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-tk-bg bg-gradient-to-br from-tk-bg via-tk-surface-2/30 to-tk-bg p-4 relative overflow-hidden transition-colors duration-200">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-tk-surface border border-tk-border flex items-center justify-center text-tk-text-primary hover:bg-tk-blue-light/50 dark:hover:bg-tk-surface-2 cursor-pointer transition-colors shadow-lg shadow-tk-blue-mid/5"
          title="Toggle theme mode"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="absolute w-[500px] h-[500px] rounded-full bg-tk-blue-mid/10 blur-[120px] -top-40 -left-40"></div>
      <div className="absolute w-[500px] h-[500px] rounded-full bg-tk-gold/5 blur-[120px] -bottom-40 -right-40"></div>

      {/* Main glass card */}
      <div className="w-full max-w-md bg-tk-surface/70 border border-tk-border backdrop-blur-xl p-8 rounded-3xl shadow-2xl space-y-6 relative z-10">
        
        {/* Logo and branding */}
        <div className="text-center space-y-2.5">
          <div className="flex justify-center">
            <img 
              src={tekartLogo} 
              alt="TEKART Logo" 
              className="h-10 w-auto object-contain transition-all duration-200"
              style={theme === 'dark' ? { filter: 'brightness(0) invert(1)' } : undefined}
            />
          </div>
          <h2 className="text-lg font-black font-display tracking-widest text-tk-text-primary mt-2">TEKART SMART LIVING</h2>
          
          <p className="text-2xs text-tk-text-secondary tracking-wide font-mono uppercase bg-tk-surface-2 border border-tk-border py-1 px-3.5 rounded-full inline-block">
            {mode === 'login' && 'POS Billing Terminal Sign In'}
            {mode === 'forgot' && 'Account Recovery'}
            {mode === 'verify_2fa' && 'Security Verification'}
            {mode === 'reset_password' && 'Choose New Password'}
          </p>
        </div>

        {/* Messaging notifications */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3.5 rounded-xl flex items-center space-x-2.5 text-xs">
            <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3.5 rounded-xl flex items-center space-x-2.5 text-xs">
            <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* MODE 1: Standard Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">Email Address</label>
              <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2.5 focus-within:border-tk-blue-bright transition-colors">
                <Mail className="w-4.5 h-4.5 text-tk-text-tertiary mr-2.5" />
                <input 
                  type="email" 
                  placeholder="e.g. owner@tekart.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-xs text-tk-text-primary focus:outline-none border-none placeholder-tk-text-tertiary"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider block">Password</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-3xs font-extrabold text-tk-blue-bright hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2.5 focus-within:border-tk-blue-bright transition-colors">
                <Lock className="w-4.5 h-4.5 text-tk-text-tertiary mr-2.5" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-xs text-tk-text-primary focus:outline-none border-none placeholder-tk-text-tertiary font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-tk-text-secondary hover:text-tk-text-primary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-tk-blue-mid/10 mt-2"
            >
              Sign In to Terminal
            </button>
          </form>
        )}

        {/* MODE 2: Forgot Password email entry */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              className="inline-flex items-center space-x-1.5 text-3xs font-bold text-tk-text-secondary hover:text-tk-text-primary transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>

            <div>
              <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">Your Registered Email</label>
              <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2.5 focus-within:border-tk-blue-bright transition-colors">
                <Mail className="w-4.5 h-4.5 text-tk-text-tertiary mr-2.5" />
                <input 
                  type="email" 
                  required
                  placeholder="e.g. backup@tekart.com" 
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="w-full bg-transparent text-xs text-tk-text-primary focus:outline-none border-none placeholder-tk-text-tertiary"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-tk-blue-mid/10 mt-2"
            >
              Verify Identity
            </button>
          </form>
        )}

        {/* MODE 3: Verify 2FA answers */}
        {mode === 'verify_2fa' && (
          <form onSubmit={handleVerify2FASubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => { setMode('forgot'); setErrorMsg(''); }}
              className="inline-flex items-center space-x-1.5 text-3xs font-bold text-tk-text-secondary hover:text-tk-text-primary transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            {securityQuestion !== 'MOCK_RECOVERY_CODE_REQUIRED' ? (
              <div className="space-y-3">
                <div className="bg-tk-surface-2 border border-tk-border rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Two-Factor Question</span>
                  <p className="text-xs text-tk-text-primary font-semibold mt-1">{securityQuestion}</p>
                </div>

                <div>
                  <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">Answer Question</label>
                  <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2.5 focus-within:border-tk-blue-bright transition-colors">
                    <Shield className="w-4.5 h-4.5 text-tk-text-tertiary mr-2.5" />
                    <input 
                      type="text" 
                      placeholder="Enter security answer" 
                      value={securityAnswerInput}
                      onChange={(e) => setSecurityAnswerInput(e.target.value)}
                      className="w-full bg-transparent text-xs text-tk-text-primary focus:outline-none border-none placeholder-tk-text-tertiary"
                    />
                  </div>
                </div>

                <div className="text-center text-[10px] text-tk-text-tertiary py-1">— OR —</div>
              </div>
            ) : null}

            <div>
              <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">Backup Recovery Code</label>
              <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2.5 focus-within:border-tk-blue-bright transition-colors">
                <Key className="w-4.5 h-4.5 text-tk-text-tertiary mr-2.5" />
                <input 
                  type="text" 
                  placeholder="TK-2FA-XXXX-XXXX" 
                  value={recoveryCodeInput}
                  onChange={(e) => setRecoveryCodeInput(e.target.value)}
                  className="w-full bg-transparent text-xs text-tk-text-primary focus:outline-none border-none placeholder-tk-text-tertiary font-mono"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-tk-blue-mid/10 mt-2"
            >
              Verify Security Credentials
            </button>
          </form>
        )}

        {/* MODE 4: Reset Password form */}
        {mode === 'reset_password' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 p-3.5 rounded-xl flex items-center space-x-2 text-3xs uppercase tracking-wider font-extrabold">
              <Shield className="w-4 h-4 shrink-0" />
              <span>Identity Verified. Reset Password Below.</span>
            </div>

            <div>
              <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">New Password</label>
              <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2.5 focus-within:border-tk-blue-bright transition-colors">
                <Lock className="w-4.5 h-4.5 text-tk-text-tertiary mr-2.5" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••" 
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className="w-full bg-transparent text-xs text-tk-text-primary focus:outline-none border-none placeholder-tk-text-tertiary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">Confirm New Password</label>
              <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2.5 focus-within:border-tk-blue-bright transition-colors">
                <Lock className="w-4.5 h-4.5 text-tk-text-tertiary mr-2.5" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••" 
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  className="w-full bg-transparent text-xs text-tk-text-primary focus:outline-none border-none placeholder-tk-text-tertiary font-mono"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-tk-blue-mid/10 mt-2"
            >
              Save New Password
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
