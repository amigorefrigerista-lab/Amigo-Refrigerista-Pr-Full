'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Plus,
  Minus,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShoppingCart,
  Wrench,
  X,
  Cylinder,
  Zap,
  Shield,
  Layers,
  Cpu,
  Bell,
} from 'lucide-react';

export interface InstallerMaterialItem {
  id: number | string;
  name: string;
  category:
    | 'tubulacao'
    | 'fluido'
    | 'eletrica'
    | 'suporte'
    | 'insumos'
    | 'pecas';
  unit: string;
  quantity: number;
  minQuantity: number;
  idealQuantity: number;
  unitCost: number; // Preço médio de mercado (R$)
  marketPriceMin: number;
  marketPriceMax: number;
  usagePerInstall: string;
  marketNotes: string;
}

export const INSTALLER_IDEAL_STOCK_CATALOG: InstallerMaterialItem[] = [
  {
    id: 'cat-1',
    name: 'Panqueca Tubo de Cobre Flexível 1/4" (Rolo 15m)',
    category: 'tubulacao',
    unit: 'rolo 15m',
    quantity: 3,
    minQuantity: 1,
    idealQuantity: 3,
    unitCost: 315.0,
    marketPriceMin: 269.9,
    marketPriceMax: 379.0,
    usagePerInstall: '3m por instalação (9k a 12k BTUs)',
    marketNotes: 'Média R$ 21,00/metro. Parede 0,79mm homologada para R-410A e R-32.',
  },
  {
    id: 'cat-2',
    name: 'Panqueca Tubo de Cobre Flexível 3/8" (Rolo 15m)',
    category: 'tubulacao',
    unit: 'rolo 15m',
    quantity: 3,
    minQuantity: 1,
    idealQuantity: 3,
    unitCost: 465.0,
    marketPriceMin: 398.0,
    marketPriceMax: 549.0,
    usagePerInstall: '3m por instalação (9k a 12k BTUs)',
    marketNotes: 'Média R$ 31,00/metro. Linha de sucção padrão para splits 9.000 e 12.000 BTUs.',
  },
  {
    id: 'cat-3',
    name: 'Panqueca Tubo de Cobre Flexível 1/2" (Rolo 15m)',
    category: 'tubulacao',
    unit: 'rolo 15m',
    quantity: 1,
    minQuantity: 1,
    idealQuantity: 2,
    unitCost: 620.0,
    marketPriceMin: 560.0,
    marketPriceMax: 695.0,
    usagePerInstall: '3m por instalação (18k a 24k BTUs)',
    marketNotes: 'Média R$ 41,30/metro. Essencial para máquinas de 18.000 e 24.000 BTUs.',
  },
  {
    id: 'cat-4',
    name: 'Isolante Térmico Elastomérico Blindado 1/4" e 3/8" (Barra 2m)',
    category: 'tubulacao',
    unit: 'barra 2m',
    quantity: 16,
    minQuantity: 10,
    idealQuantity: 24,
    unitCost: 11.5,
    marketPriceMin: 8.9,
    marketPriceMax: 14.9,
    usagePerInstall: '3 barras por instalação (linha líquida + sucção)',
    marketNotes: 'Blindado branco ou preto com proteção UV contra ressecamento externo.',
  },
  {
    id: 'cat-5',
    name: 'Fluido Refrigerante R-410A (Botija 11,3kg)',
    category: 'fluido',
    unit: 'botija',
    quantity: 2,
    minQuantity: 1,
    idealQuantity: 2,
    unitCost: 1190.0,
    marketPriceMin: 1079.9,
    marketPriceMax: 1390.0,
    usagePerInstall: 'Adicional >3m (20g/m) ou recarga completa (~800g)',
    marketNotes: 'Custo médio ~R$ 105,00/kg. Maior base instalada de Splits Inverter.',
  },
  {
    id: 'cat-6',
    name: 'Fluido Refrigerante R-32 (Cilindro 3kg Recarregável)',
    category: 'fluido',
    unit: 'cilindro 3kg',
    quantity: 1,
    minQuantity: 1,
    idealQuantity: 2,
    unitCost: 425.0,
    marketPriceMin: 379.0,
    marketPriceMax: 489.0,
    usagePerInstall: 'Complemento de linha e manutenção de novos Inverter',
    marketNotes: 'Padrão obrigatório nos lançamentos Inverter atuais (Daikin, LG, Midea, Samsung).',
  },
  {
    id: 'cat-7',
    name: 'Cabo Flexível PP 4x1,5mm² (Rolo 50m - Comando Inverter)',
    category: 'eletrica',
    unit: 'rolo 50m',
    quantity: 1,
    minQuantity: 1,
    idealQuantity: 2,
    unitCost: 445.0,
    marketPriceMin: 395.0,
    marketPriceMax: 510.0,
    usagePerInstall: '3,5m a 4m por instalação (interligação evaporadora/condensadora)',
    marketNotes: 'Média R$ 8,90/metro. Cobre 100% puro (norma NBR) evita erro de comunicação.',
  },
  {
    id: 'cat-8',
    name: 'Cabo Flexível PP 3x2,5mm² (Rolo 50m - Alimentação 220V)',
    category: 'eletrica',
    unit: 'rolo 50m',
    quantity: 1,
    minQuantity: 1,
    idealQuantity: 1,
    unitCost: 345.0,
    marketPriceMin: 315.0,
    marketPriceMax: 389.0,
    usagePerInstall: 'Conforme distância do disjuntor dedicado',
    marketNotes: 'Média R$ 6,90/metro. Alimentação de força com fase + fase + terra.',
  },
  {
    id: 'cat-9',
    name: 'Suporte Condensadora 400mm/450mm Pintura Eletrostática (Par)',
    category: 'suporte',
    unit: 'par',
    quantity: 6,
    minQuantity: 4,
    idealQuantity: 10,
    unitCost: 48.9,
    marketPriceMin: 43.9,
    marketPriceMax: 58.0,
    usagePerInstall: '1 par por instalação (9.000 a 12.000 BTUs)',
    marketNotes: 'Aço galvanizado ou alumínio para condensadoras barril ou quadradas.',
  },
  {
    id: 'cat-10',
    name: 'Suporte Condensadora 500mm/550mm Reforçado 18k-24k (Par)',
    category: 'suporte',
    unit: 'par',
    quantity: 3,
    minQuantity: 2,
    idealQuantity: 5,
    unitCost: 78.5,
    marketPriceMin: 69.9,
    marketPriceMax: 92.0,
    usagePerInstall: '1 par por instalação (18.000 a 24.000 BTUs)',
    marketNotes: 'Chapa reforçada para suportar até 80kg com segurança.',
  },
  {
    id: 'cat-11',
    name: 'Kit Calços de Borracha Amortecedores c/ Parafuso (Jogo 4 un)',
    category: 'suporte',
    unit: 'kit 4 un',
    quantity: 8,
    minQuantity: 5,
    idealQuantity: 12,
    unitCost: 14.9,
    marketPriceMin: 11.5,
    marketPriceMax: 19.9,
    usagePerInstall: '1 kit por condensadora instalada',
    marketNotes: 'Elimina vibração e ruído estrutural na parede do cliente.',
  },
  {
    id: 'cat-12',
    name: 'Kit Parafuso Sextavado + Bucha Nylon 10mm p/ Suporte (8 peças)',
    category: 'suporte',
    unit: 'kit',
    quantity: 10,
    minQuantity: 5,
    idealQuantity: 15,
    unitCost: 12.5,
    marketPriceMin: 9.8,
    marketPriceMax: 16.0,
    usagePerInstall: '1 kit por suporte externo fixado',
    marketNotes: 'Buchas com anel de expansão para alvenaria ou concreto.',
  },
  {
    id: 'cat-13',
    name: 'Fita PVC Branca 100mm x 10m sem Adesivo (Acabamento)',
    category: 'insumos',
    unit: 'rolo 10m',
    quantity: 12,
    minQuantity: 8,
    idealQuantity: 20,
    unitCost: 8.9,
    marketPriceMin: 6.5,
    marketPriceMax: 12.5,
    usagePerInstall: '1,5 a 2 rolos por instalação de 3 metros',
    marketNotes: 'Protege o isolamento térmico contra sol e chuva na área externa.',
  },
  {
    id: 'cat-14',
    name: 'Mangueira Cristal / Corrugada para Dreno 5/8" (Rolo 25m)',
    category: 'insumos',
    unit: 'rolo 25m',
    quantity: 1,
    minQuantity: 1,
    idealQuantity: 2,
    unitCost: 89.9,
    marketPriceMin: 74.9,
    marketPriceMax: 110.0,
    usagePerInstall: '2m a 4m por instalação',
    marketNotes: 'Média R$ 3,60/metro. Parede reforçada anti-dobra.',
  },
  {
    id: 'cat-15',
    name: 'Caixa de Passagem Polar p/ Ar Split com Dreno Reversível',
    category: 'insumos',
    unit: 'un',
    quantity: 5,
    minQuantity: 4,
    idealQuantity: 10,
    unitCost: 18.5,
    marketPriceMin: 14.9,
    marketPriceMax: 24.9,
    usagePerInstall: '1 unidade em infraestruturas embutidas',
    marketNotes: 'Indispensável para pré-instalação em obras e reformas.',
  },
  {
    id: 'cat-16',
    name: 'Terminal Tubular Ilhós Isolado 1,5mm² e 2,5mm² (Caixa 100 un)',
    category: 'eletrica',
    unit: 'caixa 100un',
    quantity: 2,
    minQuantity: 1,
    idealQuantity: 2,
    unitCost: 24.9,
    marketPriceMin: 18.9,
    marketPriceMax: 32.0,
    usagePerInstall: '8 a 10 terminais por máquina',
    marketNotes: 'Exigido pelos fabricantes para manter a garantia nas borneiras.',
  },
  {
    id: 'cat-17',
    name: 'Refil Gás MAPP p/ Maçarico + 5 Varetas Solda Foscoper',
    category: 'insumos',
    unit: 'kit',
    quantity: 2,
    minQuantity: 1,
    idealQuantity: 3,
    unitCost: 98.0,
    marketPriceMin: 82.0,
    marketPriceMax: 119.0,
    usagePerInstall: 'Brasagem de emendas, curvas e válvulas',
    marketNotes: 'Alta temperatura de chama para brasagem rápida sem oxidar a linha.',
  },
  {
    id: 'cat-18',
    name: 'Capacitor Permanente 35µF / 440V + Contatora 25A (Giro Rápido)',
    category: 'pecas',
    unit: 'kit',
    quantity: 3,
    minQuantity: 2,
    idealQuantity: 6,
    unitCost: 34.9,
    marketPriceMin: 26.9,
    marketPriceMax: 45.0,
    usagePerInstall: 'Reposição imediata em manutenções corretivas',
    marketNotes: 'Peça de maior giro em chamados de "ar ventilando mas não gela".',
  },
];

