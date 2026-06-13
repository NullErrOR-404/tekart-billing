import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, Lock, Eye, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  onPermissionsChange: () => void;
}

export default function Settings({ onPermissionsChange }: SettingsProps) {
  // Cashier list
  const [cashiers, setCashiers] = useState<{ id: string; name: string; email: string; password: string }[]>([]);
  const [selectedCashierId, setSelectedCashierId] = useState<string>('');
  
  // Permissions Matrix values
  const [permissions, setPermissions] = useState<{
    viewAnalytics: boolean;
    viewAccounts: boolean;
    editStockDirectly: boolean;
    manageRetailReturns: boolean;
    manageWholesaleReturns: boolean;
    manageWholesale: boolean;
    voidTransactions: boolean;
  }>({
    viewAnalytics: false,
    viewAccounts: false,
    editStockDirectly: false,
    manageRetailReturns: false,
    manageWholesaleReturns: false,
    manageWholesale: false,
    voidTransactions: false
  });

  // New Cashier details
  const [newCashierName, setNewCashierName] = useState('');
  const [newCashierEmail, setNewCashierEmail] = useState('');
  const [newCashierPassword, setNewCashierPassword] = useState('');
  const [updatePasswordVal, setUpdatePasswordVal] = useState('');

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const savedCashiers = JSON.parse(localStorage.getItem('tk_cashier_list') || '[]');
    setCashiers(savedCashiers);
    if (savedCashiers.length > 0) {
      setSelectedCashierId(savedCashiers[0].id);
      loadCashierPermissions(savedCashiers[0].id);
    }
  }, []);

  const loadCashierPermissions = (cashierId: string) => {
    const allPermissions = JSON.parse(localStorage.getItem('tk_cashier_permissions_map') || '{}');
    const custPerm = allPermissions[cashierId] || {
      viewAnalytics: false,
      viewAccounts: false,
      editStockDirectly: false,
      manageRetailReturns: false,
      manageWholesaleReturns: false,
      manageWholesale: false,
      voidTransactions: false
    };
    setPermissions(custPerm);
  };

  const handleCashierSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedCashierId(id);
    loadCashierPermissions(id);
  };

  const handleSavePermissions = () => {
    if (!selectedCashierId) return;
    const allPermissions = JSON.parse(localStorage.getItem('tk_cashier_permissions_map') || '{}');
    allPermissions[selectedCashierId] = permissions;
    localStorage.setItem('tk_cashier_permissions_map', JSON.stringify(allPermissions));
    
    setSuccessMsg('Permissions matrix updated successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
    
    onPermissionsChange();
  };

  const handleToggle = (key: keyof typeof permissions) => {
    setPermissions({
      ...permissions,
      [key]: !permissions[key]
    });
  };

  const handleUpdatePassword = () => {
    if (!selectedCashierId) return;
    if (!updatePasswordVal.trim()) {
      setErrorMsg('Password cannot be empty.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const updatedList = cashiers.map(c => {
      if (c.id === selectedCashierId) {
        return { ...c, password: updatePasswordVal.trim() };
      }
      return c;
    });

    setCashiers(updatedList);
    localStorage.setItem('tk_cashier_list', JSON.stringify(updatedList));
    setUpdatePasswordVal('');

    setSuccessMsg('Password updated successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleAddCashier = () => {
    if (!newCashierName.trim() || !newCashierEmail.trim() || !newCashierPassword.trim()) {
      setErrorMsg('Name, Email, and Password are all required.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const newId = `u-${Date.now()}`;
    const newCashier = {
      id: newId,
      name: newCashierName.trim(),
      email: newCashierEmail.toLowerCase().trim(),
      password: newCashierPassword.trim()
    };

    const newList = [...cashiers, newCashier];
    setCashiers(newList);
    localStorage.setItem('tk_cashier_list', JSON.stringify(newList));

    // Save default permission settings (all locked)
    const allPermissions = JSON.parse(localStorage.getItem('tk_cashier_permissions_map') || '{}');
    allPermissions[newId] = {
      viewAnalytics: false,
      viewAccounts: false,
      editStockDirectly: false,
      manageRetailReturns: false,
      manageWholesaleReturns: false,
      manageWholesale: false,
      voidTransactions: false
    };
    localStorage.setItem('tk_cashier_permissions_map', JSON.stringify(allPermissions));

    setNewCashierName('');
    setNewCashierEmail('');
    setNewCashierPassword('');
    setSelectedCashierId(newId);
    setPermissions(allPermissions[newId]);

    setSuccessMsg(`Added cashier ${newCashier.name} successfully.`);
    setTimeout(() => setSuccessMsg(''), 4000);
    onPermissionsChange();
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto p-1">
      {/* Title */}
      <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass">
        <h1 className="text-xl font-bold font-display text-tk-text-primary">Owner Settings Dashboard</h1>
        <p className="text-xs text-tk-text-secondary">Admin configuration: Manage cashier roles, lock route permissions, and configure billing profiles</p>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-xl flex items-center space-x-2 text-xs">
          <CheckCircle2 className="w-4.5 h-4.5" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center space-x-2 text-xs">
          <AlertTriangle className="w-4.5 h-4.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left pane: Cashier selector & add */}
        <div className="md:col-span-5 bg-tk-surface border border-tk-border p-5 rounded-2xl space-y-4 h-fit">
          <h2 className="text-sm font-bold text-tk-text-primary font-display">Cashier Employees Directory</h2>
          
          <div className="space-y-3.5 text-xs text-tk-text-primary">
            <div>
              <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Select Employee to Manage</label>
              {cashiers.length === 0 ? (
                <p className="text-tk-text-secondary italic">No cashiers registered yet.</p>
              ) : (
                <select
                  value={selectedCashierId}
                  onChange={handleCashierSelect}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2.5 text-xs text-tk-text-primary focus:outline-none"
                >
                  {cashiers.map(c => (
                    <option key={c.id} value={c.id} className="bg-tk-surface">{c.name} ({c.email})</option>
                  ))}
                </select>
              )}
            </div>

            {selectedCashierId && (
              <div className="border-t border-tk-border pt-3.5 space-y-2.5">
                <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider block">Update Password</label>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    placeholder="New Password"
                    value={updatePasswordVal}
                    onChange={(e) => setUpdatePasswordVal(e.target.value)}
                    className="flex-1 bg-tk-surface-2 border border-tk-border rounded-lg px-2.5 py-1.5 text-xs text-tk-text-primary focus:outline-none"
                  />
                  <button
                    onClick={handleUpdatePassword}
                    className="bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-1.5 px-3 rounded-lg cursor-pointer transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-tk-border pt-3.5 space-y-2.5">
              <label className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider block">Register New Cashier</label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Full Name (e.g. Priya Sen)"
                  value={newCashierName}
                  onChange={(e) => setNewCashierName(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-2.5 py-1.5 text-xs text-tk-text-primary focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Login Email (e.g. priya@tekart.com)"
                  value={newCashierEmail}
                  onChange={(e) => setNewCustPermission(e)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-2.5 py-1.5 text-xs text-tk-text-primary focus:outline-none"
                />
                <input
                  type="password"
                  placeholder="Login Password"
                  value={newCashierPassword}
                  onChange={(e) => setNewCashierPassword(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-2.5 py-1.5 text-xs text-tk-text-primary focus:outline-none"
                />
                <button
                  onClick={handleAddCashier}
                  className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition-colors"
                >
                  Register Employee
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right pane: Roles & Permissions grid */}
        <div className="md:col-span-7 bg-tk-surface border border-tk-border p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-tk-border pb-2.5">
            <h2 className="text-sm font-bold text-tk-text-primary font-display flex items-center">
              <ShieldAlert className="w-4.5 h-4.5 mr-2 text-tk-gold" />
              Permissions Matrix
            </h2>
            <span className="text-3xs font-semibold text-tk-text-secondary">
              Editing: <span className="text-tk-text-primary font-bold">
                {cashiers.find(c => c.id === selectedCashierId)?.name || 'None'}
              </span>
            </span>
          </div>

          <div className="space-y-3.5">
            {[
              { key: 'viewAnalytics', label: 'View Analytics & Reports', desc: 'Allows access to monthly sales totals, gross margins, and top items charts.' },
              { key: 'viewAccounts', label: 'View Financial Accounts & salaries', desc: 'Allows access to bank deposits, utility expenses, salaries payout registers.' },
              { key: 'editStockDirectly', label: 'Edit Inventory stock levels directly', desc: 'Allows cashier to quickly update quantities from alerts page.' },
              { key: 'manageRetailReturns', label: 'Process Retail Returns (Customer)', desc: 'Allows processing item returns and restocking from customer sales invoices.' },
              { key: 'manageWholesaleReturns', label: 'Process Wholesale Returns (Dealer)', desc: 'Allows returning inventory stocks to wholesale suppliers.' },
              { key: 'manageWholesale', label: 'Process Wholesale restocks', desc: 'Allows recording incoming supplies, which increments global inventory.' },
              { key: 'voidTransactions', label: 'Perform void transactions', desc: 'Allows cashier to void complete invoices and auto-restock items.' }
            ].map(row => (
              <div key={row.key} className="flex items-start justify-between bg-tk-surface-2 border border-tk-border p-3 rounded-xl">
                <div className="pr-4">
                  <p className="text-xs font-bold text-tk-text-primary flex items-center">
                    {!permissions[row.key as keyof typeof permissions] ? (
                      <Lock className="w-3.5 h-3.5 mr-1.5 text-tk-text-tertiary" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                    )}
                    {row.label}
                  </p>
                  <p className="text-3xs text-tk-text-secondary mt-0.5">{row.desc}</p>
                </div>
                
                <button
                  onClick={() => handleToggle(row.key as keyof typeof permissions)}
                  disabled={!selectedCashierId}
                  className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors cursor-pointer disabled:opacity-35 ${
                    permissions[row.key as keyof typeof permissions] ? 'bg-tk-blue-mid justify-end' : 'bg-slate-300 dark:bg-slate-800 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-tk-border flex justify-end">
            <button
              onClick={handleSavePermissions}
              disabled={!selectedCashierId}
              className="bg-green-500 hover:bg-green-600 disabled:bg-tk-surface-2 disabled:text-tk-text-tertiary text-slate-950 font-extrabold text-xs py-2.5 px-6 rounded-lg transition-colors cursor-pointer"
            >
              Save Permission Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  function setNewCustPermission(e: React.ChangeEvent<HTMLInputElement>) {
    setNewCashierEmail(e.target.value);
  }
}
