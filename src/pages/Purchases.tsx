import React, { useState, useEffect } from 'react';
import { supabase, Product, WholesalePurchase, ProductVariant } from '../lib/supabase';
import { Search, Plus, Trash2, FileText, CheckCircle2, AlertTriangle, ArrowDown, Eye } from 'lucide-react';

export default function Purchases() {
  const [activeTab, setActiveTab] = useState<'New' | 'History'>('New');
  const [products, setProducts] = useState<Product[]>([]);
  
  // Wholesaler states
  const [wholesalerName, setWholesalerName] = useState('');
  
  // Selection states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [costPrice, setCostPrice] = useState<string>('0');
  const [purchaseQty, setPurchaseQty] = useState<number>(1);

  // Cart / Invoice state
  const [invoiceItems, setInvoiceItems] = useState<{
    product: Product;
    selectedVariant?: ProductVariant;
    costPrice: number;
    quantity: number;
  }[]>([]);

  // History states
  const [purchaseHistory, setPurchaseHistory] = useState<WholesalePurchase[]>([]);

  // Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Categories and New Product Form states
  const [categories, setCategories] = useState<any[]>([]);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategoryId, setNewProdCategoryId] = useState('');
  const [newProdCostPrice, setNewProdCostPrice] = useState('0');
  const [newProdQty, setNewProdQty] = useState<number>(1);
  const [selectedHistoryPurchase, setSelectedHistoryPurchase] = useState<WholesalePurchase | null>(null);

  // New product variant builder states
  const [newProdHasVariants, setNewProdHasVariants] = useState(false);
  const [newProdVariantType, setNewProdVariantType] = useState('color');
  const [newProdVariants, setNewProdVariants] = useState<{
    name: string;
    sku: string;
    buying_price: string;
    price: string;
    stock: string;
    hex?: string;
  }[]>([]);

  const addVariantRow = () => {
    setNewProdVariants([
      ...newProdVariants,
      { name: '', sku: '', buying_price: '0', price: '0', stock: '1', hex: '#3b82f6' }
    ]);
  };

  const removeVariantRow = (index: number) => {
    const updated = [...newProdVariants];
    updated.splice(index, 1);
    setNewProdVariants(updated);
  };

  const updateVariantRow = (index: number, field: string, value: string) => {
    const updated = [...newProdVariants];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setNewProdVariants(updated);
  };

  useEffect(() => {
    fetchProducts();
    fetchPurchaseHistory();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('categories').select('*').order('name');
      if (data) {
        setCategories(data);
        if (data.length > 0) {
          setNewProdCategoryId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*').order('name');
      if (data) setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      const { data } = await supabase.from('wholesale_purchases').select('*').order('created_at', { ascending: false });
      if (data) setPurchaseHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!window.confirm("Are you sure you want to delete this wholesale purchase record? This will remove the record from history and exclude it from accounts/ledger analytics. Stock levels won't be reverted automatically.")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('wholesale_purchases')
        .delete()
        .eq('id', purchaseId);
        
      if (error) throw error;
      
      setSuccessMsg('Wholesale purchase record deleted successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      
      if (selectedHistoryPurchase?.id === purchaseId) {
        setSelectedHistoryPurchase(null);
      }
      
      fetchPurchaseHistory();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to delete record: ${err.message || err}`);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Autocomplete search
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)
    );
    setSearchResults(filtered);
  }, [searchQuery, products]);

  const addProductToInvoice = () => {
    if (!selectedProduct) return;
    
    // Check if variant is required but not selected
    if (selectedProduct.variants && selectedProduct.variants.length > 0 && !selectedVariant) {
      setErrorMsg('Please select a variant first.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const cost = parseFloat(costPrice) || 0;
    if (cost <= 0 || purchaseQty <= 0) {
      setErrorMsg('Price and quantity must be greater than zero.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const existingIndex = invoiceItems.findIndex(item => 
      item.product.id === selectedProduct.id && 
      (item.selectedVariant?.name === selectedVariant?.name)
    );
    
    if (existingIndex > -1) {
      const updated = [...invoiceItems];
      updated[existingIndex].quantity += purchaseQty;
      updated[existingIndex].costPrice = cost;
      setInvoiceItems(updated);
    } else {
      setInvoiceItems([
        ...invoiceItems, 
        { 
          product: selectedProduct, 
          selectedVariant: selectedVariant || undefined, 
          costPrice: cost, 
          quantity: purchaseQty 
        }
      ]);
    }

    setSelectedProduct(null);
    setSelectedVariant(null);
    setSearchQuery('');
    setCostPrice('0');
    setPurchaseQty(1);
  };

  const removeFromInvoice = (index: number) => {
    const updated = [...invoiceItems];
    updated.splice(index, 1);
    setInvoiceItems(updated);
  };

  const handleCompletePurchase = async () => {
    if (!wholesalerName.trim()) {
      setErrorMsg('Please enter the wholesaler dealer name.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    if (invoiceItems.length === 0) {
      setErrorMsg('Invoice items list is empty.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    try {
      for (const item of invoiceItems) {
        if (item.selectedVariant && item.product.variants) {
          const updatedVariants = item.product.variants.map((v: any) => {
            if (v.name === item.selectedVariant?.name) {
              return {
                ...v,
                stock: (v.stock || 0) + item.quantity
              };
            }
            return v;
          });
          const totalStock = updatedVariants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
          
          const { error } = await supabase
            .from('products')
            .update({ 
              variants: updatedVariants, 
              stock: totalStock 
            })
            .eq('id', item.product.id);
            
          if (error) throw error;
        } else {
          const newStock = item.product.stock + item.quantity;
          const { error } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.product.id);
            
          if (error) throw error;
        }
      }

      const items = invoiceItems.map(item => {
        const nameSuffix = item.selectedVariant ? ` (${item.selectedVariant.name})` : '';
        const sku = item.selectedVariant?.sku || item.product.sku;
        return {
          product_id: item.product.id,
          name: item.product.name + nameSuffix,
          sku: sku,
          cost_price: item.costPrice,
          quantity: item.quantity,
          subtotal: item.costPrice * item.quantity,
          variant_name: item.selectedVariant?.name || null
        };
      });

      const grandTotal = items.reduce((sum, item) => sum + item.subtotal, 0);

      const record = {
        wholesaler_name: wholesalerName,
        items,
        total: grandTotal
      };

      const { data, error: insertError } = await supabase.from('wholesale_purchases').insert([record]).select();
      if (insertError) throw insertError;

      if (data && data[0]) {
        setSuccessMsg(`Restocked wholesale purchase successfully. Stock levels updated!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        
        setInvoiceItems([]);
        setWholesalerName('');
        fetchProducts();
        fetchPurchaseHistory();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to process wholesale purchase: ${err.message || err}`);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleAddNewProductToCatalog = async () => {
    if (!newProdName.trim() || !newProdCategoryId) {
      setErrorMsg('Product name and category are required.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    if (newProdHasVariants && newProdVariants.length === 0) {
      setErrorMsg('Please add at least one variant.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    try {
      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedSlug = `${newProdName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${uniqueSuffix}`;

      let productPayload: any = {
        name: newProdName.trim(),
        category_id: newProdCategoryId,
        featured: false,
        priority: 0,
        gallery: [],
        tags: ['archived'],
        cover_image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80'
      };

      if (newProdHasVariants) {
        const variantsPayload = newProdVariants.map((v) => {
          const varCost = parseFloat(v.buying_price) || 0;
          const varPrice = parseFloat(v.price) || 0;
          const varSlug = `${generatedSlug}-${v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          return {
            type: newProdVariantType,
            name: v.name.trim(),
            sku: v.sku.trim() || `${newProdName.split(' ').map(w => w[0]).join('').toUpperCase()}-${v.name.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
            buying_price: varCost,
            price: varPrice,
            stock: 0, // start with 0, will be restocked via cart
            slug: varSlug,
            ...(newProdVariantType === 'color' ? { hex: v.hex } : {})
          };
        });

        const firstVar = variantsPayload[0];

        productPayload = {
          ...productPayload,
          sku: firstVar.sku,
          slug: generatedSlug,
          buying_price: firstVar.buying_price || 0,
          price: firstVar.price || 0,
          stock: 0,
          variants: variantsPayload,
          variant_type: newProdVariantType
        };
      } else {
        const cost = parseFloat(newProdCostPrice) || 0;
        const nameInitials = newProdName.split(' ').map(w => w[0]).join('').toUpperCase().replace(/[^A-Z]/g, '');
        const generatedSku = `TK-${nameInitials || 'NEW'}-${uniqueSuffix}`;

        productPayload = {
          ...productPayload,
          sku: generatedSku,
          slug: generatedSlug,
          price: cost * 1.5,
          buying_price: cost,
          stock: 0
        };
      }

      const { data, error } = await supabase.from('products').insert([productPayload]).select();
      if (error) throw error;

      if (data && data[0]) {
        const createdProd = data[0];
        
        if (newProdHasVariants && createdProd.variants) {
          const newItems = createdProd.variants.map((v: any, index: number) => {
            const qty = parseInt(newProdVariants[index].stock) || 1;
            const cost = parseFloat(newProdVariants[index].buying_price) || 0;
            return {
              product: createdProd,
              selectedVariant: v,
              costPrice: cost,
              quantity: qty
            };
          });
          setInvoiceItems([...invoiceItems, ...newItems]);
        } else {
          setInvoiceItems([
            ...invoiceItems, 
            { 
              product: createdProd, 
              costPrice: parseFloat(newProdCostPrice) || 0, 
              quantity: newProdQty 
            }
          ]);
        }

        setNewProdName('');
        setNewProdCostPrice('0');
        setNewProdQty(1);
        setNewProdHasVariants(false);
        setNewProdVariants([]);
        setShowNewProductForm(false);
        setSuccessMsg(`Successfully added ${createdProd.name} to catalog and restock cart.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchProducts();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to add new product: ${err.message || 'Check database policies.'}`);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const invoiceSubtotal = invoiceItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-1">
      {/* Title */}
      <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass">
        <h1 className="text-xl font-bold font-display text-tk-text-primary">Wholesale Purchases</h1>
        <p className="text-xs text-tk-text-secondary">Log bulk/supply restock invoices from wholesale dealers to adjust inventory stock counts</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-tk-surface-2 p-1 border border-tk-border rounded-xl max-w-sm">
        <button
          onClick={() => setActiveTab('New')}
          className={`flex-1 py-2 text-2xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === 'New' ? 'bg-tk-blue-mid text-white' : 'text-tk-text-secondary hover:text-tk-text-primary'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Purchase</span>
        </button>
        <button
          onClick={() => setActiveTab('History')}
          className={`flex-1 py-2 text-2xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1 ${
            activeTab === 'History' ? 'bg-tk-blue-mid text-white' : 'text-tk-text-secondary hover:text-tk-text-primary'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Purchase History</span>
        </button>
      </div>

      {/* Messages */}
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

      {/* Tab: New Wholesaler Purchase */}
      {activeTab === 'New' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Wholesaler Details + Product Selector Form (7 cols) */}
          <div className="lg:col-span-7 bg-tk-surface border border-tk-border p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-tk-border pb-2">
              <h2 className="text-sm font-bold text-tk-text-primary font-display">Log restock invoice items</h2>
              <button
                onClick={() => setShowNewProductForm(!showNewProductForm)}
                className="text-3xs bg-tk-blue-light hover:bg-tk-blue-strong/20 text-tk-blue-deep font-bold px-2.5 py-1.5 rounded-lg border border-tk-border transition-colors cursor-pointer"
              >
                {showNewProductForm ? "Search Existing Product" : "Add Completely New Product"}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Wholesaler Name</label>
                <input
                  type="text"
                  placeholder="e.g. Balaji Distributors Pvt Ltd"
                  value={wholesalerName}
                  onChange={(e) => setWholesalerName(e.target.value)}
                  className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-3 py-2 text-xs text-tk-text-primary focus:outline-none focus:border-tk-blue-mid"
                />
              </div>

              {!showNewProductForm ? (
                <div className="space-y-4">
                  {/* Product search selection dropdown */}
                  <div className="relative">
                    <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Select Product to Restock</label>
                    <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-lg px-3 py-2">
                      <Search className="w-4 h-4 text-tk-text-tertiary mr-2" />
                      <input
                        type="text"
                        placeholder="Search product by name or SKU..."
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
                            type="button"
                            onClick={() => {
                              setSelectedProduct(product);
                              setSearchQuery(product.name);
                              setShowDropdown(false);
                              setSelectedVariant(null);
                              if (product.variants && product.variants.length > 0) {
                                setCostPrice('0');
                              } else {
                                setCostPrice((product.buying_price || product.price * 0.5).toString());
                              }
                            }}
                            className="w-full p-2.5 text-left border-b border-tk-border hover:bg-tk-blue-light/20 dark:hover:bg-tk-surface-2 transition-colors text-xs flex justify-between text-tk-text-primary"
                          >
                            <div>
                              <p className="font-semibold">{product.name}</p>
                              <p className="text-3xs text-tk-text-secondary font-mono">SKU: {product.sku}</p>
                            </div>
                            <span className="text-3xs text-tk-text-tertiary">In Stock: {product.stock}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedProduct && (
                    <div className="bg-tk-surface-2 border border-tk-border p-4 rounded-xl space-y-3.5">
                      <div className="flex justify-between items-center text-xs text-tk-text-primary">
                        <div>
                          <p className="font-bold">{selectedProduct.name}</p>
                          <p className="text-3xs text-tk-text-secondary">SKU: {selectedProduct.sku}</p>
                        </div>
                        <span className="text-3xs text-tk-text-tertiary">Current Stock: {selectedProduct.stock} units</span>
                      </div>

                      {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                        <div>
                          <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Select Variant to Restock *</label>
                          <select
                            value={selectedVariant ? selectedVariant.name : ''}
                            onChange={(e) => {
                              const variant = selectedProduct.variants?.find(v => v.name === e.target.value);
                              if (variant) {
                                setSelectedVariant(variant);
                                setCostPrice((variant.buying_price || selectedProduct.buying_price || (variant.price || selectedProduct.price) * 0.5).toString());
                              } else {
                                setSelectedVariant(null);
                                setCostPrice('0');
                              }
                            }}
                            className="w-full bg-tk-surface border border-tk-border rounded-lg p-2 text-xs text-tk-text-primary focus:outline-none"
                          >
                            <option value="">-- Choose Variant --</option>
                            {selectedProduct.variants.map((v) => (
                              <option key={v.name} value={v.name} className="bg-tk-surface">
                                {v.name} (Current Stock: {v.stock ?? 0}, SKU: {v.sku || '—'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Wholesale Cost Price (₹)</label>
                          <input
                            type="text"
                            value={costPrice}
                            onChange={(e) => setCostPrice(e.target.value)}
                            className="w-full bg-tk-surface border border-tk-border rounded-lg px-2.5 py-1.5 text-xs text-tk-text-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Quantity Purchased</label>
                          <input
                            type="number"
                            min="1"
                            value={purchaseQty}
                            onChange={(e) => setPurchaseQty(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-tk-surface border border-tk-border rounded-lg px-2.5 py-1.5 text-xs text-tk-text-primary focus:outline-none text-center font-bold"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1.5">
                        <button
                          onClick={addProductToInvoice}
                          className="bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2 px-5 rounded-lg transition-colors cursor-pointer"
                        >
                          Add Product Item
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pt-1.5">
                  <p className="text-3xs text-tk-text-secondary uppercase font-bold tracking-wider mb-2">Create New Product in Catalog</p>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Product Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Nivea Cool Kick Deodorant"
                        value={newProdName}
                        onChange={(e) => setNewProdName(e.target.value)}
                        className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-3 py-2 text-xs text-tk-text-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Category Association *</label>
                      <select
                        value={newProdCategoryId}
                        onChange={(e) => setNewProdCategoryId(e.target.value)}
                        className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-3 py-2.5 text-xs text-tk-text-primary focus:outline-none"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id} className="bg-tk-surface">
                            {cat.icon} {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Has Variants Toggle */}
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="newProdHasVariants"
                      checked={newProdHasVariants}
                      onChange={(e) => {
                        setNewProdHasVariants(e.target.checked);
                        if (e.target.checked && newProdVariants.length === 0) {
                          addVariantRow();
                        }
                      }}
                      className="rounded border-tk-border bg-tk-surface-2 text-tk-blue-mid focus:ring-tk-blue-mid w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="newProdHasVariants" className="text-xs font-semibold text-tk-text-primary cursor-pointer select-none">
                      This product has multiple variants (e.g. Size, Color, Capacity)
                    </label>
                  </div>

                  {newProdHasVariants ? (
                    <div className="border border-tk-border rounded-xl p-4 bg-tk-surface-2 space-y-3">
                      <div className="flex items-center justify-between border-b border-tk-border pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xs font-bold text-tk-text-primary">Variant Type:</span>
                          <select
                            value={newProdVariantType}
                            onChange={(e) => setNewProdVariantType(e.target.value)}
                            className="bg-tk-surface border border-tk-border rounded px-2 py-1 text-xs text-tk-text-primary focus:outline-none"
                          >
                            <option value="color">Color</option>
                            <option value="size">Size</option>
                            <option value="volume">Volume</option>
                            <option value="capacity">Capacity</option>
                            <option value="weight">Weight</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={addVariantRow}
                          className="bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-3xs py-1 px-3 rounded-lg cursor-pointer"
                        >
                          + Add Variant Row
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-3xs border-collapse min-w-[450px]">
                          <thead>
                            <tr className="border-b border-tk-border text-tk-text-secondary">
                              <th className="pb-1.5 font-bold">Variant Name *</th>
                              <th className="pb-1.5 font-bold">SKU (Optional)</th>
                              <th className="pb-1.5 font-bold text-center">Cost (₹)</th>
                              <th className="pb-1.5 font-bold text-center">Retail (₹)</th>
                              <th className="pb-1.5 font-bold text-center">Qty</th>
                              {newProdVariantType === 'color' && <th className="pb-1.5 font-bold text-center">Color Hex</th>}
                              <th className="pb-1.5 text-center"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {newProdVariants.map((v, index) => (
                              <tr key={index} className="border-b border-tk-border/50">
                                <td className="py-1.5">
                                  <input
                                    type="text"
                                    placeholder="e.g. Red, XL, 128GB"
                                    value={v.name}
                                    onChange={(e) => updateVariantRow(index, 'name', e.target.value)}
                                    className="bg-tk-surface border border-tk-border rounded px-1.5 py-0.5 text-3xs text-tk-text-primary w-24"
                                  />
                                </td>
                                <td className="py-1.5">
                                  <input
                                    type="text"
                                    placeholder="Auto-gen if empty"
                                    value={v.sku}
                                    onChange={(e) => updateVariantRow(index, 'sku', e.target.value)}
                                    className="bg-tk-surface border border-tk-border rounded px-1.5 py-0.5 text-3xs text-tk-text-primary w-24 font-mono"
                                  />
                                </td>
                                <td className="py-1.5 text-center">
                                  <input
                                    type="text"
                                    value={v.buying_price}
                                    onChange={(e) => updateVariantRow(index, 'buying_price', e.target.value)}
                                    className="bg-tk-surface border border-tk-border rounded px-1.5 py-0.5 text-3xs text-tk-text-primary w-12 text-center"
                                  />
                                </td>
                                <td className="py-1.5 text-center">
                                  <input
                                    type="text"
                                    value={v.price}
                                    onChange={(e) => updateVariantRow(index, 'price', e.target.value)}
                                    className="bg-tk-surface border border-tk-border rounded px-1.5 py-0.5 text-3xs text-tk-text-primary w-12 text-center"
                                  />
                                </td>
                                <td className="py-1.5 text-center">
                                  <input
                                    type="number"
                                    min="1"
                                    value={v.stock}
                                    onChange={(e) => updateVariantRow(index, 'stock', e.target.value)}
                                    className="bg-tk-surface border border-tk-border rounded px-1.5 py-0.5 text-3xs text-tk-text-primary w-10 text-center font-bold"
                                  />
                                </td>
                                {newProdVariantType === 'color' && (
                                  <td className="py-1.5 text-center">
                                    <div className="flex items-center justify-center space-x-1">
                                      <input
                                        type="color"
                                        value={v.hex || '#3b82f6'}
                                        onChange={(e) => updateVariantRow(index, 'hex', e.target.value)}
                                        className="w-5 h-5 border-0 rounded cursor-pointer p-0 bg-transparent"
                                      />
                                      <span className="font-mono text-[9px] text-tk-text-secondary">{v.hex || '#3b82f6'}</span>
                                    </div>
                                  </td>
                                )}
                                <td className="py-1.5 text-center">
                                  {newProdVariants.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeVariantRow(index)}
                                      className="text-red-500 hover:text-red-400"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Wholesale Cost Price (₹)</label>
                        <input
                          type="text"
                          value={newProdCostPrice}
                          onChange={(e) => setNewProdCostPrice(e.target.value)}
                          className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-3 py-2 text-xs text-tk-text-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Restock Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={newProdQty}
                          onChange={(e) => setNewProdQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-3 py-2 text-xs text-tk-text-primary focus:outline-none text-center font-bold"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleAddNewProductToCatalog}
                      className="bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2 px-5 rounded-lg transition-colors cursor-pointer"
                    >
                      {newProdHasVariants ? "Add Product with Variants" : "Add New Product Item"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Invoice Table (5 cols) */}
          <div className="lg:col-span-5 bg-tk-surface border border-tk-border p-6 rounded-2xl flex flex-col justify-between h-[380px]">
            <div className="space-y-3.5 flex-1 flex flex-col">
              <h2 className="text-sm font-bold text-tk-text-primary font-display border-b border-tk-border pb-2">Wholesale Invoice items</h2>
              
              <div className="flex-1 overflow-y-auto pr-1 no-scrollbar text-xs">
                {invoiceItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-tk-text-secondary">
                    <ArrowDown className="w-8 h-8 text-tk-text-tertiary mb-1 animate-bounce" />
                    <p>Log wholesale items on the left to build restock invoice.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-tk-border text-tk-text-secondary font-semibold">
                        <th className="py-2">Item</th>
                        <th className="py-2 text-center">Qty</th>
                        <th className="py-2 text-right">Cost</th>
                        <th className="py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, idx) => {
                        const matched = products.find(p => p.id === item.product.id) || item.product;
                        const hasImage = matched.cover_image && matched.cover_image !== '---';
                        const displayName = matched.name + (item.selectedVariant ? ` (${item.selectedVariant.name})` : '');
                        const displaySku = item.selectedVariant?.sku || matched.sku;
                        return (
                          <tr key={`${item.product.id}-${item.selectedVariant?.name || 'base'}-${idx}`} className="border-b border-tk-border">
                            <td className="py-2.5">
                              <div className="flex items-center space-x-2.5">
                                {hasImage ? (
                                  <img 
                                    src={item.selectedVariant?.image_url || matched.cover_image} 
                                    alt={displayName} 
                                    className="w-8 h-8 object-cover rounded-lg bg-tk-surface-2 border border-tk-border flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-tk-surface-2 border border-tk-border flex items-center justify-center flex-shrink-0 text-tk-text-tertiary font-bold text-3xs font-mono">
                                    {displayName.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-tk-text-primary">{displayName}</p>
                                  <p className="text-3xs text-tk-text-secondary font-mono">SKU: {displaySku}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 text-center text-tk-text-primary">{item.quantity}</td>
                            <td className="py-2.5 text-right text-tk-text-primary font-semibold">₹{(item.costPrice * item.quantity).toFixed(2)}</td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => removeFromInvoice(idx)}
                                className="text-red-500 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="border-t border-tk-border pt-3.5 space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-tk-text-primary">Invoice Subtotal:</span>
                <span className="font-bold text-tk-gold">₹{invoiceSubtotal.toFixed(2)}</span>
              </div>
              <button
                onClick={handleCompletePurchase}
                disabled={invoiceItems.length === 0}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-tk-surface-2 disabled:text-tk-text-tertiary text-slate-950 font-extrabold text-sm py-2.5 rounded-xl cursor-pointer"
              >
                Complete Purchase & Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Purchase History */}
      {activeTab === 'History' && (
        <div className="bg-tk-surface border border-tk-border rounded-2xl p-6 overflow-x-auto no-scrollbar">
          {purchaseHistory.length === 0 ? (
            <div className="text-center py-10 text-tk-text-secondary">
              <FileText className="w-10 h-10 text-tk-text-tertiary mx-auto mb-1" />
              <p>No bulk purchases logged yet.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-tk-border text-tk-text-secondary pb-2 font-semibold">
                  <th className="py-2">Purchase ID</th>
                  <th className="py-2">Wholesaler Dealer Name</th>
                  <th className="py-2 text-center">Items Types</th>
                  <th className="py-2 text-right">Total Invoice Value</th>
                  <th className="py-2 text-center">Date Logged</th>
                  <th className="py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseHistory.map(ph => (
                  <tr key={ph.id} className="border-b border-tk-border hover:bg-tk-blue-light/10">
                    <td className="py-3 font-semibold text-tk-text-primary">#{ph.id.substring(0, 8)}...</td>
                    <td className="py-3 font-semibold text-tk-text-primary">{ph.wholesaler_name}</td>
                    <td className="py-3 text-center text-tk-text-secondary">{ph.items.length} categories</td>
                    <td className="py-3 text-right font-bold text-tk-gold">₹{ph.total.toFixed(2)}</td>
                    <td className="py-3 text-center text-tk-text-secondary">{new Date(ph.created_at).toLocaleDateString()}</td>
                    <td className="py-3 text-center">
                      <div className="flex justify-center items-center space-x-3">
                        <button
                          onClick={() => setSelectedHistoryPurchase(ph)}
                          className="text-tk-blue-bright hover:text-tk-blue-deep cursor-pointer transition-colors"
                          title="View Purchase Details"
                        >
                          <Eye className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePurchase(ph.id)}
                          className="text-red-500 hover:text-red-400 cursor-pointer transition-colors"
                          title="Delete Purchase Record"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Selected History Purchase Details Modal */}
      {selectedHistoryPurchase && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-tk-surface border border-tk-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-tk-border pb-3">
              <div>
                <h2 className="text-sm font-bold text-tk-text-primary font-display">Wholesale Invoice Details</h2>
                <p className="text-3xs text-tk-text-secondary mt-0.5">Invoice: #{selectedHistoryPurchase.id}</p>
              </div>
              <button 
                onClick={() => setSelectedHistoryPurchase(null)}
                className="text-tk-text-secondary hover:text-tk-text-primary text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="text-xs space-y-2.5">
              <div className="grid grid-cols-2 gap-4 bg-tk-surface-2 border border-tk-border p-3 rounded-xl text-tk-text-primary">
                <div>
                  <span className="text-3xs text-tk-text-secondary uppercase font-semibold block mb-0.5">Wholesaler Dealer</span>
                  <span className="font-bold">{selectedHistoryPurchase.wholesaler_name}</span>
                </div>
                <div>
                  <span className="text-3xs text-tk-text-secondary uppercase font-semibold block mb-0.5">Date Logged</span>
                  <span className="font-semibold">{new Date(selectedHistoryPurchase.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="border border-tk-border rounded-xl overflow-hidden bg-tk-surface">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-tk-surface-2 border-b border-tk-border text-tk-text-secondary font-semibold text-3xs uppercase tracking-wider">
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Cost</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                      {selectedHistoryPurchase.items.map((item, idx) => {
                        const matched = products.find(p => p.id === item.product_id);
                        const displayName = item.name;
                        const displaySku = item.sku;
                        let imageUrl = matched?.cover_image;
                        if (matched?.variants && item.variant_name) {
                          const v = matched.variants.find(varObj => varObj.name === item.variant_name);
                          if (v?.image_url) imageUrl = v.image_url;
                        }
                        const hasImage = imageUrl && imageUrl !== '---';
                        
                        return (
                          <tr key={idx} className="border-b border-tk-border text-tk-text-primary">
                            <td className="p-2.5">
                              <div className="flex items-center space-x-2.5">
                                {hasImage ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={displayName} 
                                    className="w-8 h-8 object-cover rounded-lg bg-tk-surface-2 border border-tk-border flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-tk-surface-2 border border-tk-border flex items-center justify-center flex-shrink-0 text-tk-text-tertiary font-bold text-3xs font-mono">
                                    {displayName.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                               <div>
                                 <p className="font-semibold">{displayName}</p>
                                 <p className="text-3xs text-tk-text-secondary font-mono">SKU: {displaySku}</p>
                               </div>
                             </div>
                           </td>
                           <td className="p-2.5 text-center font-semibold">{item.quantity}</td>
                           <td className="p-2.5 text-right text-tk-text-secondary">₹{item.cost_price.toFixed(2)}</td>
                           <td className="p-2.5 text-right font-bold">₹{item.subtotal.toFixed(2)}</td>
                         </tr>
                       );
                     })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-tk-border flex justify-between items-center text-xs">
              <button
                onClick={() => handleDeletePurchase(selectedHistoryPurchase.id)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Invoice</span>
              </button>
              <div className="text-right">
                <span className="font-bold text-tk-text-secondary mr-2">Total Invoice Value:</span>
                <span className="text-base font-extrabold text-tk-gold">₹{selectedHistoryPurchase.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
