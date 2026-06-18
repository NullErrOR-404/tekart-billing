import { createClient } from '@supabase/supabase-js';

// Load variables from import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if credentials are set
const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseUrl.startsWith('http') && 
  supabaseAnonKey && 
  supabaseAnonKey.length > 20;

export const isMockMode = !isSupabaseConfigured;

// Define Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  cover_image?: string;
  priority: number;
  is_hidden?: boolean;
  created_at: string;
}

export interface ProductVariant {
  type?: string; // "color" | "size" | "volume" | "capacity" | "weight"
  name: string;
  slug?: string;          // variant-specific URL slug
  buying_price?: number;  // wholesale cost per variant
  hex?: string;
  image_url?: string;
  price?: number;
  sku?: string;
  stock: number;
  description?: string;
  short_description?: string;
  tags?: string[];
  seo_title?: string;
  seo_description?: string;
}

/** @deprecated Use ProductVariant instead */
export type ProductColor = ProductVariant;

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: string;
  short_description?: string;
  description?: string;
  category_id: string;
  buying_price: number; // Wholesale buy price
  price: number;        // Retail sell price
  old_price?: number;
  stock: number;
  in_stock: boolean;
  featured: boolean;
  badge?: string;
  brand?: string;
  gallery: string[];
  cover_image: string;
  tags: string[];
  priority: number;
  variants?: ProductVariant[];
  variant_type?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  whatsapp_phone?: string;
  created_at: string;
}

export interface TransactionItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  subtotal: number;
  gst_percent?: number;
  gst_amount?: number;
  color_name?: string | null;
  variant_sku?: string | null;
}

export interface Transaction {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_whatsapp?: string;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  gst: number;
  rounding: number;
  total: number;
  payment_method: 'Cash' | 'UPI' | 'Card' | 'Online Payment';
  cashier_name: string;
  created_at: string;
  is_voided?: boolean;
}

