import React, { useState, useEffect } from 'react';
import { supabase, Transaction } from '../lib/supabase';
import { Search, FileText, AlertTriangle, CheckCircle2, RotateCcw, Printer } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';

export default function SalesHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
      if (data) setTransactions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVoidTransaction = async (receipt: Transaction) => {
    if (receipt.is_voided) return;

    if (!window.confirm('Are you sure you want to void this transaction? This will refund and restock all items.')) {
      return;
    }

    try {
      // 1. Restock products in DB
      for (const item of receipt.items) {
        // Fetch current product stock
        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.id).single();
        if (prod) {
          const newStock = prod.stock + item.quantity;
          await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
        }
      }

      // 2. Mark transaction as voided
      await supabase.from('transactions').update({ is_voided: true }).eq('id', receipt.id);

      setSuccessMsg(`Transaction #${receipt.id.substring(0, 8)} voided and restocked successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      
      // Refresh listings
      fetchTransactions();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to void transaction.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.customer_phone && t.customer_phone.includes(searchQuery)) ||
    (t.customer_name && t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-1">
      {/* Title Header */}
      <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold font-display text-tk-text-primary">Sales & Invoices Log</h1>
          <p className="text-xs text-tk-text-secondary">Browse, reprint, or void past billing tickets</p>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-xl flex items-center space-x-2 text-xs">
          <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center space-x-2 text-xs">
          <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search Filter */}
      <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-xl px-3.5 py-2.5 shadow-sm max-w-md focus-within:border-tk-blue-mid transition-all">
        <Search className="w-5 h-5 text-tk-text-tertiary mr-2.5" />
        <input 
          type="text" 
          placeholder="Filter by Order ID, Phone number, Name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-tk-text-primary focus:outline-none placeholder-tk-text-tertiary"
        />
      </div>

      {/* Transactions Table */}
      <div className="bg-tk-surface border border-tk-border rounded-2xl p-4 overflow-x-auto no-scrollbar">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-tk-text-secondary">
            <FileText className="w-10 h-10 text-tk-text-tertiary mx-auto mb-2" />
            <p className="text-sm">No transactions found matching criteria.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-tk-border text-tk-text-secondary pb-2">
                <th className="py-2.5 font-semibold">Order ID</th>
                <th className="py-2.5 font-semibold">Customer</th>
                <th className="py-2.5 text-center font-semibold">Method</th>
                <th className="py-2.5 text-right font-semibold">Grand Total</th>
                <th className="py-2.5 text-center font-semibold">Cashier</th>
                <th className="py-2.5 text-center font-semibold">Date</th>
                <th className="py-2.5 text-center font-semibold">Status</th>
                <th className="py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className={`border-b border-tk-border hover:bg-tk-blue-light/10 ${tx.is_voided ? 'opacity-50' : ''}`}>
                  <td className="py-3 font-semibold text-tk-text-primary">#{tx.id.substring(0, 8)}...</td>
                  <td className="py-3">
                    <p className="font-semibold text-tk-text-primary">{tx.customer_name || 'Walk-in'}</p>
                    {tx.customer_phone && <p className="text-3xs text-tk-text-secondary font-mono">Phone: {tx.customer_phone}</p>}
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-3xs bg-tk-surface-2 border border-tk-border px-2 py-0.5 rounded text-tk-text-primary font-semibold">
                      {tx.payment_method}
                    </span>
                  </td>
                  <td className="py-3 text-right font-bold text-tk-gold">₹{tx.total.toFixed(2)}</td>
                  <td className="py-3 text-center text-tk-text-secondary">{tx.cashier_name}</td>
                  <td className="py-3 text-center text-tk-text-secondary">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="py-3 text-center">
                    {tx.is_voided ? (
                      <span className="text-3xs bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                        Voided
                      </span>
                    ) : (
                      <span className="text-3xs bg-green-500/10 text-green-500 border border-green-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                        Completed
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right space-x-2">
                    <button
                      onClick={() => setSelectedReceipt(tx)}
                      className="bg-tk-surface-2 border border-tk-border hover:bg-tk-blue-light/50 text-tk-text-primary font-bold text-3xs py-1 px-2 rounded-md inline-flex items-center cursor-pointer"
                    >
                      <Printer className="w-3 h-3 mr-1" /> View/Reprint
                    </button>
                    {!tx.is_voided && (
                      <button
                        onClick={() => handleVoidTransaction(tx)}
                        className="bg-red-500/15 hover:bg-red-500/25 text-red-500 border border-red-500/20 font-bold text-3xs py-1 px-2 rounded-md inline-flex items-center cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Void
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reuse receipt modal layout if a transaction is selected for reprint */}
      {selectedReceipt && (
        <ReceiptModal 
          receipt={selectedReceipt} 
          onClose={() => setSelectedReceipt(null)} 
        />
      )}
    </div>
  );
}
