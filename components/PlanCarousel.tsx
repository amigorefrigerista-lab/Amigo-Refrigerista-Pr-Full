'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Zap, Crown } from 'lucide-react';

const PLANS = [
  {
    title: "Plano Amigo PRO",
    description: "Acesso total a todas as ferramentas de refrigeração e PMOC.",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-950/30"
  },
  {
    title: "Plano Flex VIP",
    description: "Ideal para quem busca agilidade com ferramentas essenciais.",
    icon: Zap,
    color: "text-cyan-400",
    bg: "bg-cyan-950/30"
  },
  {
    title: "Suporte Especializado",
    description: "Atendimento prioritário para resolver suas dúvidas técnicas.",
    icon: Star,
    color: "text-emerald-400",
    bg: "bg-emerald-950/30"
  }
];

export function PlanCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % PLANS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const Plan = PLANS[index];

  return (
    <div className="w-full min-h-[76px] sm:h-20 overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.45 }}
          className={`w-full rounded-2xl ${Plan.bg} border border-slate-700/50 p-3.5 sm:p-4 flex items-center gap-3.5`}
        >
          <div className={`p-2.5 rounded-xl bg-slate-900 shrink-0 ${Plan.color}`}>
            <Plan.icon size={20} />
          </div>
          <div className="min-w-0">
            <h4 className={`text-sm font-bold leading-snug ${Plan.color}`}>{Plan.title}</h4>
            <p className="text-xs text-slate-200 leading-relaxed mt-0.5">{Plan.description}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
