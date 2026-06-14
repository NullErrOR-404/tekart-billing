import React, { useState, useEffect } from 'react';
import { Shield, Search, Lock, ShieldAlert, CheckCircle2, UserCheck } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'cashier';
}

export default function Roles() {
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [cashiers, setCashiers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    // Load Owner profile
    const ownerProfile = JSON.parse(localStorage.getItem('tk_owner_profile') || JSON.stringify({
      id: 'owner',
      name: 'Owner',
      email: 'sameen14nmofficial@gmail.com',
      password: 'Mdsameen-2006',
      role: 'admin'
    }));
    setOwner(ownerProfile);

    // Load Cashiers
    const cashierList = JSON.parse(localStorage.getItem('tk_cashier_list') || '[]');
    setCashiers(cashierList);
  };

  const handleRoleToggle = (userId: string, currentRole: 'admin' | 'cashier') => {
    if (userId === 'owner') return; // Cannot demote primary owner

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
      <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold font-display text-tk-text-primary flex items-center space-x-2">
            <Shield className="w-5 h-5 text-tk-blue-bright" />
            <span>Role Management</span>
          </h1>
          <p className="text-xs text-tk-text-secondary mt-0.5">Configure system access levels and permissions for cashiers and administrators</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl p-3 text-xs flex items-center space-x-2 animate-pulse">
          <CheckCircle2 className="w-4.5 h-4.5" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {/* Main card grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Users list (8 columns) */}
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
        </div>

        {/* Roles Details Info Card (4 columns) */}
        <div className="lg:col-span-4 space-y-4">
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
