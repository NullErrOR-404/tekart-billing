import React, { useState, useEffect, useRef } from 'react';
import { supabase, Product, Customer, Transaction, isMockMode } from '../lib/supabase';
import { Search, ShoppingCart, UserPlus, FileText, CheckCircle2, AlertTriangle, Printer, Trash2 } from 'lucide-react';

interface POSProps {
  cashierName: string;
  isCashierRole: boolean;
  cashierPermissions: any;
}

export default function POS({ cashierName, isCashierRole, cashierPermissions }: POSProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Selection qty
  const [quantity, setQuantity] = useState<number>(1);
  const [itemGstPercent, setItemGstPercent] = useState<string>('');
  
  // Cart state
  const [cart, setCart] = useState<{ product: Product; quantity: number; gstPercent: number; selectedColor?: any }[]>([]);
  const [selectedColorForProduct, setSelectedColorForProduct] = useState<any | null>(null);
  
  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustWhatsapp, setNewCustWhatsapp] = useState('');

  // Finance inputs
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [discountType, setDiscountType] = useState<'Flat' | 'Percentage'>('Flat');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Online Payment'>('Cash');

  // Checkout Receipt state
  const [checkoutReceipt, setCheckoutReceipt] = useState<Transaction | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const custDropdownRef = useRef<HTMLDivElement>(null);

  // Load Catalog & Customers
  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    
    // Close dropdowns on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (custDropdownRef.current && !custDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*').order('name');
      if (data) setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase.from('customers').select('*').order('name');
      if (data) setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Autocomplete search handler
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      p.slug.toLowerCase().includes(query)
    );
    setSearchResults(filtered);
  }, [searchQuery, products]);

  const selectProductFromSearch = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery('');
    setShowDropdown(false);
    setQuantity(1);
    
    // Auto-select first in-stock color option if present
    if (product.colors && product.colors.length > 0) {
      const inStockColors = product.colors.filter(c => c.stock === undefined || c.stock > 0);
      if (inStockColors.length > 0) {
        setSelectedColorForProduct(inStockColors[0]);
      } else {
        setSelectedColorForProduct(null);
      }
    } else {
      setSelectedColorForProduct(null);
    }
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    if (quantity <= 0) return;

    let maxAvailableStock = selectedProduct.stock;
    if (selectedProduct.colors && selectedProduct.colors.length > 0) {
      if (!selectedColorForProduct) {
        setErrorMsg('Please select a color variant.');
        setTimeout(() => setErrorMsg(''), 4000);
        return;
      }
      maxAvailableStock = selectedColorForProduct.stock === undefined ? selectedProduct.stock : selectedColorForProduct.stock;
    }

    if (maxAvailableStock < quantity) {
      setErrorMsg(`Insufficient stock. Only ${maxAvailableStock} left in stock.`);
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const gstPct = parseFloat(itemGstPercent) || 0;

    // Check if product is already in cart with the same GST rate and color
    const existingIndex = cart.findIndex(item => 
      item.product.id === selectedProduct.id && 
      item.gstPercent === gstPct &&
      item.selectedColor?.name === selectedColorForProduct?.name
    );

    if (existingIndex > -1) {
      const newQty = cart[existingIndex].quantity + quantity;
      if (maxAvailableStock < newQty) {
        setErrorMsg(`Insufficient stock. Total cart quantity (${newQty}) exceeds available stock.`);
        setTimeout(() => setErrorMsg(''), 4000);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity = newQty;
      setCart(updated);
    } else {
      setCart([...cart, { 
        product: selectedProduct, 
        quantity, 
        gstPercent: gstPct,
        selectedColor: selectedColorForProduct || undefined
      }]);
    }

    setSelectedProduct(null);
    setSelectedColorForProduct(null);
    setItemGstPercent('');
  };

  const removeFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const updateCartQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const item = cart[index];
    let maxAvailableStock = item.product.stock;
    if (item.selectedColor) {
      maxAvailableStock = item.selectedColor.stock === undefined ? item.product.stock : item.selectedColor.stock;
    }
    if (maxAvailableStock < newQty) {
      setErrorMsg(`Only ${maxAvailableStock} items available in stock.`);
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    setCart(updated);
  };

  // Customers Lookup handlers
  const handleCustomerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerSearch(e.target.value);
    setShowCustomerDropdown(true);
    setNewCustomerMode(false);
  };

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.phone);
    setShowCustomerDropdown(false);
  };

  const addNewCustomer = async () => {
    if (!newCustName || !newCustPhone) {
      setErrorMsg('Name and Phone number are required to register a customer.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    // Default WhatsApp to phone if empty
    const whatsapp = newCustWhatsapp.trim() || newCustPhone.trim();

    try {
      const { data } = await supabase.from('customers').insert([{
        name: newCustName,
        phone: newCustPhone,
        email: newCustEmail || null,
        whatsapp_phone: whatsapp
      }]).select();

      if (data && data[0]) {
        setCustomers([...customers, data[0]]);
        setSelectedCustomer(data[0]);
        setCustomerSearch(data[0].phone);
        setNewCustomerMode(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustEmail('');
        setNewCustWhatsapp('');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save new customer.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => {
    const itemPrice = item.selectedColor?.price !== undefined ? item.selectedColor.price : item.product.price;
    return sum + (itemPrice * item.quantity);
  }, 0);
  
  const discountVal = parseFloat(discountInput) || 0;
  const discountTotal = discountType === 'Flat' 
    ? discountVal 
    : (subtotal * discountVal) / 100;

  // Calculate per-item GST sum
  const gstVal = cart.reduce((sum, item) => {
    const itemPrice = item.selectedColor?.price !== undefined ? item.selectedColor.price : item.product.price;
    const itemSubtotal = itemPrice * item.quantity;
    return sum + (itemSubtotal * (item.gstPercent / 100));
  }, 0);

  const rawTotal = Math.max(0, subtotal - discountTotal + gstVal);
  const roundedTotal = Math.round(rawTotal);
  const rounding = Number((roundedTotal - rawTotal).toFixed(2));

  // Perform POS Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMsg('Cart is empty.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    try {
      // 1. Decrement Stock in DB (handling colors JSON array)
      for (const item of cart) {
        if (item.selectedColor && item.product.colors) {
          const updatedColors = item.product.colors.map((color: any) => {
            if (color.name === item.selectedColor?.name) {
              return {
                ...color,
                stock: Math.max(0, (color.stock || 0) - item.quantity)
              };
            }
            return color;
          });
          const totalStock = updatedColors.reduce((sum: number, c: any) => sum + (c.stock || 0), 0);
          await supabase.from('products').update({ 
            colors: updatedColors,
            stock: totalStock 
          }).eq('id', item.product.id);
        } else {
          const remainingStock = item.product.stock - item.quantity;
          await supabase.from('products').update({ stock: remainingStock }).eq('id', item.product.id);
        }
      }

      // 2. Prepare receipt items
      const items = cart.map(item => {
        const itemPrice = item.selectedColor?.price !== undefined ? item.selectedColor.price : item.product.price;
        return {
          id: item.product.id,
          name: item.product.name + (item.selectedColor ? ` (${item.selectedColor.name})` : ''),
          sku: item.selectedColor?.sku || item.product.sku,
          price: itemPrice,
          quantity: item.quantity,
          subtotal: itemPrice * item.quantity,
          gst_percent: item.gstPercent,
          gst_amount: (itemPrice * item.quantity) * (item.gstPercent / 100),
          color_name: item.selectedColor?.name || null,
          variant_sku: item.selectedColor?.sku || null
        };
      });

      // 3. Record transaction in database
      const transactionRecord = {
        customer_name: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
        customer_phone: selectedCustomer ? selectedCustomer.phone : '',
        customer_whatsapp: selectedCustomer ? (selectedCustomer.whatsapp_phone || selectedCustomer.phone) : '',
        items,
        subtotal,
        discount: discountTotal,
        gst: gstVal,
        rounding,
        total: roundedTotal,
        payment_method: paymentMethod,
        cashier_name: cashierName,
        is_voided: false
      };

      const { data } = await supabase.from('transactions').insert([transactionRecord]).select();

      if (data && data[0]) {
        setCheckoutReceipt(data[0]);
        // Refresh catalog locally
        fetchProducts();
        // Clear active cart & selections
        setCart([]);
        setSelectedProduct(null);
        setSelectedCustomer(null);
        setCustomerSearch('');
        setDiscountInput('0');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Checkout failed. Please check backend connection.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // WhatsApp click-to-chat API share URL generator
  const getWhatsAppShareLink = (receipt: Transaction) => {
    if (!receipt) return '';
    const phoneNum = receipt.customer_whatsapp || receipt.customer_phone || '';
    if (!phoneNum) return '';

    // Format phone to international format without special characters
    const cleanPhone = phoneNum.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const itemsText = receipt.items
      .map(item => `- ${item.quantity}x ${item.name} (SKU: ${item.sku}) - ₹${item.subtotal.toFixed(2)}`)
      .join('\n');

    const message = `🧾 *TEKART STORE RECEIPT* 🧾\n\n` +
      `*Transaction ID:* #${receipt.id}\n` +
      `*Date:* ${new Date(receipt.created_at).toLocaleDateString()}\n` +
      `*Cashier:* ${receipt.cashier_name}\n\n` +
      `*Items Purchased:*\n${itemsText}\n\n` +
      `*Subtotal:* ₹${receipt.subtotal.toFixed(2)}\n` +
      (receipt.gst > 0 ? `*GST:* ₹${receipt.gst.toFixed(2)}\n` : '') +
      (receipt.discount > 0 ? `*Discount:* -₹${receipt.discount.toFixed(2)}\n` : '') +
      `*Grand Total:* ₹${receipt.total.toFixed(2)}\n` +
      `*Payment Method:* ${receipt.payment_method}\n\n` +
      `Thank you for shopping at *TEKART SMART LIVING*!`;

    return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  };

  const filteredCustomerResults = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1 max-w-7xl mx-auto h-[calc(100vh-120px)]">
      {/* Left panel: Search & Add Products (8 cols) */}
      <div className="lg:col-span-7 flex flex-col space-y-4 overflow-y-auto pr-2 no-scrollbar">
        {/* Header Title */}
        <div className="flex justify-between items-center bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass">
          <div>
            <h1 className="text-xl font-bold font-display text-tk-text-primary">New Sale Workspace</h1>
            <p className="text-xs text-tk-text-secondary">Cashier: <span className="text-tk-blue-bright font-semibold">{cashierName}</span></p>
          </div>
          <span className="text-2xs bg-green-500/10 text-green-500 border border-green-500/20 px-2.5 py-1 rounded-full font-semibold">
            {isMockMode ? 'Offline Database' : 'Supabase Live Connection'}
          </span>
        </div>

        {/* Product Search Box */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-xl px-3.5 py-2.5 shadow-sm focus-within:border-tk-blue-mid focus-within:ring-2 focus-within:ring-tk-blue-mid/20 transition-all">
            <Search className="w-5 h-5 text-tk-text-tertiary mr-2.5" />
            <input 
              type="text" 
              placeholder="Search by Product Name, SKU, or Slug..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full bg-transparent text-sm text-tk-text-primary focus:outline-none border-none placeholder-tk-text-tertiary"
            />
          </div>

          {/* Autocomplete Dropdown list */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-tk-surface border border-tk-border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto no-scrollbar">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => selectProductFromSearch(product)}
                  className="w-full flex items-center p-3 text-left border-b border-tk-border hover:bg-tk-blue-light/40 dark:hover:bg-tk-surface-2 transition-colors"
                >
                  <img 
                    src={product.cover_image} 
                    alt={product.name} 
                    className="w-10 h-10 object-cover rounded-md mr-3.5 bg-tk-surface-2 border border-tk-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-tk-text-primary truncate">{product.name}</p>
                    <p className="text-2xs text-tk-text-secondary">SKU: {product.sku} | Price: ₹{product.price}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xs px-2 py-0.5 rounded-full font-semibold ${
                      product.stock > 0 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {product.stock > 0 ? `${product.stock} In Stock` : 'Out of Stock'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Product Detail Panel */}
        {selectedProduct ? (
          <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
              <img 
                src={selectedColorForProduct?.image_url || selectedProduct.cover_image} 
                alt={selectedProduct.name} 
                className="w-full h-24 object-cover rounded-lg border border-tk-border bg-tk-surface-2"
              />
            </div>
            <div className="md:col-span-6 flex flex-col justify-between">
              <div>
                <span className="text-3xs bg-tk-blue-light dark:bg-tk-blue-light/10 text-tk-blue-bright border border-tk-blue-bright/20 px-2 py-0.5 rounded-md font-semibold tracking-wider uppercase">
                  {products.find(p => p.id === selectedProduct.id)?.category_id === 'cat-1' ? 'Accessories' : 'Product'}
                </span>
                <h3 className="text-base font-bold text-tk-text-primary mt-1">{selectedProduct.name}</h3>
                <p className="text-2xs text-tk-text-secondary mt-0.5">
                  SKU: {selectedColorForProduct?.sku || selectedProduct.sku} | Brand: {selectedProduct.brand || 'TEKART'}
                </p>
                
                {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[10px] font-bold text-tk-text-secondary uppercase tracking-wider block">
                      Color Variant: <span className="text-tk-blue-bright">{selectedColorForProduct ? selectedColorForProduct.name : 'None Selected'}</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProduct.colors.map((color, idx) => {
                        const isOutOfStock = color.stock !== undefined && color.stock <= 0;
                        const isSelected = selectedColorForProduct?.name === color.name;
                        return (
                          <button
                            key={idx}
                            disabled={isOutOfStock}
                            onClick={() => setSelectedColorForProduct(color)}
                            className={`relative w-6 h-6 rounded-full border flex items-center justify-center p-0.5 transition-all ${
                              isOutOfStock ? 'opacity-35 cursor-not-allowed border-dashed' : 'cursor-pointer hover:scale-105'
                            } ${
                              isSelected ? 'border-tk-blue-bright ring-2 ring-tk-blue-bright' : 'border-tk-border'
                            }`}
                            title={`${color.name}${isOutOfStock ? ' (Out of stock)' : ''}`}
                          >
                            <span className="w-full h-full rounded-full block border border-black/10" style={{ backgroundColor: color.hex }}></span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3.5 mt-2.5">
                <span className="text-base font-extrabold text-tk-gold">
                  ₹{(selectedColorForProduct?.price !== undefined ? selectedColorForProduct.price : selectedProduct.price).toFixed(2)}
                </span>
                <span className={`text-2xs font-semibold ${
                  (selectedColorForProduct?.stock !== undefined ? selectedColorForProduct.stock : selectedProduct.stock) > 5 ? 'text-green-500' : 'text-amber-500'
                }`}>
                  Stock: {selectedColorForProduct?.stock !== undefined ? selectedColorForProduct.stock : selectedProduct.stock} units
                </span>
              </div>
            </div>
            <div className="md:col-span-3 flex flex-col justify-center space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-3xs font-semibold text-tk-text-secondary uppercase tracking-wider block mb-1">Qty</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={selectedProduct.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg text-xs text-tk-text-primary px-2 py-1.5 focus:outline-none focus:border-tk-blue-mid text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-3xs font-semibold text-tk-text-secondary uppercase tracking-wider block mb-1">GST %</label>
                  <input 
                    type="text" 
                    placeholder="0"
                    value={itemGstPercent}
                    onChange={(e) => setItemGstPercent(e.target.value)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg text-xs text-tk-text-primary px-2 py-1.5 focus:outline-none focus:border-tk-blue-mid text-center font-bold"
                  />
                </div>
              </div>
              <button 
                onClick={addToCart}
                disabled={selectedProduct.stock <= 0}
                className="w-full bg-tk-blue-mid hover:bg-tk-blue-deep disabled:bg-tk-surface-2 disabled:text-tk-text-tertiary text-white font-bold text-sm py-2 rounded-lg transition-colors cursor-pointer"
              >
                Add to Cart
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-tk-surface border border-dashed border-tk-border p-6 rounded-2xl flex flex-col items-center justify-center text-center text-tk-text-secondary">
            <ShoppingCart className="w-8 h-8 text-tk-text-tertiary mb-2" />
            <p className="text-sm">Search and click a product above to review details and load quantities.</p>
          </div>
        )}

        {/* Error Messaging banner */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center space-x-2 text-xs">
            <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Cart Listing Panel */}
        <div className="flex-1 bg-tk-surface border border-tk-border rounded-2xl p-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold font-display text-tk-text-primary flex items-center">
              <ShoppingCart className="w-4 h-4 mr-2 text-tk-blue-bright" />
              Active Order Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
            </h2>
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])}
                className="text-2xs text-red-500 hover:text-red-400 flex items-center cursor-pointer font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear Cart
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 no-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-tk-text-secondary py-10">
                <p className="text-xs">No products added. Search and add products above to start billing.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-tk-border text-tk-text-secondary pb-2">
                    <th className="py-2 font-semibold">Item</th>
                    <th className="py-2 text-center font-semibold">Price</th>
                    <th className="py-2 text-center font-semibold">Qty</th>
                    <th className="py-2 text-right font-semibold">Total</th>
                    <th className="py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => {
                    const itemPrice = item.selectedColor?.price !== undefined ? item.selectedColor.price : item.product.price;
                    return (
                      <tr key={`${item.product.id}-${item.gstPercent}-${item.selectedColor?.name || 'none'}`} className="border-b border-tk-border hover:bg-tk-blue-light/10">
                        <td className="py-3 pr-2">
                          <p className="font-semibold text-tk-text-primary text-xs flex items-center flex-wrap gap-1">
                            <span>{item.product.name}</span>
                            {item.selectedColor && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-tk-blue-light/35 dark:bg-tk-blue-light/10 text-tk-blue-bright text-[10px] font-bold border border-tk-blue-bright/20">
                                <span className="w-1.5 h-1.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: item.selectedColor.hex }}></span>
                                {item.selectedColor.name}
                              </span>
                            )}
                          </p>
                          <p className="text-3xs text-tk-text-tertiary">SKU: {item.selectedColor?.sku || item.product.sku} {item.gstPercent > 0 && `| GST: ${item.gstPercent}%`}</p>
                        </td>
                        <td className="py-3 text-center text-tk-text-secondary">₹{itemPrice.toFixed(2)}</td>
                        <td className="py-3 text-center">
                          <div className="inline-flex items-center bg-tk-surface-2 border border-tk-border rounded-md">
                            <button 
                              onClick={() => updateCartQuantity(idx, item.quantity - 1)}
                              className="px-1.5 py-0.5 text-xs hover:bg-tk-blue-light/30 text-tk-text-primary font-bold cursor-pointer"
                            >-</button>
                            <span className="px-2 font-bold text-tk-text-primary text-2xs">{item.quantity}</span>
                            <button 
                              onClick={() => updateCartQuantity(idx, item.quantity + 1)}
                              className="px-1.5 py-0.5 text-xs hover:bg-tk-blue-light/30 text-tk-text-primary font-bold cursor-pointer"
                            >+</button>
                          </div>
                        </td>
                        <td className="py-3 text-right font-bold text-tk-text-primary">₹{(itemPrice * item.quantity).toFixed(2)}</td>
                        <td className="py-3 text-right">
                          <button 
                            onClick={() => removeFromCart(idx)}
                            className="text-red-500 hover:text-red-400 ml-2.5 cursor-pointer"
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
      </div>

      {/* Right Panel: Checkout, Customer Register, and Calculation (4 cols) */}
      <div className="lg:col-span-5 flex flex-col space-y-4 overflow-y-auto no-scrollbar">
        {/* Customer Directory / Lookup Form */}
        <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass flex flex-col" ref={custDropdownRef}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold font-display text-tk-text-primary">Customer Details</h2>
            {!newCustomerMode && (
              <button 
                onClick={() => setNewCustomerMode(true)}
                className="text-2xs text-tk-blue-bright hover:text-tk-blue-deep flex items-center cursor-pointer font-semibold"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" /> New Customer
              </button>
            )}
          </div>

          {!newCustomerMode ? (
            <div className="relative">
              <div className="flex items-center bg-tk-surface-2 border border-tk-border rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-tk-text-tertiary mr-2" />
                <input 
                  type="text" 
                  placeholder="Lookup customer by Phone or Name..." 
                  value={customerSearch}
                  onChange={handleCustomerSearch}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full bg-transparent text-xs text-tk-text-primary focus:outline-none border-none placeholder-tk-text-tertiary"
                />
              </div>

              {showCustomerDropdown && customerSearch.trim() && filteredCustomerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-tk-surface border border-tk-border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto no-scrollbar">
                  {filteredCustomerResults.map((cust) => (
                    <button
                      key={cust.id}
                      onClick={() => selectCustomer(cust)}
                      className="w-full p-2.5 text-left border-b border-tk-border hover:bg-tk-blue-light/20 dark:hover:bg-tk-surface-2 transition-colors text-xs text-tk-text-primary"
                    >
                      <p className="font-semibold">{cust.name}</p>
                      <p className="text-3xs text-tk-text-secondary">Phone: {cust.phone}</p>
                    </button>
                  ))}
                </div>
              )}

              {selectedCustomer && (
                <div className="mt-3 bg-tk-surface-2 border border-tk-border p-2.5 rounded-xl text-2xs flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-tk-text-primary">{selectedCustomer.name}</p>
                    <p className="text-tk-text-secondary mt-0.5">Phone: {selectedCustomer.phone}</p>
                    {selectedCustomer.whatsapp_phone && (
                      <p className="text-tk-text-tertiary mt-0.5">WhatsApp: {selectedCustomer.whatsapp_phone}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                    className="text-red-500 hover:text-red-400 font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Name*</label>
                  <input 
                    type="text" 
                    placeholder="John Doe"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-2.5 py-1.5 text-xs text-tk-text-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Phone*</label>
                  <input 
                    type="text" 
                    placeholder="9876543210"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-2.5 py-1.5 text-xs text-tk-text-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">Email</label>
                  <input 
                    type="email" 
                    placeholder="john@example.com"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-2.5 py-1.5 text-xs text-tk-text-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-3xs text-tk-text-secondary uppercase font-semibold mb-1 block">WhatsApp Phone (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Defaults to standard phone"
                    value={newCustWhatsapp}
                    onChange={(e) => setNewCustWhatsapp(e.target.value)}
                    className="w-full bg-tk-surface-2 border border-tk-border rounded-lg px-2.5 py-1.5 text-xs text-tk-text-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex space-x-2 pt-1.5">
                <button 
                  onClick={addNewCustomer}
                  className="flex-1 bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-2xs py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Save Customer
                </button>
                <button 
                  onClick={() => setNewCustomerMode(false)}
                  className="bg-tk-surface-2 hover:bg-tk-blue-light/55 border border-tk-border text-tk-text-primary font-bold text-2xs py-2 px-3 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Totals & Calculations Section */}
        <div className="bg-tk-surface border border-tk-border p-4 rounded-2xl tk-glass space-y-3.5 flex-1 flex flex-col justify-between">
          <h2 className="text-sm font-bold font-display text-tk-text-primary border-b border-tk-border pb-2">Checkout Details</h2>
          
          <div className="space-y-2 text-xs">
            {/* Subtotal */}
            <div className="flex justify-between text-tk-text-secondary">
              <span>Subtotal:</span>
              <span className="font-semibold text-tk-text-primary">₹{subtotal.toFixed(2)}</span>
            </div>

            {/* Discount Section */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-tk-text-secondary">Discount (Seller Input):</span>
              <div className="flex items-center space-x-1.5">
                <input 
                  type="text" 
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="w-16 bg-tk-surface-2 border border-tk-border rounded-md px-1.5 py-0.5 text-right font-semibold text-tk-text-primary focus:outline-none"
                />
                <select 
                  value={discountType} 
                  onChange={(e) => setDiscountType(e.target.value as 'Flat' | 'Percentage')}
                  className="bg-tk-surface border border-tk-border rounded-md text-2xs px-1 text-tk-text-primary py-0.5 focus:outline-none"
                >
                  <option value="Flat">₹</option>
                  <option value="Percentage">%</option>
                </select>
              </div>
            </div>

            {/* GST Section */}
            <div className="flex justify-between text-tk-text-secondary py-0.5">
              <span>GST/Taxes (Calculated):</span>
              <span className="font-semibold text-tk-text-primary">₹{gstVal.toFixed(2)}</span>
            </div>

            {/* Rounding Off */}
            {rounding !== 0 && (
              <div className="flex justify-between text-tk-text-tertiary text-2xs">
                <span>Rounding Off:</span>
                <span>{rounding > 0 ? '+' : ''}₹{rounding.toFixed(2)}</span>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="border-t border-tk-border pt-2.5 flex flex-col space-y-1.5">
              <span className="text-tk-text-secondary text-2xs uppercase tracking-wider font-semibold">Payment Mode</span>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Cash', 'UPI', 'Card', 'Online Payment'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMethod(mode)}
                    className={`py-2 text-[10px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      paymentMethod === mode 
                        ? 'bg-tk-blue-mid border-tk-blue-bright text-white' 
                        : 'bg-tk-surface-2 border-tk-border text-tk-text-secondary hover:border-tk-text-primary'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-tk-border pt-3.5 space-y-3.5">
            {/* Grand Total */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-tk-text-primary">Grand Total:</span>
              <span className="text-lg font-extrabold text-tk-gold">₹{roundedTotal.toFixed(2)}</span>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-tk-surface-2 disabled:text-tk-text-tertiary text-slate-950 font-extrabold text-sm py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-green-500/10 active:scale-[0.99]"
            >
              Checkout & Complete Order
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Success Receipt Modal overlay */}
      {checkoutReceipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-green-500/10 border-b border-green-500/20 flex items-center justify-between no-print">
              <div className="flex items-center space-x-2 text-green-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Transaction Successful</span>
              </div>
              <button 
                onClick={() => setCheckoutReceipt(null)}
                className="text-tk-text-secondary hover:text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Print docket invoice area */}
            <div className="flex-1 overflow-y-auto p-6 max-h-[70vh] bg-white text-black font-mono text-xs print-receipt-area">
              <div className="text-center space-y-0.5 border-b border-dashed border-black/40 pb-3 mb-3">
                <h2 className="text-base font-extrabold tracking-wider">TEKART SMART LIVING</h2>
                <p>Premium Curation Store</p>
                <p className="text-[10px]">C-Sector, Local Market, Shop #4</p>
                <p className="text-[10px]">Phone: +91 98765 43210</p>
              </div>

              <div className="space-y-1 border-b border-dashed border-black/40 pb-3 mb-3 text-[10px]">
                <p><span className="font-bold">Order ID:</span> #{checkoutReceipt.id}</p>
                <p><span className="font-bold">Date:</span> {new Date(checkoutReceipt.created_at).toLocaleString()}</p>
                <p><span className="font-bold">Cashier:</span> {checkoutReceipt.cashier_name}</p>
                {checkoutReceipt.customer_name && (
                  <p><span className="font-bold">Customer:</span> {checkoutReceipt.customer_name} ({checkoutReceipt.customer_phone})</p>
                )}
              </div>

              <table className="w-full text-left text-[10px] border-b border-dashed border-black/40 pb-2 mb-2">
                <thead>
                  <tr className="border-b border-black/20 font-bold">
                    <th className="pb-1">Item</th>
                    <th className="pb-1 text-center">Qty</th>
                    <th className="pb-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {checkoutReceipt.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1">
                        <p>{item.name}</p>
                        <p className="text-[8px] text-gray-500">SKU: {item.sku}</p>
                      </td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">₹{item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 text-[10px] border-b border-dashed border-black/40 pb-3 mb-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{checkoutReceipt.subtotal.toFixed(2)}</span>
                </div>
                {checkoutReceipt.gst > 0 && (
                  <div className="flex justify-between">
                    <span>GST (Tax):</span>
                    <span>₹{checkoutReceipt.gst.toFixed(2)}</span>
                  </div>
                )}
                {checkoutReceipt.discount > 0 && (
                  <div className="flex justify-between font-bold text-gray-700">
                    <span>Discount:</span>
                    <span>-₹{checkoutReceipt.discount.toFixed(2)}</span>
                  </div>
                )}
                {checkoutReceipt.rounding !== 0 && (
                  <div className="flex justify-between text-[9px] text-gray-500">
                    <span>Rounding:</span>
                    <span>₹{checkoutReceipt.rounding.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-extrabold border-t border-black/10 pt-1.5">
                  <span>Grand Total:</span>
                  <span>₹{checkoutReceipt.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center space-y-1">
                <p className="font-bold">Payment Mode: {checkoutReceipt.payment_method}</p>
                <p className="text-[9px] mt-1.5 italic">Thank you! Visit again.</p>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="p-4 bg-slate-950/40 border-t border-white/5 flex flex-col space-y-2 no-print">
              {checkoutReceipt.customer_phone && (
                <a
                  href={getWhatsAppShareLink(checkoutReceipt)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white font-extrabold text-xs py-2.5 rounded-lg flex items-center justify-center space-x-1.5 shadow-md shadow-green-500/10 cursor-pointer text-center"
                >
                  <FileText className="w-4 h-4" />
                  <span>Send Bill via WhatsApp (Free)</span>
                </a>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setCheckoutReceipt(null)}
                  className="flex-1 bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
                >
                  Close & New Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
