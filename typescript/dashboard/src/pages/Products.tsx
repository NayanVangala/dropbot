import { useApi } from '../hooks/useApi';
import { Card } from '../components/ui/card';
import { motion, type Variants } from 'framer-motion';
import { Plus, Package, Edit2, Trash2, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

interface Product {
  id: string;
  shopify_product_id: string;
  shopify_variant_id: string;
  title: string;
  current_price: number;
  cost_price: number;
  profit_margin: number;
  inventory_quantity: number;
  last_stock_check: string;
  status: string;
}

interface ProductsResponse {
  products: Product[];
  total: number;
}

const listVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function Products() {
  const { data, loading } = useApi<ProductsResponse>('/api/products', 30000);
  const products = data?.products || [];

  // Mock products if API not connected
  const displayProducts = products.length > 0 ? products : [
    { id: '1', title: 'LED Strip Lights RGB 5M', status: 'ACTIVE', current_price: 24.99, cost_price: 12.50, profit_margin: 0.5, inventory_quantity: 42, last_stock_check: new Date().toISOString() } as any,
    { id: '2', title: 'Wireless Earbuds Pro TWS', status: 'ACTIVE', current_price: 34.99, cost_price: 18.20, profit_margin: 0.48, inventory_quantity: 15, last_stock_check: new Date().toISOString() } as any,
    { id: '3', title: 'Magnetic Phone Car Mount', status: 'ACTIVE', current_price: 19.99, cost_price: 6.80, profit_margin: 0.66, inventory_quantity: 0, last_stock_check: new Date().toISOString() } as any,
  ];



  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Products</h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">{displayProducts.length} active listings on Shopify</p>
        </div>
        
        <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-primary/25 active:scale-95">
          <Plus size={16} strokeWidth={3} />
          Add Product
        </button>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-3xl shadow-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/30 backdrop-blur-md border-b border-border/50 text-muted-foreground uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Product</th>
                <th className="px-6 py-4">Pricing</th>
                <th className="px-6 py-4">Margin</th>
                <th className="px-6 py-4">Inventory</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <motion.tbody 
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="divide-y divide-border/30"
            >
              {loading && displayProducts.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-5"><div className="h-4 bg-secondary rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : (
                displayProducts.map((product) => {
                  const price = product.current_price;
                  const cost = product.cost_price || (price * 0.6);
                  const margin = product.profit_margin || ((price - cost) / price);
                  
                  const marginClass = margin >= 0.4 ? 'bg-emerald-500' : margin >= 0.25 ? 'bg-amber-500' : 'bg-red-500';
                  const textMarginClass = margin >= 0.4 ? 'text-emerald-500' : margin >= 0.25 ? 'text-amber-500' : 'text-red-500';
                  
                  const stock = product.inventory_quantity;
                  const stockClass = stock > 20 ? 'text-emerald-500' : stock > 5 ? 'text-amber-500' : 'text-red-500';

                  return (
                    <motion.tr variants={rowVariants} key={product.id} className="hover:bg-secondary/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-secondary to-secondary/30 border border-border/50 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                            <Package size={20} className="text-primary" />
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-sm flex items-center gap-2">
                              {product.title.slice(0, 35)}{product.title.length > 35 ? '...' : ''}
                            </div>
                            <div className="text-xs text-muted-foreground font-medium mt-0.5 font-mono uppercase">
                              ID: {product.id.split('/').pop()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-black text-[15px] flex items-center gap-1"><Tag size={12} className="text-muted-foreground"/> ${price.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground font-medium line-through decoration-muted-foreground/50">${(price * 1.5).toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 w-24">
                          <span className={cn("font-bold text-xs flex justify-between", textMarginClass)}>
                            <span>{(margin * 100).toFixed(0)}%</span>
                            <span className="text-muted-foreground">${cost.toFixed(2)} cost</span>
                          </span>
                          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden shadow-inner">
                            <div className={cn("h-full rounded-full transition-all duration-1000", marginClass)} style={{ width: `${margin * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex flex-col gap-1">
                          <span className={cn("font-black text-[15px] flex items-center gap-1", stockClass)}>
                             {stock === 0 ? 'Out of Stock' : `${stock} in stock`}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                            Last Synced: {product.last_stock_check ? new Date(product.last_stock_check).toLocaleTimeString() : 'Never'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border shadow-sm",
                          product.status === 'ACTIVE' 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : "bg-secondary text-muted-foreground border-border"
                        )}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 bg-secondary/50 hover:bg-secondary text-foreground rounded-lg transition-colors border border-transparent hover:border-border/50 shadow-sm group-hover:shadow group/btn">
                             <Edit2 size={15} className="group-hover/btn:text-primary transition-colors" />
                          </button>
                          <button className="p-2 bg-secondary/50 hover:bg-red-500/10 text-foreground rounded-lg transition-colors border border-transparent hover:border-red-500/20 shadow-sm group-hover:shadow group/btn">
                             <Trash2 size={15} className="group-hover/btn:text-red-500 transition-colors" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </motion.tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