const CATEGORY_LABELS: Record<
  InstallerMaterialItem['category'] | 'all' | 'low_stock' | 'below_min',
  string
> = {
  all: 'Todos os Materiais',
  below_min: 'Abaixo do Estoque Mínimo',
  low_stock: 'Abaixo do Estoque Ideal',
  tubulacao: 'Tubulação & Cobre',
  fluido: 'Gases & Fluidos',
  eletrica: 'Elétrica & Comando',
  suporte: 'Suportes & Fixação',
  insumos: 'Ferramentas & Insumos',
  pecas: 'Peças de Giro Rápido',
};

const CATEGORY_VISUAL_META: Record<
  InstallerMaterialItem['category'],
  {
    icon: React.ElementType;
    shortName: string;
    subtitle: string;
    iconBgClass: string;
    iconTextClass: string;
    barClass: string;
  }
> = {
  tubulacao: {
    icon: Layers,
    shortName: 'Cobre & Isolamento',
    subtitle: 'Panquecas 1/4", 3/8", 1/2" e esponjoso blindado',
    iconBgClass: 'bg-orange-500/15 border-orange-500/30',
    iconTextClass: 'text-orange-400',
    barClass: 'bg-orange-400',
  },
  fluido: {
    icon: Cylinder,
    shortName: 'Gases Refrigerantes',
    subtitle: 'Botijas R-410A, cilindros R-32 e carga adicional',
    iconBgClass: 'bg-cyan-500/15 border-cyan-500/30',
    iconTextClass: 'text-cyan-400',
    barClass: 'bg-cyan-400',
  },
  eletrica: {
    icon: Zap,
    shortName: 'Elétrica & Cabos PP',
    subtitle: 'Cabos PP 4x1,5mm², 3x2,5mm² e terminais ilhós',
    iconBgClass: 'bg-amber-500/15 border-amber-500/30',
    iconTextClass: 'text-amber-400',
    barClass: 'bg-amber-400',
  },
  suporte: {
    icon: Shield,
    shortName: 'Suportes & Fixação',
    subtitle: 'Suportes 400/500mm, calços de borracha e buchas',
    iconBgClass: 'bg-indigo-500/15 border-indigo-500/30',
    iconTextClass: 'text-indigo-400',
    barClass: 'bg-indigo-400',
  },
  insumos: {
    icon: Wrench,
    shortName: 'Ferramentas & Insumos',
    subtitle: 'Gás MAPP, solda foscoper, fita PVC e dreno',
    iconBgClass: 'bg-emerald-500/15 border-emerald-500/30',
    iconTextClass: 'text-emerald-400',
    barClass: 'bg-emerald-400',
  },
  pecas: {
    icon: Cpu,
    shortName: 'Peças de Giro Rápido',
    subtitle: 'Capacitores permanentes e contatoras de reposição',
    iconBgClass: 'bg-purple-500/15 border-purple-500/30',
    iconTextClass: 'text-purple-400',
    barClass: 'bg-purple-400',
  },
};