export interface WholesalePurchase {
  id: string;
  wholesaler_name: string;
  items: {
    product_id: string;
    name: string;
    sku: string;
    cost_price: number;
    quantity: number;
    subtotal: number;
    variant_name?: string | null;
  }[];
  total: number;
  created_at: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

export interface SalaryPayment {
  id: string;
  employee_name: string;
  amount: number;
  month: string;
  date: string;
  created_at: string;
}

export interface BankLedger {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  reference: string;
  date: string;
  created_at: string;
}

// Initial Data Seed
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Fashion Accessories',
    slug: 'fashion-accessories',
    description: 'Curated lifestyle accents, bracelets, caps, scarfs, and smart styling additions.',
    icon: '🕶️',
    cover_image: 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cf4?w=800&auto=format&fit=crop&q=80',
    priority: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-2',
    name: 'Electronics & Accessories',
    slug: 'electronics',
    description: 'Smart utilities and devices designed for modern living.',
    icon: '⚡',
    cover_image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&auto=format&fit=crop&q=80',
    priority: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-3',
    name: 'Perfumes',
    slug: 'perfumes',
    description: 'Luxurious olfactory blends that define elegance.',
    icon: '✨',
    cover_image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&auto=format&fit=crop&q=80',
    priority: 3,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-4',
    name: 'Deodorants',
    slug: 'deodorants',
    description: 'Fresh and energetic roll-ons and sprays for active protection.',
    icon: '🍃',
    cover_image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&auto=format&fit=crop&q=80',
    priority: 4,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-5',
    name: 'Cosmetics',
    slug: 'cosmetics',
    description: 'Organic and dermatologically tested beauty enhancements.',
    icon: '💄',
    cover_image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop&q=80',
    priority: 5,
    created_at: new Date().toISOString()
  }
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    sku: 'TK-ACC-001',
    slug: 'obsidian-beaded-bracelet',
    name: 'Obsidian Beaded Bracelet',
    short_description: 'Natural black obsidian beads with steel accents.',
    description: 'Handcrafted from genuine 8mm black obsidian stones, this bracelet adds a touch of modern minimalism.',
    category_id: 'cat-1',
    buying_price: 450.00,
    price: 899.00,
    old_price: 1200.00,
    stock: 15,
    in_stock: true,
    featured: true,
    badge: 'New',
    brand: 'TEKART Curation',
    gallery: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&auto=format&fit=crop&q=80'],
    cover_image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&auto=format&fit=crop&q=80',
    tags: ['bracelet', 'jewelry', 'accessories'],
    priority: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'p-2',
    sku: 'TK-ACC-002',
    slug: 'classic-wool-knit-scarf',
    name: 'Classic Wool Knit Scarf',
    short_description: 'Premium wool blend neck scarf for cool styling.',
    description: 'Made from a premium wool-acrylic blend for itch-free warmth. Finished with elegant ribbed borders.',
    category_id: 'cat-1',
    buying_price: 750.00,
    price: 1499.00,
    old_price: 1999.00,
    stock: 8,
    in_stock: true,
    featured: true,
    badge: 'Trending',
    brand: 'TEKART Curation',
    gallery: ['https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800&auto=format&fit=crop&q=80'],
    cover_image: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800&auto=format&fit=crop&q=80',
    tags: ['scarf', 'apparel', 'accessories'],
    priority: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'p-3',
    sku: 'TK-ELEC-001',
    slug: 'tekart-aura-anc-headphones',
    name: 'TEKART Aura ANC Headphones',
    short_description: 'Over-ear headphones with custom 40mm drivers and active noise cancellation.',
    description: 'Escape the noise and immerse yourself in studio-grade audio quality.',
    category_id: 'cat-2',
    buying_price: 4500.00,
    price: 8999.00,
    old_price: 12999.00,
    stock: 12,
    in_stock: true,
    featured: true,
    badge: 'Popular',
    brand: 'TEKART Audio',
    gallery: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'],
    cover_image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    tags: ['audio', 'headphones', 'anc'],
    priority: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'p-4',
    sku: 'TK-ELEC-002',
    slug: 'minimalist-magsafe-wallet',
    name: 'Minimalist MagSafe Leather Wallet',
    short_description: 'Sleek top-grain leather wallet with secure magnetic snap.',
    description: 'Designed for the modern essentials. Cut from premium vegetable-tanned leather.',
    category_id: 'cat-2',
    buying_price: 750.00,
    price: 1499.00,
    old_price: 1999.00,
    stock: 20,
    in_stock: true,
    featured: false,
    badge: 'Sale',
    brand: 'TEKART Gear',
    gallery: ['https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&auto=format&fit=crop&q=80'],
    cover_image: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&auto=format&fit=crop&q=80',
    tags: ['magsafe', 'wallet', 'accessories'],
    priority: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'p-5',
    sku: 'TK-PERF-001',
    slug: 'oud-noir-eau-de-parfum',
    name: 'Oud Noir Eau de Parfum',
    short_description: 'A rich fragrance of agarwood, amber, and saffron.',
    description: 'Oud Noir is a deep, sensual, and highly sophisticated oriental woody perfume.',
    category_id: 'cat-3',
    buying_price: 1800.00,
    price: 3499.00,
    old_price: 4999.00,
    stock: 3,
    in_stock: true,
    featured: true,
    badge: 'Best Seller',
    brand: 'TEKART Parfum',
    gallery: ['https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&auto=format&fit=crop&q=80'],
    cover_image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&auto=format&fit=crop&q=80',
    tags: ['perfume', 'oud', 'fragrance'],
    priority: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'c-1',
    name: 'Rahul Sharma',
    phone: '9876543210',
    email: 'rahul@gmail.com',
    whatsapp_phone: '9876543210',
    created_at: new Date().toISOString()
  },
  {
    id: 'c-2',
    name: 'Ananya Roy',
    phone: '8765432109',
    whatsapp_phone: '8765432109',
    created_at: new Date().toISOString()
  }
];

const DEFAULT_CASHIERS = [
  { id: 'u-1', name: 'Amit Kumar', email: 'amit@tekart.com', password: 'amit123' },
  { id: 'u-2', name: 'Priya Sen', email: 'priya@tekart.com', password: 'priya123' }
];

