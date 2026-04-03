import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sparkles, Copy, RefreshCw, Check, ShieldAlert, History, User } from 'lucide-react';
import { GlassCard, SectionHeader, GlassButton } from '../components/DesignSystem';
import { apiPost } from '../hooks/useApi';

type Tone = 'Professional' | 'Empathetic' | 'Firm';

export default function SupportAgent() {
  const [inquiry, setInquiry] = useState('');
  const [tone, setTone] = useState<Tone>('Professional');
  const [draft, setDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!inquiry) return;
    setIsGenerating(true);
    try {
      const res = await apiPost('/api/ai/draft-email', { 
        inquiry, 
        tone: tone.toLowerCase(),
        context: 'Shopify Dropshipping Customer'
      });
      setDraft(res.draft);
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const templates = [
    "Where is my order? It hasn't arrived yet.",
    "My item arrived damaged. I want a refund.",
    "The tracking number isn't working.",
    "I want to change my shipping address."
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionHeader 
          title="Support Intelligence" 
          subtitle="AI-powered concierge for high-conversion customer service" 
        />
        
        <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Concierge Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Inquiry Composer */}
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-3">
                <MessageSquare className="text-primary" /> Customer Inquiry
              </h3>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                {(['Professional', 'Empathetic', 'Firm'] as Tone[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      tone === t ? 'bg-primary text-white shadow-glow' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="relative group">
              <textarea 
                value={inquiry}
                onChange={(e) => setInquiry(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-6 min-h-[200px] outline-none focus:border-primary/50 transition-all font-medium text-lg leading-relaxed placeholder:opacity-30 scrollbar-hide text-white"
                placeholder="Paste the customer's message here..."
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <GlassButton 
                  onClick={handleGenerate}
                  disabled={isGenerating || !inquiry}
                  className="flex items-center gap-2 !px-8"
                >
                  {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {isGenerating ? 'ANALYZING...' : 'DRAFT RESPONSE'}
                </GlassButton>
              </div>
            </div>
          </GlassCard>

          {/* AI Response Hub */}
          <AnimatePresence mode="wait">
            {draft && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <GlassCard className="border-primary/30 bg-primary/5 relative">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow-glow">
                        <Sparkles size={16} className="text-white" />
                      </div>
                      <h3 className="text-lg font-bold">AI Recommended Draft</h3>
                    </div>
                    <GlassButton onClick={copyToClipboard} className="!py-2 !px-4 text-xs flex items-center gap-2">
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'COPIED' : 'COPY RESPONSE'}
                    </GlassButton>
                  </div>
                  
                  <div className="bg-black/20 rounded-2xl p-8 border border-white/5 text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                    {draft}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar / Quick Actions */}
        <div className="space-y-8">
          <GlassCard>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <History size={18} className="text-muted-foreground" /> Common Templates
            </h3>
            <div className="space-y-3">
              {templates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setInquiry(t)}
                  className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-white/10 transition-all group"
                >
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2 italic">"{t}"</p>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="bg-amber-500/5 border-amber-500/20">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-500" /> Resolution Matrix
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                <span>Avg Response Time</span>
                <span className="text-amber-400">12s</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                <span>Satisfaction Prob.</span>
                <span className="text-emerald-400">92%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-4">
                 <div className="h-full bg-amber-500 w-3/4 rounded-full" />
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <User size={20} className="text-muted-foreground" />
               </div>
               <div>
                  <p className="text-sm font-bold">Manual Review Required</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">For refunds {">"} $50.00</p>
               </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
