import React, { useState, useEffect } from 'react';
import { supabase, Customer, Transaction } from '../lib/supabase';
import { Search, User, FileText, ShoppingBag, Landmark } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchTransactions();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase.from('customers').select('*').order('name');
      if (data) setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data } = await supabase.from('transactions').select('*');
      if (data) setTransactions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const getCustomerTransactions = (phone: string) => {
    return transactions.filter(t => t.customer_phone === phone);
  };

  const getCustomerStats = (phone: string) => {
    const custTxList = getCustomerTransactions(phone);
    const completedTx = custTxList.filter(t => !t.is_voided);
    const totalSpent = completedTx.reduce((sum, t) => sum + t.total, 0);
    const avgTicket = completedTx.length > 0 ? totalSpent / completedTx.length : 0;
    return {
      ordersCount: completedTx.length,
      totalSpent,
      avgTicket
    };
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto p-1 h-[calc(100vh-120px)]">
      {/* Left Column: Customer Directory list (5 cols) */}
      <div className="lg:col-span-5 flex flex-col space-y-4 overflow-y-auto pr-1 no-scrollbar">
        <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass">
          <h1 className="text-xl font-bold font-display text-tk-text-primary">Customers Directory</h1>
          <p className="text-xs text-tk-text-secondary">Track customer registrations and purchase histories</p>
        </div>

        {/* Search */}
        <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-xl px-3.5 py-2.5 shadow-sm focus-within:border-tk-blue-mid transition-all">
          <Search className="w-5 h-5 text-tk-text-tertiary mr-2.5" />
          <input 
            type="text" 
            placeholder="Search by phone number or name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-tk-text-primary focus:outline-none placeholder-tk-text-tertiary"
          />
        </div>

        {/* Customer list cards */}
        <div className="flex-1 bg-tk-surface border border-tk-border rounded-2xl p-3 overflow-y-auto space-y-2.5 no-scrollbar max-h-[500px]">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-10 text-tk-text-secondary text-xs">
              <User className="w-8 h-8 text-tk-text-tertiary mx-auto mb-1" />
              <p>No customers registered under search query.</p>
            </div>
          ) : (
            filteredCustomers.map(cust => {
              const stats = getCustomerStats(cust.phone);
              return (
                <button
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  className={`w-full text-left p-3.5 border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                    selectedCustomer?.id === cust.id 
                      ? 'bg-tk-blue-mid/15 border-tk-blue-bright' 
                      : 'bg-tk-surface-2 border-tk-border hover:border-tk-text-primary/10'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-tk-blue-bright/10 flex items-center justify-center text-tk-blue-bright text-xs font-bold">
                      {cust.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-tk-text-primary">{cust.name}</h3>
                      <p className="text-3xs text-tk-text-secondary mt-0.5">Phone: {cust.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xs font-extrabold text-tk-gold">₹{stats.totalSpent.toFixed(2)}</p>
                    <p className="text-3xs text-tk-text-secondary mt-0.5">{stats.ordersCount} bills completed</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Customer In-depth Statistics & Order List (7 cols) */}
      <div className="lg:col-span-7 flex flex-col space-y-4 overflow-y-auto no-scrollbar">
        {selectedCustomer ? (
          <div className="flex-1 flex flex-col space-y-4">
            {/* Customer Stats cards */}
            <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass grid grid-cols-3 gap-3">
              <div className="bg-tk-surface-2 border border-tk-border p-3.5 rounded-xl text-center">
                <ShoppingBag className="w-5 h-5 text-tk-blue-bright mx-auto mb-1.5" />
                <p className="text-3xs text-tk-text-secondary uppercase font-semibold">Total Orders</p>
                <p className="text-base font-extrabold text-tk-text-primary mt-1">{getCustomerStats(selectedCustomer.phone).ordersCount}</p>
              </div>
              <div className="bg-tk-surface-2 border border-tk-border p-3.5 rounded-xl text-center">
                <Landmark className="w-5 h-5 text-tk-gold mx-auto mb-1.5" />
                <p className="text-3xs text-tk-text-secondary uppercase font-semibold">Total Spent</p>
                <p className="text-base font-extrabold text-tk-text-primary mt-1">₹{getCustomerStats(selectedCustomer.phone).totalSpent.toFixed(0)}</p>
              </div>
              <div className="bg-tk-surface-2 border border-tk-border p-3.5 rounded-xl text-center">
                <FileText className="w-5 h-5 text-green-500 mx-auto mb-1.5" />
                <p className="text-3xs text-tk-text-secondary uppercase font-semibold">Avg Ticket</p>
                <p className="text-base font-extrabold text-tk-text-primary mt-1">₹{getCustomerStats(selectedCustomer.phone).avgTicket.toFixed(0)}</p>
              </div>
            </div>

            {/* Customer purchase history listing */}
            <div className="bg-tk-surface border border-tk-border p-5 rounded-2xl flex-1 flex flex-col">
              <h2 className="text-sm font-bold font-display text-tk-text-primary border-b border-tk-border pb-2.5 mb-3.5">
                Billing Invoices for {selectedCustomer.name}
              </h2>

              <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 no-scrollbar text-xs space-y-3">
                {getCustomerTransactions(selectedCustomer.phone).length === 0 ? (
                  <p className="text-tk-text-secondary py-10 text-center">No orders documented for this customer.</p>
                ) : (
                  getCustomerTransactions(selectedCustomer.phone).map(tx => (
                    <div key={tx.id} className="bg-tk-surface-2 border border-tk-border p-3.5 rounded-xl flex justify-between items-center text-tk-text-primary">
                      <div>
                        <p className="font-semibold">Invoice ID: #{tx.id.substring(0, 8)}...</p>
                        <p className="text-3xs text-tk-text-secondary mt-0.5">Date: {new Date(tx.created_at).toLocaleString()} | Payment Mode: {tx.payment_method}</p>
                        <p className="text-3xs text-tk-text-tertiary mt-0.5">
                          Items: {tx.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-tk-gold">₹{tx.total.toFixed(2)}</p>
                        <p className={`text-3xs font-semibold mt-0.5 ${tx.is_voided ? 'text-red-500' : 'text-green-500'}`}>
                          {tx.is_voided ? 'Voided' : 'Completed'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-tk-surface border border-dashed border-tk-border rounded-2xl flex flex-col items-center justify-center text-center text-tk-text-secondary">
            <User className="w-10 h-10 text-tk-text-tertiary mb-2" />
            <p className="text-sm">Select a customer from the left directory to review analytics and past invoices.</p>
          </div>
        )}
      </div>
    </div>
  );
}
