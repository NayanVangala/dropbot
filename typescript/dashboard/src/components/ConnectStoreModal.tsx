import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store, Key, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { GlassButton } from './DesignSystem';

interface ConnectStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConnectStoreModal: React.FC<ConnectStoreModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ name: '', domain: '', accessToken: '' });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setError(null);

    try {
      const resp = await fetch('http://localhost:3001/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!resp.ok) throw new Error('Failed to connect store. Check credentials.');
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({ name: '', domain: '', accessToken: '' });
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-secondary border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden glassmorphism"
          >
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 blur-[100px] -z-10" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full"
            >
              <X size={20} />
            </button>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <CheckCircle2 size={64} className="text-primary mb-4 animate-bounce" />
                <h3 className="text-2xl font-bold text-glow">Store Connected!</h3>
                <p className="text-muted-foreground">Redirecting to your new dashboard...</p>
              </motion.div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="h-12 w-12 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
                    <Store className="text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">Connect Shopify Store</h3>
                  <p className="text-sm text-muted-foreground">
                    Link your storefront to start the AI product hunter.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Globe size={14} /> Store Domain
                    </label>
                    <input
                      type="text"
                      placeholder="myshopify-store.myshopify.com"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                      value={formData.domain}
                      onChange={e => setFormData({ ...formData, domain: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Globe size={14} /> Store Name (Friendly)
                    </label>
                    <input
                      type="text"
                      placeholder="Main Store"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Key size={14} /> Admin Access Token
                    </label>
                    <input
                      type="password"
                      placeholder="shpat_xxxxxxxxxxxx"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                      value={formData.accessToken}
                      onChange={e => setFormData({ ...formData, accessToken: e.target.value })}
                    />
                  </div>

                  {error && <p className="text-sm text-destructive font-medium px-1">{error}</p>}

                  <GlassButton
                    type="submit"
                    className="w-full mt-4 flex items-center justify-center gap-2"
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} /> Connecting...
                      </>
                    ) : (
                      'Activate Store'
                    )}
                  </GlassButton>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
