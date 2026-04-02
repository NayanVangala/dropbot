import { useState } from 'react';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Trending from './pages/Trending';
import { BarChart3, Store, Package, TrendingUp, Settings, MessageSquare, Menu, Sun, Moon, PlusSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';
import { StoreSwitcher } from './components/StoreSwitcher';

type Page = 'dashboard' | 'products' | 'orders' | 'trending' | 'stores';

const navItems = [
  { id: 'dashboard' as Page, icon: BarChart3, label: 'Dashboard' },
  { id: 'products' as Page, icon: Store, label: 'Products' },
  { id: 'orders' as Page, icon: Package, label: 'Orders' },
  { id: 'trending' as Page, icon: TrendingUp, label: 'Trending' },
  { id: 'stores' as Page, icon: PlusSquare, label: 'Stores' },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button 
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      title="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

function DropBotApp() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'products': return <Products />;
      case 'orders': return <Orders />;
      case 'trending': return <Trending />;
      case 'stores': return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center text-3xl">🏬</div>
          <h2 className="text-2xl font-bold">Store Management</h2>
          <p className="text-muted-foreground max-w-sm">
            Add and manage multiple Shopify stores here. This feature is being finalized with full API key validation.
          </p>
          <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all">
            + Connect New Store
          </button>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed md:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shrink-0 flex flex-col"
          >
            <div className="flex items-center gap-3 p-6">
              <div className="h-10 w-10 bg-primary/20 text-primary flex items-center justify-center rounded-xl text-xl shrink-0">
                🤖
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">DropBot</h1>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">AI Automation</span>
              </div>
            </div>

            <div className="px-4 mb-6">
              <StoreSwitcher />
            </div>

            <nav className="flex-1 px-4 space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-primary/20 text-primary shadow-sm ring-1 ring-primary/30' 
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-primary' : ''} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 mt-auto">
              <div className="px-4 py-2 space-y-1 mb-4">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors">
                  <Settings size={18} /> Settings
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors">
                  <MessageSquare size={18} /> Discord
                </button>
              </div>

              <div className="bg-secondary/50 border border-border/50 rounded-xl p-4 flex flex-col gap-1 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span className="text-xs font-semibold text-primary">Pi Online</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Raspberry Pi 5 · 8GB</span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md transition-colors"
            >
              <Menu size={20} />
            </button>
            <h2 className="font-semibold text-foreground capitalize tracking-wide">{currentPage}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-auto p-6 md:p-8 bg-background">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto"
          >
            {renderPage()}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <DropBotApp />
    </ThemeProvider>
  );
}

export default App;
