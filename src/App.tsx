import React, { useState, useEffect } from 'react';
import POS from './pages/POS';
import SalesHistory from './pages/SalesHistory';
import Returns from './pages/Returns';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Customers from './pages/Customers';
import Accounts from './pages/Accounts';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Roles from './pages/Roles';
import Login from './pages/Login';
import { isMockMode } from './lib/supabase';
import tekartLogo from './assets/tekart-logo.png';
import { 
  ShoppingCart, 
  History, 
  RotateCcw, 
  Package, 
  Truck, 
  Users, 
  Percent, 
  TrendingUp, 
  Settings as SettingsIcon,
  Sun,
  Moon,
  LogOut,
  User,
  Shield
} from 'lucide-react';

type TabId = 'POS' | 'History' | 'RetailReturns' | 'WholesaleReturns' | 'Inventory' | 'Purchases' | 'Customers' | 'Accounts' | 'Analytics' | 'Settings' | 'Roles';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('POS');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  
  // Cashier lists
  const [cashierList, setCashierList] = useState<{ id: string; name: string }[]>([]);
  const [cashierPermissions, setCashierPermissions] = useState<any>({
    viewAnalytics: false,
    viewAccounts: false,
    editStockDirectly: false,
    manageRetailReturns: false,
    manageWholesaleReturns: false,
    manageWholesale: false,
    voidTransactions: false
  });
  
  // Profile edit states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  useEffect(() => {
    // 0. Ensure owner profile is updated to Sameen (Developer) / sameen@tekart.com
    let ownerProfile = JSON.parse(localStorage.getItem('tk_owner_profile') || 'null');
    if (!ownerProfile || ownerProfile.email === 'owner@tekart.com' || ownerProfile.email === 'sameen14nmofficial@gmail.com' || ownerProfile.name === 'Owner') {
      ownerProfile = {
        id: 'owner',
        name: 'Sameen (Developer)',
        email: 'sameen@tekart.com',
        password: 'Mdsameen-2006',
        role: 'admin'
      };
      localStorage.setItem('tk_owner_profile', JSON.stringify(ownerProfile));

      // Clean up duplicate cashier list entries
      const cashierList = JSON.parse(localStorage.getItem('tk_cashier_list') || '[]');
      const filtered = cashierList.filter((u: any) => 
        u.email.toLowerCase().trim() !== 'sameen@tekart.com' && 
        u.email.toLowerCase().trim() !== 'sameen14nmofficial@gmail.com'
      );
      localStorage.setItem('tk_cashier_list', JSON.stringify(filtered));
    }

    // 1. Theme sync with system or stored preference
    const savedTheme = localStorage.getItem('tk_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme === 'dark' || (!savedTheme && systemPrefersDark) ? 'dark' : 'light';
    
    const root = document.documentElement;
    if (initialTheme === 'dark') {
      root.classList.add('dark');
      setTheme('dark');
    } else {
      root.classList.remove('dark');
      setTheme('light');
    }

    // 2. Check for tab parameter in query string
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as TabId;
    if (tabParam && ['POS', 'History', 'RetailReturns', 'WholesaleReturns', 'Inventory', 'Purchases', 'Customers', 'Accounts', 'Analytics', 'Settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    // 3. Try loading active session from SessionStorage and sync it with owner profile if logged in
    const savedSession = sessionStorage.getItem('tk_pos_session');
    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      if (parsedSession.id === 'owner' && ownerProfile) {
        parsedSession.name = ownerProfile.name;
        parsedSession.email = ownerProfile.email;
        sessionStorage.setItem('tk_pos_session', JSON.stringify(parsedSession));
      }
      setCurrentUser(parsedSession);
    }
  }, []);

  useEffect(() => {
    if (currentUser && showProfileModal) {
      setProfileName(currentUser.name);
      setProfileEmail(currentUser.email);
      setProfilePassword('');
      setProfileError('');
      setProfileSuccess('');
    }
  }, [showProfileModal, currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadCashierPermissions();
    }
  }, [currentUser]);

  const loadCashierPermissions = () => {
    // Reload cashier list
    const list = JSON.parse(localStorage.getItem('tk_cashier_list') || '[]');
    setCashierList(list);

    if (currentUser?.role === 'admin') {
      setCashierPermissions({
        viewAnalytics: true,
        viewAccounts: true,
        editStockDirectly: true,
        manageRetailReturns: true,
        manageWholesaleReturns: true,
        manageWholesale: true,
        voidTransactions: true
      });
    } else if (currentUser) {
      const allPermissions = JSON.parse(localStorage.getItem('tk_cashier_permissions_map') || '{}');
      const permissions = allPermissions[currentUser.id] || {
        viewAnalytics: false,
        viewAccounts: false,
        editStockDirectly: false,
        manageRetailReturns: false,
        manageWholesaleReturns: false,
        manageWholesale: false,
        voidTransactions: false
      };
      setCashierPermissions(permissions);
      
      // Auto redirect to POS if cashier does not have access to current tab
      if (activeTab === 'Analytics' && !permissions.viewAnalytics) setActiveTab('POS');
      if (activeTab === 'Accounts' && !permissions.viewAccounts) setActiveTab('POS');
      if (activeTab === 'RetailReturns' && !permissions.manageRetailReturns) setActiveTab('POS');
      if (activeTab === 'WholesaleReturns' && !permissions.manageWholesaleReturns) setActiveTab('POS');
      if (activeTab === 'Purchases' && !permissions.manageWholesale) setActiveTab('POS');
      if (activeTab === 'Settings') setActiveTab('POS');
    }
  };

  const handleLoginSuccess = (user: CurrentUser) => {
    setCurrentUser(user);
    sessionStorage.setItem('tk_pos_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('tk_pos_session');
    setActiveTab('POS');
  };

  const handleUpdateProfile = () => {
    if (!profileName.trim() || !profileEmail.trim() || !currentUser) {
      setProfileError('Name and Email cannot be empty.');
      return;
    }

    const cleanEmail = profileEmail.toLowerCase().trim();

    // Check for email uniqueness
    const cashierList = JSON.parse(localStorage.getItem('tk_cashier_list') || '[]');
    const ownerProfile = JSON.parse(localStorage.getItem('tk_owner_profile') || JSON.stringify({
      id: 'owner',
      name: 'Owner',
      email: 'owner@tekart.com',
      password: 'admin123',
      role: 'admin'
    }));

    const isEmailTaken = (cleanEmail === ownerProfile.email.toLowerCase().trim() && currentUser.role !== 'admin') ||
      cashierList.some((c: any) => c.id !== currentUser.id && c.email.toLowerCase().trim() === cleanEmail);

    if (isEmailTaken) {
      setProfileError('This email address is already in use.');
      return;
    }

    if (currentUser.role === 'admin') {
      const updatedOwner = {
        ...ownerProfile,
        name: profileName.trim(),
        email: cleanEmail,
      };

      if (profilePassword.trim()) {
        updatedOwner.password = profilePassword.trim();
      }

      localStorage.setItem('tk_owner_profile', JSON.stringify(updatedOwner));
      
      const updatedUser: CurrentUser = {
        ...currentUser,
        name: updatedOwner.name,
        email: updatedOwner.email
      };
      setCurrentUser(updatedUser);
      sessionStorage.setItem('tk_pos_session', JSON.stringify(updatedUser));
      setProfileSuccess('Owner profile updated successfully.');
    } else {
      const updatedList = cashierList.map((c: any) => {
        if (c.id === currentUser.id) {
          const updatedCashier = {
            ...c,
            name: profileName.trim(),
            email: cleanEmail,
          };
          if (profilePassword.trim()) {
            updatedCashier.password = profilePassword.trim();
          }
          return updatedCashier;
        }
        return c;
      });

      localStorage.setItem('tk_cashier_list', JSON.stringify(updatedList));

      const updatedUser: CurrentUser = {
        ...currentUser,
        name: profileName.trim(),
        email: cleanEmail
      };
      setCurrentUser(updatedUser);
      sessionStorage.setItem('tk_pos_session', JSON.stringify(updatedUser));
      setProfileSuccess('Profile updated successfully.');
    }
    
    setProfilePassword('');
    setTimeout(() => {
      setShowProfileModal(false);
      setProfileSuccess('');
      setProfileError('');
    }, 1500);
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('dark');
      localStorage.setItem('tk_theme', 'dark');
      setTheme('dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('tk_theme', 'light');
      setTheme('light');
    }
  };

  const isTabVisible = (tab: TabId) => {
    if (currentUser?.role === 'admin') return true;
    if (tab === 'POS' || tab === 'History' || tab === 'Customers' || tab === 'Inventory') return true;
    if (tab === 'Analytics') return cashierPermissions.viewAnalytics;
    if (tab === 'Accounts') return cashierPermissions.viewAccounts;
    if (tab === 'RetailReturns') return cashierPermissions.manageRetailReturns;
    if (tab === 'WholesaleReturns') return cashierPermissions.manageWholesaleReturns;
    if (tab === 'Purchases') return cashierPermissions.manageWholesale;
    return false;
  };

  // Guard routing: if not authenticated, render Login Screen
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} theme={theme} toggleTheme={toggleTheme} />;
  }

  return (
    <div className="min-h-screen bg-tk-bg text-tk-text-primary flex flex-col transition-colors duration-200">
      {/* Top Header */}
      <header className="bg-tk-surface border-b border-tk-border px-6 py-4 flex items-center justify-between tk-glass no-print">
        <div className="flex items-center space-x-3">
          <img 
            src={tekartLogo} 
            alt="TEKART Logo" 
            className="h-8 w-auto object-contain"
            style={theme === 'dark' ? { filter: 'brightness(0) invert(1)' } : undefined}
          />
          <span className="text-xl font-black font-display tracking-widest text-tk-text-primary h-8 flex items-center leading-none select-none">
            TEKART
          </span>
          <span className="text-[10px] bg-tk-gold/10 text-tk-gold border border-tk-gold/20 px-2 py-0.5 rounded font-mono font-bold tracking-wider select-none">
            POS BILLING TERMINAL
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Active Cashier Name / Profile Settings Trigger */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center space-x-2 bg-tk-surface-2 hover:bg-tk-blue-light/30 border border-tk-border rounded-xl px-3.5 py-1.5 text-xs text-tk-text-primary cursor-pointer transition-colors"
            title="Edit My Profile & Credentials"
          >
            <User className="w-4 h-4 text-tk-gold" />
            <span className="font-extrabold truncate max-w-[150px]">
              {currentUser.name}
            </span>
          </button>

          {/* Theme Selector */}
          <button 
            onClick={toggleTheme}
            className="w-8 h-8 rounded-xl border border-tk-border flex items-center justify-center text-tk-text-primary hover:bg-tk-blue-light/50 dark:hover:bg-tk-surface-2 cursor-pointer transition-colors"
            title="Toggle theme mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Log Out Button */}
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-xl border border-red-500/20 hover:border-red-500/40 text-red-500 flex items-center justify-center cursor-pointer transition-colors"
            title="Sign Out of Terminal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-64 bg-tk-surface border-r border-tk-border p-4 flex flex-col justify-between no-print">
          <nav className="space-y-1">
            {[
              { id: 'POS', label: 'POS Billing', icon: ShoppingCart },
              { id: 'History', label: 'Sales History', icon: History },
              { id: 'RetailReturns', label: 'Retail Returns', icon: RotateCcw },
              { id: 'WholesaleReturns', label: 'Wholesale Returns', icon: RotateCcw },
              { id: 'Inventory', label: 'Inventory Stock', icon: Package },
              { id: 'Purchases', label: 'Wholesale Purchases', icon: Truck },
              { id: 'Customers', label: 'Customers directory', icon: Users },
              { id: 'Accounts', label: 'Finance & Ledgers', icon: Percent },
              { id: 'Analytics', label: 'Analytics Reports', icon: TrendingUp },
              { id: 'Settings', label: 'Admin Settings', icon: SettingsIcon },
              { id: 'Roles', label: 'Role Management', icon: Shield }
            ].map(item => {
              if (!isTabVisible(item.id as TabId)) return null;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabId)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                    activeTab === item.id 
                      ? 'bg-tk-blue-mid text-white shadow-md shadow-tk-blue-mid/10' 
                      : 'text-tk-text-secondary hover:text-tk-text-primary hover:bg-tk-blue-light/50 dark:hover:bg-tk-surface-2'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-tk-border pt-4 text-center">
            <p className="text-[10px] text-tk-text-tertiary">TEKART Shop POS v1.0.0</p>
            <p className="text-3xs text-tk-text-tertiary mt-0.5">Origin: {isMockMode ? 'Offline Store' : 'Cloud Supabase'}</p>
          </div>
        </aside>

        {/* Content View area */}
        <main className="flex-1 overflow-y-auto p-6 bg-tk-bg text-tk-text-primary">
          {activeTab === 'POS' && (
            <POS 
              cashierName={currentUser.name} 
              isCashierRole={currentUser.role !== 'admin'}
              cashierPermissions={cashierPermissions}
            />
          )}
          {activeTab === 'History' && <SalesHistory />}
          {activeTab === 'RetailReturns' && (
            <Returns 
              type="retail"
              isAdmin={currentUser.role === 'admin'}
              canRetail={cashierPermissions.manageRetailReturns}
              canWholesale={cashierPermissions.manageWholesaleReturns}
            />
          )}
          {activeTab === 'WholesaleReturns' && (
            <Returns 
              type="wholesale"
              isAdmin={currentUser.role === 'admin'}
              canRetail={cashierPermissions.manageRetailReturns}
              canWholesale={cashierPermissions.manageWholesaleReturns}
            />
          )}
          {activeTab === 'Inventory' && (
            <Inventory 
              currentUserRole={currentUser.role}
              cashierPermissions={cashierPermissions}
            />
          )}
          {activeTab === 'Purchases' && <Purchases />}
          {activeTab === 'Customers' && <Customers />}
          {activeTab === 'Accounts' && <Accounts />}
          {activeTab === 'Analytics' && <Analytics />}
          {activeTab === 'Settings' && <Settings onPermissionsChange={loadCashierPermissions} />}
          {activeTab === 'Roles' && <Roles currentUser={currentUser} />}
        </main>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-tk-surface border border-tk-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-tk-border pb-3">
              <h2 className="text-sm font-bold text-tk-text-primary font-display">Edit Profile Credentials</h2>
              <button 
                onClick={() => {
                  setShowProfileModal(false);
                  setProfileError('');
                  setProfileSuccess('');
                }}
                className="text-tk-text-secondary hover:text-tk-text-primary text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            {profileError && (
              <div className="bg-red-500/10 border border-red-505 text-red-500 p-2.5 rounded-xl text-2xs">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="bg-green-500/10 border border-green-505 text-green-500 p-2.5 rounded-xl text-2xs">
                {profileSuccess}
              </div>
            )}

            <div className="space-y-3 text-xs">
              {currentUser.role !== 'admin' && (
                <div>
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Your Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-2.5 py-1.5 text-xs text-tk-text-primary focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Login Email Address</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-2.5 py-1.5 text-xs text-tk-text-primary focus:outline-none"
                />
              </div>
              {currentUser.role !== 'admin' && (
                <div>
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password (or leave blank)"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-2.5 py-1.5 text-xs text-tk-text-primary focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleUpdateProfile}
                className="bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2 px-5 rounded-lg transition-colors cursor-pointer"
              >
                Save Profile Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
