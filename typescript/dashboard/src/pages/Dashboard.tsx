import { useApi } from '../hooks/useApi'
import { DollarSign, Package, ShoppingBag, TrendingUp, AlertTriangle, MonitorPlay, Activity, Zap } from 'lucide-react'
import { GlassCard, SectionHeader, NeonPulse } from '../components/DesignSystem'

interface HealthData {
  status: string;
  uptime: number;
  components: Record<string, string>;
}

interface StatsData {
  shopify: { 
    totalProducts: number; 
    totalOrders: number; 
    totalRevenue: number;
    shopName: string;
    currencyCode: string;
  };
  candidates: { total: number; pending: number; listed: number };
  system: { activeStore: string; uptime: number; memory: { rss: number } };
  currency: string;
}

interface Activity {
  type: 'sale' | 'listing' | 'price' | 'alert';
  text: string;
  time: string;
}

export default function Dashboard() {
  const { data: health } = useApi<HealthData>('/api/health', 10000);
  const { data: stats } = useApi<StatsData>('/api/stats', 15000);
  const { data: activities } = useApi<Activity[]>('/api/activities', 30000);
  const { data: logData } = useApi<{ logs: string }>('/api/system/logs', 5000);

  const uptimeMinutes = Math.floor((health?.uptime || 0) / 60);
  const logs = logData?.logs || '';
  const memMB = Math.round((stats?.system?.memory?.rss || 0) / 1024 / 1024);
  const currency = stats?.currency || 'USD';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(val);
  };

  const activityConfigs = {
    sale: { icon: DollarSign, color: 'text-emerald-400' },
    listing: { icon: Package, color: 'text-blue-400' },
    price: { icon: TrendingUp, color: 'text-primary' },
    alert: { icon: AlertTriangle, color: 'text-amber-400' },
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionHeader 
          title="System Overview" 
          subtitle={`Managing ${stats?.shopify?.shopName || stats?.system?.activeStore || 'Primary Store'}`}
        />
        
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <NeonPulse />
            <span className="text-sm font-bold tracking-tight">System Live</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-sm font-medium text-muted-foreground">{uptimeMinutes}m Uptime</span>
        </div>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: formatCurrency(stats?.shopify?.totalRevenue || 0), trend: 'Live', icon: DollarSign, color: 'text-primary' },
          { label: 'Estimated Profit', value: formatCurrency((stats?.shopify?.totalRevenue || 0) * 0.3), trend: 'Synced', icon: Zap, color: 'text-amber-400' },
          { label: 'Active Products', value: stats?.shopify?.totalProducts || 0, trend: 'Synced', icon: Package, color: 'text-blue-400' },
          { label: 'New Orders', value: stats?.shopify?.totalOrders || 0, trend: 'Real-time', icon: ShoppingBag, color: 'text-emerald-400' },
        ].map((stat, i) => (
          <GlassCard key={i} delay={i * 0.1} className="relative group overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-white/5 ${stat.color} shadow-glow`}>
                <stat.icon size={22} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md text-muted-foreground mr-[-4px]">
                {stat.trend}
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <h3 className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</h3>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Feed */}
        <GlassCard className="lg:col-span-2">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
            <Activity className="text-primary" /> Live Operations Feed
          </h3>
          <div className="space-y-6">
            {(activities || []).map((item, i) => {
              const config = activityConfigs[item.type] || activityConfigs.alert;
              const Icon = config.icon;
              return (
                <div key={i} className="flex items-start gap-5 p-4 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 group">
                  <div className={`p-3 rounded-xl bg-white/5 ${config.color} group-hover:scale-110 transition-transform`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-base">{item.text}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-1">{item.time}</p>
                  </div>
                  <div className="self-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                  </div>
                </div>
              );
            })}
            {(!activities || activities.length === 0) && (
               <div className="p-8 text-center text-muted-foreground font-medium">
                  Waiting for system events...
               </div>
            )}
          </div>
        </GlassCard>

        {/* Health Panel */}
        <div className="space-y-6">
          <GlassCard className="border-primary/20 bg-primary/5">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <MonitorPlay size={18} className="text-primary" /> Core Engine Health
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-sm font-bold text-muted-foreground">API Gateway</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${health?.status === 'ok' ? 'bg-primary/20 text-primary' : 'bg-red-500/10 text-red-400'}`}>
                  {health?.status === 'ok' ? 'Nominal' : 'Error'}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-sm font-bold text-muted-foreground">Discord Bridge</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${health?.components?.discord === 'connected' ? 'bg-primary/20 text-primary' : 'bg-amber-500/10 text-amber-400'}`}>
                  {health?.components?.discord === 'connected' ? 'Streaming' : 'Sleeping'}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-sm font-bold text-muted-foreground">Memory RSS</span>
                <span className="text-sm font-black text-glow">{(memMB || 48).toFixed(1)} MB</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="relative overflow-hidden group border-white/10">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Package size={120} />
             </div>
             <h3 className="text-lg font-bold mb-2">Inventory Sync</h3>
             <p className="text-sm text-muted-foreground mb-4 font-medium">Automatic monitoring of product availability across suppliers.</p>
             <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <TrendingUp size={14} /> Full Synchronization Enabled
             </div>
          </GlassCard>
        </div>
      </div>

      {/* AI Matrix Log Console */}
      <GlassCard className="!p-0 overflow-hidden border-primary/20 bg-black/40">
        <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <MonitorPlay size={18} className="text-primary" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em]">AI Matrix Console</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Streaming Logs</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase">v1.2.0-secure</span>
          </div>
        </div>
        <div className="p-8 font-mono text-xs text-muted-foreground leading-relaxed h-[200px] overflow-auto scrollbar-hide">
          <div className="space-y-1">
            {(logs || 'Initializing core system logs...').split('\n').map((line, i) => (
              <div key={i} className="flex gap-4">
                <span className="text-primary/40 select-none w-6">{i + 1}</span>
                <span className={line.includes('[ERROR]') ? 'text-red-400' : line.includes('[INFO]') ? 'text-blue-300' : ''}>
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
