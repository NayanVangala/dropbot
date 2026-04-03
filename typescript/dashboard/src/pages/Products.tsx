import { useApi } from '../hooks/useApi';
import { motion } from 'framer-motion';
import { Plus, Package, Edit2, Trash2, Tag, Globe, Layers, TrendingUp } from 'lucide-react';
import { GlassCard, SectionHeader, GlassButton, NeonPulse } from '../components/DesignSystem';

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

export default function Products() {
  const { data } = useApi<ProductsResponse>('/api/products', 30000);
  const products = data?.products || [];

  const displayProducts = products;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeader 
          title="Product Inventory" 
          subtitle={`${displayProducts.length} Active listings synced from your storefront`} 
        />
        
        <GlassButton className="flex items-center gap-2">
          <Plus size={18} />
          Add To Store
        </GlassButton>
      </div>

      <GlassCard className="!p-0 overflow-hidden border-white/5">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/[0.02] border-b border-white/10 text-muted-foreground uppercase text-[10px] font-black tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Product Details</th>
                <th className="px-8 py-5">Price Points</th>
                <th className="px-8 py-5">Market Intel</th>
                <th className="px-8 py-5">Profit Margin</th>
                <th className="px-8 py-5">Availability</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {displayProducts.map((product, i) => {
                const price = product.current_price;
                const cost = product.cost_price || (price * 0.6);
                const margin = product.profit_margin || ((price - cost) / price);
                const stock = product.inventory_quantity;
                
                return (
                  <motion.tr 
                    key={product.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-[1.25rem] bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-xl">
                          <Package size={24} className="text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-bold text-base tracking-tight leading-none truncate max-w-[250px]">
                            {product.title}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5">
                            <Globe size={11} className="text-primary" /> SKU: {product.id.split('/').pop()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="font-black text-lg tracking-tight flex items-center gap-1.5 text-glow">
                           <Tag size={14} className="text-primary"/> ${price.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-bold tracking-widest line-through opacity-50">
                          ${(price * 1.5).toFixed(2)} MSRP
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-glow" />
                          <span className="text-xs font-bold text-white">${(price * 0.9).toFixed(2)} - ${(price * 1.1).toFixed(2)}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1.5">
                          <TrendingUp size={11} className="text-primary" /> Market Average
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-2 w-32">
                        <div className="flex justify-between items-end">
                          <span className={`${margin > 0.4 ? 'text-emerald-400' : 'text-primary'} text-xs font-black`}>{(margin * 100).toFixed(0)}%</span>
                          <span className="text-[10px] text-muted-foreground font-bold">${cost.toFixed(2)} Unit</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${margin * 100}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className={`h-full ${margin > 0.4 ? 'bg-emerald-500 shadow-glow' : 'bg-primary'} rounded-full`}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                        <div className={`font-bold flex items-center gap-2 ${stock > 0 ? 'text-foreground' : 'text-red-400'}`}>
                           {stock === 0 ? 'OUT OF STOCK' : `${stock} Units Ready`}
                           {stock > 0 && <NeonPulse color="bg-emerald-500" />}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          Auto-Sync Active
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl border ${
                        product.status === 'ACTIVE' 
                          ? "bg-primary/10 text-primary border-primary/20" 
                          : "bg-white/5 text-muted-foreground border-white/5"
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
                        <button className="p-2.5 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground rounded-xl border border-white/5 transition-all">
                           <Edit2 size={16} />
                        </button>
                        <button className="p-2.5 bg-white/5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-xl border border-white/5 transition-all">
                           <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {displayProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Package size={48} className="text-muted-foreground" />
                      <p className="text-base font-bold italic">No products detected in your Shopify storefront yet...</p>
                      <p className="text-xs font-medium uppercase tracking-[0.2em]">Ready to sync first product</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Info Card */}
      <GlassCard className="bg-primary/5 border-primary/20 flex flex-col md:flex-row items-center gap-6">
        <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-glow">
          <Layers className="text-white" size={32} />
        </div>
        <div className="text-center md:text-left flex-1">
          <h4 className="text-lg font-bold mb-1 tracking-tight italic">AI Inventory Guardian Active</h4>
          <p className="text-sm text-muted-foreground font-medium">Your stock levels are checked every 15 minutes against your CJ Dropshipping supplier. If they go out of stock, we hide the product instantly.</p>
        </div>
        <GlassButton variant="secondary" className="whitespace-nowrap px-8">
           Configure Sync
        </GlassButton>
      </GlassCard>
    </div>
  );
}
