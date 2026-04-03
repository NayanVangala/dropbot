import { useApi } from '../hooks/useApi';
import { motion } from 'framer-motion';
import { Clock, Truck, CheckCircle2, Copy, ExternalLink, Package, Globe, CreditCard } from 'lucide-react';
import { GlassCard, SectionHeader, NeonPulse, GlassButton } from '../components/DesignSystem';

interface OrdersResponse {
  orders: any[];
  total: number;
}



const statusConfig: Record<string, { icon: any, color: string, label: string }> = {
  pending: { icon: Clock, color: 'text-amber-400', label: 'ACT_REQUIRED' },
  shipped: { icon: Truck, color: 'text-primary', label: 'IN_TRANSIT' },
  delivered: { icon: CheckCircle2, color: 'text-emerald-400', label: 'COMPLETED' },
};

export default function Orders() {
  const { data } = useApi<OrdersResponse>('/api/orders', 30000);
  const orders = data?.orders || [];

  const displayOrders = orders.map((o: any) => {
    // If it's a real Shopify order object
    if (o.name) {
      return {
        id: o.name,
        customer: `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim() || 'Guest',
        email: o.customer?.email || 'N/A',
        product: o.lineItems?.edges?.[0]?.node?.title || 'Multiple Items',
        amount: parseFloat(o.totalPriceSet?.shopMoney?.amount || '0'),
        status: o.fulfillmentStatus?.toLowerCase() || 'pending',
        tracking: o.fulfillments?.[0]?.trackingInfo?.[0]?.number || '',
        date: new Date(o.createdAt).toLocaleDateString(),
      };
    }
    return o; // Fallback to mock
  });

  const pendingCount = displayOrders.filter((o: any) => o.status === 'pending').length;
  const shippedCount = displayOrders.filter((o: any) => o.status === 'shipped' || o.status === 'fulfilled').length;
  const deliveredCount = displayOrders.filter((o: any) => o.status === 'delivered').length;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeader 
          title="Fulfillment Hub" 
          subtitle="Real-time tracking and automated processing of incoming orders" 
        />
        <GlassButton variant="secondary" className="flex items-center gap-2">
           <ExternalLink size={16} /> Shop Admin
        </GlassButton>
      </div>

      {/* Summary Island Grids */}
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: 'Pending Action', value: pendingCount, icon: Clock, color: 'text-amber-400', pulse: true },
          { label: 'Carrier Transit', value: shippedCount, icon: Truck, color: 'text-primary', pulse: false },
          { label: 'Delivered Succesfully', value: deliveredCount, icon: CheckCircle2, color: 'text-emerald-400', pulse: false },
        ].map((stat, i) => (
          <GlassCard key={i} delay={i * 0.1} className="relative group overflow-hidden border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-4 rounded-2xl bg-white/5 ${stat.color} shadow-glow`}>
                <stat.icon size={24} />
              </div>
              {stat.pulse && <NeonPulse color="bg-amber-400" />}
            </div>
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <h3 className="text-4xl font-bold mt-1 tracking-tighter">{stat.value}</h3>
          </GlassCard>
        ))}
      </div>

       <GlassCard className="!p-0 overflow-hidden border-white/5">
        <div className="p-8 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
           <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
             <Package className="text-primary" /> Recent Shipments
           </h3>
           <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">
             <Globe size={14} className="text-primary" /> Global Context Active
           </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/[0.02] border-b border-white/10 text-muted-foreground uppercase text-[10px] font-black tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Order Reference</th>
                <th className="px-8 py-5">Customer Intelligence</th>
                <th className="px-8 py-5">Revenue</th>
                <th className="px-8 py-5">Global Status</th>
                <th className="px-8 py-5">Carrier Tracking</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {displayOrders.map((order: any, i: number) => {
                const config = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = config.icon;

                return (
                  <motion.tr 
                    key={i} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-white/[0.02] transition-all group"
                  >
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                          <div className="font-black text-lg tracking-tight text-glow">{order.id}</div>
                          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                            <Package size={11} className="text-primary"/> {order.product}
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center font-bold shadow-xl">
                          {order.customer?.charAt(0)}
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-bold text-base tracking-tight">{order.customer}</div>
                          <div className="text-[11px] text-muted-foreground font-medium opacity-70">{order.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-black text-base flex items-center gap-1.5">
                         <CreditCard size={14} className="text-primary opacity-50" />
                         ${typeof order.amount === 'number' ? order.amount.toFixed(2) : order.amount}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${
                        order.status === 'pending' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' :
                        (order.status === 'shipped' || order.status === 'fulfilled') ? 'bg-primary/10 text-primary border-primary/20' :
                        'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                      }`}>
                         <StatusIcon size={12} strokeWidth={3} /> {config.label}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      {order.tracking ? (
                        <div className="flex items-center gap-3 group/tracking cursor-pointer w-max">
                           <div className="font-mono text-[11px] font-bold text-foreground bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 group-hover/tracking:border-primary/50 transition-all text-glow">
                             {order.tracking}
                           </div>
                           <Copy size={13} className="text-muted-foreground opacity-30 group-hover/tracking:opacity-100 transition-opacity hover:text-primary"/>
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest opacity-40">Awaiting Logistics</span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end opacity-40 group-hover:opacity-100 transition-opacity duration-300">
                          {order.status === 'pending' ? (
                            <GlassButton className="!py-2 !px-4 text-xs">
                              PROCESS
                            </GlassButton>
                          ) : (
                            <button className="h-9 w-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all">
                               <ExternalLink size={16} />
                            </button>
                          )}
                       </div>
                    </td>
                  </motion.tr>
                );
              })}
              {displayOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Package size={48} className="text-muted-foreground" />
                      <p className="text-base font-bold italic">Awaiting first order from your Shopify store...</p>
                      <p className="text-xs font-medium uppercase tracking-[0.2em]">System Monitoring Active</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
