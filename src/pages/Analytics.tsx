import React, { useState, useEffect } from 'react';
import { supabase, Transaction, Expense, Product } from '../lib/supabase';
import { TrendingUp, Award, ShoppingBag, Landmark } from 'lucide-react';

export default function Analytics() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const { data: txData } = await supabase.from('transactions').select('*');
      if (txData) setTransactions(txData);

      const { data: expData } = await supabase.from('expenses').select('*');
      if (expData) setExpenses(expData);

      const { data: prodData } = await supabase.from('products').select('*');
      if (prodData) setProducts(prodData);
    } catch (err) {
      console.error(err);
    }
  };

  const completedTransactions = transactions.filter(t => !t.is_voided);
  const totalSales = completedTransactions.reduce((sum, t) => sum + t.total, 0);
  const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Compute Top Selling Products
  const productSalesCounts: { [sku: string]: { name: string; qty: number; value: number } } = {};
  completedTransactions.forEach(tx => {
    tx.items.forEach(item => {
      if (!productSalesCounts[item.sku]) {
        productSalesCounts[item.sku] = { name: item.name, qty: 0, value: 0 };
      }
      productSalesCounts[item.sku].qty += item.quantity;
      productSalesCounts[item.sku].value += item.subtotal;
    });
  });

  const sortedTopProducts = Object.keys(productSalesCounts)
    .map(sku => ({ sku, ...productSalesCounts[sku] }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const maxProductQty = sortedTopProducts.length > 0 ? sortedTopProducts[0].qty : 1;

  const paymentSplits = { Cash: 0, UPI: 0, Card: 0, 'Online Payment': 0 };
  completedTransactions.forEach(tx => {
    const method = tx.payment_method || 'Cash';
    if (method in paymentSplits) {
      paymentSplits[method as keyof typeof paymentSplits] += tx.total;
    }
  });

  const totalSplit = Object.values(paymentSplits).reduce((sum, v) => sum + v, 0) || 1;

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-1">
      {/* Title */}
      <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass">
        <h1 className="text-xl font-bold font-display text-tk-text-primary">Analytics Dashboard</h1>
        <p className="text-xs text-tk-text-secondary">Analyze shop revenues, profit margins, and popular categories in real-time</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-tk-surface border border-tk-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-3xs text-tk-text-secondary uppercase font-semibold">Total Retail Revenue</p>
            <p className="text-lg font-extrabold text-tk-text-primary mt-1">₹{totalSales.toFixed(2)}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
        </div>

        <div className="bg-tk-surface border border-tk-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-3xs text-tk-text-secondary uppercase font-semibold">Total Orders Processed</p>
            <p className="text-lg font-extrabold text-tk-text-primary mt-1">{completedTransactions.length} bills</p>
          </div>
          <ShoppingBag className="w-8 h-8 text-tk-blue-bright opacity-20" />
        </div>

        <div className="bg-tk-surface border border-tk-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-3xs text-tk-text-secondary uppercase font-semibold">Shop Utilities Outflow</p>
            <p className="text-lg font-extrabold text-tk-text-primary mt-1">₹{expensesTotal.toFixed(2)}</p>
          </div>
          <Landmark className="w-8 h-8 text-red-500 opacity-20" />
        </div>

        <div className="bg-tk-surface border border-tk-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-3xs text-tk-text-secondary uppercase font-semibold">Active Catalog Size</p>
            <p className="text-lg font-extrabold text-tk-text-primary mt-1">{products.length} categories</p>
          </div>
          <Award className="w-8 h-8 text-tk-gold opacity-20" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top selling products chart */}
        <div className="bg-tk-surface border border-tk-border p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-tk-text-primary font-display border-b border-tk-border pb-2">Top 5 Best Selling Items</h2>
          {sortedTopProducts.length === 0 ? (
            <p className="text-xs text-tk-text-secondary py-10 text-center">No sales records logged yet.</p>
          ) : (
            <div className="space-y-4 pt-2 text-xs">
              {sortedTopProducts.map(tp => {
                const percentage = (tp.qty / maxProductQty) * 100;
                return (
                  <div key={tp.sku} className="space-y-1">
                    <div className="flex justify-between font-semibold text-tk-text-primary text-2xs">
                      <span>{tp.name} (SKU: {tp.sku})</span>
                      <span>{tp.qty} sold | ₹{tp.value.toFixed(0)}</span>
                    </div>
                    <div className="w-full bg-tk-surface-2 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-tk-blue-mid to-tk-blue-bright h-full rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Splits chart */}
        <div className="bg-tk-surface border border-tk-border p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-tk-text-primary font-display border-b border-tk-border pb-2 mb-4">Payment Methods Distribution</h2>
            {completedTransactions.length === 0 ? (
              <p className="text-xs text-tk-text-secondary py-10 text-center">No transactions completed.</p>
            ) : (
              <div className="space-y-6 text-xs">
                <div className="w-full bg-tk-surface-2 rounded-2xl h-6 flex overflow-hidden border border-tk-border">
                  <div 
                    className="bg-green-500 h-full flex items-center justify-center text-slate-950 font-extrabold text-3xs transition-all"
                    style={{ width: `${(paymentSplits.Cash / totalSplit) * 100}%` }}
                    title={`Cash: ₹${paymentSplits.Cash.toFixed(2)}`}
                  >
                    {paymentSplits.Cash > 0 && 'Cash'}
                  </div>
                  <div 
                    className="bg-tk-blue-bright h-full flex items-center justify-center text-slate-950 font-extrabold text-3xs transition-all"
                    style={{ width: `${(paymentSplits.UPI / totalSplit) * 100}%` }}
                    title={`UPI: ₹${paymentSplits.UPI.toFixed(2)}`}
                  >
                    {paymentSplits.UPI > 0 && 'UPI'}
                  </div>
                  <div 
                    className="bg-tk-gold h-full flex items-center justify-center text-slate-950 font-extrabold text-3xs transition-all"
                    style={{ width: `${(paymentSplits.Card / totalSplit) * 100}%` }}
                    title={`Card: ₹${paymentSplits.Card.toFixed(2)}`}
                  >
                    {paymentSplits.Card > 0 && 'Card'}
                  </div>
                  <div 
                    className="bg-purple-500 h-full flex items-center justify-center text-slate-950 font-extrabold text-3xs transition-all"
                    style={{ width: `${(paymentSplits['Online Payment'] / totalSplit) * 100}%` }}
                    title={`Online Payment: ₹${paymentSplits['Online Payment'].toFixed(2)}`}
                  >
                    {paymentSplits['Online Payment'] > 0 && 'Online'}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 text-center text-2xs">
                  <div className="bg-tk-surface-2 p-2 rounded-xl border-l-4 border-green-500 border border-tk-border">
                    <p className="text-tk-text-secondary font-semibold truncate">Cash</p>
                    <p className="font-extrabold text-tk-text-primary mt-1">₹{paymentSplits.Cash.toFixed(0)}</p>
                    <p className="text-3xs text-tk-text-tertiary mt-0.5">{((paymentSplits.Cash / totalSplit) * 100).toFixed(0)}%</p>
                  </div>
                  <div className="bg-tk-surface-2 p-2 rounded-xl border-l-4 border-tk-blue-bright border border-tk-border">
                    <p className="text-tk-text-secondary font-semibold truncate">UPI</p>
                    <p className="font-extrabold text-tk-text-primary mt-1">₹{paymentSplits.UPI.toFixed(0)}</p>
                    <p className="text-3xs text-tk-text-tertiary mt-0.5">{((paymentSplits.UPI / totalSplit) * 100).toFixed(0)}%</p>
                  </div>
                  <div className="bg-tk-surface-2 p-2 rounded-xl border-l-4 border-tk-gold border border-tk-border">
                    <p className="text-tk-text-secondary font-semibold truncate">Card</p>
                    <p className="font-extrabold text-tk-text-primary mt-1">₹{paymentSplits.Card.toFixed(0)}</p>
                    <p className="text-3xs text-tk-text-tertiary mt-0.5">{((paymentSplits.Card / totalSplit) * 100).toFixed(0)}%</p>
                  </div>
                  <div className="bg-tk-surface-2 p-2 rounded-xl border-l-4 border-purple-500 border border-tk-border">
                    <p className="text-tk-text-secondary font-semibold truncate">Online</p>
                    <p className="font-extrabold text-tk-text-primary mt-1">₹{paymentSplits['Online Payment'].toFixed(0)}</p>
                    <p className="text-3xs text-tk-text-tertiary mt-0.5">{((paymentSplits['Online Payment'] / totalSplit) * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="text-center pt-4 border-t border-tk-border text-3xs text-tk-text-secondary">
            <span>Aggregated across {completedTransactions.length} completed customer sales</span>
          </div>
        </div>
      </div>
    </div>
  );
}
