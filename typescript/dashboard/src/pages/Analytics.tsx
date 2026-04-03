import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Users, Activity } from 'lucide-react';
import { GlassCard, SectionHeader, NeonPulse } from '../components/DesignSystem';
import { useApi } from '../hooks/useApi';

interface StatsData {
  shopify: { 
    totalProducts: number; 
    totalOrders: number; 
    totalRevenue: number;
    shopName: string;
    currencyCode: string;
  };
  dailyRevenue: { name: string, revenue: number, profit: number, orders: number }[];
  currency: string;
}

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

export default function Analytics() {
  const { data: stats } = useApi<StatsData>('/api/stats', 15000);
  const currency = stats?.currency || 'USD';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(val);
  };

  const revenue = stats?.shopify?.totalRevenue || 0;
  const profit = revenue * 0.3; // 30% mock margin

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <SectionHeader 
          title="Profit Analytics" 
          subtitle={`Performance metrics for ${stats?.shopify?.shopName || 'Active Store'}`} 
        />
        <div className="flex items-center gap-3 bg-glass px-4 py-2 rounded-2xl">
          <Activity size={16} className="text-primary animate-pulse" />
          <span className="text-sm font-semibold">Live Data Engine</span>
          <NeonPulse />
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: formatCurrency(revenue), trend: '+12.5%', icon: DollarSign, color: 'text-primary' },
          { label: 'Net Profit', value: formatCurrency(profit), trend: '+8.2%', icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Total Orders', value: stats?.shopify?.totalOrders || 0, trend: '+5.4%', icon: ShoppingBag, color: 'text-amber-400' },
          { label: 'Active Customers', value: '1,204', trend: '-2.1%', icon: Users, color: 'text-blue-400' },
        ].map((stat, i) => (
          <GlassCard key={i} className="relative group overflow-hidden" delay={i * 0.1}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <stat.icon size={64} />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl bg-white/5 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                stat.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {stat.trend}
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <h3 className="text-2xl font-bold mt-1 tracking-tight">{stat.value}</h3>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <GlassCard className="lg:col-span-2 min-h-[400px]">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Activity size={18} className="text-primary" /> Revenue Velocity
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.dailyRevenue || []}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(20,20,20,0.9)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Profit Breakdown */}
        <GlassCard className="lg:col-span-1">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-400" /> Weekly Breakdown
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.dailyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} 
                />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                  {(stats?.dailyRevenue || []).map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
            <div>
              <p className="text-xs text-muted-foreground">Recent Trend</p>
              <p className="font-bold text-emerald-400">Active Tracking</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sync Status</p>
              <p className="font-bold text-glow">Real-time</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
