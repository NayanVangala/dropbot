import { useState, useEffect } from 'react';
import { ChevronDown, Store, Check, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Store {
  id: string;
  name: string;
  domain: string;
  status: string;
}

export function StoreSwitcher() {
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
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
      
      const savedId = localStorage.getItem('activeStoreId') || 'store_primary';
      const active = data.stores?.find((s: Store) => s.id === savedId) || data.stores?.[0];
      if (active) {
        setActiveStore(active);
        localStorage.setItem('activeStoreId', active.id);
      }
    } catch (err) {
      console.error('Failed to fetch stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectStore = (store: Store) => {
    setActiveStore(store);
    localStorage.setItem('activeStoreId', store.id);
    setIsOpen(false);
    // Reload the page to refresh all data hooks with the new store context
    window.location.reload();
  };

  if (loading) return <div className="h-10 w-48 bg-secondary animate-pulse rounded-lg"></div>;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary hover:border-primary/30 transition-all text-sm font-medium w-48 justify-between group"
      >
        <div className="flex items-center gap-2 truncate">
          <Store size={16} className="text-primary shrink-0" />
          <span className="truncate">{activeStore?.name || 'Select Store'}</span>
        </div>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 py-2 backdrop-blur-xl bg-opacity-90"
            >
              <div className="px-3 py-1 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Switch Store</span>
              </div>
              
              <div className="max-h-60 overflow-y-auto px-1">
                {stores.map(store => (
                  <button
                    key={store.id}
                    onClick={() => selectStore(store)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm hover:bg-secondary transition-colors group"
                  >
                    <div className="flex flex-col items-start gap-0.5 truncate">
                      <span className={`font-medium ${activeStore?.id === store.id ? 'text-primary' : 'text-foreground'}`}>
                        {store.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate w-full flex items-center gap-1">
                        {store.domain}
                      </span>
                    </div>
                    {activeStore?.id === store.id && (
                      <Check size={14} className="text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t border-border/50 px-1">
                <button 
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                  onClick={() => {
                    // This would ideally open the store management page
                    setIsOpen(false);
                  }}
                >
                  <Plus size={14} /> Add New Store
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
