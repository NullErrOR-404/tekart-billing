import React, { useState, useEffect } from 'react';
import { supabase, Product, Category } from '../lib/supabase';
import { Search, AlertTriangle, ArrowRightLeft, FileText, CheckCircle2, ChevronRight } from 'lucide-react';

interface InventoryProps {
  currentUserRole: 'admin' | 'cashier';
  cashierPermissions: any;
}

export default function Inventory({ currentUserRole, cashierPermissions }: InventoryProps) {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Transfer' | 'Alerts'>('Overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Filtering & searching
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Stock Transfer state
  const [srcBranch, setSrcBranch] = useState('Main Shop');
  const [destBranch, setDestBranch] = useState('Viman Nagar Store');
  const [transferSearch, setTransferSearch] = useState('');
  const [transferResults, setTransferResults] = useState<Product[]>([]);
  const [selectedTransferProduct, setSelectedTransferProduct] = useState<Product | null>(null);
  const [transferQty, setTransferQty] = useState<number>(1);
  const [showTransferDropdown, setShowTransferDropdown] = useState(false);

  // Low stock threshold
  const [threshold, setThreshold] = useState<number>(5);
  const [quickRestockQtys, setQuickRestockQtys] = useState<{ [id: string]: number }>({});

  // Banners
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = currentUserRole === 'admin';
  const canEditStock = isAdmin || cashierPermissions.editStockDirectly;

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*').order('name');
      if (data) setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('categories').select('*').order('name');
      if (data) setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Autocomplete for transfer product
  useEffect(() => {
    if (!transferSearch) {
      setTransferResults([]);
      return;
    }
    const query = transferSearch.toLowerCase().trim();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)
    );
    setTransferResults(filtered);
  }, [transferSearch, products]);

  // Quick Restock directly from Alerts tab
  const handleQuickRestock = async (productId: string, currentStock: number) => {
    if (!canEditStock) {
      setErrorMsg('You do not have permission to restock inventory.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const qtyToAdd = quickRestockQtys[productId] || 0;
    if (qtyToAdd <= 0) {
      setErrorMsg('Please input a valid quantity to restock.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    try {
      const newStock = currentStock + qtyToAdd;
      await supabase.from('products').update({ stock: newStock }).eq('id', productId);
      
      setSuccessMsg(`Successfully restocked product. New Stock: ${newStock} units.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      
      setQuickRestockQtys({
        ...quickRestockQtys,
        [productId]: 0
      });
      
      fetchProducts();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to restock product.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Submit Branch Transfer
  const handleBranchTransferSubmit = async () => {
    if (!isAdmin) {
      setErrorMsg('Only Admin users can authorize branch transfers.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    if (!selectedTransferProduct) return;
    if (transferQty <= 0 || transferQty > selectedTransferProduct.stock) {
      setErrorMsg(`Transfer quantity exceeds available stock (${selectedTransferProduct.stock}).`);
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    try {
      if (srcBranch === 'Main Shop') {
        const newStock = selectedTransferProduct.stock - transferQty;
        await supabase.from('products').update({ stock: newStock }).eq('id', selectedTransferProduct.id);
      }

      setSuccessMsg(`Transferred ${transferQty} units of ${selectedTransferProduct.name} to ${destBranch} successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);

      setSelectedTransferProduct(null);
      setTransferSearch('');
      setTransferQty(1);
      
      fetchProducts();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to process branch transfer.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const getCategoryName = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : 'Unknown';
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = products.filter(p => p.stock < threshold);

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-1">
      {/* Title */}
      <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass">
        <h1 className="text-xl font-bold font-display text-tk-text-primary">Inventory Monitor</h1>
        <p className="text-xs text-tk-text-secondary">Track branch stock levels, restock items, and dispatch branch transfers</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-tk-surface-2 p-1 border border-tk-border rounded-xl max-w-md">
        <button
          onClick={() => setActiveTab('Overview')}
          className={`flex-1 py-2 text-2xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === 'Overview' ? 'bg-tk-blue-mid text-white' : 'text-tk-text-secondary hover:text-tk-text-primary'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Stock Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('Transfer')}
          className={`flex-1 py-2 text-2xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === 'Transfer' ? 'bg-tk-blue-mid text-white' : 'text-tk-text-secondary hover:text-tk-text-primary'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Branch Transfer</span>
        </button>
        <button
          onClick={() => setActiveTab('Alerts')}
          className={`flex-1 py-2 text-2xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === 'Alerts' ? 'bg-tk-blue-mid text-white' : 'text-tk-text-secondary hover:text-tk-text-primary'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Low Stock Alerts {lowStockProducts.length > 0 && `(${lowStockProducts.length})`}</span>
        </button>
      </div>

      {/* Message banners */}
      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-505 p-3 rounded-xl flex items-center space-x-2 text-xs">
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

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3.5">
            <div className="flex-1 bg-tk-surface-2 border border-tk-border rounded-xl px-3.5 py-2 flex items-center">
              <Search className="w-4.5 h-4.5 text-tk-text-tertiary mr-2.5" />
              <input
                type="text"
                placeholder="Search catalog by SKU or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-tk-text-primary focus:outline-none placeholder-tk-text-tertiary"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-tk-surface-2 border border-tk-border rounded-xl px-4 py-2 text-xs text-tk-text-primary focus:outline-none"
            >
              <option value="All" className="bg-tk-surface">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id} className="bg-tk-surface">{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Catalog Stock table */}
          <div className="bg-tk-surface border border-tk-border rounded-2xl p-4 overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-tk-border text-tk-text-secondary pb-2">
                  <th className="py-2 font-semibold">Product SKU</th>
                  <th className="py-2 font-semibold">Name</th>
                  <th className="py-2 font-semibold">Category</th>
                  {isAdmin && <th className="py-2 text-center font-semibold text-purple-400">Buying Cost</th>}
                  <th className="py-2 text-center font-semibold">Selling Price</th>
                  <th className="py-2 text-center font-semibold">Stock Quantity</th>
                  {isAdmin && <th className="py-2 text-right font-semibold">Selling Value</th>}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id} className="border-b border-tk-border hover:bg-tk-blue-light/10">
                    <td className="py-3 font-mono font-bold text-tk-text-primary text-3xs">{p.sku}</td>
                    <td className="py-3 flex items-center">
                      <img src={p.cover_image} alt={p.name} className="w-7 h-7 object-cover rounded mr-2.5 bg-tk-surface-2 border border-tk-border" />
                      <span className="font-semibold text-tk-text-primary">{p.name}</span>
                    </td>
                    <td className="py-3 text-tk-text-secondary">{getCategoryName(p.category_id)}</td>
                    {isAdmin && (
                      <td className="py-3 text-center text-purple-500 font-semibold">
                        ₹{p.buying_price ? p.buying_price.toFixed(2) : (p.price * 0.5).toFixed(2)}
                      </td>
                    )}
                    <td className="py-3 text-center text-tk-text-secondary">₹{p.price.toFixed(2)}</td>
                    <td className="py-3 text-center">
                      <span className={`font-bold px-2.5 py-0.5 rounded-full text-3xs ${
                        p.stock > 10 ? 'text-green-500 bg-green-500/10' :
                        p.stock > 0 ? 'text-amber-500 bg-amber-500/10' :
                        'text-red-500 bg-red-500/10'
                      }`}>
                        {p.stock} units
                      </span>
                    </td>
                    {isAdmin && <td className="py-3 text-right font-bold text-tk-gold">₹{(p.price * p.stock).toFixed(2)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Branch Transfer Tab */}
      {activeTab === 'Transfer' && (
        <div className="bg-tk-surface border border-tk-border rounded-2xl p-6 max-w-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-tk-border pb-2">
            <h2 className="text-sm font-bold text-tk-text-primary font-display">Log Branch Stock Transfer</h2>
            {!isAdmin && (
              <span className="text-3xs bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-0.5 rounded-full font-semibold">
                Owner Access Only
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-5 gap-3.5 items-center">
            <div className="col-span-2">
              <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Source Branch</label>
              <select
                value={srcBranch}
                onChange={(e) => setSrcBranch(e.target.value)}
                disabled={!isAdmin}
                className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none disabled:opacity-40"
              >
                <option value="Main Shop" className="bg-tk-surface">Main Shop (Viman Nagar)</option>
                <option value="Hadapsar Warehouse" className="bg-tk-surface">Hadapsar Warehouse</option>
              </select>
            </div>
            <div className="col-span-1 flex justify-center pt-4 text-tk-text-tertiary">
              <ChevronRight className="w-5 h-5" />
            </div>
            <div className="col-span-2">
              <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Destination Branch</label>
              <select
                value={destBranch}
                onChange={(e) => setDestBranch(e.target.value)}
                disabled={!isAdmin}
                className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none disabled:opacity-40"
              >
                <option value="Viman Nagar Store" className="bg-tk-surface">Viman Nagar Store</option>
                <option value="Hadapsar Warehouse" className="bg-tk-surface">Hadapsar Warehouse</option>
                <option value="Koregaon Park Branch" className="bg-tk-surface">Koregaon Park Branch</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Search Product</label>
            <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-tk-text-tertiary mr-2" />
              <input
                type="text"
                placeholder="Lookup product to transfer..."
                value={transferSearch}
                onChange={(e) => {
                  setTransferSearch(e.target.value);
                  setShowTransferDropdown(true);
                }}
                disabled={!isAdmin}
                onFocus={() => setShowTransferDropdown(true)}
                className="w-full bg-transparent text-xs text-tk-text-primary focus:outline-none placeholder-tk-text-tertiary disabled:opacity-40"
              />
            </div>

            {showTransferDropdown && transferResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-tk-surface border border-tk-border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto no-scrollbar">
                {transferResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedTransferProduct(product);
                      setTransferSearch(product.name);
                      setShowTransferDropdown(false);
                      setTransferQty(1);
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

          {selectedTransferProduct && (
            <div className="bg-tk-surface-2 border border-tk-border p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs text-tk-text-primary">
                <div>
                  <p className="font-bold">{selectedTransferProduct.name}</p>
                  <p className="text-3xs text-tk-text-secondary">SKU: {selectedTransferProduct.sku}</p>
                </div>
                <p className="font-semibold">Available Stock: {selectedTransferProduct.stock} units</p>
              </div>

              <div className="flex items-center space-x-4 max-w-xs">
                <div className="flex-1">
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Qty to Dispatch</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedTransferProduct.stock}
                    value={transferQty}
                    onChange={(e) => setTransferQty(Math.max(1, Math.min(selectedTransferProduct.stock, parseInt(e.target.value) || 1)))}
                    className="w-full bg-tk-surface border border-tk-border rounded-lg px-2 py-1.5 text-xs text-tk-text-primary focus:outline-none text-center font-bold"
                  />
                </div>
                <div className="flex-1 pt-4">
                  <button
                    onClick={handleBranchTransferSubmit}
                    className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Confirm Dispatch
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'Alerts' && (
        <div className="bg-tk-surface border border-tk-border rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-tk-text-primary font-display">Low Stock Alerts</h2>
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-tk-text-secondary">Alert Threshold:</span>
              <input
                type="number"
                min="1"
                max="20"
                value={threshold}
                onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value) || 5))}
                className="w-12 bg-tk-surface-2 border border-tk-border rounded px-1.5 py-0.5 text-center text-tk-text-primary focus:outline-none"
              />
              <span className="text-tk-text-secondary">units</span>
            </div>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="text-center py-10 text-tk-text-secondary">
              <CheckCircle2 className="w-8 h-8 text-green-500/20 mx-auto mb-2" />
              <p className="text-xs">No low stock items. All products have healthy inventory volumes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lowStockProducts.map(p => (
                <div key={p.id} className="bg-tk-surface-2 border border-tk-border p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={p.cover_image} alt={p.name} className="w-10 h-10 object-cover rounded border border-tk-border" />
                    <div>
                      <p className="font-semibold text-tk-text-primary text-xs">{p.name}</p>
                      <p className="text-3xs text-tk-text-secondary">SKU: {p.sku}</p>
                      <p className="text-3xs text-red-500 font-bold mt-0.5">Stock Left: {p.stock} units</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      placeholder="+Qty"
                      min="1"
                      disabled={!canEditStock}
                      value={quickRestockQtys[p.id] || ''}
                      onChange={(e) => setQuickRestockQtys({
                        ...quickRestockQtys,
                        [p.id]: Math.max(1, parseInt(e.target.value) || 0)
                      })}
                      className="w-14 bg-tk-surface border border-tk-border rounded-md py-1 text-center text-xs text-tk-text-primary focus:outline-none placeholder-tk-text-tertiary disabled:opacity-40"
                    />
                    <button
                      onClick={() => handleQuickRestock(p.id, p.stock)}
                      disabled={!canEditStock}
                      className="bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-3xs py-1.5 px-3 rounded-md transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Restock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
