import React, { useState, useEffect } from 'react';
import { supabase, Product, Category } from '../lib/supabase';
import { Search, AlertTriangle, ArrowRightLeft, FileText, CheckCircle2, ChevronRight, ChevronDown, Trash2, Plus, Info, Edit, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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
  const [alertsSearchQuery, setAlertsSearchQuery] = useState('');

  // Branch list states
  const [branches, setBranches] = useState<string[]>([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [showManageBranches, setShowManageBranches] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add Product states
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState('');
  const [newProdBuyPrice, setNewProdBuyPrice] = useState<string>('0');
  const [newProdPrice, setNewProdPrice] = useState<string>('0');
  const [newProdStock, setNewProdStock] = useState<string>('0');
  const [nameSuggestions, setNameSuggestions] = useState<Product[]>([]);
  const [showNameDropdown, setShowNameDropdown] = useState(false);

  // Inline Stock Edit states
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingStockVal, setEditingStockVal] = useState<string>('');

  // Sorting states
  const [sortField, setSortField] = useState<'name' | 'price' | 'stock' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Expanded variant rows
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const toggleExpand = (productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const isAdmin = currentUserRole === 'admin';
  const canEditStock = isAdmin || cashierPermissions.editStockDirectly;

  useEffect(() => {
    fetchProducts();
    fetchCategories();

    const saved = localStorage.getItem('tk_branches');
    if (saved) {
      const parsed = JSON.parse(saved);
      setBranches(parsed);
      if (parsed.length > 0) {
        setSrcBranch(parsed[0]);
        if (parsed.length > 1) setDestBranch(parsed[1]);
        else setDestBranch(parsed[0]);
      }
    } else {
      const defaults = ['Main Shop', 'Hadapsar Warehouse', 'Viman Nagar Store', 'Koregaon Park Branch'];
      localStorage.setItem('tk_branches', JSON.stringify(defaults));
      setBranches(defaults);
      setSrcBranch(defaults[0]);
      setDestBranch(defaults[2]);
    }
  }, []);

  // Auto-fill form when SKU matches existing product
  useEffect(() => {
    if (!newProdSku.trim()) {
      return;
    }
    const existing = products.find(p => p.sku.trim().toLowerCase() === newProdSku.trim().toLowerCase());
    if (existing) {
      setNewProdName(existing.name);
      setNewProdCat(existing.category_id);
      setNewProdBuyPrice((existing.buying_price || existing.price * 0.5).toString());
      setNewProdPrice(existing.price.toString());
    }
  }, [newProdSku, products]);

  // Autocomplete and auto-sku generation when name is entered first
  useEffect(() => {
    if (!newProdName.trim()) {
      setNameSuggestions([]);
      if (newProdSku.startsWith('TK-AUTO-')) {
        setNewProdSku('');
      }
      return;
    }
    const query = newProdName.toLowerCase().trim();
    const filtered = products.filter(p => p.name.toLowerCase().includes(query));
    setNameSuggestions(filtered);

    const exactMatch = products.find(p => p.name.toLowerCase() === query);
    if (!exactMatch) {
      if (!newProdSku.trim() || newProdSku.startsWith('TK-AUTO-')) {
        const namePart = newProdName.trim().toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 4);
        const randomPart = Math.floor(100 + Math.random() * 900);
        setNewProdSku(`TK-AUTO-${namePart || 'PROD'}-${randomPart}`);
      }
    } else {
      setNewProdSku(exactMatch.sku);
      setNewProdCat(exactMatch.category_id);
      setNewProdBuyPrice((exactMatch.buying_price || exactMatch.price * 0.5).toString());
      setNewProdPrice(exactMatch.price.toString());
    }
  }, [newProdName, products]);

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

  const handleAddBranch = () => {
    if (!newBranchName.trim()) return;
    if (branches.includes(newBranchName.trim())) {
      setErrorMsg('Branch already exists.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    const updated = [...branches, newBranchName.trim()];
    localStorage.setItem('tk_branches', JSON.stringify(updated));
    setBranches(updated);
    setNewBranchName('');
    setSuccessMsg(`Added branch "${newBranchName.trim()}" successfully.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSaveProduct = async () => {
    if (!newProdSku.trim()) {
      setErrorMsg('Product SKU is required.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const qty = parseInt(newProdStock) || 0;
    if (qty < 0) {
      setErrorMsg('Stock quantity cannot be negative.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const skuTrimmed = newProdSku.trim();

    try {
      const existing = products.find(p => p.sku.toLowerCase() === skuTrimmed.toLowerCase());
      if (existing) {
        const newStock = existing.stock + qty;
        const updates: any = {
          stock: newStock
        };

        if (newProdName.trim() && newProdName !== existing.name) {
          updates.name = newProdName.trim();
        }
        if (newProdCat && newProdCat !== existing.category_id) {
          updates.category_id = newProdCat;
        }
        const bPrice = parseFloat(newProdBuyPrice) || 0;
        if (bPrice > 0 && bPrice !== existing.buying_price) {
          updates.buying_price = bPrice;
        }
        const sPrice = parseFloat(newProdPrice) || 0;
        if (sPrice > 0 && sPrice !== existing.price) {
          updates.price = sPrice;
        }

        const { error } = await supabase.from('products').update(updates).eq('id', existing.id);
        if (error) throw error;

        setSuccessMsg(`Updated stock for ${existing.name}. New stock: ${newStock} units.`);
      } else {
        if (!newProdName.trim()) {
          setErrorMsg('Product name is required for new items.');
          setTimeout(() => setErrorMsg(''), 4000);
          return;
        }
        if (!newProdCat) {
          setErrorMsg('Please select a category for the new product.');
          setTimeout(() => setErrorMsg(''), 4000);
          return;
        }

        const bPrice = parseFloat(newProdBuyPrice) || 0;
        const sPrice = parseFloat(newProdPrice) || 0;

        const slug = newProdName.toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

        const newProduct = {
          sku: skuTrimmed,
          name: newProdName.trim(),
          slug,
          category_id: newProdCat,
          buying_price: bPrice || Math.round(sPrice * 0.5),
          price: sPrice,
          stock: qty,
          featured: false,
          cover_image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
          gallery: [],
          tags: ['archived'],
          priority: 0
        };

        const { error } = await supabase.from('products').insert([newProduct]);
        if (error) throw error;

        setSuccessMsg(`Added product "${newProdName.trim()}" successfully (Archived/Hidden in website).`);
      }

      setNewProdSku('');
      setNewProdName('');
      setNewProdCat(categories[0]?.id || '');
      setNewProdBuyPrice('0');
      setNewProdPrice('0');
      setNewProdStock('0');
      setShowAddProduct(false);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Database Error: ${err.message || 'Failed to save product.'}`);
      setTimeout(() => setErrorMsg(''), 6000);
    }
  };

  const handleSaveInlineStock = async (productId: string) => {
    const newStock = parseInt(editingStockVal);
    if (isNaN(newStock) || newStock < 0) {
      setErrorMsg('Please enter a valid stock quantity.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);

      if (error) throw error;

      setSuccessMsg('Stock updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      setEditingProductId(null);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to update stock: ${err.message || err}`);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setSuccessMsg(`Deleted product "${productName}" successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to delete product: ${err.message || err}`);
      setTimeout(() => setErrorMsg(''), 6000);
    }
  };

  const handleDeleteBranch = (branchToDelete: string) => {
    const updated = branches.filter(b => b !== branchToDelete);
    localStorage.setItem('tk_branches', JSON.stringify(updated));
    setBranches(updated);
    setSuccessMsg(`Deleted branch "${branchToDelete}".`);
    setTimeout(() => setSuccessMsg(''), 4000);
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

  const handleSort = (field: 'name' | 'price' | 'stock') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal: any = a[sortField === 'price' ? 'price' : sortField === 'stock' ? 'stock' : 'name'];
    let bVal: any = b[sortField === 'price' ? 'price' : sortField === 'stock' ? 'stock' : 'name'];

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const lowStockProducts = products.filter(p => p.stock < threshold);
  const filteredLowStockProducts = lowStockProducts.filter(p => 
    p.name.toLowerCase().includes(alertsSearchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(alertsSearchQuery.toLowerCase())
  );

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
          <div className="flex flex-col sm:flex-row gap-3.5 items-stretch">
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
            {canEditStock && (
              <button
                onClick={() => {
                  setShowAddProduct(!showAddProduct);
                  if (categories.length > 0 && !newProdCat) {
                    setNewProdCat(categories[0].id);
                  }
                }}
                className="bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1 shrink-0"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Add Product</span>
              </button>
            )}
          </div>

          {/* Add Product Tile Form */}
          {showAddProduct && (
            <div className="bg-tk-surface border border-tk-border p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-tk-border pb-2">
                <h2 className="text-sm font-bold text-tk-text-primary font-display flex items-center space-x-1.5">
                  <Plus className="w-4 h-4 text-tk-blue-bright" />
                  <span>Quick Add / Restock Product</span>
                </h2>
                <button
                  onClick={() => setShowAddProduct(false)}
                  className="text-3xs text-tk-text-secondary hover:text-tk-text-primary cursor-pointer font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">SKU Code</label>
                  <input
                    type="text"
                    placeholder="e.g. TK-PERF-100"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none font-mono"
                  />
                  {newProdSku.trim() && (
                    <div className="mt-1 text-[10px]">
                      {products.find(p => p.sku.trim().toLowerCase() === newProdSku.trim().toLowerCase()) ? (
                        <span className="text-green-500 font-semibold">✓ Existing product matched. Stock will be added.</span>
                      ) : (
                        <span className="text-amber-500 font-semibold">✦ SKU not found. A new product will be created (Archived/Hidden).</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Product Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Amber Oud Intense"
                    value={newProdName}
                    onChange={(e) => {
                      setNewProdName(e.target.value);
                      setShowNameDropdown(true);
                    }}
                    onFocus={() => setShowNameDropdown(true)}
                    onBlur={() => setTimeout(() => setShowNameDropdown(false), 250)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                  />
                  {showNameDropdown && nameSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-tk-surface border border-tk-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto no-scrollbar">
                      {nameSuggestions.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => {
                            setNewProdSku(prod.sku);
                            setNewProdName(prod.name);
                            setNewProdCat(prod.category_id);
                            setNewProdBuyPrice((prod.buying_price || prod.price * 0.5).toString());
                            setNewProdPrice(prod.price.toString());
                            setShowNameDropdown(false);
                          }}
                          className="w-full p-2 text-left border-b border-tk-border hover:bg-tk-blue-light/10 dark:hover:bg-tk-surface-2 transition-colors text-xs flex items-center justify-between text-tk-text-primary cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                            <img src={prod.cover_image} alt={prod.name} className="w-6 h-6 object-cover rounded border border-tk-border" />
                            <div>
                              <p className="font-semibold">{prod.name}</p>
                              <p className="text-[10px] text-tk-text-secondary">SKU: {prod.sku}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-tk-text-tertiary">Stock: {prod.stock}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Category</label>
                  <select
                    value={newProdCat}
                    onChange={(e) => setNewProdCat(e.target.value)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                  >
                    <option value="" disabled>Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-tk-surface">{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Quantity to Add</label>
                  <input
                    type="number"
                    min="0"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none font-bold text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {isAdmin && (
                  <div>
                    <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Wholesale Buying Price (₹)</label>
                    <input
                      type="text"
                      value={newProdBuyPrice}
                      onChange={(e) => setNewProdBuyPrice(e.target.value)}
                      className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Retail Selling Price (₹)</label>
                  <input
                    type="text"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={handleSaveProduct}
                    className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2.5 rounded-lg cursor-pointer transition-colors"
                  >
                    {products.find(p => p.sku.trim().toLowerCase() === newProdSku.trim().toLowerCase()) ? "Update Stock" : "Create Product (Archived)"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Catalog Stock table */}
          <div className="bg-tk-surface border border-tk-border rounded-2xl p-4 overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-tk-border text-tk-text-secondary pb-2">
                  <th className="py-2 font-semibold select-none">Product SKU</th>
                  <th 
                    className="py-2 font-semibold cursor-pointer hover:text-tk-blue-bright select-none transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th className="py-2 font-semibold select-none">Category</th>
                  {isAdmin && <th className="py-2 text-center font-semibold text-purple-400 select-none">Buying Cost</th>}
                  <th 
                    className="py-2 text-center font-semibold cursor-pointer hover:text-tk-blue-bright select-none transition-colors"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Selling Price</span>
                      {sortField === 'price' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="py-2 text-center font-semibold cursor-pointer hover:text-tk-blue-bright select-none transition-colors"
                    onClick={() => handleSort('stock')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Stock Quantity</span>
                      {sortField === 'stock' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                      )}
                    </div>
                  </th>
                  {isAdmin && <th className="py-2 text-right font-semibold select-none">Selling Value</th>}
                  <th className="py-2 text-right font-semibold pr-2 select-none">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map(p => {
                  const hasVariants = p.variants && p.variants.length > 0;
                  const isExpanded = expandedProducts.has(p.id);
                  return (
                    <React.Fragment key={p.id}>
                    <tr 
                      className={`border-b border-tk-border hover:bg-tk-blue-light/10 ${hasVariants ? 'cursor-pointer' : ''}`}
                      onClick={hasVariants ? () => toggleExpand(p.id) : undefined}
                    >
                    <td className="py-3 font-mono font-bold text-tk-text-primary text-3xs">{p.sku}</td>
                    <td className="py-3 flex items-center">
                      <img src={p.cover_image} alt={p.name} className="w-7 h-7 object-cover rounded mr-2.5 bg-tk-surface-2 border border-tk-border" />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-tk-text-primary">{p.name}</span>
                          {hasVariants && (
                            <span className="text-[9px] font-bold text-tk-blue-deep bg-tk-blue-light px-1.5 py-0.5 rounded-full">
                              {p.variants!.length} variants
                            </span>
                          )}
                        </div>
                        {p.tags?.includes('archived') && (
                          <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.2 rounded border border-red-500/20 w-fit mt-0.5">
                            Archived / Hidden
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-tk-text-secondary">{getCategoryName(p.category_id)}</td>
                    {isAdmin && (
                      <td className="py-3 text-center text-purple-500 font-semibold">
                        ₹{p.buying_price ? p.buying_price.toFixed(2) : (p.price * 0.5).toFixed(2)}
                      </td>
                    )}
                    <td className="py-3 text-center text-tk-text-secondary">₹{p.price.toFixed(2)}</td>
                    <td className="py-3 text-center">
                      {editingProductId === p.id ? (
                        <div className="flex items-center space-x-1.5 justify-center">
                          <input
                            type="number"
                            value={editingStockVal}
                            onChange={(e) => setEditingStockVal(e.target.value)}
                            className="w-16 bg-tk-surface-2 border border-tk-border rounded px-1.5 py-0.5 text-center text-xs text-tk-text-primary focus:outline-none font-bold"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveInlineStock(p.id)}
                            className="text-green-500 hover:text-green-400 font-bold text-3xs cursor-pointer px-1.5 py-0.5 rounded border border-green-500/20 bg-green-500/10"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingProductId(null)}
                            className="text-tk-text-secondary hover:text-tk-text-primary text-3xs cursor-pointer px-1.5 py-0.5 rounded border border-tk-border bg-tk-surface-2"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <span className={`font-bold px-2.5 py-0.5 rounded-full text-3xs ${
                            p.stock > 10 ? 'text-green-500 bg-green-500/10' :
                            p.stock > 0 ? 'text-amber-500 bg-amber-500/10' :
                            'text-red-500 bg-red-500/10'
                          }`}>
                            {p.stock} units
                          </span>
                          {canEditStock && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProductId(p.id);
                                setEditingStockVal(p.stock.toString());
                              }}
                              className="text-tk-blue-bright hover:text-tk-blue-deep cursor-pointer p-1 rounded hover:bg-tk-blue-light/20 transition-colors"
                              title="Edit Stock"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    {isAdmin && <td className="py-3 text-right font-bold text-tk-gold">₹{(p.price * p.stock).toFixed(2)}</td>}
                    <td className="py-3 text-right pr-2">
                      <div className="flex items-center justify-end gap-1">
                        {hasVariants && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(p.id); }}
                            className="text-tk-text-secondary hover:text-tk-blue-deep p-1.5 rounded-lg hover:bg-tk-blue-light/20 transition-colors cursor-pointer"
                            title={isExpanded ? 'Collapse variants' : 'Expand variants'}
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id, p.name); }}
                          className="text-red-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded variant sub-rows */}
                  {hasVariants && isExpanded && p.variants!.map((v, vIdx) => (
                    <tr key={`${p.id}-v-${vIdx}`} className="bg-tk-blue-pale/20 dark:bg-tk-surface-2/40 border-b border-tk-border/50">
                      <td className="py-2 pl-6 font-mono text-3xs text-tk-text-tertiary">{v.sku || '—'}</td>
                      <td className="py-2 pl-4 flex items-center">
                        <div className="w-1 h-6 bg-tk-blue-mid/30 rounded-full mr-2.5 shrink-0" />
                        {v.image_url ? (
                          <img src={v.image_url} alt={v.name} className="w-6 h-6 object-cover rounded mr-2 bg-tk-surface-2 border border-tk-border/50" />
                        ) : (
                          <div className="w-6 h-6 rounded mr-2 bg-tk-surface-2 border border-tk-border/50 flex items-center justify-center">
                            {v.hex ? (
                              <span className="w-4 h-4 rounded-full block" style={{ backgroundColor: v.hex }} />
                            ) : (
                              <span className="text-[8px] text-tk-text-tertiary">—</span>
                            )}
                          </div>
                        )}
                        <span className="text-xs text-tk-text-secondary font-medium">{v.name}</span>
                      </td>
                      <td className="py-2 text-tk-text-tertiary text-3xs">—</td>
                      {isAdmin && (
                        <td className="py-2 text-center text-purple-400 text-xs font-medium">
                          {v.buying_price ? `₹${v.buying_price.toFixed(2)}` : '—'}
                        </td>
                      )}
                      <td className="py-2 text-center text-tk-text-secondary text-xs">
                        {v.price ? `₹${v.price.toFixed(2)}` : `₹${p.price.toFixed(2)}`}
                      </td>
                      <td className="py-2 text-center">
                        <span className={`font-bold px-2 py-0.5 rounded-full text-3xs ${
                          (v.stock ?? 0) > 10 ? 'text-green-500 bg-green-500/10' :
                          (v.stock ?? 0) > 0 ? 'text-amber-500 bg-amber-500/10' :
                          'text-red-500 bg-red-500/10'
                        }`}>
                          {v.stock ?? 0}
                        </span>
                      </td>
                      {isAdmin && <td className="py-2 text-right text-xs text-tk-text-tertiary">—</td>}
                      <td className="py-2"></td>
                    </tr>
                  ))}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Branch Transfer Tab */}
      {activeTab === 'Transfer' && (
        <div className="bg-tk-surface border border-tk-border rounded-2xl p-6 max-w-xl space-y-4">
          <div className="flex justify-between items-center border-b border-tk-border pb-2">
            <h2 className="text-sm font-bold text-tk-text-primary font-display">Log Branch Stock Transfer</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowManageBranches(!showManageBranches)}
                className="text-3xs bg-tk-blue-light hover:bg-tk-blue-strong/20 text-tk-blue-deep font-bold px-2.5 py-1.5 rounded-lg border border-tk-border transition-colors cursor-pointer"
              >
                {showManageBranches ? "Back to Transfer" : "Manage Branches"}
              </button>
              {!isAdmin && (
                <span className="text-3xs bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-0.5 rounded-full font-semibold">
                  Owner Access Only
                </span>
              )}
            </div>
          </div>
          
          {showManageBranches ? (
            <div className="space-y-4 pt-1.5">
              <p className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-2">Configure Branch list</p>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter new branch name..."
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  disabled={!isAdmin}
                  className="flex-1 bg-tk-surface-2 border border-tk-border rounded-lg px-3 py-2 text-xs text-tk-text-primary focus:outline-none placeholder-tk-text-tertiary disabled:opacity-40"
                />
                <button
                  onClick={handleAddBranch}
                  disabled={!isAdmin}
                  className="bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2 px-4 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                >
                  Add Branch
                </button>
              </div>

              <div className="border border-tk-border rounded-xl divide-y divide-tk-border overflow-hidden bg-tk-surface">
                {branches.length === 0 ? (
                  <p className="p-4 text-center text-tk-text-secondary text-xs">No branches configured. Add one above.</p>
                ) : (
                  branches.map(b => (
                    <div key={b} className="p-3 flex justify-between items-center text-xs text-tk-text-primary">
                      <span className="font-semibold">{b}</span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteBranch(b)}
                          className="text-red-500 hover:text-red-400 cursor-pointer"
                          title={`Delete branch ${b}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-5 gap-3.5 items-center">
                <div className="col-span-2">
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Source Branch</label>
                  <select
                    value={srcBranch}
                    onChange={(e) => setSrcBranch(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none disabled:opacity-40"
                  >
                    {branches.map(b => (
                      <option key={b} value={b} className="bg-tk-surface">{b}</option>
                    ))}
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
                    {branches.map(b => (
                      <option key={b} value={b} className="bg-tk-surface">{b}</option>
                    ))}
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
                          {product.variants && product.variants.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {product.variants.map((color, cIdx) => {
                                const isSoldOut = color.stock !== undefined && color.stock <= 0;
                                return (
                                  <span
                                    key={cIdx}
                                    title={`${color.name} (Stock: ${color.stock ?? 0})`}
                                    className="w-2.5 h-2.5 rounded-full border border-tk-border/50 block shadow-2xs shrink-0 relative"
                                    style={{ backgroundColor: color.hex }}
                                  >
                                    {isSoldOut && (
                                      <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-red-600 leading-none select-none bg-black/10 rounded-full">
                                        ×
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <span className="text-3xs text-tk-text-tertiary font-semibold">Stock: {product.stock} units</span>
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
                      {selectedTransferProduct.variants && selectedTransferProduct.variants.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          {selectedTransferProduct.variants.map((color, cIdx) => {
                            const isSoldOut = color.stock !== undefined && color.stock <= 0;
                            return (
                              <span
                                key={cIdx}
                                title={`${color.name} (Stock: ${color.stock ?? 0})`}
                                className="w-3.5 h-3.5 rounded-full border border-tk-border/50 block shadow-2xs shrink-0 relative"
                                style={{ backgroundColor: color.hex }}
                              >
                                {isSoldOut && (
                                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-red-600 leading-none select-none bg-black/10 rounded-full">
                                    ×
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
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
            </>
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

          {/* Search Bar for Low Stock Alerts */}
          <div className="bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2.5 flex items-center max-w-md shadow-sm">
            <Search className="w-4 h-4 text-tk-text-tertiary mr-2" />
            <input
              type="text"
              placeholder="Search low stock items by name or SKU..."
              value={alertsSearchQuery}
              onChange={(e) => setAlertsSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-tk-text-primary focus:outline-none placeholder-tk-text-tertiary"
            />
          </div>

          {filteredLowStockProducts.length === 0 ? (
            <div className="text-center py-10 text-tk-text-secondary">
              <CheckCircle2 className="w-8 h-8 text-green-500/20 mx-auto mb-2" />
              <p className="text-xs">No low stock items match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLowStockProducts.map(p => (
                <div key={p.id} className="bg-tk-surface-2 border border-tk-border p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={p.cover_image} alt={p.name} className="w-10 h-10 object-cover rounded border border-tk-border" />
                    <div>
                      <p className="font-semibold text-tk-text-primary text-xs">{p.name}</p>
                      <p className="text-3xs text-tk-text-secondary">SKU: {p.sku}</p>
                      {p.variants && p.variants.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          {p.variants.map((color, cIdx) => {
                            const isSoldOut = color.stock !== undefined && color.stock <= 0;
                            return (
                              <span
                                key={cIdx}
                                title={`${color.name} (Stock: ${color.stock ?? 0})`}
                                className="w-2.5 h-2.5 rounded-full border border-tk-border/50 block shadow-2xs shrink-0 relative"
                                style={{ backgroundColor: color.hex }}
                              >
                                {isSoldOut && (
                                  <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-red-600 leading-none select-none bg-black/10 rounded-full">
                                    ×
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-3xs text-red-500 font-bold mt-1">Stock Left: {p.stock} units</p>
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