const initMockDB = () => {
  if (!localStorage.getItem('tk_categories')) {
    localStorage.setItem('tk_categories', JSON.stringify(DEFAULT_CATEGORIES));
  }
  
  // Always set default products in mock mode if buying_price is missing (overwrite key to update structure)
  const existingProd = localStorage.getItem('tk_products');
  if (!existingProd || !existingProd.includes('buying_price')) {
    localStorage.setItem('tk_products', JSON.stringify(DEFAULT_PRODUCTS));
  }

  if (!localStorage.getItem('tk_customers')) {
    localStorage.setItem('tk_customers', JSON.stringify(DEFAULT_CUSTOMERS));
  }
  if (!localStorage.getItem('tk_transactions')) {
    localStorage.setItem('tk_transactions', JSON.stringify([]));
  }
  if (!localStorage.getItem('tk_wholesale_purchases')) {
    localStorage.setItem('tk_wholesale_purchases', JSON.stringify([]));
  }
  if (!localStorage.getItem('tk_expenses')) {
    localStorage.setItem('tk_expenses', JSON.stringify([]));
  }
  if (!localStorage.getItem('tk_salaries')) {
    localStorage.setItem('tk_salaries', JSON.stringify([]));
  }
  if (!localStorage.getItem('tk_bank_ledger')) {
    localStorage.setItem('tk_bank_ledger', JSON.stringify([]));
  }
  if (!localStorage.getItem('tk_cashier_list')) {
    localStorage.setItem('tk_cashier_list', JSON.stringify(DEFAULT_CASHIERS));
  }
};

if (isMockMode) {
  initMockDB();
}

// Fallback Real Client creation
const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackKey = 'placeholder-anon-key-placeholder-anon-key-placeholder-anon-key';
export const realSupabase = createClient(
  isSupabaseConfigured ? supabaseUrl : fallbackUrl, 
  isSupabaseConfigured ? supabaseAnonKey : fallbackKey
);

class MockClient {
  private getTableData(table: string): any[] {
    const key = `tk_${table}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  private setTableData(table: string, data: any[]) {
    const key = `tk_${table}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  from(table: string) {
    const self = this;
    return {
      select: () => {
        let items = self.getTableData(table);
        const queryResult = {
          data: items,
          error: null,
          eq: (field: string, value: any) => {
            queryResult.data = queryResult.data.filter((item: any) => item[field] === value);
            return queryResult;
          },
          neq: (field: string, value: any) => {
            queryResult.data = queryResult.data.filter((item: any) => item[field] !== value);
            return queryResult;
          },
          order: (field: string, { ascending = true } = {}) => {
            queryResult.data = [...queryResult.data].sort((a: any, b: any) => {
              if (a[field] < b[field]) return ascending ? -1 : 1;
              if (a[field] > b[field]) return ascending ? 1 : -1;
              return 0;
            });
            return queryResult;
          },
          single: () => {
            return { data: queryResult.data[0] || null, error: queryResult.data.length ? null : new Error('Not found') };
          }
        };
        return queryResult;
      },

      insert: (rows: any[]) => {
        let items = self.getTableData(table);
        const added = rows.map(row => ({
          id: row.id || `mock-${Math.random().toString(36).substring(2, 11)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...row
        }));
        
        if (table === 'products') {
          added.forEach((item: any) => {
            item.in_stock = (item.stock || 0) > 0;
            item.buying_price = item.buying_price || Math.round((item.price || 0) * 0.5); // auto cost
          });
        }

        items.push(...added);
        self.setTableData(table, items);

        return {
          data: added,
          error: null,
          select: () => ({ data: added, error: null })
        };
      },

      update: (updates: any) => {
        return {
          eq: (field: string, value: any) => {
            let items = self.getTableData(table);
            const updated: any[] = [];

            items = items.map(item => {
              if (item[field] === value) {
                const uItem = { ...item, ...updates, updated_at: new Date().toISOString() };
                if (table === 'products' && updates.stock !== undefined) {
                  uItem.in_stock = updates.stock > 0;
                }
                updated.push(uItem);
                return uItem;
              }
              return item;
            });

            self.setTableData(table, items);
            return { data: updated, error: null };
          }
        };
      },

      delete: () => {
        return {
          eq: (field: string, value: any) => {
            let items = self.getTableData(table);
            const deleted = items.filter(item => item[field] === value);
            items = items.filter(item => item[field] !== value);
            self.setTableData(table, items);
            return { data: deleted, error: null };
          }
        };
      }
    };
  }
}

export const mockSupabase = new MockClient();
export const supabase = isMockMode ? (mockSupabase as any) : realSupabase;
