import { useState } from 'react';
import { Card } from '../components/ui/card';
import { motion, type Variants } from 'framer-motion';
import { TrendingUp, Search, Music, ShoppingCart, ShoppingBag, Check, X, Star, Sparkles, Loader2 } from 'lucide-react';
import { apiPost, useApi } from '../hooks/useApi';
import { cn } from '../lib/utils';

interface CandidatesResponse {
  candidates: any[];
  total: number;
}

const listVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const rowVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98, filter: 'blur(4px)' },
  show: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Trending() {
  const { data, loading, refetch } = useApi<CandidatesResponse>('/api/products/candidates', 30000);
  const [upscalingId, setUpscalingId] = useState<string | null>(null);

  const handleUpscale = async (candidateId: string, imageUrl: string) => {
    setUpscalingId(candidateId);
    try {
      await apiPost('/api/images/upscale', {
        url: imageUrl,
        candidate_id: candidateId,
      });
      refetch(); // Refresh to get the new upscaled URL
    } catch (err) {
      console.error('Upscale failed:', err);
    } finally {
      setUpscalingId(null);
    }
  };

  const displayCandidates = (data?.candidates || []).length > 0 ? data!.candidates : [
    { id: 'abc123', title: 'Mini Projector HD 1080P WiFi', source: 'tiktok_shop', supplier_price: 18.50, suggested_retail_price: 49.99, profit_margin: 0.63, review_score: 4.7, review_count: 2341, trending_score: 92, category: 'electronics' },
    { id: 'def456', title: 'Cloud LED Lamp Aesthetic Room', source: 'aliexpress_trending', supplier_price: 8.20, suggested_retail_price: 24.99, profit_margin: 0.67, review_score: 4.5, review_count: 891, trending_score: 87, category: 'home-garden' },
    { id: 'ghi789', title: 'Electric Spin Scrubber Pro', source: 'amazon_movers', supplier_price: 12.40, suggested_retail_price: 34.99, profit_margin: 0.65, review_score: 4.6, review_count: 1567, trending_score: 84, category: 'home-garden' },
    { id: 'jkl012', title: 'Sunset Lamp Projection 16 Colors', source: 'tiktok_shop', supplier_price: 6.80, suggested_retail_price: 19.99, profit_margin: 0.66, review_score: 4.4, review_count: 3102, trending_score: 79, category: 'home-garden' },
    { id: 'mno345', title: 'Magnetic Power Bank 10000mAh', source: 'aliexpress_trending', supplier_price: 14.20, suggested_retail_price: 39.99, profit_margin: 0.64, review_score: 4.8, review_count: 756, trending_score: 75, category: 'electronics' },
  ];

  const getScoreData = (score: number) => {
    if (score >= 90) return { label: 'Viral', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]' };
    if (score >= 80) return { label: 'Hot', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' };
    return { label: 'Rising', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'tiktok_shop': return <Music size={14} className="text-pink-500" strokeWidth={2.5} />;
      case 'amazon_movers': return <ShoppingCart size={14} className="text-amber-500" strokeWidth={2.5} />;
      default: return <ShoppingBag size={14} className="text-orange-500" strokeWidth={2.5} />;
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-3">
             <div className="p-2 bg-primary/20 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)]">
               <TrendingUp className="h-6 w-6 text-primary" strokeWidth={3} />
             </div>
             Trending Radar
          </h2>
          <p className="text-muted-foreground mt-2 text-sm font-medium">{displayCandidates.length} AI-curated product candidates ready for dropshipping review.</p>
        </div>
        
        <button className="flex items-center gap-2 bg-foreground text-background hover:bg-foreground/90 px-5 py-2.5 rounded-xl font-bold text-sm transition-transform shadow-xl active:scale-95 group">
          <Search size={16} strokeWidth={3} className="text-primary group-hover:scale-110 transition-transform" />
          Run AI Scraper
        </button>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-3xl shadow-xl overflow-hidden mt-6 flex flex-col pt-0">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/30 backdrop-blur-md border-b border-border/50 text-muted-foreground uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Prospective Product</th>
                <th className="px-6 py-4">Sourcing</th>
                <th className="px-6 py-4">Financials</th>
                <th className="px-6 py-4">Market Demand</th>
                <th className="px-6 py-4">AI Score</th>
                <th className="px-6 py-4 text-right">Approval</th>
              </tr>
            </thead>
            <motion.tbody 
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="divide-y divide-border/30"
            >
              {loading && displayCandidates.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-5"><div className="h-4 bg-secondary rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : (
                displayCandidates.map((c, i) => {
                  const scoreConfig = getScoreData(c.trending_score);

                  return (
                    <motion.tr variants={rowVariants} key={i} className="hover:bg-secondary/20 transition-colors group">
                      <td className="px-6 py-4 max-w-[280px]">
                        <div className="flex items-center gap-4 whitespace-normal">
                          <div className="h-16 w-16 rounded-xl bg-secondary/50 border border-border/50 shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                            {c.image_urls && JSON.parse(c.image_urls).length > 0 ? (
                              <img src={JSON.parse(c.image_urls)[0]} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground"><Music size={16} /></div>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-sm text-foreground line-clamp-2 leading-tight">
                              {c.title}
                            </span>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mt-1">
                               <div className="w-1.5 h-1.5 rounded-full bg-primary" /> {c.category}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 uppercase tracking-tight font-black text-xs text-muted-foreground px-2 py-1 bg-secondary/80 w-max rounded-md border border-border">
                          {getSourceIcon(c.source)}
                          {c.source.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                           <div className="flex items-center gap-2">
                             <span className="text-xs text-muted-foreground font-bold">COST</span>
                             <span className="text-sm font-black">${c.supplier_price.toFixed(2)}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-xs text-primary font-bold">RRP</span>
                             <span className="text-sm font-black text-primary">${c.suggested_retail_price.toFixed(2)}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col justify-center gap-1.5">
                           <span className="text-lg font-black text-emerald-500 tracking-tighter">
                             {(c.profit_margin * 100).toFixed(0)}% Margin
                           </span>
                           <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                             <Star size={12} className="text-amber-500" fill="currentColor" />
                             {c.review_score} <span className="opacity-70">({c.review_count.toLocaleString()})</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className={cn("flex flex-col items-center justify-center p-2 rounded-xl border-2 shrink-0 transition-transform group-hover:scale-110", scoreConfig.bg, scoreConfig.color, scoreConfig.border)}>
                              <span className="text-xl font-black leading-none">{c.trending_score}</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] font-black uppercase text-muted-foreground">Status</span>
                             <span className={cn("text-xs font-black uppercase tracking-widest", scoreConfig.color)}>{scoreConfig.label}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 isolate">
                           <button 
                             onClick={() => {
                               const images = JSON.parse(c.image_urls || '[]');
                               if (images.length > 0) handleUpscale(c.id, images[0]);
                             }}
                             disabled={upscalingId === c.id}
                             className="flex items-center justify-center w-9 h-9 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-transform hover:scale-110 border border-primary/20" 
                             title="AI Upscale Image"
                           >
                             {upscalingId === c.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                           </button>
                           <button className="flex items-center justify-center w-9 h-9 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-transform hover:scale-110 border border-emerald-500/20" title="Publish Listing">
                             <Check size={18} strokeWidth={3} />
                           </button>
                           <button className="flex items-center justify-center w-9 h-9 bg-secondary hover:bg-red-500/20 text-muted-foreground hover:text-red-500 rounded-lg transition-transform hover:scale-110 border border-border" title="Discard">
                             <X size={18} strokeWidth={3} />
                           </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </motion.tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
