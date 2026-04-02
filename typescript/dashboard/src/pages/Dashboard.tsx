import { useApi } from '../hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { DollarSign, Package, ShoppingBag, TrendingUp, AlertTriangle, MonitorPlay, Store } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { cn } from '../lib/utils'

interface HealthData {
  status: string;
  uptime: number;
  components: Record<string, string>;
}

interface StatsData {
  shopify: { totalProducts: number; totalOrders: number };
  candidates: { total: number; pending: number; listed: number };
  system: { uptime: number; memory: { rss: number } };
}

// Mock activity data
const activities = [
  { type: 'sale', icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10", text: 'New sale: LED Strip Lights — $24.99', time: '2 min ago' },
  { type: 'listing', icon: Package, color: "text-blue-500", bg: "bg-blue-500/10", text: 'Listed: Wireless Earbuds Pro on Shopify', time: '18 min ago' },
  { type: 'price', icon: TrendingUp, color: "text-violet-500", bg: "bg-violet-500/10", text: 'Price adjusted: Phone Case $12.99 → $11.49', time: '45 min ago' },
  { type: 'alert', icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", text: 'Low stock alert: Portable Blender', time: '1 hr ago' },
  { type: 'sale', icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10", text: 'New sale: Magnetic Phone Mount — $19.99', time: '2 hr ago' },
];

const revenueData = [120, 280, 190, 340, 450, 380, 290];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Dashboard() {
  const { data: health } = useApi<HealthData>('/api/health', 10000);
  const { data: stats } = useApi<StatsData>('/api/stats', 15000);

  const maxRevenue = Math.max(...revenueData);
  const uptimeMinutes = Math.floor((health?.uptime || 0) / 60);
  const memMB = Math.round((stats?.system?.memory?.rss || 0) / 1024 / 1024);

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Overview</h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Real-time overview of your dropshipping empire</p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </span>
          Live — {uptimeMinutes}m uptime
        </div>
      </div>

      {/* Stat Cards - The glowing islands */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card/40 to-card/40 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Total Revenue</CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tracking-tight">$2,847.00</div>
              <p className="text-xs text-emerald-500 font-bold mt-2 flex items-center gap-1">
                <TrendingUp size={12} /> +12.5% vs last week
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-card/40 to-card/40 hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Net Profit</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tracking-tight">$924.00</div>
              <p className="text-xs text-blue-500 font-bold mt-2 flex items-center gap-1">
                <TrendingUp size={12} /> +8.3% vs last week
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:-translate-y-1 hover:shadow-xl group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Active Listings</CardTitle>
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Store className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tracking-tight">{stats?.shopify?.totalProducts || 24}</div>
              <p className="text-xs text-muted-foreground font-medium mt-2">+3 new this week</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover:-translate-y-1 hover:shadow-xl group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Pending Orders</CardTitle>
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <ShoppingBag className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tracking-tight">{stats?.shopify?.totalOrders || 7}</div>
              <p className="text-xs text-amber-500 font-bold mt-2">-2 need fulfillment</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Charts & Feed */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 flex flex-col hover:border-border/80 transition-colors">
          <CardHeader>
            <CardTitle className="text-xl">Revenue Last 7 Days</CardTitle>
            <CardDescription className="font-medium text-sm">Total earned this week: <span className="text-primary font-bold">$2,050</span></CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="h-[250px] flex items-end justify-between gap-3 pt-6 px-2">
              {revenueData.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative">
                  <div className="absolute -top-8 bg-popover text-popover-foreground text-xs font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                    ${val}
                  </div>
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${(val / maxRevenue) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, delay: i * 0.1 }}
                    className={cn(
                      "w-full rounded-md transition-all duration-300 relative overflow-hidden", 
                      i === revenueData.length - 2 
                        ? "bg-primary shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                        : "bg-primary/20 group-hover:bg-primary/50 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    )}
                  >
                    {i === revenueData.length - 2 && (
                       <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    )}
                  </motion.div>
                  <span className="text-xs text-muted-foreground font-bold tracking-wider">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 flex flex-col hover:border-border/80 transition-colors">
          <CardHeader>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
            <CardDescription className="font-medium text-sm">Real-time dropshipping actions</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto pr-2">
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              {activities.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div variants={itemVariants} key={i} className="flex items-start gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer group">
                    <div className={cn("p-2.5 rounded-xl shadow-sm group-hover:scale-110 transition-transform", item.bg, item.color)}>
                      <Icon size={18} strokeWidth={2.5} />
                    </div>
                    <div className="grid gap-1 mt-0.5">
                      <p className="text-sm font-semibold leading-snug">{item.text}</p>
                      <p className="text-xs text-muted-foreground font-medium">{item.time}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-3xl shadow-md">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 font-bold">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                 <MonitorPlay size={18} strokeWidth={2.5} /> 
              </div>
              System Modules
            </CardTitle>
            <span className="px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-widest bg-emerald-500/10 text-emerald-500 shadow-sm border border-emerald-500/20">All Operational</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1.5 p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">API Server</p>
              <div className="flex items-center gap-2">
                <span className={cn("h-3 w-3 rounded-full shadow-inner", health?.status === 'ok' ? 'bg-primary' : 'bg-destructive')} />
                <span className="text-sm font-bold tracking-tight">{health?.status === 'ok' ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            <div className="space-y-1.5 p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Discord Bot</p>
              <div className="flex items-center gap-2">
                <span className={cn("h-3 w-3 rounded-full shadow-inner", health?.components?.discord === 'connected' ? 'bg-primary' : 'bg-amber-500')} />
                <span className="text-sm font-bold tracking-tight">{health?.components?.discord === 'connected' ? 'Connected' : 'Standby'}</span>
              </div>
            </div>
            <div className="space-y-1.5 p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Memory Allocation</p>
              <p className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                  <span className="text-blue-500">{(memMB || 48).toFixed(1)}</span> <span className="text-muted-foreground">MB</span>
              </p>
            </div>
            <div className="space-y-1.5 p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Deep Research</p>
              <p className="text-sm font-bold tracking-tight">
                  <span className="text-amber-500">{stats?.candidates?.pending || 0}</span> <span className="text-muted-foreground">Awaiting Review</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