const LOCAL_STOCK_KEY = 'amigo_installer_ideal_stock_v1';

interface StockTabProps {
  dbStockItems?: any[];
  onSaveToDb?: (item: {
    id?: number;
    name: string;
    category?: string;
    quantity: number;
    unit?: string;
    minQuantity?: number;
    unitCost?: number;
  }) => Promise<void>;
  onUpdateQtyInDb?: (id: number, newQty: number) => Promise<void>;
  onDeleteFromDb?: (id: number) => Promise<void>;
}

export default function StockTab({
  dbStockItems = [],
  onSaveToDb,
}: StockTabProps) {
  const [items, setItems] = useState<InstallerMaterialItem[]>(INSTALLER_IDEAL_STOCK_CATALOG);
  const [selectedCategory, setSelectedCategory] = useState<
    InstallerMaterialItem['category'] | 'all' | 'low_stock' | 'below_min'
  >('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showShoppingList, setShowShoppingList] = useState<boolean>(false);

  // Estado do formulário de novo material
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<InstallerMaterialItem['category']>('tubulacao');
  const [newUnit, setNewUnit] = useState('un');
  const [newQty, setNewQty] = useState(1);
  const [newIdealQty, setNewIdealQty] = useState(5);
  const [newUnitCost, setNewUnitCost] = useState(50);
  const [newUsage, setNewUsage] = useState('Uso geral em instalações e manutenções');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STOCK_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          return;
        }
      }
      localStorage.setItem(LOCAL_STOCK_KEY, JSON.stringify(INSTALLER_IDEAL_STOCK_CATALOG));
    } catch {
      // ignore storage errors
    }
  }, []);

  const persistItems = (updated: InstallerMaterialItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(LOCAL_STOCK_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleUpdateQty = (id: number | string, deltaOrValue: number, isAbsolute = false) => {
    const updated = items.map((item) => {
      if (item.id !== id) return item;
      const nextQty = isAbsolute ? Math.max(0, deltaOrValue) : Math.max(0, item.quantity + deltaOrValue);
      return { ...item, quantity: nextQty };
    });
    persistItems(updated);
  };

  const handleMatchAllToIdeal = () => {
    const updated = items.map((item) => ({
      ...item,
      quantity: Math.max(item.quantity, item.idealQuantity),
    }));
    persistItems(updated);
  };

  const handleResetCatalog = () => {
    persistItems(INSTALLER_IDEAL_STOCK_CATALOG);
  };

  const handleRemoveItem = (id: number | string) => {
    const updated = items.filter((i) => i.id !== id);
    persistItems(updated);
  };

  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const cost = Number(newUnitCost) || 0;
    const created: InstallerMaterialItem = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      unit: newUnit.trim() || 'un',
      quantity: Number(newQty) || 0,
      minQuantity: Math.max(1, Math.floor((Number(newIdealQty) || 2) / 2)),
      idealQuantity: Math.max(1, Number(newIdealQty) || 1),
      unitCost: cost,
      marketPriceMin: Number((cost * 0.88).toFixed(2)),
      marketPriceMax: Number((cost * 1.15).toFixed(2)),
      usagePerInstall: newUsage.trim() || 'Uso técnico em campo',
      marketNotes: 'Item adicionado manualmente pelo técnico instalador.',
    };

    persistItems([created, ...items]);

    if (onSaveToDb) {
      await onSaveToDb({
        name: created.name,
        category: created.category,
        quantity: created.quantity,
        unit: created.unit,
        minQuantity: created.minQuantity,
        unitCost: created.unitCost,
      }).catch(() => {});
    }

    setNewName('');
    setShowAddModal(false);
  };

  // Cálculos de Mercado e Estoque Ideal
  const metrics = useMemo(() => {
    const currentTotalValue = items.reduce((acc, i) => acc + i.quantity * i.unitCost, 0);
    const idealTotalValue = items.reduce((acc, i) => acc + i.idealQuantity * i.unitCost, 0);
    const restockItems = items.filter((i) => i.quantity < i.idealQuantity);
    const belowMinItems = items.filter((i) => i.quantity < i.minQuantity);
    const restockCost = restockItems.reduce(
      (acc, i) => acc + Math.max(0, i.idealQuantity - i.quantity) * i.unitCost,
      0
    );

    // Custo médio de material para 1 instalação padrão de 3m (9k/12k BTUs):
    // 3m cobre 1/4 (~R$ 63) + 3m cobre 3/8 (~R$ 93) + 3 barras isolante (~R$ 34,50) +
    // 4m cabo PP (~R$ 35,60) + 1 par suporte 400mm (~R$ 48,90) + kit calços/buchas (~R$ 27,40) +
    // fita PVC e dreno (~R$ 25,00) = ~R$ 327,40
    const costPerStandardInstall3m = 327.4;

    return {
      currentTotalValue,
      idealTotalValue,
      restockCount: restockItems.length,
      belowMinCount: belowMinItems.length,
      belowMinItems,
      restockCost,
      restockItems,
      costPerStandardInstall3m,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory === 'below_min') {
        if (item.quantity >= item.minQuantity) return false;
      } else if (selectedCategory === 'low_stock') {
        if (item.quantity >= item.idealQuantity) return false;
      } else if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const catLabel = (CATEGORY_LABELS[item.category] || '').toLowerCase();
        const catMeta = CATEGORY_VISUAL_META[item.category];
        const catShort = (catMeta?.shortName || '').toLowerCase();
        const catSubtitle = (catMeta?.subtitle || '').toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          catLabel.includes(q) ||
          catShort.includes(q) ||
          catSubtitle.includes(q) ||
          item.marketNotes.toLowerCase().includes(q) ||
          item.usagePerInstall.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, selectedCategory, searchQuery]);

  const visibleCategories = useMemo(() => {
    const allCats = ['tubulacao', 'fluido', 'insumos', 'eletrica', 'suporte', 'pecas'] as const;
    if (!searchQuery.trim()) return allCats;
    const q = searchQuery.toLowerCase().trim();
    const matched = allCats.filter((catKey) => {
      const meta = CATEGORY_VISUAL_META[catKey];
      const label = CATEGORY_LABELS[catKey].toLowerCase();
      const hasMatchingItem = items.some(
        (i) =>
          i.category === catKey &&
          (i.name.toLowerCase().includes(q) ||
            i.marketNotes.toLowerCase().includes(q) ||
            i.usagePerInstall.toLowerCase().includes(q))
      );
      return (
        catKey.includes(q) ||
        label.includes(q) ||
        meta.shortName.toLowerCase().includes(q) ||
        meta.subtitle.toLowerCase().includes(q) ||
        hasMatchingItem
      );
    });
    return matched.length > 0 ? matched : allCats;
  }, [items, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho Principal do Controle de Estoque & Pesquisa de Mercado */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 shrink-0 mt-0.5">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Controle de Estoque Ideal & Pesquisa de Mercado de Materiais HVAC-R
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Lista dos 18 materiais mais utilizados por instaladores com estoque ideal para autonomia de 10 instalações e valores médios praticados no Brasil
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Ícone de Notificação / Badge de Itens Abaixo do Estoque Mínimo */}
            <button
              type="button"
              onClick={() =>
                setSelectedCategory((prev) => (prev === 'below_min' ? 'all' : 'below_min'))
              }
              title={
                metrics.belowMinCount > 0
                  ? `${metrics.belowMinCount} item(ns) com quantidade abaixo do estoque mínimo (clique para filtrar)`
                  : 'Nenhum item abaixo do estoque mínimo'
              }
              className={`relative px-3.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                selectedCategory === 'below_min'
                  ? 'bg-rose-500 text-slate-950 border-rose-400 shadow-md'
                  : metrics.belowMinCount > 0
                  ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-300'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400'
              }`}
            >
              <div className="relative flex items-center">
                <Bell
                  className={`w-4 h-4 ${
                    metrics.belowMinCount > 0 && selectedCategory !== 'below_min'
                      ? 'text-rose-400 animate-pulse'
                      : ''
                  }`}
                />
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-black leading-none ${
                    selectedCategory === 'below_min'
                      ? 'bg-slate-950 text-rose-400'
                      : metrics.belowMinCount > 0
                      ? 'bg-rose-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {metrics.belowMinCount}
                </span>
              </div>
              <span>Abaixo do Mínimo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowShoppingList((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>
                Lista de Reposição ({metrics.restockCount})
              </span>
            </button>

            <button
              type="button"
              onClick={handleMatchAllToIdeal}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completar Estoque Ideal</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Material</span>
            </button>
          </div>
        </div>

        {/* Barra de Busca Rápida no Topo (por Nome do Material ou Categoria) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/90 border border-slate-800 rounded-2xl p-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar material no estoque por nome ou categoria (ex: cobre, gás R-410A, elétrica, suporte, ferramentas)..."
              aria-label="Buscar itens do estoque por nome ou categoria"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums shrink-0 px-1">
            <span>
              Encontrados: <strong className="text-sky-400">{filteredItems.length}</strong>/{items.length}
            </span>
            {(searchQuery || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-xs text-amber-400 hover:underline font-sans font-semibold cursor-pointer ml-2"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Cards de Indicadores de Estoque & Mercado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 block">Valor Atual em Estoque</span>
            <div className="text-xl font-bold text-white font-mono tabular-nums mt-0.5">
              R$ {metrics.currentTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
              Meta Ideal: R$ {metrics.idealTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 block">Orçamento p/ Estoque Ideal</span>
            <div className="text-xl font-bold text-amber-400 font-mono tabular-nums mt-0.5">
              R$ {metrics.restockCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {metrics.restockCount === 0
                ? '100% do estoque ideal atingido'
                : `${metrics.restockCount} itens abaixo da meta ideal`}
            </p>
          </div>

          <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 block">
              Custo de Material / Instalação (3m)
            </span>
            <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
              R$ {metrics.costPerStandardInstall3m.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Kit 9k/12k BTUs (Cobre + PP + Suporte + Isolante)
            </p>
          </div>

          <div className="bg-slate-950/80 border border-sky-500/30 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 block">Autonomia do Estoque Ideal</span>
            <div className="text-xl font-bold text-sky-400 font-mono tabular-nums mt-0.5">
              10 a 15 Instalações
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Dimensionado p/ 2 semanas de giro em campo
            </p>
          </div>
        </div>

        {/* Resumo da Pesquisa de Mercado por Metro / Kit de Instalação */}
        <div className="bg-slate-950/90 border border-sky-500/20 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Referência Rápida de Mercado — Custo Fracionado por Metro de Linha</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Base: Distribuidoras HVAC Brasil (Dufrio, Frigelar, Leveros e Mercado Livre Pro)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono tabular-nums">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-bold block font-sans">Split 9.000 / 12.000 BTUs</span>
                <span className="text-[11px] text-slate-400">Cobre 1/4&quot; + 3/8&quot; + Isolante + PP</span>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-bold text-sm">R$ 72,50 / m</span>
                <span className="block text-[10px] text-slate-400">Kit 3m: ~R$ 327,40</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-bold block font-sans">Split 18.000 / 24.000 BTUs</span>
                <span className="text-[11px] text-slate-400">Cobre 1/4&quot; + 1/2&quot; + Isolante + PP</span>
              </div>
              <div className="text-right">
                <span className="text-amber-400 font-bold text-sm">R$ 86,20 / m</span>
                <span className="block text-[10px] text-slate-400">Kit 3m: ~R$ 398,00</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-bold block font-sans">Carga de Fluido R-410A / R-32</span>
                <span className="text-[11px] text-slate-400">Custo de insumo por kg</span>
              </div>
              <div className="text-right">
                <span className="text-sky-400 font-bold text-sm">R$ 105 a R$ 141/kg</span>
                <span className="block text-[10px] text-slate-400">Recarga 800g: ~R$ 95,00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Painel Expansível: Lista de Compras para atingir o Estoque Ideal */}
        {showShoppingList && (
          <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <ShoppingCart className="w-4 h-4" />
                <span>Lista de Compras Automática (Para Atingir o Estoque Ideal)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowShoppingList(false)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Fechar</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {metrics.restockItems.length === 0 ? (
              <p className="text-xs text-emerald-400 py-2">
                Todos os itens já estão com o Estoque Ideal completo!
              </p>
            ) : (
              <div className="space-y-2">
                {metrics.restockItems.map((item) => {
                  const needed = Math.max(0, item.idealQuantity - item.quantity);
                  const subtotal = needed * item.unitCost;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white">{item.name}</span>
                        <span className="text-slate-400 block sm:inline sm:ml-2 font-mono text-[11px]">
                          (Atual: {item.quantity} · Ideal: {item.idealQuantity} {item.unit})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono tabular-nums">
                        <span className="text-amber-300 font-bold">
                          Comprar +{needed} {item.unit}
                        </span>
                        <span className="text-white font-bold">
                          R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono tabular-nums">
                  <span className="text-slate-400 font-sans font-semibold">
                    Total Estimado na Distribuidora:
                  </span>
                  <span className="text-base font-bold text-amber-400">
                    R$ {metrics.restockCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Painel Visual por Categoria de Material (Cobre, Gases, Ferramentas, Elétrica, Suportes, Peças) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">
                Nível Operacional por Categoria &amp; Proximidade do Estoque Mínimo
              </h3>
              <p className="text-xs text-slate-400">
                Comparativo direto entre <strong className="text-slate-200 font-mono">quantidade_atual</strong> e <strong className="text-slate-200 font-mono">estoque_minimo</strong> (Verde: Saudável · Amarelo: Atenção · Vermelho: Crítico)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Saudável (&ge;150% do mín.)</span>
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Atenção (100%–149% do mín.)</span>
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Crítico (&lt;100% do mín.)</span>
              </span>
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="text-xs text-sky-400 hover:underline font-semibold cursor-pointer ml-1"
                >
                  Mostrar todas
                </button>
              )}
            </div>
          </div>

          {/* Campo de Busca no Topo do Painel de Categorias & Materiais */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar rapidamente por nome do material ou categoria (ex: Tubulação, Gases, Ferramentas, Elétrica, Suporte)..."
              aria-label="Filtrar itens do estoque por nome ou categoria"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title="Limpar filtro"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visibleCategories.map((catKey) => {
              const meta = CATEGORY_VISUAL_META[catKey];
              const CatIcon = meta.icon;
              const catItems = items.filter((i) => i.category === catKey);
              const totalQty = catItems.reduce((acc, i) => acc + i.quantity, 0);
              const totalMin = catItems.reduce((acc, i) => acc + i.minQuantity, 0);
              const ratioVsMinPct = Math.round((totalQty / Math.max(1, totalMin)) * 100);
              // Escala visual da barra onde 50% equivale a 100% do estoque_minimo e 100% equivale a >= 2x estoque_minimo
              const barFillPct = Math.min(
                100,
                Math.round((totalQty / Math.max(1, totalMin * 2)) * 100)
              );
              const isCatCritical = ratioVsMinPct < 100;
              const isCatWarning = ratioVsMinPct >= 100 && ratioVsMinPct < 150;
              const isSelected = selectedCategory === catKey;

              const catBarColorClass = isCatCritical
                ? 'bg-rose-500'
                : isCatWarning
                ? 'bg-amber-400'
                : 'bg-emerald-500';

              const catStatusTextClass = isCatCritical
                ? 'text-rose-400'
                : isCatWarning
                ? 'text-amber-400'
                : 'text-emerald-400';

              const catStatusLabel = isCatCritical
                ? 'Crítico'
                : isCatWarning
                ? 'Atenção'
                : 'Saudável';

              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() =>
                    setSelectedCategory((prev) => (prev === catKey ? 'all' : catKey))
                  }
                  className={`text-left p-4 rounded-2xl bg-slate-950 border transition cursor-pointer space-y-3 ${
                    isSelected
                      ? 'border-sky-500 ring-1 ring-sky-500/30'
                      : isCatCritical
                      ? 'border-rose-500/40 hover:border-rose-400'
                      : isCatWarning
                      ? 'border-amber-500/40 hover:border-amber-400'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl border shrink-0 ${meta.iconBgClass} ${meta.iconTextClass}`}
                      >
                        <CatIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {meta.shortName}
                        </span>
                        <span className="text-[11px] text-slate-400 line-clamp-1">
                          {meta.subtitle}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-mono tabular-nums font-bold block ${catStatusTextClass}`}>
                        {ratioVsMinPct}% do mín.
                      </span>
                      <span className={`text-[10px] font-semibold ${catStatusTextClass}`}>
                        {catStatusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progresso comparando quantidade_atual vs estoque_minimo */}
                  <div className="space-y-1.5">
                    <div className="relative w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className={`h-full transition-all duration-500 ease-in-out rounded-full ${catBarColorClass}`}
                        style={{ width: `${barFillPct}%` }}
                      />
                      {/* Linha de referência no meio (50% da barra = 100% do estoque_minimo) */}
                      <div
                        title={`Estoque Mínimo da Categoria: ${totalMin} un`}
                        className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
                        style={{ left: '50%' }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                      <span>
                        quantidade_atual: <strong className="text-white">{totalQty}</strong>
                      </span>
                      <span>
                        estoque_minimo: <strong className="text-slate-200">{totalMin}</strong>
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtros por Categoria e Busca */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            {(
              [
                'all',
                'below_min',
                'low_stock',
                'tubulacao',
                'fluido',
                'eletrica',
                'suporte',
                'insumos',
                'pecas',
              ] as const
            ).map((cat) => {
              const CatFilterIcon =
                cat === 'all'
                  ? Package
                  : cat === 'below_min'
                  ? Bell
                  : cat === 'low_stock'
                  ? AlertTriangle
                  : CATEGORY_VISUAL_META[cat].icon;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CatFilterIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{CATEGORY_LABELS[cat]}</span>
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar material, bitola, gás..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Lista Detalhada de Materiais com Barra de Progresso (quantidade_atual vs estoque_minimo) */}
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const quantidade_atual = item.quantity;
            const estoque_minimo = Math.max(1, item.minQuantity);
            const isIdealReached = quantidade_atual >= item.idealQuantity;

            // Porcentagem de estoque disponível em relação ao estoque_minimo (100% = exatamente no estoque_minimo)
            const stockAvailabilityPct = Math.round((quantidade_atual / estoque_minimo) * 100);

            // Estados de saúde baseados na comparação quantidade_atual vs estoque_minimo:
            // - Crítico (Vermelho): quantidade_atual < estoque_minimo (< 100%)
            // - Atenção (Amarelo): quantidade_atual no limite ou próximo do estoque_minimo (100% a 149%)
            // - Saudável (Verde): quantidade_atual com folga segura (>= 150% do estoque_minimo)
            const isCritical = stockAvailabilityPct < 100;
            const isWarning = stockAvailabilityPct >= 100 && stockAvailabilityPct < 150;

            // Largura visual da barra (onde 50% da barra representa exatamente 100% do estoque_minimo, e 100% representa >= 2x o estoque_minimo)
            const visualBarWidthPct = Math.min(
              100,
              Math.round((quantidade_atual / (estoque_minimo * 2)) * 100)
            );

            const statusBarColor = isCritical
              ? 'bg-rose-500'
              : isWarning
              ? 'bg-amber-400'
              : 'bg-emerald-500';

            const statusTextColor = isCritical
              ? 'text-rose-400'
              : isWarning
              ? 'text-amber-400'
              : 'text-emerald-400';

            const statusLabel = isCritical
              ? 'Crítico — Abaixo do Estoque Mínimo'
              : isWarning
              ? 'Atenção — Próximo ao Estoque Mínimo'
              : 'Saudável — Estoque Disponível Seguro';

            const totalItemValue = quantidade_atual * item.unitCost;
            const catMeta = CATEGORY_VISUAL_META[item.category] || CATEGORY_VISUAL_META.insumos;
            const ItemCategoryIcon = catMeta.icon;
            const diffFromMin = quantidade_atual - estoque_minimo;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl bg-slate-950 border transition ${
                  isCritical
                    ? 'border-rose-500/40'
                    : isWarning
                    ? 'border-amber-500/40'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Ícone da Categoria + Informações do Material e Pesquisa de Mercado */}
                  <div className="flex items-start gap-3.5 flex-1">
                    <div
                      className={`p-3 rounded-2xl border shrink-0 mt-0.5 ${catMeta.iconBgClass} ${catMeta.iconTextClass}`}
                      title={CATEGORY_LABELS[item.category]}
                    >
                      <ItemCategoryIcon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{item.name}</h4>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className={`text-xs font-medium ${catMeta.iconTextClass}`}>
                          {CATEGORY_LABELS[item.category]}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className={`text-xs font-semibold ${statusTextColor}`}>
                          {statusLabel} ({stockAvailabilityPct}% do mín.)
                        </span>
                      </div>

                      {/* Faixa de Preço de Mercado e Rendimento */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono tabular-nums">
                        <span>
                          Preço Médio:{' '}
                          <strong className="text-emerald-400">
                            R$ {item.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>{' '}
                          / {item.unit}
                        </span>
                        <span>
                          Faixa no Mercado: R${' '}
                          {item.marketPriceMin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} – R${' '}
                          {item.marketPriceMax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="font-sans text-slate-300">
                          Consumo: {item.usagePerInstall}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500">{item.marketNotes}</p>
                    </div>
                  </div>

                  {/* Controles de Quantidade + Barra de Progresso (quantidade_atual vs estoque_minimo) */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 min-w-[320px] border-t lg:border-t-0 border-slate-800/80 pt-3 lg:pt-0">
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full">
                      <div className="text-left sm:text-right font-mono tabular-nums">
                        <span className="text-[11px] text-slate-400 block">
                          Atual / <strong className="text-amber-400">Mínimo</strong> /{' '}
                          <strong className="text-sky-400">Ideal</strong>
                        </span>
                        <span className="text-sm font-bold text-white">
                          {quantidade_atual} /{' '}
                          <span className="text-amber-400">{estoque_minimo}</span> /{' '}
                          <span className="text-sky-400">
                            {item.idealQuantity} {item.unit}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, -1)}
                          aria-label={`Diminuir quantidade de ${item.name}`}
                          className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, 1)}
                          aria-label={`Aumentar quantidade de ${item.name}`}
                          className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        {!isIdealReached && (
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.id, item.idealQuantity, true)}
                            title="Ajustar para o Estoque Ideal"
                            className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px] font-semibold cursor-pointer"
                          >
                            Ideal ({item.idealQuantity})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remover item"
                          className="p-2 text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Barra de Progresso Visual comparando quantidade_atual com estoque_minimo */}
                    <div className="w-full space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                        <span className={`font-sans font-semibold ${statusTextColor}`}>
                          {isCritical
                            ? `Crítico: faltam ${Math.abs(diffFromMin)} ${item.unit} p/ o mínimo`
                            : isWarning
                            ? `Atenção: +${diffFromMin} ${item.unit} acima do mínimo`
                            : `Saudável: +${diffFromMin} ${item.unit} acima do mínimo`}
                        </span>
                        <span className={`font-bold ${statusTextColor}`}>
                          {stockAvailabilityPct}% do mín.
                        </span>
                      </div>

                      <div
                        role="progressbar"
                        aria-valuenow={quantidade_atual}
                        aria-valuemin={0}
                        aria-valuemax={estoque_minimo * 2}
                        aria-label={`Nível de estoque de ${item.name}: ${quantidade_atual} de no mínimo ${estoque_minimo} ${item.unit}`}
                        className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800"
                      >
                        <div
                          className={`h-full transition-all duration-500 ease-in-out rounded-full ${statusBarColor}`}
                          style={{ width: `${visualBarWidthPct}%` }}
                        />
                        {/* Marcador vertical indicando exatamente o estoque_minimo (100% do mínimo = 50% da barra) */}
                        <div
                          title={`Estoque Mínimo (estoque_minimo = ${estoque_minimo} ${item.unit})`}
                          className="absolute top-0 bottom-0 w-0.5 bg-white/90 z-10"
                          style={{ left: '50%' }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                        <span>
                          Atual: <strong className="text-white">{quantidade_atual}</strong> vs. Mínimo:{' '}
                          <strong className="text-slate-200">{estoque_minimo}</strong> {item.unit}
                        </span>
                        <span>
                          Valor: R${' '}
                          {totalItemValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé de Restauração do Catálogo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
          <span>
            Exibindo <strong className="text-white font-mono">{filteredItems.length}</strong> de{' '}
            <strong className="text-white font-mono">{items.length}</strong> itens do catálogo técnico
          </span>
          <button
            type="button"
            onClick={handleResetCatalog}
            className="text-xs text-sky-400 hover:underline cursor-pointer self-start sm:self-auto"
          >
            Restaurar catálogo padrão de 18 materiais e valores de mercado
          </button>
        </div>
      </div>

      {/* Modal de Adição de Novo Material */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-sky-400" />
                <span>Cadastrar Novo Material no Estoque</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome e Especificação do Material
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Disjuntor Bipolar 16A Curva C"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoria</label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="tubulacao">Tubulação & Isolamento</option>
                    <option value="fluido">Fluidos Refrigerantes</option>
                    <option value="eletrica">Elétrica & Comando</option>
                    <option value="suporte">Suportes & Fixação</option>
                    <option value="insumos">Acabamento & Insumos</option>
                    <option value="pecas">Peças de Giro Rápido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Unidade de Medida
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: un, rolo 15m, par, kg"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Qtd. Atual</label>
                  <input
                    type="number"
                    min={0}
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estoque Ideal</label>
                  <input
                    type="number"
                    min={1}
                    value={newIdealQty}
                    onChange={(e) => setNewIdealQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Preço Unit. (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={newUnitCost}
                    onChange={(e) => setNewUnitCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Aplicação / Rendimento por Instalação
                </label>
                <input
                  type="text"
                  value={newUsage}
                  onChange={(e) => setNewUsage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black cursor-pointer"
                >
                  Salvar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
