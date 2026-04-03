import { useState } from 'react';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Trending from './pages/Trending';
import Analytics from './pages/Analytics';
import BrandCenter from './pages/BrandCenter';
import SupportAgent from './pages/SupportAgent';
import { BarChart3, Store, Package, TrendingUp, Sparkles, MessageSquare, Menu, Sun, Moon, PlusSquare, PieChart, Info, ShieldCheck, Settings, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';
import { StoreSwitcher } from './components/StoreSwitcher';
import { ConnectStoreModal } from './components/ConnectStoreModal';
import { GlassButton } from './components/DesignSystem';

type Page = 'dashboard' | 'analytics' | 'products' | 'orders' | 'trending' | 'branding' | 'support' | 'stores';

const navItems = [
  { id: 'dashboard' as Page, icon: BarChart3, label: 'Overview' },
  { id: 'analytics' as Page, icon: PieChart, label: 'Analytics' },
  { id: 'products' as Page, icon: Store, label: 'My Store' },
  { id: 'orders' as Page, icon: Package, label: 'Orders' },
  { id: 'trending' as Page, icon: TrendingUp, label: 'Viral Hunter' },
  { id: 'branding' as Page, icon: Sparkles, label: 'Brand Center' },
  { id: 'support' as Page, icon: Headphones, label: 'Support Hub' },
  { id: 'stores' as Page, icon: PlusSquare, label: 'Add Store' },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button 
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground transition-all duration-300"
      title="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

function DropBotApp() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isConnectStoreModalOpen, setIsConnectStoreModalOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'analytics': return <Analytics />;
      case 'products': return <Products />;
      case 'orders': return <Orders />;
      case 'trending': return <Trending />;
      case 'branding': return <BrandCenter />;
      case 'support': return <SupportAgent />;
      case 'stores': return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="h-32 w-32 bg-primary/20 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-glow animate-float"
          >
            🏬
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-4xl font-bold tracking-tight text-glow">Scale Your Empire</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-lg">
              Unlock multi-store automation. Add your next Shopify storefront and let the AI hunt for both simultaneously.
            </p>
          </div>
          <div className="flex gap-4">
            <GlassButton 
              onClick={() => setIsConnectStoreModalOpen(true)}
              className="px-10 py-4 text-lg"
            >
              + Connect New Store
            </GlassButton>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 px-4 py-2 rounded-full border border-white/5">
            <ShieldCheck size={14} className="text-primary" />
            End-to-end encrypted API credentials
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
      {/* Dynamic Background Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed md:static inset-y-0 left-0 z-50 w-72 bg-glass-card m-4 rounded-[2.5rem] shrink-0 flex flex-col overflow-hidden shadow-2xl shadow-black/50"
          >
            <div className="flex items-center gap-4 p-8">
              <div className="h-12 w-12 bg-primary flex items-center justify-center rounded-2xl text-2xl shadow-glow animate-pulse">
                🤖
              </div>
              <div>
                <h1 className="font-bold text-xl tracking-tight leading-none mb-1">DropBot</h1>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">AI Command Hub</span>
                </div>
              </div>
            </div>

            <div className="px-6 mb-8">
              <StoreSwitcher />
            </div>

            <nav className="flex-1 px-6 space-y-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 relative group ${
                      isActive 
                        ? 'bg-primary/15 text-primary shadow-sm' 
                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                    }`}
                  >
                    <Icon size={20} className={isActive ? 'text-primary scale-110' : 'group-hover:scale-110 transition-transform'} />
                    {item.label}
                    {isActive && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute left-[-4px] w-1 h-6 bg-primary rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-6 mt-auto space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-muted-foreground hover:text-foreground group">
                  <Settings size={20} className="group-hover:rotate-45 transition-transform duration-500" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Settings</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-muted-foreground hover:text-foreground group">
                  <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Discord</span>
                </button>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                  <Info size={40} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">System Live</span>
                </div>
                <span className="text-xs font-semibold text-foreground">Raspberry Pi 5 · 8GB</span>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-1/4 rounded-full" />
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-10 shrink-0 z-40 bg-background/40 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 -ml-2 text-muted-foreground bg-white/5 hover:bg-white/10 border border-white/10 hover:text-foreground rounded-xl transition-all"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-glow capitalize">{currentPage}</h2>
              <div className="h-4 w-px bg-white/10 hidden md:block" />
              <p className="text-sm text-muted-foreground hidden md:block">Real-time store management system</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-6 mr-4 text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> API: Active</span>
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> AI Scraper: Idle</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-auto bg-background/20 relative">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="p-10 max-w-[1600px] mx-auto min-h-full"
          >
            {renderPage()}
          </motion.div>
        </div>
      </main>

      {/* Global Modals */}
      <ConnectStoreModal 
        isOpen={isConnectStoreModalOpen} 
        onClose={() => setIsConnectStoreModalOpen(false)}
        onSuccess={() => {
          // Will be handled by the StoreSwitcher's data refresh or global state
        }}
      />
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
