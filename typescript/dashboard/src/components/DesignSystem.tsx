import React from 'react';
import { motion } from 'framer-motion';

export const GlassCard: React.FC<{ children: React.ReactNode, className?: string, delay?: number }> = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className={`bg-glass-card rounded-[2rem] p-6 ${className}`}
  >
    {children}
  </motion.div>
);

export const GlassButton: React.FC<{ 
  children: React.ReactNode, 
  onClick?: () => void, 
  className?: string, 
  variant?: 'primary' | 'secondary' | 'ghost',
  disabled?: boolean,
  type?: "button" | "submit" | "reset"
}> = ({ children, onClick, className = '', variant = 'primary', disabled = false, type = "button" }) => {
  const variants = {
    primary: 'bg-primary text-primary-foreground shadow-glow hover:translate-y-[-2px] hover:shadow-[0_0_30px_-5px_hsl(var(--primary))]',
    secondary: 'bg-secondary/50 text-foreground border border-white/10 hover:bg-secondary',
    ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
};

export const NeonPulse: React.FC<{ color?: string }> = ({ color = 'bg-primary' }) => (
  <div className="relative flex h-3 w-3">
    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}></span>
    <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`}></span>
  </div>
);

export const SectionHeader: React.FC<{ title: string, subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-8">
    <h2 className="text-3xl font-bold tracking-tight text-glow mb-1">{title}</h2>
    {subtitle && <p className="text-muted-foreground font-medium">{subtitle}</p>}
  </div>
);
