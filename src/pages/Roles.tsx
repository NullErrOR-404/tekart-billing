import React, { useState, useEffect } from 'react';
import { Shield, Search, Lock, ShieldAlert, CheckCircle2, UserCheck, Key, Phone, AlertCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'cashier';
}

interface RolesProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'cashier';
  };
}

export default function Roles({ currentUser }: RolesProps) {
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [cashiers, setCashiers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Notification states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 2FA Setup State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState('What was your first school?');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [backupEmail, setBackupEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');

  useEffect(() => {
    loadUsers();
    loadSecurityConfig();
  }, []);

  const loadUsers = () => {
    let ownerProfile = JSON.parse(localStorage.getItem('tk_owner_profile') || 'null');
    if (!ownerProfile || ownerProfile.email === 'owner@tekart.com' || ownerProfile.email === 'sameen14nmofficial@gmail.com') {
      ownerProfile = {
        id: 'owner',
        name: 'Sameen (Developer)',
        email: 'sameen@tekart.com',
        password: 'Mdsameen-2006',
        role: 'admin'
      };
      localStorage.setItem('tk_owner_profile', JSON.stringify(ownerProfile));
    }
    setOwner(ownerProfile);

    // Clean up duplicate cashier list entries
    let cashierList = JSON.parse(localStorage.getItem('tk_cashier_list') || '[]');
    const initialLength = cashierList.length;
    cashierList = cashierList.filter((u: any) => 
      u.email.toLowerCase().trim() !== 'sameen@tekart.com' && 
      u.email.toLowerCase().trim() !== 'sameen14nmofficial@gmail.com'
    );
    if (cashierList.length !== initialLength) {
      localStorage.setItem('tk_cashier_list', JSON.stringify(cashierList));
    }
    setCashiers(cashierList);
  };

  const loadSecurityConfig = () => {
    const savedConfig = JSON.parse(localStorage.getItem('tk_owner_2fa_config') || '{}');
    if (savedConfig.enabled) {
      setIs2FAEnabled(true);
      setSecurityQuestion(savedConfig.securityQuestion || 'What was your first school?');
      setSecurityAnswer(savedConfig.securityAnswer || '');
      setBackupEmail(savedConfig.backupEmail || '');
      setRecoveryCode(savedConfig.recoveryCode || '');
    } else {
      // Generate a new recovery code as a suggestion
      setRecoveryCode(`TK-2FA-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };

  const handleRoleToggle = (userId: string, currentRole: 'admin' | 'cashier') => {
    if (userId === 'owner') return;

    const nextRole = currentRole === 'admin' ? 'cashier' : 'admin';
    const updatedCashiers: UserProfile[] = cashiers.map(u => {
      if (u.id === userId) {
        return { ...u, role: nextRole };
      }
      return u;
    });

    setCashiers(updatedCashiers);
    localStorage.setItem('tk_cashier_list', JSON.stringify(updatedCashiers));

    setSuccessMsg(`Successfully updated role to ${nextRole.toUpperCase()}!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setErrorMsg('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    // 1. Get current logged-in user password
    if (currentUser.id === 'owner') {
      const ownerProfile = JSON.parse(localStorage.getItem('tk_owner_profile') || '{}');
      if (ownerProfile.password !== currentPassword) {
        setErrorMsg('Incorrect current password.');
        return;
      }
      ownerProfile.password = newPassword;
      localStorage.setItem('tk_owner_profile', JSON.stringify(ownerProfile));
    } else {
      const list = JSON.parse(localStorage.getItem('tk_cashier_list') || '[]');
      const userIndex = list.findIndex((u: any) => u.id === currentUser.id);
      if (userIndex === -1 || list[userIndex].password !== currentPassword) {
        setErrorMsg('Incorrect current password.');
        return;
      }
      list[userIndex].password = newPassword;
      localStorage.setItem('tk_cashier_list', JSON.stringify(list));
    }

    setSuccessMsg('Password changed successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSuccessMsg(''), 4000);
    loadUsers();
  };

  const handleSave2FASettings = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (is2FAEnabled) {
      if (!securityAnswer.trim()) {
        setErrorMsg('Please enter an answer to your security question.');
        return;
      }
      if (!backupEmail.trim()) {
        setErrorMsg('Backup email is required for password resets.');
        return;
      }
    }

    const config = {
      enabled: is2FAEnabled,
      securityQuestion,
      securityAnswer: securityAnswer.trim(),
      backupEmail: backupEmail.trim().toLowerCase(),
      recoveryCode
    };

    localStorage.setItem('tk_owner_2fa_config', JSON.stringify(config));
    setSuccessMsg(is2FAEnabled ? 'Two-Factor Authentication configured successfully!' : '2FA disabled successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const allUsers: UserProfile[] = [];
  if (owner) allUsers.push({ ...owner, role: 'admin' });
  cashiers.forEach(c => {
    allUsers.push({
      id: c.id,
      name: c.name,
      email: c.email,
      role: c.role || 'cashier'
    });
  });

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-1">
      {/* Title block */}
      <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass">
        <h1 className="text-xl font-bold font-display text-tk-text-primary flex items-center space-x-2">
          <Shield className="w-5 h-5 text-tk-blue-bright" />
          <span>Role & Security Management</span>
        </h1>
        <p className="text-xs text-tk-text-secondary mt-0.5">Configure system access levels, update passwords, and set up two-factor security</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl p-3 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4.5 h-4.5" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4.5 h-4.5" />
          <span className="font-bold">{errorMsg}</span>
        </div>
      )}

      {/* Main card grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Users list (8 columns) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-tk-surface border border-tk-border rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-center gap-4">
              <h2 className="text-xs font-black uppercase text-tk-text-secondary tracking-widest font-mono">User Listing</h2>
              
              {/* Search Bar */}
              <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-lg px-2.5 py-1.5 w-64 shadow-2xs">
                <Search className="w-4 h-4 text-tk-text-tertiary mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-2xs text-tk-text-primary focus:outline-none placeholder-tk-text-tertiary"
                />
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar border border-tk-border rounded-xl">
              <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-tk-surface-2 border-b border-tk-border text-tk-text-secondary">
                    <th className="p-3 font-semibold text-3xs uppercase tracking-wider">User details</th>
                    <th className="p-3 font-semibold text-3xs uppercase tracking-wider text-center">System Role</th>
                    <th className="p-3 font-semibold text-3xs uppercase tracking-wider text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isOwner = user.id === 'owner';
                    const isAdmin = user.role === 'admin';
                    
                    return (
                      <tr key={user.id} className="border-b border-tk-border hover:bg-tk-blue-light/10 dark:hover:bg-tk-surface-2/40 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-tk-text-primary text-xs">{user.name}</p>
                          <p className="text-[10px] font-mono text-tk-text-secondary mt-0.5">{user.email}</p>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-wider uppercase ${
                            isOwner 
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                              : isAdmin 
                                ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' 
                                : 'bg-tk-blue-mid/10 text-tk-blue-bright border border-tk-blue-bright/20'
                          }`}>
                            {isOwner ? 'Owner / Admin' : isAdmin ? 'Admin' : 'Cashier'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {isOwner ? (
                            <div className="inline-flex items-center space-x-1 text-3xs text-tk-text-secondary bg-tk-surface-2 border border-tk-border px-2.5 py-1 rounded-lg">
                              <Lock className="w-3 h-3" />
                              <span className="font-bold uppercase tracking-wider">Owner (Locked)</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleRoleToggle(user.id, user.role || 'cashier')}
                              className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-3xs font-extrabold tracking-wider uppercase cursor-pointer transition-colors border ${
                                isAdmin
                                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20'
                                  : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20'
                              }`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{isAdmin ? 'Revoke Admin Access' : 'Grant Admin Access'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-tk-text-secondary">
                        No users match the search query
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Two-Factor Authentication Card (Only for Owner) */}
          {currentUser.id === 'owner' && (
            <div className="bg-tk-surface border border-tk-border rounded-2xl p-4 space-y-4">
              <h2 className="text-xs font-black uppercase text-tk-text-secondary tracking-widest font-mono flex items-center space-x-1.5">
                <Phone className="w-4 h-4 text-purple-400" />
                <span>Owner 2FA & Security Recovery Setup</span>
              </h2>
              <hr className="border-tk-border" />

              <form onSubmit={handleSave2FASettings} className="space-y-4">
                <div className="flex items-center justify-between bg-tk-surface-2 border border-tk-border rounded-xl p-3.5">
                  <div>
                    <p className="text-xs font-bold text-tk-text-primary">Enable Two-Factor Authentication</p>
                    <p className="text-[10px] text-tk-text-secondary mt-0.5">Enables verification code prompt on forgot password resets</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={is2FAEnabled}
                      onChange={(e) => setIs2FAEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-tk-surface-3 border border-tk-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-tk-text-secondary after:border-tk-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tk-blue-mid"></div>
                  </label>
                </div>

                {is2FAEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                    <div className="space-y-3">
                      <div>
                        <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">Security Recovery Question</label>
                        <select
                          value={securityQuestion}
                          onChange={(e) => setSecurityQuestion(e.target.value)}
                          className="w-full bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2 text-xs text-tk-text-primary focus:outline-none"
                        >
                          <option>What was your first school?</option>
                          <option>What city were you born in?</option>
                          <option>What is your mother's maiden name?</option>
                          <option>What was your first pet's name?</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">Answer *</label>
                        <input
                          type="text"
                          required
                          value={securityAnswer}
                          onChange={(e) => setSecurityAnswer(e.target.value)}
                          placeholder="e.g. Saint Pauls"
                          className="w-full bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2 text-xs text-tk-text-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">Backup Email Address *</label>
                        <input
                          type="email"
                          required
                          value={backupEmail}
                          onChange={(e) => setBackupEmail(e.target.value)}
                          placeholder="e.g. backup@tekart.com"
                          className="w-full bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2 text-xs text-tk-text-primary focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">Recovery Code (Save this)</label>
                        <input
                          type="text"
                          readOnly
                          value={recoveryCode}
                          className="w-full bg-tk-surface-2/60 border border-tk-border rounded-xl px-3 py-2 text-xs text-tk-text-secondary font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-extrabold text-3xs uppercase tracking-wider px-4 py-2.5 rounded-lg cursor-pointer transition-colors"
                >
                  Save Security Settings
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Info & Change Password (4 columns) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Change Password Card */}
          <div className="bg-tk-surface border border-tk-border rounded-2xl p-4 space-y-4">
            <h2 className="text-xs font-black uppercase text-tk-text-secondary tracking-widest font-mono flex items-center space-x-1.5">
              <Key className="w-4 h-4 text-tk-blue-bright" />
              <span>Change Password</span>
            </h2>
            <hr className="border-tk-border" />

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-3">
              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2.5 text-xs text-tk-text-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2.5 text-xs text-tk-text-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-1 block">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2.5 text-xs text-tk-text-primary focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-extrabold text-3xs uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-tk-blue-mid/5"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* Role Description Card */}
          <div className="bg-tk-surface border border-tk-border rounded-2xl p-4 space-y-3">
            <h2 className="text-xs font-black uppercase text-tk-text-secondary tracking-widest font-mono flex items-center space-x-1">
              <ShieldAlert className="w-4 h-4 text-tk-blue-bright" />
              <span>Role Permissions</span>
            </h2>
            <hr className="border-tk-border" />
            
            <div className="space-y-4 pt-1">
              <div className="space-y-1">
                <span className="text-3xs font-mono bg-purple-500/10 text-purple-500 border border-purple-500/20 px-2 py-0.5 rounded uppercase font-extrabold">Admin Access</span>
                <p className="text-[10px] text-tk-text-secondary pt-1 leading-relaxed">
                  Admins have full ownership control. They can view Wholesale Purchases, Profit Analytics, Cash Flow Ledgers, bank transactions, and adjust all user access roles.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-3xs font-mono bg-tk-blue-mid/10 text-tk-blue-bright border border-tk-blue-bright/20 px-2 py-0.5 rounded uppercase font-extrabold">Cashier Access</span>
                <p className="text-[10px] text-tk-text-secondary pt-1 leading-relaxed">
                  Cashiers have restricted access, focused entirely on day-to-day operations: creating new sales, looking up customers, and logging retail returns. They are restricted from viewing wholesale buy prices, financial ledgers, and setting user roles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
