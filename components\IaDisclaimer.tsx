import React from "react";

interface IaDisclaimerProps {
  className?: string;
}

export function IaDisclaimer({ className = "" }: IaDisclaimerProps) {
  return (
    <div className={`p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-200 text-xs ${className}`}>
      <p className="font-bold flex items-center gap-2">⚠️ Aviso Legal e Isenção de Responsabilidade Técnica:</p>
      <p className="mt-2">Os diagnósticos e leituras são gerados por Inteligência Artificial para suporte auxiliar. Confirme sempre as medições e orientações com o manual do fabricante e os procedimentos padrão de segurança antes de realizar qualquer intervenção técnica.</p>
    </div>
  );
}
