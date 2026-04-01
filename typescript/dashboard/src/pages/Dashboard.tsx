import { useApi } from '../hooks/useApi';

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

// Mock activity data (would come from API in production)
const activities = [
  { type: 'sale', icon: '💰', text: 'New sale: LED Strip Lights — $24.99', time: '2 min ago' },
  { type: 'listing', icon: '📦', text: 'Listed: Wireless Earbuds Pro on Shopify', time: '18 min ago' },
  { type: 'price', icon: '💲', text: 'Price adjusted: Phone Case $12.99 → $11.49', time: '45 min ago' },
  { type: 'alert', icon: '⚠️', text: 'Low stock alert: Portable Blender', time: '1 hr ago' },
  { type: 'sale', icon: '💰', text: 'New sale: Magnetic Phone Mount — $19.99', time: '2 hr ago' },
  { type: 'listing', icon: '📦', text: 'Listed: Smart Watch Band on Shopify', time: '3 hr ago' },
];

// Mock revenue data for chart
const revenueData = [
  { label: 'Mon', value: 120 },
  { label: 'Tue', value: 280 },
  { label: 'Wed', value: 190 },
  { label: 'Thu', value: 340 },
  { label: 'Fri', value: 450 },
  { label: 'Sat', value: 380 },
  { label: 'Sun', value: 290 },
];

export default function Dashboard() {
  const { data: health } = useApi<HealthData>('/api/health', 10000);
  const { data: stats } = useApi<StatsData>('/api/stats', 15000);

  const maxRevenue = Math.max(...revenueData.map(d => d.value));
  const uptimeMinutes = Math.floor((health?.uptime || 0) / 60);
  const memMB = Math.round((stats?.system?.memory?.rss || 0) / 1024 / 1024);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2>Dashboard</h2>
            <p>Real-time overview of your dropshipping empire</p>
          </div>
          <div className="live-indicator">
            <span className="pulse-dot"></span>
            Live — {uptimeMinutes}m uptime
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card purple fade-in-up">
          <div className="stat-header">
            <span className="stat-label">Total Revenue</span>
            <div className="stat-icon">💵</div>
          </div>
          <div className="stat-value count-up">$2,847</div>
          <div className="stat-change positive">▲ 12.5% vs last week</div>
        </div>

        <div className="stat-card green fade-in-up">
          <div className="stat-header">
            <span className="stat-label">Net Profit</span>
            <div className="stat-icon">💰</div>
          </div>
          <div className="stat-value count-up">$924</div>
          <div className="stat-change positive">▲ 8.3% vs last week</div>
        </div>

        <div className="stat-card amber fade-in-up">
          <div className="stat-header">
            <span className="stat-label">Active Listings</span>
            <div className="stat-icon">🏪</div>
          </div>
          <div className="stat-value count-up">{stats?.shopify?.totalProducts || 24}</div>
          <div className="stat-change positive">▲ 3 new this week</div>
        </div>

        <div className="stat-card cyan fade-in-up">
          <div className="stat-header">
            <span className="stat-label">Pending Orders</span>
            <div className="stat-icon">📦</div>
          </div>
          <div className="stat-value count-up">{stats?.shopify?.totalOrders || 7}</div>
          <div className="stat-change negative">▼ 2 need fulfillment</div>
        </div>
      </div>

      {/* Charts + Activity */}
      <div className="chart-area">
        {/* Revenue Chart */}
        <div className="chart-card">
          <div className="section-title">
            <h3>📈 Revenue — This Week</h3>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
              Total: $2,050
            </span>
          </div>
          <div className="mini-chart">
            {revenueData.map((d, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px' }}>
                <div
                  className="bar"
                  data-value={`$${d.value}`}
                  style={{
                    height: `${(d.value / maxRevenue) * 100}%`,
                    background: i === revenueData.length - 2
                      ? 'var(--gradient-primary)'
                      : 'rgba(99, 102, 241, 0.3)',
                    width: '100%',
                  }}
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="chart-card">
          <h3>⚡ Recent Activity</h3>
          <div className="activity-feed" style={{ marginTop: 'var(--space-md)' }}>
            {activities.map((item, i) => (
              <div className="activity-item" key={i}>
                <div className={`activity-icon ${item.type}`}>
                  {item.icon}
                </div>
                <div className="activity-content">
                  <p>{item.text}</p>
                  <span className="time">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="section-title">
          <h3>🔧 System Status</h3>
          <span className="badge active">All Systems Operational</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>API Server</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="pulse-dot"></span>
              <span style={{ fontSize: '0.85rem' }}>{health?.status === 'ok' ? 'Running' : 'Offline'}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Discord Bot</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="pulse-dot" style={{ background: health?.components?.discord === 'connected' ? 'var(--accent-green)' : 'var(--accent-amber)' }}></span>
              <span style={{ fontSize: '0.85rem' }}>{health?.components?.discord === 'connected' ? 'Connected' : 'Standby'}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Memory Usage</div>
            <span style={{ fontSize: '0.85rem' }}>{memMB || '~48'} MB</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Pending Candidates</div>
            <span style={{ fontSize: '0.85rem' }}>{stats?.candidates?.pending || 0} products</span>
          </div>
        </div>
      </div>
    </div>
  );
}
