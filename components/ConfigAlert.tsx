'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export function ConfigAlert() {
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/config-status')
      .then((res) => res.json())
      .then((data) => {
        if (!data.valid) {
          setMissing(data.missing);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || missing.length === 0) return null;

  return (
    <div className="bg-rose-500/15 border border-rose-500/50 text-rose-200 p-4 rounded-2xl mb-6 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-bold text-white mb-1">Configurações Críticas Ausentes</h3>
        <p className="text-xs text-rose-200/80 mb-2">As seguintes variáveis de ambiente não foram configuradas:</p>
        <ul className="text-[11px] font-mono list-disc list-inside">
          {missing.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
