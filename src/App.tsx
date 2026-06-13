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
  User
} from 'lucide-react';

type TabId = 'POS' | 'History' | 'RetailReturns' | 'WholesaleReturns' | 'Inventory' | 'Purchases' | 'Customers' | 'Accounts' | 'Analytics' | 'Settings';

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

  useEffect(() => {
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

    // 2. Try loading active session from SessionStorage
    const savedSession = sessionStorage.getItem('tk_pos_session');
    if (savedSession) {
      setCurrentUser(JSON.parse(savedSession));
    }
  }, []);

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
          {/* Active Cashier Name */}
          <div className="flex items-center space-x-2 bg-tk-surface-2 border border-tk-border rounded-xl px-3.5 py-1.5 text-xs text-tk-text-primary">
            <User className="w-4 h-4 text-tk-gold" />
            <span className="font-extrabold truncate max-w-[150px]">
              {currentUser.role === 'admin' ? 'Owner (Admin)' : `${currentUser.name}`}
            </span>
          </div>

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
              { id: 'Settings', label: 'Admin Settings', icon: SettingsIcon }
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
              cashierName={currentUser.role === 'admin' ? 'Owner (Admin)' : currentUser.name} 
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
        </main>
      </div>
    </div>
  );
}
