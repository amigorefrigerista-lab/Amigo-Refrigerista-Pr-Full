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
    <div className="w-full h-20 overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className={`h-full w-full rounded-2xl ${Plan.bg} border border-slate-700/50 p-4 flex items-center gap-4`}
        >
          <div className={`p-2 rounded-xl bg-slate-900 ${Plan.color}`}>
            <Plan.icon size={20} />
          </div>
          <div>
            <h4 className={`text-sm font-bold ${Plan.color}`}>{Plan.title}</h4>
            <p className="text-xs text-slate-300">{Plan.description}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
