import React, { useState, useEffect } from 'react';
import { supabase, Transaction, Product } from '../lib/supabase';
import { Search, CheckCircle2, AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface ReturnsProps {
  type: 'retail' | 'wholesale';
  isAdmin: boolean;
  canRetail: boolean;
  canWholesale: boolean;
}

export default function Returns({ type, isAdmin, canRetail, canWholesale }: ReturnsProps) {
  const activeTab = type === 'retail' ? 'Sales' : 'Purchase';
  
  // Sales Return states
  const [salesTxId, setSalesTxId] = useState('');
  const [foundSalesTx, setFoundSalesTx] = useState<Transaction | null>(null);
  const [salesReturnQtys, setSalesReturnQtys] = useState<{ [itemId: string]: number }>({});
  const [salesReturnChecked, setSalesReturnChecked] = useState<{ [itemId: string]: boolean }>({});
  
  // Purchase Return states
  const [wholesalerName, setWholesalerName] = useState('');
  const [purchaseProducts, setPurchaseProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [purchaseReturnQty, setPurchaseReturnQty] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Status banners
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*');
      if (data) setPurchaseProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Autocomplete search for wholesale return
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const filtered = purchaseProducts.filter(p => 
      p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)
    );
    setSearchResults(filtered);
  }, [searchQuery, purchaseProducts]);

  // Sales Return: Search Invoice
  const handleSearchSalesInvoice = async () => {
    if (!salesTxId.trim()) return;
    try {
      const { data, error } = await supabase.from('transactions').select('*').eq('id', salesTxId.trim()).single();
      if (error || !data) {
        setErrorMsg('Transaction ID not found.');
        setFoundSalesTx(null);
        setTimeout(() => setErrorMsg(''), 4000);
        return;
      }

      if (data.is_voided) {
        setErrorMsg('This transaction is already voided. Cannot perform partial returns.');
        setFoundSalesTx(null);
        setTimeout(() => setErrorMsg(''), 4000);
        return;
      }

      setFoundSalesTx(data);
      const qtys: { [id: string]: number } = {};
      const checked: { [id: string]: boolean } = {};
      data.items.forEach((item: any) => {
        qtys[item.id] = 1;
        checked[item.id] = false;
      });
      setSalesReturnQtys(qtys);
      setSalesReturnChecked(checked);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to locate sales invoice.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Submit Customer Sales Return
  const handleSubmitSalesReturn = async () => {
    if (!foundSalesTx) return;
    
    const itemsToReturn = foundSalesTx.items.filter(item => salesReturnChecked[item.id]);
    if (itemsToReturn.length === 0) {
      setErrorMsg('Please select at least one item to return.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    try {
      for (const item of itemsToReturn) {
        const returnQty = salesReturnQtys[item.id];
        if (returnQty <= 0 || returnQty > item.quantity) {
          setErrorMsg(`Invalid return quantity for ${item.name}. Must be between 1 and ${item.quantity}.`);
          setTimeout(() => setErrorMsg(''), 4000);
          return;
        }

        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.id).single();
        if (prod) {
          const newStock = prod.stock + returnQty;
          await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
        }
      }

      setSuccessMsg(`Successfully processed return of ${itemsToReturn.length} items. Inventory updated.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      
      setSalesTxId('');
      setFoundSalesTx(null);
      fetchProducts();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to submit sales return.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Submit Wholesale Purchase Return
  const handleSubmitPurchaseReturn = async () => {
    if (!selectedProduct || !wholesalerName) {
      setErrorMsg('Wholesaler name and product must be selected.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    if (purchaseReturnQty <= 0 || purchaseReturnQty > selectedProduct.stock) {
      setErrorMsg(`Return quantity exceeds current stock level (${selectedProduct.stock}).`);
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    try {
      const newStock = selectedProduct.stock - purchaseReturnQty;
      await supabase.from('products').update({ stock: newStock }).eq('id', selectedProduct.id);

      setSuccessMsg(`Successfully returned ${purchaseReturnQty} units of ${selectedProduct.name} to ${wholesalerName}.`);
      setTimeout(() => setSuccessMsg(''), 4000);

      setWholesalerName('');
      setSelectedProduct(null);
      setSearchQuery('');
      setPurchaseReturnQty(1);
      fetchProducts();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to submit purchase return.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-1">
      {/* Title */}
      <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass">
        <h1 className="text-xl font-bold font-display text-tk-text-primary">
          {type === 'retail' ? 'Retail Returns Monitor' : 'Wholesale Returns Monitor'}
        </h1>
        <p className="text-xs text-tk-text-secondary">
          {type === 'retail' 
            ? 'Process customer order returns and restock items back to store inventory' 
            : 'Record and track bulk stock returns dispatched back to wholesalers'}
        </p>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-xl flex items-center space-x-2 text-xs">
          <CheckCircle2 className="w-4.5 h-4.5" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-505 p-3 rounded-xl flex items-center space-x-2 text-xs">
          <AlertTriangle className="w-4.5 h-4.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sales Return Form */}
      {activeTab === 'Sales' && (
        <div className="bg-tk-surface border border-tk-border rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-tk-text-primary font-display">Sales Return Workspace</h2>
          <div className="flex space-x-2.5 max-w-md">
            <div className="relative flex-1 bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2.5 flex items-center">
              <Search className="w-4 h-4 text-tk-text-tertiary mr-2.5" />
              <input
                type="text"
                placeholder="Enter Sales Transaction ID..."
                value={salesTxId}
                onChange={(e) => setSalesTxId(e.target.value)}
                className="w-full bg-transparent text-xs text-tk-text-primary focus:outline-none placeholder-tk-text-tertiary"
              />
            </div>
            <button
              onClick={handleSearchSalesInvoice}
              className="bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs px-5 rounded-xl transition-colors cursor-pointer"
            >
              Find Order
            </button>
          </div>

          {foundSalesTx && (
            <div className="border border-tk-border rounded-xl overflow-hidden mt-4 bg-tk-surface">
              <div className="bg-tk-surface-2 p-4 border-b border-tk-border text-xs flex justify-between text-tk-text-primary">
                <div>
                  <p className="font-bold">Invoice ID: #{foundSalesTx.id.substring(0, 8)}...</p>
                  <p className="text-3xs text-tk-text-secondary mt-0.5">Date: {new Date(foundSalesTx.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">Customer: {foundSalesTx.customer_name || 'Walk-in'}</p>
                  <p className="text-3xs text-tk-text-secondary mt-0.5">Phone: {foundSalesTx.customer_phone || '-'}</p>
                </div>
              </div>

              <div className="p-4">
                <p className="text-3xs text-tk-text-secondary uppercase font-semibold mb-3 tracking-wider">Select items to return & restock</p>
                
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-tk-border text-tk-text-secondary">
                      <th className="py-2 text-center w-10">Select</th>
                      <th className="py-2">Item Description</th>
                      <th className="py-2 text-center w-24">QTY Purchased</th>
                      <th className="py-2 text-center w-32">QTY to Return</th>
                      <th className="py-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foundSalesTx.items.map((item) => (
                      <tr key={item.id} className="border-b border-tk-border hover:bg-tk-blue-light/10">
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            checked={salesReturnChecked[item.id] || false}
                            onChange={(e) => setSalesReturnChecked({
                              ...salesReturnChecked,
                              [item.id]: e.target.checked
                            })}
                            className="w-4 h-4 rounded accent-tk-blue-mid cursor-pointer"
                          />
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-tk-text-primary">{item.name}</p>
                          <p className="text-3xs text-tk-text-secondary">SKU: {item.sku}</p>
                        </td>
                        <td className="py-3 text-center text-tk-text-primary font-semibold">{item.quantity}</td>
                        <td className="py-3 text-center">
                          <input
                            type="number"
                            min="1"
                            max={item.quantity}
                            disabled={!salesReturnChecked[item.id]}
                            value={salesReturnQtys[item.id] || 1}
                            onChange={(e) => setSalesReturnQtys({
                              ...salesReturnQtys,
                              [item.id]: Math.max(1, Math.min(item.quantity, parseInt(e.target.value) || 1))
                            })}
                            className="w-16 bg-tk-surface-2 border border-tk-border rounded-md text-center text-xs py-1 text-tk-text-primary disabled:opacity-30 focus:outline-none"
                          />
                        </td>
                        <td className="py-3 text-right text-tk-text-secondary">₹{item.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end pt-4 mt-2">
                  <button
                    onClick={handleSubmitSalesReturn}
                    className="bg-green-500 hover:bg-green-600 text-slate-950 font-bold text-xs py-2.5 px-6 rounded-lg transition-colors cursor-pointer"
                  >
                    Confirm Return & Restock items
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Purchase Return Form */}
      {activeTab === 'Purchase' && (
        <div className="bg-tk-surface border border-tk-border rounded-2xl p-6 space-y-4 max-w-xl">
          <h2 className="text-sm font-bold text-tk-text-primary font-display">Wholesaler Return Workspace</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Wholesaler Dealer Name</label>
              <input
                type="text"
                placeholder="e.g. Balaji Distributors Pvt Ltd"
                value={wholesalerName}
                onChange={(e) => setWholesalerName(e.target.value)}
                className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-3 py-2 text-xs text-tk-text-primary focus:outline-none focus:border-tk-blue-mid"
              />
            </div>

            <div className="relative">
              <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Select Product to Return</label>
              <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-tk-text-tertiary mr-2" />
                <input
                  type="text"
                  placeholder="Type product name or SKU..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full bg-transparent text-xs text-tk-text-primary focus:outline-none placeholder-tk-text-tertiary"
                />
              </div>

              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-tk-surface border border-tk-border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto no-scrollbar">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setSelectedProduct(product);
                        setSearchQuery(product.name);
                        setShowDropdown(false);
                        setPurchaseReturnQty(1);
                      }}
                      className="w-full p-2.5 text-left border-b border-tk-border hover:bg-tk-blue-light/25 dark:hover:bg-tk-surface-2 transition-colors text-xs flex justify-between text-tk-text-primary"
                    >
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-3xs text-tk-text-secondary">SKU: {product.sku}</p>
                      </div>
                      <span className="text-3xs text-tk-text-tertiary">Stock: {product.stock} units</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="bg-tk-surface-2 border border-tk-border p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-xs text-tk-text-primary">
                  <div>
                    <p className="font-bold">{selectedProduct.name}</p>
                    <p className="text-3xs text-tk-text-secondary mt-0.5">SKU: {selectedProduct.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Current Stock: {selectedProduct.stock} units</p>
                    <p className="text-3xs text-tk-text-secondary mt-0.5">Unit Price: ₹{selectedProduct.price}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 max-w-xs">
                  <div className="flex-1">
                    <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Qty to Return</label>
                    <input
                      type="number"
                      min="1"
                      max={selectedProduct.stock}
                      value={purchaseReturnQty}
                      onChange={(e) => setPurchaseReturnQty(Math.max(1, Math.min(selectedProduct.stock, parseInt(e.target.value) || 1)))}
                      className="w-full bg-tk-surface border border-tk-border rounded-lg px-2 py-1.5 text-xs text-tk-text-primary focus:outline-none text-center font-bold"
                    />
                  </div>
                  <div className="flex-1 pt-4">
                    <button
                      onClick={handleSubmitPurchaseReturn}
                      className="w-full bg-red-500 hover:bg-red-600 text-slate-950 font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Return to Wholesaler
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
