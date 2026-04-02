import { useApi } from '../hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { motion, type Variants } from 'framer-motion';
import { Clock, Truck, CheckCircle2, Copy, ExternalLink, Package } from 'lucide-react';
import { cn } from '../lib/utils';

interface OrdersResponse {
  orders: any[];
  total: number;
}

const mockOrders = [
  { id: '#1042', customer: 'Sarah J.', email: 'sarah@email.com', product: 'LED Strip Lights', amount: 24.99, status: 'shipped', tracking: 'LX328947CN', date: '2h ago' },
  { id: '#1041', customer: 'Mike R.', email: 'mike@email.com', product: 'Wireless Earbuds Pro', amount: 34.99, status: 'pending', tracking: '', date: '5h ago' },
  { id: '#1040', customer: 'Emily T.', email: 'emily@email.com', product: 'Phone Car Mount', amount: 19.99, status: 'shipped', tracking: 'LX328812CN', date: '1d ago' },
  { id: '#1039', customer: 'Alex K.', email: 'alex@email.com', product: 'Portable Blender', amount: 29.99, status: 'delivered', tracking: 'LX328790CN', date: '2d ago' },
  { id: '#1038', customer: 'Jordan P.', email: 'jordan@email.com', product: 'Smart Watch Band', amount: 12.99, status: 'pending', tracking: '', date: '2d ago' },
  { id: '#1037', customer: 'Chris M.', email: 'chris@email.com', product: 'Ring Light 10"', amount: 22.99, status: 'shipped', tracking: 'LX328655CN', date: '3d ago' },
  { id: '#1036', customer: 'Sam W.', email: 'sam@email.com', product: 'LED Strip Lights', amount: 24.99, status: 'delivered', tracking: 'LX328501CN', date: '4d ago' },
];

const statusStyles: Record<string, { icon: any, color: string, badge: string, border: string }> = {
  pending: { icon: Clock, color: 'text-amber-500', badge: 'bg-amber-500/10 text-amber-500', border: 'border-amber-500/20' },
  shipped: { icon: Truck, color: 'text-blue-500', badge: 'bg-blue-500/10 text-blue-500', border: 'border-blue-500/20' },
  delivered: { icon: CheckCircle2, color: 'text-emerald-500', badge: 'bg-emerald-500/10 text-emerald-500', border: 'border-emerald-500/20' },
  cancelled: { icon: Package, color: 'text-red-500', badge: 'bg-red-500/10 text-red-500', border: 'border-red-500/20' }
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const rowVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98, filter: 'blur(4px)' },
  show: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Orders() {
  const { data, loading } = useApi<OrdersResponse>('/api/orders', 30000);
  const orders = (data?.orders?.length ? data.orders : mockOrders);

  const pendingCount = orders.filter((o: any) => o.status === 'pending').length;
  const shippedCount = orders.filter((o: any) => o.status === 'shipped').length;
  const deliveredCount = orders.filter((o: any) => o.status === 'delivered').length;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Orders</h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Track and manage dropshipping fulfillment pipelines</p>
        </div>
      </div>

      {/* Summary Island Grids */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-3">
        <motion.div variants={rowVariants}>
          <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card/40 to-card/40 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)] group transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Pending Fulfillment</CardTitle>
              <div className="p-2 rounded-xl bg-amber-500/20 shadow-inner group-hover:scale-110 transition-transform">
                 <Clock className="h-5 w-5 text-amber-500" strokeWidth={2.5}/>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tight text-foreground">{pendingCount}</div>
              <p className="text-xs text-amber-500 font-bold mt-2 font-mono">NEEDS ACTION</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={rowVariants}>
          <Card className="relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-card/40 to-card/40 hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] group transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold tracking-widest text-muted-foreground uppercase">In Transit</CardTitle>
              <div className="p-2 rounded-xl bg-blue-500/20 shadow-inner group-hover:scale-110 transition-transform">
                 <Truck className="h-5 w-5 text-blue-500" strokeWidth={2.5}/>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tight text-foreground">{shippedCount}</div>
              <p className="text-xs text-blue-500 font-bold mt-2 font-mono">TRACKING ACTIVE</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={rowVariants}>
          <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card/40 to-card/40 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] group transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Delivered</CardTitle>
              <div className="p-2 rounded-xl bg-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform">
                 <CheckCircle2 className="h-5 w-5 text-emerald-500" strokeWidth={2.5}/>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tight text-foreground">{deliveredCount}</div>
              <p className="text-xs text-emerald-500 font-bold mt-2 font-mono">COMPLETED</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

       {/* Main Table Card */}
       <Card className="border-border/50 bg-card/60 backdrop-blur-3xl shadow-xl overflow-hidden mt-8 flex flex-col">
        <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-secondary/10">
           <h3 className="text-xl font-bold tracking-tight">Recent Orders</h3>
           <button className="text-sm font-bold bg-secondary hover:bg-secondary/70 text-foreground px-4 py-2 rounded-lg transition-colors border border-border">
             Export CSV
           </button>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/30 backdrop-blur-md border-b border-border/50 text-muted-foreground uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Order Details</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tracking Label</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <motion.tbody 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="divide-y divide-border/30"
            >
              {loading && orders.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-5"><div className="h-4 bg-secondary rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : (
                orders.map((order: any, i: number) => {
                  const style = statusStyles[order.status] || statusStyles.pending;
                  const StatusIcon = style.icon;

                  return (
                    <motion.tr variants={rowVariants} key={i} className="hover:bg-secondary/20 transition-colors group">
                      <td className="px-6 py-4">
                         <div className="flex flex-col gap-0.5">
                            <span className="font-black text-[15px]">{order.id}</span>
                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Package size={12}/> {order.product}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary/20 to-secondary text-primary flex items-center justify-center font-bold shadow-inner">
                            {order.customer.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm tracking-tight">{order.customer}</span>
                            <span className="text-[11px] text-muted-foreground">{order.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-primary">${typeof order.amount === 'number' ? order.amount.toFixed(2) : order.amount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 w-max shadow-sm", style.badge, style.border)}>
                           <StatusIcon size={12} strokeWidth={3} /> {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {order.tracking ? (
                          <div className="flex items-center gap-2 group/tracking cursor-pointer w-max">
                             <div className="font-mono text-xs font-bold text-foreground bg-secondary/50 px-2 py-1 rounded border border-border group-hover/tracking:border-primary/50 transition-colors">
                               {order.tracking}
                             </div>
                             <Copy size={13} className="text-muted-foreground opacity-0 group-hover/tracking:opacity-100 transition-opacity hover:text-primary"/>
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-medium text-xs">Awaiting courier</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                           {order.status === 'pending' ? (
                             <button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 py-2 font-bold rounded-lg shadow-md hover:shadow-primary/20 transition-all active:scale-95 flex items-center gap-2">
                               Fulfill <ExternalLink size={13} />
                             </button>
                           ) : (
                             <button className="bg-secondary/80 hover:bg-secondary text-foreground text-xs px-4 py-2 font-bold rounded-lg transition-colors border border-transparent hover:border-border shadow-sm">
                               Details
                             </button>
                           )}
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
