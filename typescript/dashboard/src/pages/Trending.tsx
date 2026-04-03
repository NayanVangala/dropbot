import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Search, Music, ShoppingCart, ShoppingBag, Check, X, Star, Sparkles, Loader2, Zap, Globe, Calculator } from 'lucide-react';
import { apiPost, useApi } from '../hooks/useApi';
import { GlassCard, SectionHeader, GlassButton } from '../components/DesignSystem';

interface CandidatesResponse {
  candidates: any[];
  total: number;
}

export default function Trending() {
  const { data, refetch } = useApi<CandidatesResponse>('/api/products/candidates', 30000);
  const [upscalingId, setUpscalingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [activeScript, setActiveScript] = useState<{title: string, text: string} | null>(null);
  const [calcId, setCalcId] = useState<string | null>(null);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});

  const handleUpscale = async (candidateId: string, imageUrl: string) => {
    setUpscalingId(candidateId);
    try {
      await apiPost('/api/images/upscale', {
        url: imageUrl,
        candidate_id: candidateId,
      });
      refetch();
    } catch (err) {
      console.error('Upscale failed:', err);
    } finally {
      setUpscalingId(null);
    }
  };

  const handleGenerateScript = async (candidate: any) => {
    setGeneratingId(candidate.id);
    try {
      const res = await apiPost('/api/ai/generate-script', {
        title: candidate.title,
        category: candidate.category || 'General'
      });
      setActiveScript({ title: candidate.title, text: res.script });
    } catch (err) {
      console.error('Script generation failed:', err);
    } finally {
      setGeneratingId(null);
    }
  };

  const displayCandidates = data?.candidates || [];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)]';
    if (score >= 80) return 'text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
    return 'text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'tiktok_shop': return <Music size={12} className="text-pink-500" />;
      case 'amazon_movers': return <ShoppingCart size={12} className="text-amber-500" />;
      default: return <ShoppingBag size={12} className="text-primary" />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeader 
          title="Viral Radar" 
          subtitle="AI-curated product opportunities across TikTok, Amazon, and AliExpress" 
        />
        
        <GlassButton className="flex items-center gap-2">
          <Search size={18} />
          Scan For Trends
        </GlassButton>
      </div>

      <GlassCard className="!p-0 overflow-hidden border-white/5">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/[0.02] border-b border-white/10 text-muted-foreground uppercase text-[10px] font-black tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Potential Winner</th>
                <th className="px-8 py-5">Trend Origin</th>
                <th className="px-8 py-5">Financials</th>
                <th className="px-8 py-5">Market Pulse</th>
                <th className="px-8 py-5">AI Confidence</th>
                <th className="px-8 py-5 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {displayCandidates.map((c, i) => (
                <Fragment key={c.id}>
                  <motion.tr 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-white/[0.02] transition-all group"
                  >
                    <td className="px-8 py-6 max-w-[320px]">
                      <div className="flex items-center gap-5 whitespace-normal">
                        <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 shrink-0 overflow-hidden group-hover:scale-105 transition-all duration-500 shadow-xl relative">
                          {c.image_urls && JSON.parse(c.image_urls).length > 0 ? (
                            <img src={JSON.parse(c.image_urls)[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-white/5 to-transparent"><Globe size={24} /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-bold text-base leading-tight text-white">
                            {c.title}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                            <Zap size={10} className="text-primary" /> {c.category || 'General'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 w-fit">
                        {getSourceIcon(c.source)}
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">{c.source.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-muted-foreground opacity-50">UNIT</span>
                          <span className="text-sm font-black tracking-tight text-white">${c.supplier_price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-primary opacity-70">VAL</span>
                          <span className="text-sm font-black text-primary tracking-tight text-glow">${(customPrices[c.id] || c.suggested_retail_price).toFixed(2)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="text-lg font-black text-emerald-400 tracking-tighter italic">
                           +{(( (customPrices[c.id] || c.suggested_retail_price) - c.supplier_price) / (customPrices[c.id] || c.suggested_retail_price) * 100).toFixed(0)}% Margin
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                          <Star size={11} className="text-amber-500" fill="currentColor" /> {c.review_score} · {c.review_count.toLocaleString()} Views
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-xl border border-white/10 flex flex-col items-center justify-center bg-white/5 ${getScoreColor(c.trending_score)} group-hover:scale-110 transition-transform`}>
                             <span className="text-xl font-black leading-none">{c.trending_score}</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">Confidence</span>
                             <span className="text-xs font-black uppercase tracking-[0.2em]">{c.trending_score > 90 ? 'VIRAL' : 'STRATEGIC'}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 isolate">
                         <button 
                           onClick={() => setCalcId(calcId === c.id ? null : c.id)}
                           title="Profit Calculator"
                           className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all hover:scale-110 ${
                             calcId === c.id ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-glow' : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-amber-500/10'
                           }`}
                         >
                           <Calculator size={16} />
                         </button>
                         <button 
                           onClick={() => handleGenerateScript(c)}
                           disabled={generatingId === c.id}
                           title="Generate TikTok Script"
                           className="h-10 w-10 flex items-center justify-center bg-primary/10 hover:bg-primary/30 text-primary rounded-xl border border-primary/20 transition-all hover:scale-110"
                         >
                           {generatingId === c.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                         </button>
                         <button 
                           onClick={() => {
                             const images = JSON.parse(c.image_urls || '[]');
                             if (images.length > 0) handleUpscale(c.id, images[0]);
                           }}
                           disabled={upscalingId === c.id}
                           title="AI Image Upscale"
                           className="h-10 w-10 flex items-center justify-center bg-white/5 hover:bg-white/20 text-muted-foreground hover:text-foreground rounded-xl border border-white/10 transition-all hover:scale-105"
                         >
                           {upscalingId === c.id ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                         </button>
                      </div>
                    </td>
                  </motion.tr>

                  {/* Calculator Panel */}
                  <AnimatePresence>
                    {calcId === c.id && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-primary/5"
                      >
                        <td colSpan={6} className="px-8 py-0 overflow-hidden">
                          <div className="py-8 grid grid-cols-1 md:grid-cols-3 gap-12 items-center border-t border-primary/20">
                            <div className="space-y-4">
                              <h4 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                <Calculator size={14} /> Profit Simulator
                              </h4>
                              <div>
                                <div className="flex justify-between mb-2">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Target Retail Price</label>
                                  <span className="text-sm font-black text-white">${(customPrices[c.id] || c.suggested_retail_price).toFixed(2)}</span>
                                </div>
                                <input 
                                  type="range" 
                                  min={c.supplier_price} 
                                  max={c.supplier_price * 10} 
                                  step="0.1"
                                  value={customPrices[c.id] || c.suggested_retail_price}
                                  onChange={(e) => setCustomPrices({...customPrices, [c.id]: parseFloat(e.target.value)})}
                                  className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                                 <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">Profit Margin</p>
                                 <p className="text-xl font-black text-emerald-400 italic">
                                   +{(( (customPrices[c.id] || c.suggested_retail_price) - c.supplier_price) / (customPrices[c.id] || c.suggested_retail_price) * 100).toFixed(0)}%
                                 </p>
                              </div>
                              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                                 <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">Profit / Unit</p>
                                 <p className="text-xl font-black text-primary text-glow">
                                   ${((customPrices[c.id] || c.suggested_retail_price) - c.supplier_price).toFixed(2)}
                                 </p>
                              </div>
                            </div>

                            <div className="flex justify-end gap-4">
                               <GlassButton variant="secondary" className="!px-8 text-xs" onClick={() => setCalcId(null)}>CANCEL</GlassButton>
                               <GlassButton className="!px-8 text-xs flex items-center gap-2">
                                 <Check size={14} /> LIST FOR ${(customPrices[c.id] || c.suggested_retail_price).toFixed(0)}
                               </GlassButton>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              ))}
              {displayCandidates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground">
                    <Search size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-bold italic">Scanning the horizon for viral trends...</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Script Modal */}
      <AnimatePresence>
        {activeScript && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-glass-card border border-primary/30 rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
            >
              <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
              <div className="flex items-center justify-between mb-8 relative">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-glow">
                    <Music size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{activeScript.title}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Viral TikTok Marketing Script</p>
                  </div>
                </div>
                <button onClick={() => setActiveScript(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X size={24} className="text-muted-foreground" />
                </button>
              </div>
              <div className="bg-black/30 rounded-3xl p-8 border border-white/5 font-medium leading-relaxed max-h-[400px] overflow-auto scrollbar-hide mb-8 relative">
                <div className="whitespace-pre-wrap text-white">{activeScript.text}</div>
              </div>
              <div className="flex justify-end gap-4 relative">
                <GlassButton onClick={() => { navigator.clipboard.writeText(activeScript.text); setActiveScript(null); }} className="px-8 !py-4">COPY & CLOSE</GlassButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <GlassCard className="flex items-center gap-6 bg-primary/5 border-primary/20">
           <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center shadow-glow"><Zap className="text-white" size={24} /></div>
           <div><h4 className="text-sm font-black uppercase tracking-widest mb-1">AI Research Active</h4><p className="text-xs text-muted-foreground font-medium">Scanning TikTok Shop API for revenue growth.</p></div>
        </GlassCard>
        <GlassCard className="flex items-center gap-6 bg-white/5 border-white/10">
           <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center"><TrendingUp className="text-primary" size={24} /></div>
           <div><h4 className="text-sm font-black uppercase tracking-widest mb-1">Trending Velocity</h4><p className="text-xs text-muted-foreground font-medium">Average trending score is <span className="text-primary font-bold">84%</span> today.</p></div>
        </GlassCard>
      </div>
    </div>
  );
}

// Ensure Fragment is imported from 'react' if not already
import { Fragment } from 'react';
