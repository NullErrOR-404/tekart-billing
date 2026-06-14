import React, { useState } from 'react';
import tekartLogo from '../assets/tekart-logo.png';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Sun, Moon } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: { id: string; name: string; email: string; role: 'admin' | 'cashier' }) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Login({ onLoginSuccess, theme, toggleTheme }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
        role: 'cashier'
      });
    } else {
      setErrorMsg('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-tk-bg bg-gradient-to-br from-tk-bg via-tk-surface-2/30 to-tk-bg p-4 relative overflow-hidden transition-colors duration-200">
      {/* Theme Toggle Button (Floating) */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-tk-surface border border-tk-border flex items-center justify-center text-tk-text-primary hover:bg-tk-blue-light/50 dark:hover:bg-tk-surface-2 cursor-pointer transition-colors shadow-lg shadow-tk-blue-mid/5"
          title="Toggle theme mode"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Decorative radial gradients */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-tk-blue-mid/10 blur-[120px] -top-40 -left-40"></div>
      <div className="absolute w-[500px] h-[500px] rounded-full bg-tk-gold/5 blur-[120px] -bottom-40 -right-40"></div>

      {/* Main glass card container */}
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
            POS Billing Terminal Sign In
          </p>
        </div>

        {/* Error message card */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3.5 rounded-xl flex items-center space-x-2.5 text-xs animate-shake">
            <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login form */}
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
            <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">Password</label>
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
            className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-tk-blue-mid/10 active:scale-[0.99] mt-2"
          >
            Sign In to Terminal
          </button>
        </form>


      </div>
    </div>
  );
}
