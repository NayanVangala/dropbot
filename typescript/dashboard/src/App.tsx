import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Trending from './pages/Trending';
import './index.css';

type Page = 'dashboard' | 'products' | 'orders' | 'trending';

const navItems: { id: Page; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'products', icon: '🏪', label: 'Products' },
  { id: 'orders', icon: '📦', label: 'Orders' },
  { id: 'trending', icon: '📈', label: 'Trending' },
];

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'products': return <Products />;
      case 'orders': return <Orders />;
      case 'trending': return <Trending />;
    }
  };

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      <div
        className={`overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">🤖</div>
          <div>
            <h1>DropBot</h1>
            <span>AI Automation</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <div
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentPage(item.id);
                setSidebarOpen(false);
              }}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </div>
          ))}

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-lg)' }}>
            <div className="nav-item">
              <span className="icon">⚙️</span>
              Settings
            </div>
            <div className="nav-item">
              <span className="icon">🔗</span>
              Discord
            </div>
          </div>
        </nav>

        <div style={{
          padding: 'var(--space-md)',
          background: 'var(--bg-glass)',
          borderRadius: 'var(--radius-md)',
          marginTop: 'var(--space-md)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="pulse-dot"></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-green)' }}>Pi Online</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Raspberry Pi 5 · 8GB
          </span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Mobile header */}
        <div className="mobile-header">
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              DropBot
            </h1>
          </div>
        </div>

        {renderPage()}
      </main>
    </div>
  );
}

export default App;
