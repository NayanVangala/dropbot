import { useState, useEffect } from 'react';
import { ChevronDown, Store, Check, Plus, Globe, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StoreItem {
  id: string;
  name: string;
  domain: string;
  isPrimary?: boolean;
}

export function StoreSwitcher() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const resp = await fetch('http://localhost:3001/api/stores');
      const data = await resp.json();
      setStores(data.stores || []);
      setActiveId(data.activeId);
    } catch (err) {
      console.error('Failed to fetch stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectStore = async (id: string) => {
    try {
      const resp = await fetch('http://localhost:3001/api/stores/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (resp.ok) {
        setActiveId(id);
        setIsOpen(false);
        // Force a page reload to refresh all context for the new store
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to switch store:', err);
    }
  };

  const activeStore = stores.find(s => s.id === activeId) || stores[0];

  if (loading) return <div className="h-14 w-full bg-white/5 animate-pulse rounded-2xl border border-white/5"></div>;

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-3 w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 transition-all duration-300 backdrop-blur-sm"
      >
        <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
          <Store size={20} />
        </div>
        <div className="flex flex-col items-start min-w-0">
          <span className="text-sm font-bold truncate w-full">{activeStore?.name || 'Select Store'}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold truncate">
            <Globe size={10} /> {activeStore?.domain}
          </span>
        </div>
        <ChevronDown size={14} className={`ml-auto text-muted-foreground transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="absolute top-full left-0 right-0 mt-4 bg-secondary/80 border border-white/10 rounded-2xl shadow-2xl z-50 py-3 backdrop-blur-2xl overflow-hidden"
            >
              <div className="px-4 py-2 border-b border-white/5 mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">Active Storefronts</span>
              </div>
              
              <div className="max-h-64 overflow-y-auto px-2 space-y-1">
                {stores.map(store => (
                  <button
                    key={store.id}
                    onClick={() => selectStore(store.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 relative group ${
                      activeId === store.id ? 'bg-primary/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                      activeId === store.id ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground'
                    }`}>
                      <Activity size={16} />
                    </div>
                    <div className="flex flex-col items-start truncate overflow-hidden">
                      <span className={`text-sm font-bold ${activeId === store.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {store.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 truncate font-medium">
                        {store.domain}
                      </span>
                    </div>
                    {activeId === store.id && (
                      <Check size={16} className="ml-auto text-primary" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 px-2">
                <button 
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-primary text-white shadow-glow hover:translate-y-[-2px] transition-all"
                  onClick={() => {
                    // Logic to open modal can be handled by a global state or parent callback
                    setIsOpen(false);
                  }}
                >
                  <Plus size={16} /> Add New Hub
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
