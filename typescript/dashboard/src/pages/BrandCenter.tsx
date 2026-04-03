import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Shield, Zap, Sparkles, Save, Check, Copy, RefreshCw } from 'lucide-react';
import { GlassCard, SectionHeader, GlassButton } from '../components/DesignSystem';
import { apiGet, apiPost } from '../hooks/useApi';

interface Branding {
  name: string;
  niche: string;
  domain: string;
  slogan?: string;
}

export default function BrandCenter() {
  const [branding, setBranding] = useState<Branding>({ name: '', niche: '', domain: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    apiGet<Branding>('/api/system/branding').then(data => {
      if (data) setBranding(data);
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await apiPost('/api/system/branding', branding);
    setIsSaving(false);
    setLastSaved(new Date());
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionHeader 
          title="Brand Center" 
          subtitle="Define your storefront identity and domain architecture" 
        />
        
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <Check size={12} className="text-primary" /> Auto-synced {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <GlassButton onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? 'SYNCING...' : 'SAVE CHANGES'}
          </GlassButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Identity Form */}
        <div className="lg:col-span-2 space-y-8">
          <GlassCard>
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
              <Sparkles className="text-primary" /> Store Identity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Storefront Name</label>
                <input 
                  type="text" 
                  value={branding.name}
                  onChange={(e) => setBranding({...branding, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-bold text-lg text-white"
                  placeholder="e.g. CyberTrend Co."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Market Niche</label>
                <input 
                  type="text" 
                  value={branding.niche}
                  onChange={(e) => setBranding({...branding, niche: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-bold text-lg text-white"
                  placeholder="e.g. Tech Electronics"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Brand Slogan (Optional)</label>
                <input 
                  type="text" 
                  value={branding.slogan}
                  onChange={(e) => setBranding({...branding, slogan: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-bold text-lg text-white"
                  placeholder="e.g. The future of trending tech, delivered today."
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
              <Globe className="text-blue-400" /> Domain Architecture
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Target Domain</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={branding.domain}
                    onChange={(e) => setBranding({...branding, domain: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pl-14 outline-none focus:border-blue-400/50 transition-all font-mono font-bold text-lg text-white"
                    placeholder="e.g. cybertrendco.com"
                  />
                  <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-400 transition-colors" size={20} />
                </div>
              </div>

              {branding.domain && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-4"
                >
                  <div className="flex items-center gap-3 text-blue-400">
                    <Shield size={18} />
                    <span className="text-sm font-bold uppercase tracking-widest">Shopify DNS Configuration</span>
                  </div>
                  <p className="text-sm text-muted-foreground">To link <strong>{branding.domain}</strong> to your store, set the following records in your domain registrar:</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Type: A Record</span>
                        <Copy size={12} className="cursor-pointer hover:text-primary transition-colors" />
                      </div>
                      <code className="text-xs font-mono font-bold">23.227.38.65</code>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Type: CNAME</span>
                        <Copy size={12} className="cursor-pointer hover:text-primary transition-colors" />
                      </div>
                      <code className="text-xs font-mono font-bold">shops.myshopify.com</code>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Sidebar / Recommendations */}
        <div className="space-y-8">
          <GlassCard className="bg-primary/5 border-primary/20">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Zap size={18} className="text-primary" /> AI Launch Roadmap
            </h3>
            <div className="space-y-6">
              {[
                { title: 'Identity Confirmed', status: branding.name ? 'done' : 'pending' },
                { title: 'Niche Analysis', status: branding.niche ? 'done' : 'pending' },
                { title: 'Domain Planning', status: branding.domain ? 'done' : 'pending' },
                { title: 'Logo Generated', status: 'pending' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4">
                   <div className={`h-6 w-6 rounded-full flex items-center justify-center border ${step.status === 'done' ? 'bg-primary border-primary text-white shadow-glow' : 'border-white/10 text-muted-foreground'}`}>
                      {step.status === 'done' ? <Check size={14} /> : <span className="text-[10px] font-bold">{i+1}</span>}
                   </div>
                   <span className={`text-sm font-bold ${step.status === 'done' ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</span>
                </div>
              ))}
            </div>
            <GlassButton className="w-full mt-8 !py-4 text-sm font-black">
               GENERATE STORE LOGO
            </GlassButton>
          </GlassCard>

          <GlassCard>
            <h3 className="text-lg font-bold mb-4">Domain Tips</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">Use a <strong>.com</strong> domain for maximum customer trust.</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">Keep it under 3 words. Short and punchy converts better.</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">Avoid hyphens. They look like "spam" to mobile users.</p>
              </li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
