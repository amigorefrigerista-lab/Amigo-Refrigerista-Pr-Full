'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  AlertCircle, 
  Calculator, 
  TrendingUp, 
  Users, 
  Plus, 
  Search, 
  FileText, 
  QrCode, 
  Camera, 
  Sparkles, 
  Bot, 
  CheckCircle2, 
  Clock, 
  Phone, 
  MapPin, 
  DollarSign, 
  Layers, 
  Wrench, 
  Thermometer, 
  Gauge, 
  Wind, 
  Droplet, 
  ChevronRight, 
  Settings, 
  LogOut, 
  Download, 
  Share2, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  Headset, 
  Info, 
  ArrowUpRight,
  Flame,
  Snowflake,
  Send,
  Bell,
  RefreshCw,
  Crown,
  Zap,
  ShieldAlert,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Shield,
  Calendar,
  MessageSquare,
  CalendarCheck,
  BellRing,
  Gift,
  Copy,
  ExternalLink,
  Globe,
  SlidersHorizontal,
  AlertTriangle,
  Package,
  Tag,
  Minus
} from 'lucide-react';
import { 
  MaintenanceReminder, 
  generateWhatsAppReminderLink, 
  calculateNextMaintenanceDate,
  calculateReminderAlertDate,
  DEFAULT_WHATSAPP_TEMPLATE,
  ServiceOrder
} from '@/lib/reminderUtils';
import { WhatsAppTemplateModal } from '@/components/WhatsAppTemplateModal';
import { GoogleConnectModal } from '@/components/GoogleConnectModal';
import { ProfileUpdateModal } from '@/components/ProfileUpdateModal';
import { RecurringRevenueCard } from '@/components/RecurringRevenueCard';
import { PlanCarousel } from '@/components/PlanCarousel';
import { UpgradeModal } from '@/components/UpgradeModal';
import { InstallPrompt } from '@/components/InstallPrompt';
import { MobileInstallBanner } from '@/components/MobileInstallBanner';
import { ClientSupportModal } from '@/components/ClientSupportModal';
import { Footer } from '@/components/Footer';
import { AdminSupportChatView } from '@/components/AdminSupportChatView';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  syncUserAction,
  getUserProfileAction,
  updateUserProfileAction,
  getClientsAction,
  saveClientAction,
  deleteClientAction,
  getQuotesAction,
  saveQuoteAction,
  updateQuoteStatusAction,
  deleteQuoteAction,
  getInstallationsAction,
  saveInstallationAction,
  updateInstallationStatusAction,
  deleteInstallationAction,
  getDiagnosesAction,
  saveDiagnosisAction,
  getStockAction,
  saveStockItemAction,
  updateStockQuantityAction,
  deleteStockItemAction
} from '@/app/actions/dbActions';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import SettingsTab from '@/components/tabs/SettingsTab';
import StockTab from '@/components/tabs/StockTab';
import { sendOrderEmailAction, SmtpConfig } from '@/app/actions/smtpActions';
import { diagnoseErrorCode } from '@/app/actions/diagnoseErrorCode';
import { parseEquipmentPlate } from '@/app/actions/parsePlateImage';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  Legend
} from 'recharts';

export default function AmigoApp() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { 
    user, 
    profile, 
    loading: authLoading, 
    isAdmin, 
    isSupportOrAdmin, 
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail, 
    resetPasswordForEmail,
    signOut,
    updateProfileData,
    refreshProfile
  } = useAuth();
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState('dash');
  const [calcSubTab, setCalcSubTab] = useState<'sh_sub' | 'thermal' | 'pt_table'>('sh_sub');
  const [showProfileUpdateModal, setShowProfileUpdateModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Validação: Detecta se campos obrigatórios do perfil (nome, email) estão vazios
  const isProfileIncomplete = useMemo(() => {
    if (!user) return false;
    const name = profile?.name?.trim() || user.displayName?.trim();
    const email = profile?.email?.trim() || user.email?.trim();
    return !name || !email || name === 'Técnico' || name === 'Usuário';
  }, [user, profile?.name, profile?.email]);

  // Alerta automático se o perfil no banco de dados estiver incompleto após login
  useEffect(() => {
    let isCancelled = false;
    const verifyDatabaseProfile = async () => {
      if (!user?.uid || authLoading) return;
      try {
        const dbUser = await getUserProfileAction(user.uid).catch(() => null);
        const nameVal = dbUser?.name?.trim() || profile?.name?.trim() || user.displayName?.trim();
        const emailVal = dbUser?.email?.trim() || profile?.email?.trim() || user.email?.trim();

        const isNameEmpty = !nameVal || nameVal === 'Técnico' || nameVal === 'Usuário';
        const isEmailEmpty = !emailVal || !emailVal.includes('@');

        if (isNameEmpty || isEmailEmpty) {
          if (!isCancelled) {
            toast.error(
              'Atenção: Os campos obrigatórios do seu perfil (Nome e E-mail) estão vazios no banco de dados. Por favor, atualize seus dados!',
              { duration: 8000, id: 'db-profile-incomplete-alert' }
            );
            setShowProfileUpdateModal(true);
          }
        }
      } catch (err) {
        console.warn('Erro ao verificar campos obrigatórios do perfil no banco:', err);
      }
    };

    verifyDatabaseProfile();
    return () => { isCancelled = true; };
  }, [user, authLoading, profile?.name, profile?.email]);

  // HVAC Error Diagnoses State
  const [errorBrand, setErrorBrand] = useState('Daikin');
  const [errorCodeInput, setErrorCodeInput] = useState('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [diagnosisHistory, setDiagnosisHistory] = useState<any[]>([]);

  // Carregar Dados do PostgreSQL via Server Actions
  useEffect(() => {
    if (!user) {
      setClients([]);
      setServiceOrders([]);
      setReminders([]);
      setDiagnosisHistory([]);
      return;
    }

    // Sincronizar Usuário no PostgreSQL
    syncUserAction({
      uid: user.uid,
      email: user.email || '',
      name: user.displayName || undefined,
      photoURL: user.photoURL || undefined,
    }).catch(console.error);

    // Buscar Clientes
    getClientsAction(user.uid)
      .then((data) => {
        setClients(data || []);
      })
      .catch((err) => {
        console.error('Erro ao buscar clientes:', err);
        setClients([]);
      });

    // Buscar Ordens de Serviço / Instalações
    getInstallationsAction(user.uid)
      .then((data) => {
        if (data && data.length > 0) {
          setServiceOrders(data.map((d: any) => ({
            id: String(d.id),
            clientName: d.clientName,
            clientPhone: d.clientPhone || '',
            clientAddress: d.address || '',
            equipment: d.equipment,
            brand: d.brand || '',
            btus: d.btus || '',
            type: d.type || 'instalacao',
            status: d.status || 'agendado',
            serviceDate: d.date,
            value: d.value || 0,
            notes: d.notes || '',
            warrantyMonths: d.warrantyMonths || 12,
            orderNumber: d.qrCode || `OS-${d.id}`,
            maintenanceIntervalMonths: 6,
            autoScheduleReminder: true,
            reminderDaysBefore: 3,
          })));
        } else {
          setServiceOrders([]);
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar ordens de serviço:', err);
        setServiceOrders([]);
      });

    // Buscar Histórico de Diagnósticos
    getDiagnosesAction(user.uid)
      .then((logs) => {
        setDiagnosisHistory(logs || []);
      })
      .catch((err) => {
        console.error('Erro ao buscar diagnósticos:', err);
        setDiagnosisHistory([]);
      });

    // CORREÇÃO 1: Carregar Estoque do Instalador do Supabase
    getStockAction(user.uid)
      .then((data) => setStockItems(data || []))
      .catch((err) => {
        console.error('Erro ao buscar estoque de materiais:', err);
        setStockItems([]);
      });

    // CORREÇÃO 2: Carregar Orçamentos e Tabela de Preços do Supabase
    getQuotesAction(user.uid)
      .then((data) => setQuotes(data || []))
      .catch((err) => {
        console.error('Erro ao buscar orçamentos e preços:', err);
        setQuotes([]);
      });
  }, [user]);

  // Superheating & Subcooling State
  const [selectedGas, setSelectedGas] = useState('R410A');
  const [suctionPressure, setSuctionPressure] = useState('118'); // psig
  const [suctionTemp, setSuctionTemp] = useState('12'); // °C
  const [liquidPressure, setLiquidPressure] = useState('335'); // psig
  const [liquidTemp, setLiquidTemp] = useState('42'); // °C

  // Thermal Load Calculation State
  const [areaM2, setAreaM2] = useState('20');
  const [peopleCount, setPeopleCount] = useState('2');
  const [sunExposure, setSunExposure] = useState<'morning' | 'afternoon'>('afternoon');
  const [electronicWatts, setElectronicWatts] = useState('300');

  // OCR Plate Scanner State
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrData, setOcrData] = useState<any>(null);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'register' | 'login' | 'forgot-password'>('register');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [documentInput, setDocumentInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [domainAuthError, setDomainAuthError] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [savedGoogleEmail, setSavedGoogleEmail] = useState<string>('');
  const [savedGoogleName, setSavedGoogleName] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('amigo_last_google_email') || '';
      const name = localStorage.getItem('amigo_last_google_name') || '';
      if (email) {
        setSavedGoogleEmail(email);
        setEmailInput(prev => prev || email);
      }
      if (name) {
        setSavedGoogleName(name);
        setNameInput(prev => prev || name);
      }
    }
  }, []);

  // Subscription & Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isCancellingSub, setIsCancellingSub] = useState(false);

  // Lembretes de Manutenção Preventiva State (Inicia 100% limpo para novos usuários)
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [waTemplate, setWaTemplate] = useState<string>(DEFAULT_WHATSAPP_TEMPLATE);

  const [showOSModal, setShowOSModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [remClientName, setRemClientName] = useState('');
  const [remClientPhone, setRemClientPhone] = useState('');
  const [remClientEmail, setRemClientEmail] = useState('');
  const [remClientAddress, setRemClientAddress] = useState('');
  const [remEquipment, setRemEquipment] = useState('');
  const [remMonths, setRemMonths] = useState<number>(6);
  const [remDaysBefore, setRemDaysBefore] = useState<number>(3);
  const [remNotes, setRemNotes] = useState('');
  const [remServiceDate, setRemServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoScheduleReminder, setAutoScheduleReminder] = useState(true);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);

  // Número sequencial automático de Ordem de Serviço
  const nextOrderNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const count = serviceOrders.length + 1;
    return `OS-${year}-${String(count).padStart(4, '0')}`;
  }, [serviceOrders.length]);

  // Financial State (Inicia 100% limpo para novos usuários)
  const [revenueItems, setRevenueItems] = useState<any[]>([]);

  // Sincroniza e limpa dados locais por usuário
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.uid) {
      try {
        const storedRev = localStorage.getItem(`amigo_revenue_${user.uid}`);
        setRevenueItems(storedRev ? JSON.parse(storedRev) : []);
      } catch {
        setRevenueItems([]);
      }
      try {
        const storedRem = localStorage.getItem(`amigo_reminders_${user.uid}`);
        setReminders(storedRem ? JSON.parse(storedRem) : []);
      } catch {
        setReminders([]);
      }
      try {
        const storedTpl = localStorage.getItem(`amigo_wa_template_${user.uid}`);
        if (storedTpl) setWaTemplate(storedTpl);
      } catch {}
    } else {
      setRevenueItems([]);
      setReminders([]);
      setClients([]);
      setServiceOrders([]);
      setDiagnosisHistory([]);
    }
  }, [user?.uid]);

  const handleSaveWaTemplate = (newTemplate: string) => {
    setWaTemplate(newTemplate);
    if (typeof window !== 'undefined') {
      const key = user?.uid ? `amigo_wa_template_${user.uid}` : 'amigo_wa_template_guest';
      localStorage.setItem(key, newTemplate);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.uid) {
      localStorage.setItem(`amigo_revenue_${user.uid}`, JSON.stringify(revenueItems));
    }
  }, [revenueItems, user?.uid]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.uid) {
      localStorage.setItem(`amigo_reminders_${user.uid}`, JSON.stringify(reminders));
    }
  }, [reminders, user?.uid]);

  // Form para novas transações financeiras
  const [newTxDesc, setNewTxDesc] = useState('');
  const [newTxValue, setNewTxValue] = useState('');
  const [newTxDate, setNewTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTxType, setNewTxType] = useState<'in' | 'out'>('in');
  const [isAddingTx, setIsAddingTx] = useState(false);



  // Agrupamento Mensal de Receitas vs Despesas para o Gráfico de Barras
  const monthlyChartData = useMemo(() => {
    const monthsMap: { [key: string]: { month: string; Receitas: number; Despesas: number; rawDate: Date } } = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    revenueItems.forEach(item => {
      if (!item.date) return;
      const d = new Date(item.date + 'T12:00:00'); // Evita timezone offset do navegador
      if (isNaN(d.getTime())) return;

      const monthName = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const label = `${monthName}/${String(year).slice(-2)}`;

      if (!monthsMap[label]) {
        monthsMap[label] = {
          month: label,
          Receitas: 0,
          Despesas: 0,
          rawDate: new Date(d.getFullYear(), d.getMonth(), 1)
        };
      }

      const val = parseFloat(String(item.value)) || 0;
      if (item.type === 'in') {
        monthsMap[label].Receitas += val;
      } else {
        monthsMap[label].Despesas += val;
      }
    });

    return Object.values(monthsMap)
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
      .map(({ month, Receitas, Despesas }) => ({
        month,
        Receitas: parseFloat(Receitas.toFixed(2)),
        Despesas: parseFloat(Despesas.toFixed(2)),
        Saldo: parseFloat((Receitas - Despesas).toFixed(2))
      }));
  }, [revenueItems]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newTxValue);
    if (!newTxDesc.trim() || isNaN(val) || val <= 0) {
      toast.error('Informe uma descrição válida e um valor maior que zero.');
      return;
    }

    setIsAddingTx(true);
    const newId = `tx-${Date.now()}`;
    const newTx = {
      id: newId,
      desc: newTxDesc.trim(),
      value: val,
      date: newTxDate,
      type: newTxType
    };

    try {
      setRevenueItems(prev => [newTx, ...prev]);
      toast.success('Transação adicionada com sucesso!');
      setNewTxDesc('');
      setNewTxValue('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar transação.');
    } finally {
      setIsAddingTx(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      setRevenueItems(prev => prev.filter(item => item.id !== id));
      toast.success('Lançamento removido com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Falha ao deletar lançamento.');
    }
  };

  // Handlers para o Estoque do Instalador
  const handleSaveStockItem = async (itemData: {
    id?: number;
    name: string;
    category?: string;
    quantity: number;
    unit?: string;
    minQuantity?: number;
    unitCost?: number;
  }) => {
    if (!user) return;
    try {
      const saved = await saveStockItemAction({
        ...itemData,
        userUid: user.uid,
      });
      if (saved) {
        setStockItems((prev) => {
          const idx = prev.findIndex((i) => i.id === saved.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = saved;
            return updated;
          }
          return [saved, ...prev];
        });
        toast.success('Item de estoque salvo no Supabase!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar item no estoque.');
    }
  };

  const handleUpdateStockQuantity = async (id: number, newQty: number) => {
    if (!user) return;
    try {
      const updated = await updateStockQuantityAction(id, newQty, user.uid);
      if (updated) {
        setStockItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
        toast.success('Quantidade atualizada!');
      }
    } catch (err) {
      toast.error('Erro ao atualizar quantidade no estoque.');
    }
  };

  const handleDeleteStockItem = async (id: number) => {
    if (!user) return;
    try {
      const ok = await deleteStockItemAction(id, user.uid);
      if (ok) {
        setStockItems((prev) => prev.filter((item) => item.id !== id));
        toast.success('Item removido do estoque!');
      }
    } catch (err) {
      toast.error('Erro ao remover item do estoque.');
    }
  };

  // Handlers para Orçamentos e Preços
  const handleSaveQuote = async (quoteData: {
    id?: number;
    clientName: string;
    clientPhone?: string;
    equipment?: string;
    description?: string;
    totalAmount: number;
    status?: string;
    validityDays?: number;
    items?: any[];
    notes?: string;
  }) => {
    if (!user) return;
    try {
      const saved = await saveQuoteAction({
        ...quoteData,
        userUid: user.uid,
      });
      if (saved) {
        setQuotes((prev) => {
          const idx = prev.findIndex((q) => q.id === saved.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = saved;
            return updated;
          }
          return [saved, ...prev];
        });
        toast.success('Orçamento/Preço salvo com sucesso!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar orçamento.');
    }
  };

  const handleDeleteQuote = async (id: number) => {
    if (!user) return;
    try {
      const ok = await deleteQuoteAction(id, user.uid);
      if (ok) {
        setQuotes((prev) => prev.filter((q) => q.id !== id));
        toast.success('Orçamento excluído!');
      }
    } catch (err) {
      toast.error('Erro ao excluir orçamento.');
    }
  };

  // Clients State (Inicia 100% limpo para novos usuários)
  const [clients, setClients] = useState<any[]>([]);

  // Superheating Calculation
  const shCalculations = useMemo(() => {
    // Tabela simplificada de Pressão (psig) vs Temp Saturação (°C)
    // Valores aproximados para R410A e R22 para fins didáticos.
    const ptTable: any = {
      'R410A': {
        suction: { 100: -8.8, 110: -6.7, 120: -4.7, 130: -2.8, 140: -1.0 },
        liquid: { 300: 48.7, 320: 51.5, 340: 54.2, 360: 56.8, 380: 59.3 }
      },
      'R22': {
        suction: { 50: -5.4, 60: -1.6, 70: 1.8, 80: 4.8, 90: 7.5 },
        liquid: { 200: 33.3, 220: 37.0, 240: 40.4, 260: 43.6, 280: 46.5 }
      }
    };

    const pSuction = parseFloat(suctionPressure) || 0;
    const tSuction = parseFloat(suctionTemp) || 0;
    const pLiquid = parseFloat(liquidPressure) || 0;
    const tLiquid = parseFloat(liquidTemp) || 0;

    // Função de busca simples ou interpolação linear básica
    const getSatTemp = (gas: string, type: 'suction' | 'liquid', pressure: number) => {
      const data = ptTable[gas]?.[type] || {};
      const pressures = Object.keys(data).map(Number).sort((a, b) => a - b);
      
      if (pressure <= pressures[0]) return data[pressures[0]];
      if (pressure >= pressures[pressures.length - 1]) return data[pressures[pressures.length - 1]];

      for (let i = 0; i < pressures.length - 1; i++) {
        if (pressure >= pressures[i] && pressure <= pressures[i+1]) {
          const p1 = pressures[i]; const p2 = pressures[i+1];
          const t1 = data[p1]; const t2 = data[p2];
          return t1 + (t2 - t1) * (pressure - p1) / (p2 - p1);
        }
      }
      return 0;
    };

    const evapSatTemp = getSatTemp(selectedGas, 'suction', pSuction);
    const condSatTemp = getSatTemp(selectedGas, 'liquid', pLiquid);

    const superheat = tSuction - evapSatTemp;
    const subcooling = condSatTemp - tLiquid;

    return {
      evapSatTemp: evapSatTemp.toFixed(1),
      condSatTemp: condSatTemp.toFixed(1),
      superheat: superheat.toFixed(1),
      subcooling: subcooling.toFixed(1),
      shStatus: superheat >= 4 && superheat <= 8 ? 'Ideal (4°C a 8°C)' : superheat < 4 ? 'Baixo' : 'Alto',
      scStatus: subcooling >= 5 && subcooling <= 10 ? 'Ideal (5°C a 10°C)' : subcooling < 5 ? 'Baixo' : 'Alto'
    };
  }, [suctionPressure, suctionTemp, liquidPressure, liquidTemp, selectedGas]);

  // Thermal Load Calculation
  const calculatedBtu = useMemo(() => {
    const area = parseFloat(areaM2) || 0;
    const people = parseFloat(peopleCount) || 1;
    const watts = parseFloat(electronicWatts) || 0;
    
    // Fatores padrão residencial (Normas técnicas simplificadas):
    // 600 BTU/m2 (base), +200 BTU/m2 se exposição solar vespertina.
    // 600 BTU/pessoa (carga sensível + latente).
    // 3.41 BTU/Watt para equipamentos elétricos.
    const baseLoad = area * 600;
    const sunLoad = sunExposure === 'afternoon' ? (area * 200) : 0;
    const loadPeople = people * 600;
    const loadElectronics = watts * 3.41;
    
    const total = baseLoad + sunLoad + loadPeople + loadElectronics;
    
    // Arredondamento para potências comerciais de mercado (mínimo 9000 BTUs)
    const commercialSizes = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];
    const btu = commercialSizes.find(size => size >= total) || commercialSizes[commercialSizes.length - 1];
    
    return btu;
  }, [areaM2, peopleCount, sunExposure, electronicWatts]);

  const handleDiagnose = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = errorCodeInput.trim();
    if (!cleanCode) {
      toast.error('Informe o código de erro exibido na máquina');
      return;
    }

    setIsDiagnosing(true);
    setDiagnosisResult(null);

    try {
      const res = await diagnoseErrorCode(errorBrand, cleanCode);
      setDiagnosisResult(res);
      toast.success('Diagnóstico técnico gerado com IA!');

      // Salva o log de diagnóstico no banco de dados relacional (PostgreSQL)
      if (user) {
        saveDiagnosisAction({
          userUid: user.uid,
          brand: errorBrand,
          code: cleanCode.toUpperCase(),
          equipmentType: undefined,
          result: res,
        })
          .then((saved) => {
            if (saved) {
              setDiagnosisHistory((prev) => [
                {
                  id: saved.id,
                  brand: errorBrand,
                  code: cleanCode.toUpperCase(),
                  result: res,
                  createdAt: saved.createdAt,
                },
                ...prev,
              ]);
            }
          })
          .catch((writeErr) => {
            console.warn('Erro ao salvar histórico de diagnósticos no banco:', writeErr);
          });
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao consultar diagnóstico.');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (err) {
        toast.error('É necessário conceder permissão de acesso à câmera para ler a placa do equipamento ou anexar a foto na OS.');
        return false;
      }
    }
    return true;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      toast.error('Informe o e-mail e a senha.');
      return;
    }
    setAuthSubmitting(true);
    try {
      const { error } = await signInWithEmail(emailInput.trim(), passwordInput);
      if (error) {
        toast.error(error.message || 'E-mail ou senha incorretos.');
      } else {
        toast.success('Login efetuado com sucesso!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao realizar login.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      toast.error('Por favor, informe seu e-mail cadastrado.');
      return;
    }
    setAuthSubmitting(true);
    try {
      const { error } = await resetPasswordForEmail(emailInput.trim());
      if (error) {
        toast.error(error.message || 'Erro ao enviar e-mail de redefinição de senha.');
      } else {
        toast.success('E-mail de redefinição de senha enviado com sucesso! Verifique sua caixa de entrada e spam.');
        setAuthMode('login');
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao solicitar redefinição de senha.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      toast.error('Por favor, informe seu Nome Completo.');
      return;
    }
    if (!emailInput.trim()) {
      toast.error('Por favor, informe seu E-mail.');
      return;
    }
    if (!passwordInput || passwordInput.length < 6) {
      toast.error('A senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (!termsAccepted) {
      toast.error('É necessário aceitar os Termos e a Política de Privacidade.');
      return;
    }

    setAuthSubmitting(true);
    try {
      const { error } = await signUpWithEmail(emailInput.trim(), passwordInput, nameInput.trim());
      if (error) {
        toast.error(error.message || 'Falha ao criar conta.');
      } else {
        toast.success('Conta criada com sucesso! Seja bem-vindo ao Amigo Refrigerista Pro.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao realizar cadastro.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    const confirm = window.confirm(
      'Tem certeza que deseja cancelar a renovação do seu plano? Você continuará com os benefícios ativos até o fim do período já pago.'
    );

    if (confirm) {
      setIsCancellingSub(true);
      try {
        const res = await fetch('/api/subscription/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Sua assinatura foi cancelada e não haverá novas cobranças.');
        } else {
          toast.error(data.error || 'Falha ao cancelar assinatura.');
        }
      } catch (err: any) {
        toast.error('Erro de comunicação com o servidor de assinaturas.');
      } finally {
        setIsCancellingSub(false);
      }
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remClientName.trim() || !remClientPhone.trim() || !remEquipment.trim()) {
      toast.error('Preencha os campos obrigatórios: Cliente, Telefone e Equipamento.');
      return;
    }

    const orderId = `os-${Date.now()}`;
    const orderNumber = nextOrderNumber;
    const targetDueDate = calculateNextMaintenanceDate(remServiceDate, remMonths);
    const alertDate = calculateReminderAlertDate(targetDueDate, remDaysBefore);

    const newOS: ServiceOrder = {
      id: orderId,
      orderNumber: orderNumber,
      clientName: remClientName.trim(),
      clientPhone: remClientPhone.trim(),
      clientAddress: remClientAddress.trim(),
      equipment: remEquipment.trim(),
      serviceDate: remServiceDate,
      maintenanceIntervalMonths: remMonths,
      autoScheduleReminder: autoScheduleReminder,
      reminderDaysBefore: remDaysBefore,
      notes: remNotes.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      if (user) {
        await saveClientAction({
          userUid: user.uid,
          name: remClientName.trim(),
          phone: remClientPhone.trim(),
          email: remClientEmail.trim() || undefined,
          address: remClientAddress.trim(),
          notes: remNotes.trim(),
        });

        await saveInstallationAction({
          userUid: user.uid,
          clientName: remClientName.trim(),
          clientPhone: remClientPhone.trim(),
          equipment: remEquipment.trim(),
          type: 'instalacao',
          status: 'agendado',
          date: remServiceDate,
          address: remClientAddress.trim(),
          value: 0,
          notes: remNotes.trim(),
          warrantyMonths: 12,
          qrCode: orderNumber,
        });

        toast.success(`Ordem de Serviço #${orderNumber} criada com sucesso no PostgreSQL!`);
      } else {
        toast.success(`Ordem de Serviço #${orderNumber} criada localmente!`);
      }

      // Envio automático via SMTP se configurado e ativado
      if (typeof window !== 'undefined' && remClientEmail.trim()) {
        try {
          const savedSmtpStr = localStorage.getItem('amigo_smtp_config');
          if (savedSmtpStr) {
            const smtpCfg: SmtpConfig = JSON.parse(savedSmtpStr);
            if (smtpCfg.enabled && smtpCfg.sendOnOsCreated && smtpCfg.host && smtpCfg.user && smtpCfg.pass) {
              sendOrderEmailAction(smtpCfg, {
                orderNumber,
                clientName: remClientName.trim(),
                clientEmail: remClientEmail.trim(),
                equipment: remEquipment.trim(),
                type: 'Instalação / Manutenção',
                date: remServiceDate,
                notes: remNotes.trim(),
                companyName: profile?.empresa || profile?.name || 'Amigo Refrigerista PRO',
                companyPhone: profile?.telefone || remClientPhone.trim(),
              }).then((res) => {
                if (res.log && typeof window !== 'undefined') {
                  try {
                    const existingLogsStr = localStorage.getItem('amigo_smtp_email_logs');
                    const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
                    const updatedLogs = [res.log, ...existingLogs].slice(0, 20);
                    localStorage.setItem('amigo_smtp_email_logs', JSON.stringify(updatedLogs));
                  } catch (logErr) {
                    console.warn('Erro ao salvar log de e-mail:', logErr);
                  }
                }
                if (res.success) {
                  toast.success(`✉️ E-mail da OS #${orderNumber} enviado com sucesso ao cliente!`);
                } else {
                  toast.error(`Falha no envio do e-mail da OS: ${res.message}`);
                }
              }).catch(console.warn);
            }
          }
        } catch (e) {
          console.warn('Erro ao disparar e-mail automático SMTP:', e);
        }
      }

      setServiceOrders(prev => [newOS, ...prev]);
      setShowOSModal(false);

      // Limpa campos
      setRemClientName('');
      setRemClientPhone('');
      setRemClientEmail('');
      setRemClientAddress('');
      setRemEquipment('');
      setRemNotes('');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar Ordem de Serviço.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const hasCamPerm = await requestCameraPermission();
    if (!hasCamPerm) return;

    setOcrLoading(true);
    setOcrData(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await parseEquipmentPlate(base64);
          setOcrData(res);
          toast.success('Dados da placa extraídos com sucesso!');
        } catch (ocrErr: any) {
          toast.error(ocrErr.message || 'Não foi possível ler a placa.');
        } finally {
          setOcrLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error('Erro ao carregar foto.');
      setOcrLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070e1c] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-300 text-sm font-semibold">Iniciando Amigo Refrigerista Pro...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070e1c] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 py-8 relative transition-colors duration-200">
        <Toaster position="top-center" richColors theme={isDark ? 'dark' : 'light'} />
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle showLabel />
        </div>
        <div className="max-w-md w-full">
          <MobileInstallBanner />
        </div>
        <div className="max-w-md w-full bg-white dark:bg-slate-900/90 border border-sky-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white mx-auto shadow-[0_0_25px_rgba(14,165,233,0.4)]">
              <Snowflake size={36} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Amigo Refrigerista <span className="text-sky-400">PRO</span></h1>
              <p className="text-xs text-slate-400 mt-1">
                Plataforma profissional para técnicos de HVAC-R
              </p>
            </div>
          </div>

          {/* Abas do formulário */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setAuthMode('register')}
              className={`py-2 rounded-lg transition ${authMode === 'register' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Criar Conta
            </button>
            <button
              onClick={() => setAuthMode('login')}
              className={`py-2 rounded-lg transition ${authMode === 'login' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Já tenho Conta
            </button>
          </div>

          {/* Botão rápido e inteligente do Google */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                const targetEmail = savedGoogleEmail || emailInput.trim();
                const targetName = savedGoogleName || nameInput.trim();

                if (targetEmail) {
                  try {
                    setIsGoogleLoading(true);
                    const { data, error } = await signInWithGoogle(targetEmail, targetName);
                    if (error) {
                      toast.error(error.message || 'Falha na autenticação Google');
                    } else {
                      const loggedUid = data?.user?.id;
                      const dbUser = loggedUid ? await getUserProfileAction(loggedUid).catch(() => null) : null;
                      const finalName = dbUser?.name?.trim() || targetName || data?.user?.user_metadata?.full_name?.trim() || 'Técnico';
                      toast.success(`Bem-vindo de volta, ${finalName}!`);
                    }
                  } catch (err: any) {
                    toast.error(err.message || 'Falha ao entrar com Google');
                  } finally {
                    setIsGoogleLoading(false);
                  }
                } else {
                  setShowGoogleModal(true);
                }
              }}
              disabled={isGoogleLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.99] disabled:opacity-75 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2.5 shadow-lg shadow-white/10 cursor-pointer"
            >
              {isGoogleLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>Conectando com o Google...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span className="truncate">
                    {savedGoogleEmail 
                      ? `Entrar como ${savedGoogleName || savedGoogleEmail.split('@')[0]}` 
                      : (authMode === 'register' ? 'Criar Conta com 1 Clique (Google)' : 'Entrar com Google em 1 Clique')
                    }
                  </span>
                </>
              )}
            </button>

            {savedGoogleEmail && (
              <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
                <span className="truncate font-mono">{savedGoogleEmail}</span>
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(true)}
                  className="text-sky-400 hover:text-sky-300 transition underline underline-offset-2 ml-2 shrink-0 cursor-pointer font-medium"
                >
                  Trocar de conta Google
                </button>
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-widest font-mono">ou com e-mail</span>
          </div>

          {/* Form de Cadastro */}
          {authMode === 'register' && (
            <form onSubmit={handleEmailRegister} className="space-y-3.5 text-left text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nome Completo *</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Silva"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">E-mail Profissional *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Senha (Mínimo 6 caracteres) *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">WhatsApp / Telefone</label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">CPF / CNPJ (Opcional)</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={documentInput}
                    onChange={(e) => setDocumentInput(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-sky-500"
                />
                <label htmlFor="terms">
                  Li e concordo com os Termos de Uso e a{' '}
                  <Link href="/privacidade" target="_blank" className="text-sky-400 hover:underline">
                    Política de Privacidade & Segurança de Dados
                  </Link>.
                </label>
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {authSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Concluir Cadastro Gratuitamente</span>
                )}
              </button>
            </form>
          )}

          {/* Form de Login */}
          {authMode === 'login' && (
            <form onSubmit={handleEmailLogin} className="space-y-3.5 text-left text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">E-mail Cadastrado</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-semibold block">Senha</label>
                  <button
                    type="button"
                    onClick={() => setAuthMode('forgot-password')}
                    className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline transition font-semibold cursor-pointer"
                  >
                    Esqueci minha senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {authSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Entrar na Minha Conta</span>
                )}
              </button>
            </form>
          )}

          {/* Form de Esqueci Minha Senha */}
          {authMode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-3.5 text-left text-xs">
              <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-300 text-xs font-medium leading-relaxed">
                Informe o seu e-mail cadastrado. Enviaremos um link direto para redefinir sua senha com segurança.
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">E-mail Cadastrado</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="w-1/3 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {authSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Enviar E-mail de Recuperação</span>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="text-center pt-2">
            {/* O rodapé agora é global via componente Footer */}
          </div>
        </div>

        {/* Modal de Conexão com Conta Google Real para usuário não autenticado */}
        <GoogleConnectModal
          isOpen={showGoogleModal}
          onClose={() => setShowGoogleModal(false)}
          initialEmail={emailInput || savedGoogleEmail}
          initialName={nameInput || savedGoogleName}
          onConnect={async (email, name) => {
            setEmailInput(email);
            setNameInput(name);
            setSavedGoogleEmail(email);
            setSavedGoogleName(name);
            const { data, error } = await signInWithGoogle(email, name);
            if (error) {
              throw error;
            }

            // Verificação pós-login com Google: Checa campos obrigatórios (nome, email) no banco
            const loggedUid = data?.user?.id;
            const dbUser = loggedUid ? await getUserProfileAction(loggedUid).catch(() => null) : null;
            const finalName = dbUser?.name?.trim() || name.trim();
            const finalEmail = dbUser?.email?.trim() || email.trim();

            if (!finalName || !finalEmail || finalName === 'Técnico' || finalName === 'Usuário') {
              toast.error(
                'Atenção: Os campos obrigatórios do seu perfil (Nome e E-mail) estão vazios no banco de dados. Atualize seus dados!',
                { duration: 8000, id: 'google-modal-incomplete' }
              );
              setShowProfileUpdateModal(true);
            } else {
              toast.success(`Conta Google conectada com sucesso! Bem-vindo(a), ${finalName}!`);
            }
          }}
        />

        {/* Modal de Atualização de Campos Obrigatórios de Perfil */}
        <ProfileUpdateModal
          isOpen={showProfileUpdateModal}
          onClose={() => setShowProfileUpdateModal(false)}
          currentName={nameInput}
          currentEmail={emailInput}
          onSave={async (newName, newEmail) => {
            setNameInput(newName);
            setEmailInput(newEmail);
            const activeUser = user as any;
            if (activeUser?.uid) {
              await updateUserProfileAction({
                uid: activeUser.uid,
                email: newEmail,
                name: newName,
                photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=0284c7&color=fff&size=150&bold=true`
              });
              await updateProfileData({ name: newName, email: newEmail });
              await refreshProfile();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070e1c] text-slate-900 dark:text-white pb-28 pt-16 transition-colors duration-200">
      <Toaster position="top-center" richColors theme={isDark ? 'dark' : 'light'} />
      
      {/* Header com os botões de Suporte e Admin */}
      <Header 
        onOpenSettings={() => setActiveTab('settings')} 
        onOpenSupportModal={() => setShowSupportModal(true)}
      />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Banner de Instalação Mobile no topo da página inicial (standalone: false & iOS/Android) */}
        <MobileInstallBanner />

        {/* Alerta de Perfil Incompleto no Banco */}
        {isProfileIncomplete && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/10 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-white">Campos Obrigatórios Incompletos no Banco de Dados</p>
                <p className="text-[11px] text-amber-200/90 mt-0.5">
                  Os campos obrigatórios (Nome e E-mail) estão vazios no banco. Atualize para assinar Ordens de Serviço e laudos.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowProfileUpdateModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shrink-0 shadow-md"
            >
              Atualizar Perfil Agora
            </button>
          </div>
        )}

        {/* Banner de Boas-Vindas */}
        <PlanCarousel />

        {/* Botões de Navegação entre Abas */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveTab('dash')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${ activeTab === 'dash' ? 'bg-sky-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800' }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('estoque')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${ activeTab === 'estoque' ? 'bg-sky-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800' }`}
          >
            Estoque do Técnico
          </button>

          <button
            onClick={() => setActiveTab('precos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${ activeTab === 'precos' ? 'bg-sky-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800' }`}
          >
            Tabela de Preços / Orçamentos
          </button>
        </div>


        {/* 1. ABA: DASHBOARD */}
        {activeTab === 'dash' && (
          <div className="space-y-6">
            {/* Card de Destaque: Criar Novo Serviço (Botão de fácil identificação) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <Wrench size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      AGILIDADE DE CAMPO
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      Próxima: <strong className="text-emerald-400">#{nextOrderNumber}</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">Criar Novo Serviço (Nova OS)</h3>
                  <p className="text-xs text-slate-400">Gera número de OS sequencial automático, cadastra o cliente e agenda o lembrete de preventiva.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowOSModal(true)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.35)] cursor-pointer active:scale-95 shrink-0"
              >
                <Plus size={18} strokeWidth={3} />
                <span>Criar Novo Serviço Agora</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold">Clientes Ativos</span>
                  <Users size={16} className="text-sky-400" />
                </div>
                <div className="text-2xl font-bold text-white">{clients.length}</div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold">Máquinas PMOC</span>
                  <Wrench size={16} className="text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {clients.reduce((acc, c) => acc + (c.equipment?.length || 0), 0)}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold">Receitas do Mês</span>
                  <DollarSign size={16} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400">
                  R$ {revenueItems.filter(i => i.type === 'in').reduce((a, b) => a + b.value, 0).toFixed(0)}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold">Saldo Líquido</span>
                  <TrendingUp size={16} className="text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ {(revenueItems.filter(i => i.type === 'in').reduce((a, b) => a + b.value, 0) - revenueItems.filter(i => i.type === 'out').reduce((a, b) => a + b.value, 0)).toFixed(0)}
                </div>
              </div>
            </div>

            {/* Card de Faturamento Recorrente com Lembretes Pendentes */}
            <RecurringRevenueCard
              pendingClients={reminders.map(rem => ({
                id: rem.id!,
                name: rem.clientName,
                phone: rem.clientPhone,
                equipment: rem.equipment,
                monthsSinceService: rem.monthsInterval
              }))}
              estimatedPricePerService={200}
              onSendWhatsApp={(client) => {
                toast.success(`Iniciando conversa no WhatsApp com ${client.name}!`);
              }}
            />

            {/* Ações Rápidas de Campo */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-300">Ferramentas Rápidas de Campo</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setActiveTab('errors')}
                  className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl p-4 text-left transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Diagnóstico de Erros</h4>
                      <p className="text-[11px] text-slate-400">IA especialista em todas as marcas</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-500 group-hover:text-white transition" />
                </button>

                <button
                  onClick={() => setActiveTab('calc')}
                  className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl p-4 text-left transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                      <Thermometer size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Superaquecimento</h4>
                      <p className="text-[11px] text-slate-400">SH, Sub-resfriamento e PxT</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-500 group-hover:text-white transition" />
                </button>

                <button
                  onClick={() => setActiveTab('clients')}
                  className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl p-4 text-left transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                      <Users size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Clientes & PMOC</h4>
                      <p className="text-[11px] text-slate-400">Ordens de serviço e QR Code</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-500 group-hover:text-white transition" />
                </button>
              </div>
            </div>

            {/* Leitor OCR de Placa de Ar-Condicionado com IA */}
            <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                    <Camera size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Leitor OCR de Placa Técnica</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">IA GEMINI</span>
                    </h3>
                    <p className="text-xs text-slate-400">Tire foto da etiqueta do condensador/evaporador para extrair BTU, Gás, Corrente e Modelo</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-purple-500/30 hover:border-purple-500/50 rounded-2xl bg-purple-500/5 hover:bg-purple-500/10 cursor-pointer transition">
                  <Camera size={32} className="text-purple-400 mb-2" />
                  <span className="text-xs font-bold text-white">Tirar Foto ou Enviar Imagem da Placa</span>
                  <span className="text-[10px] text-slate-400 mt-1">Extração automática de marca, modelo, fluido e especificações</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              {ocrLoading && (
                <div className="p-4 rounded-xl bg-slate-950 flex items-center justify-center gap-3 text-purple-300 text-xs font-semibold">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span>Analisando placa técnica com Visão Computacional do Gemini...</span>
                </div>
              )}

              {ocrData && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-3">
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Dados Extraídos da Placa</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Marca</span>
                      <strong className="text-white text-sm">{ocrData.brand || 'N/D'}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Modelo</span>
                      <strong className="text-white text-sm">{ocrData.model || 'N/D'}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Capacidade</span>
                      <strong className="text-white text-sm">{ocrData.btuCapacity || 'N/D'}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Fluido Refrigerante</span>
                      <strong className="text-cyan-400 text-sm">{ocrData.refrigerant || 'N/D'}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Carga de Fluido</span>
                      <strong className="text-white text-sm">{ocrData.refrigerantWeight || 'N/D'}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Tensão / Fases</span>
                      <strong className="text-white text-sm">{ocrData.voltage || 'N/D'}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. ABA: ERROS HVAC */}
        {activeTab === 'errors' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                  <span>Diagnóstico Inteligente de Erros & Defeitos HVAC</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Pesquise por <strong>Código de Erro</strong> (ex: E1, CH05, U4, EC, F0) ou <strong>Descrição do Defeito</strong> (ex: não gela, congelando tubo, compressor esquenta e desliga, pingando água, desarmando disjuntor).
                </p>
              </div>

              <form onSubmit={handleDiagnose} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Marca do Fabricante</label>
                    <select
                      value={errorBrand}
                      onChange={(e) => setErrorBrand(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="Daikin">Daikin</option>
                      <option value="Midea">Midea / Springer</option>
                      <option value="Gree">Gree</option>
                      <option value="Carrier">Carrier</option>
                      <option value="LG">LG</option>
                      <option value="Samsung">Samsung</option>
                      <option value="Fujitsu">Fujitsu</option>
                      <option value="Elgin">Elgin</option>
                      <option value="TCL">TCL</option>
                      <option value="Komeco">Komeco</option>
                      <option value="Philco">Philco</option>
                      <option value="Consul">Consul</option>
                      <option value="York">York</option>
                      <option value="Hitachi">Hitachi</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Código de Erro OU Sintoma / Defeito</label>
                    <input
                      type="text"
                      value={errorCodeInput}
                      onChange={(e) => setErrorCodeInput(e.target.value)}
                      placeholder="Ex: E1, CH05, U4 ou digite 'não gela', 'congelando tubo'..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 font-sans"
                    />
                  </div>
                </div>

                {/* Atalhos de Defeitos e Sintomas Mais Frequentes */}
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">Defeitos frequentes:</span>
                    {[
                      { label: '❄️ Não Gela', query: 'não gela' },
                      { label: '🧊 Congelando Tubo Fino', query: 'congelando tubo fino' },
                      { label: '🧊 Congelando Sucção', query: 'congelando tubo grosso' },
                      { label: '⚡ Compressor Não Parte', query: 'compressor não liga' },
                      { label: '🔥 Compressor Esquenta & Desliga', query: 'compressor esquenta e desliga' },
                      { label: '💧 Pingando Água', query: 'pingando água' },
                      { label: '🔌 Desarmando Disjuntor', query: 'desarmando disjuntor' },
                      { label: '🌀 Ventilador Parado', query: 'ventilador parado' },
                      { label: '💥 Barulho Excessivo', query: 'barulho excessivo' },
                      { label: '📴 Placa Não Liga', query: 'placa não liga' },
                    ].map((symptom) => (
                      <button
                        key={symptom.query}
                        type="button"
                        onClick={async () => {
                          setErrorCodeInput(symptom.query);
                          setIsDiagnosing(true);
                          setDiagnosisResult(null);
                          try {
                            const res = await diagnoseErrorCode(errorBrand, symptom.query);
                            setDiagnosisResult(res);
                            toast.success(`Diagnóstico gerado para: ${symptom.label}`);
                          } catch (err: any) {
                            toast.error(err.message || 'Falha ao analisar defeito');
                          } finally {
                            setIsDiagnosing(false);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-sky-500/20 border border-slate-800 hover:border-sky-500/40 text-[11px] font-semibold text-slate-300 hover:text-sky-300 transition cursor-pointer"
                      >
                        {symptom.label}
                      </button>
                    ))}
                  </div>

                  {/* Atalhos rápidos dos códigos mais comuns da marca selecionada */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">Códigos {errorBrand}:</span>
                    {(
                      errorBrand === 'Daikin' ? ['U4', 'L5', 'E7', 'A5', 'C4', 'C9', 'U0', 'E1'] :
                      errorBrand === 'LG' ? ['CH05', 'CH10', 'CH21', 'CH01', 'CH02', 'CH32'] :
                      errorBrand === 'Midea' ? ['EC', 'E1', 'E3', 'P4', 'E7'] :
                      errorBrand === 'Gree' ? ['E6', 'F0', 'E1', 'H6'] :
                      errorBrand === 'Samsung' ? ['E101', 'E458', 'E464', 'E121'] :
                      errorBrand === 'Carrier' ? ['EC', 'E1', 'P4', 'E3'] :
                      errorBrand === 'Fujitsu' ? ['E:01', 'E:11'] :
                      errorBrand === 'Elgin' ? ['E1', 'E6', 'EC'] :
                      errorBrand === 'TCL' ? ['E1', 'E6', 'EC'] :
                      errorBrand === 'Hitachi' ? ['01', '03'] :
                      ['E1', 'E6', 'EC', 'F1']
                    ).map((quickCode) => (
                      <button
                        key={quickCode}
                        type="button"
                        onClick={async () => {
                          setErrorCodeInput(quickCode);
                          setIsDiagnosing(true);
                          setDiagnosisResult(null);
                          try {
                            const res = await diagnoseErrorCode(errorBrand, quickCode);
                            setDiagnosisResult(res);
                            toast.success(`Diagnóstico oficial para ${errorBrand} - ${quickCode}`);
                          } catch (err: any) {
                            toast.error(err.message || 'Falha ao consultar código');
                          } finally {
                            setIsDiagnosing(false);
                          }
                        }}
                        className="px-2 py-0.5 rounded-md bg-slate-950 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/40 text-[11px] font-mono font-bold text-slate-300 hover:text-rose-300 transition cursor-pointer"
                      >
                        {quickCode}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isDiagnosing}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.3)] cursor-pointer disabled:opacity-50"
                >
                  {isDiagnosing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Diagnosticar com IA Especialista</span>
                </button>
              </form>

              {/* HISTÓRICO DE PESQUISAS */}
              {user && diagnosisHistory.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-400" />
                    <span>Histórico de Diagnósticos Recentes</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {diagnosisHistory.slice(0, 8).map((log: any) => (
                      <button
                        key={log.id}
                        type="button"
                        onClick={() => {
                          setErrorBrand(log.brand);
                          setErrorCodeInput(log.code);
                          setDiagnosisResult(log.result);
                          toast.success('Diagnóstico recuperado do histórico!');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="font-bold text-rose-400">{log.brand}</span>
                        <span className="text-slate-400">|</span>
                        <span className="font-extrabold">{log.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {diagnosisResult && (
                <div className="p-6 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-mono text-rose-400 font-bold">
                        {diagnosisResult.brand} - {diagnosisResult.code}
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">{diagnosisResult.title}</h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase">
                      Gravidade: {diagnosisResult.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{diagnosisResult.description}</p>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-200">Causas Prováveis:</h4>
                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                      {diagnosisResult.probableCauses?.map((c: string, idx: number) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-200">Procedimento de Resolução Passo a Passo:</h4>
                    <div className="space-y-1.5">
                      {diagnosisResult.stepByStepSolution?.map((step: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900 p-2 rounded-xl">
                          <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. ABA: CÁLCULO DE SUPERAQUECIMENTO, SUB-RESFRIAMENTO & CARGA TÉRMICA */}
        {activeTab === 'calc' && (
          <div className="space-y-6">
            <div className="flex flex-wrap sm:flex-nowrap gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setCalcSubTab('sh_sub')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  calcSubTab === 'sh_sub' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Superaquecimento & Sub-resfriamento
              </button>
              <button
                type="button"
                onClick={() => setCalcSubTab('thermal')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  calcSubTab === 'thermal' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cálculo de BTU/h
              </button>
              <button
                type="button"
                onClick={() => setCalcSubTab('pt_table')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  calcSubTab === 'pt_table' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tabela PxT
              </button>
              <button
                type="button"
                onClick={() => setCalcSubTab('pt_table')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  calcSubTab === 'pt_table' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tabela PxT (Pressão x Temp)
              </button>
            </div>

            {calcSubTab === 'sh_sub' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-sky-400" />
                    <span>Cálculo de Superaquecimento (SH) e Sub-resfriamento (SC)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Insira as pressões manométricas (PSIG) e as temperaturas de bulbo (°C) medidas com termopar.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Seção Superaquecimento */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/20 space-y-3">
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">Superaquecimento (Linha de Sucção)</h4>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Fluido Refrigerante</label>
                      <select
                        value={selectedGas}
                        onChange={(e) => setSelectedGas(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="R410A">R410A</option>
                        <option value="R32">R32</option>
                        <option value="R22">R22</option>
                        <option value="R134a">R134a</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Pressão de Sucção (PSIG)</label>
                      <input
                        type="number"
                        value={suctionPressure}
                        onChange={(e) => setSuctionPressure(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Temperatura de Sucção Tubo (°C)</label>
                      <input
                        type="number"
                        value={suctionTemp}
                        onChange={(e) => setSuctionTemp(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-center">
                      <span className="text-[10px] text-slate-400 uppercase block">Superaquecimento Total</span>
                      <strong className="text-2xl font-black text-sky-300">{shCalculations.superheat} °C</strong>
                      <p className="text-[11px] text-sky-400 mt-0.5">{shCalculations.shStatus}</p>
                    </div>
                  </div>

                  {/* Seção Sub-resfriamento */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/20 space-y-3">
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Sub-resfriamento (Linha de Líquido)</h4>
                    
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Pressão de Alta / Descarga (PSIG)</label>
                      <input
                        type="number"
                        value={liquidPressure}
                        onChange={(e) => setLiquidPressure(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Temperatura Linha de Líquido Tubo (°C)</label>
                      <input
                        type="number"
                        value={liquidTemp}
                        onChange={(e) => setLiquidTemp(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-center mt-6">
                      <span className="text-[10px] text-slate-400 uppercase block">Sub-resfriamento Total</span>
                      <strong className="text-2xl font-black text-cyan-300">{shCalculations.subcooling} °C</strong>
                      <p className="text-[11px] text-cyan-400 mt-0.5">{shCalculations.scStatus}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {calcSubTab === 'thermal' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-amber-400" />
                    <span>Dimensionamento de Carga Térmica (BTU/h)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Cálculo de capacidade ideal para climatização residencial e comercial.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Área do Ambiente (m²)</label>
                    <input
                      type="number"
                      value={areaM2}
                      onChange={(e) => setAreaM2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Número de Pessoas</label>
                    <input
                      type="number"
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Incidência Solar</label>
                    <select
                      value={sunExposure}
                      onChange={(e: any) => setSunExposure(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                    >
                      <option value="morning">Sol da Manhã (600 BTU/m²)</option>
                      <option value="afternoon">Sol da Tarde / Intenso (800 BTU/m²)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Eletrônicos & Equipamentos (Watts)</label>
                    <input
                      type="number"
                      value={electronicWatts}
                      onChange={(e) => setElectronicWatts(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 text-center space-y-1 shadow-lg">
                  <span className="text-xs font-bold text-slate-400 uppercase">Capacidade Recomendada</span>
                  <div className="text-3xl font-black text-amber-400">{calculatedBtu.toLocaleString('pt-BR')} BTU/h</div>
                  <p className="text-xs text-slate-400">
                    Sugerido: Modelo Split Inverter de {calculatedBtu >= 18000 ? `${(calculatedBtu/1000).toFixed(0)}k` : calculatedBtu >= 12000 ? '12.000 BTU/h' : '9.000 BTU/h'}
                  </p>
                </div>
              </div>
            )}

            {calcSubTab === 'pt_table' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Gauge className="w-5 h-5 text-sky-400" />
                      <span>Tabela de Saturação Pressão x Temperatura (PxT)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Consulte a temperatura de evaporação e condensação para diagnosticar carga de gás.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold">Gás:</span>
                    <select
                      value={selectedGas}
                      onChange={(e) => setSelectedGas(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-sky-300 font-bold focus:outline-none focus:border-sky-500"
                    >
                      <option value="R410A">R-410A</option>
                      <option value="R32">R-32</option>
                      <option value="R22">R-22</option>
                      <option value="R134a">R-134a</option>
                    </select>
                  </div>
                </div>

                {/* Tabela de Referência Rápida */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-3">Pressão (PSIG)</th>
                        <th className="p-3">Pressão (Bar)</th>
                        <th className="p-3">Temp. Saturação (°C)</th>
                        <th className="p-3">Aplicação Típica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {(() => {
                        const ptData: Record<string, Array<{ psig: number; bar: number; temp: string; note: string }>> = {
                          R410A: [
                            { psig: 102, bar: 7.0, temp: '-1.0 °C', note: 'Evaporação Baixa (Risco de Gelo)' },
                            { psig: 118, bar: 8.1, temp: '3.3 °C', note: 'Evaporação Ideal Ar Condicionado' },
                            { psig: 130, bar: 9.0, temp: '6.7 °C', note: 'Evaporação Alta / Carga Térmica Alta' },
                            { psig: 145, bar: 10.0, temp: '10.5 °C', note: 'Retorno Quente / Sobrecarga' },
                            { psig: 335, bar: 23.1, temp: '40.0 °C', note: 'Condensação Típica (Ambiente 30°C)' },
                            { psig: 390, bar: 26.9, temp: '48.0 °C', note: 'Condensação Alta / Condensador Sujo' },
                          ],
                          R32: [
                            { psig: 105, bar: 7.2, temp: '-1.8 °C', note: 'Evaporação Baixa' },
                            { psig: 125, bar: 8.6, temp: '4.2 °C', note: 'Evaporação Ideal Ar Condicionado' },
                            { psig: 140, bar: 9.6, temp: '8.0 °C', note: 'Evaporação Alta' },
                            { psig: 340, bar: 23.4, temp: '41.0 °C', note: 'Condensação Normal (Ambiente 30°C)' },
                            { psig: 400, bar: 27.6, temp: '49.0 °C', note: 'Condensação Elevada' },
                          ],
                          R22: [
                            { psig: 58, bar: 4.0, temp: '0.8 °C', note: 'Evaporação Baixa (Gelo no Tubo)' },
                            { psig: 68, bar: 4.7, temp: '4.5 °C', note: 'Evaporação Ideal Ar Condicionado' },
                            { psig: 75, bar: 5.2, temp: '7.2 °C', note: 'Evaporação Alta' },
                            { psig: 225, bar: 15.5, temp: '43.0 °C', note: 'Condensação Típica' },
                            { psig: 260, bar: 17.9, temp: '50.0 °C', note: 'Condensação Alta' },
                          ],
                          R134a: [
                            { psig: 18, bar: 1.2, temp: '-5.0 °C', note: 'Congelador / Baixa' },
                            { psig: 28, bar: 1.9, temp: '2.0 °C', note: 'Refrigerador Comercial Médio' },
                            { psig: 35, bar: 2.4, temp: '6.5 °C', note: 'Climatizador Automotivo' },
                            { psig: 135, bar: 9.3, temp: '41.0 °C', note: 'Condensação Normal' },
                          ],
                        };

                        const rows = ptData[selectedGas] || ptData['R410A'];
                        return rows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition">
                            <td className="p-3 text-sky-400 font-bold">{r.psig} psig</td>
                            <td className="p-3 text-slate-300">{r.bar.toFixed(1)} bar</td>
                            <td className="p-3 text-white font-bold">{r.temp}</td>
                            <td className="p-3 text-slate-400 font-sans text-[11px]">{r.note}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. ABA: FINANCEIRO */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            
            {/* 4.1 Bento Cards de Resumo Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total de Receitas</span>
                <div className="text-3xl font-black text-emerald-400 font-mono tabular-nums">
                  R$ {revenueItems.filter(i => i.type === 'in').reduce((a, b) => a + (parseFloat(b.value) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-slate-500">Entrada total de serviços, instalações e PMOC</p>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total de Despesas</span>
                <div className="text-3xl font-black text-rose-400 font-mono tabular-nums">
                  R$ {revenueItems.filter(i => i.type === 'out').reduce((a, b) => a + (parseFloat(b.value) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-slate-500">Custo com insumos, peças de cobre, fluido e ajudantes</p>
              </div>

              {(() => {
                const totalIn = revenueItems.filter(i => i.type === 'in').reduce((a, b) => a + (parseFloat(b.value) || 0), 0);
                const totalOut = revenueItems.filter(i => i.type === 'out').reduce((a, b) => a + (parseFloat(b.value) || 0), 0);
                const balance = totalIn - totalOut;
                return (
                  <div className={`p-5 rounded-3xl bg-slate-900 border space-y-2 transition-colors ${balance >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Líquido</span>
                    <div className={`text-3xl font-black font-mono tabular-nums ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[10px] text-slate-500">Resultado do período (Receitas - Despesas)</p>
                  </div>
                );
              })()}
            </div>

            {/* 4.2 Gráfico de Barras Mensal (Visualização de Receitas vs Despesas) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Análise de Desempenho Mensal</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Visão gráfica comparativa de entradas e saídas mensais do fluxo de caixa</p>
              </div>

              {monthlyChartData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl p-6 text-center">
                  <p className="text-xs text-slate-500">Nenhum dado mensal disponível para gerar o gráfico.</p>
                </div>
              ) : !isMounted ? (
                <div className="h-72 w-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        stroke="#64748b" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `R$ ${v}`}
                      />
                      <Tooltip
                        cursor={{ fill: '#334155', opacity: 0.15 }}
                        contentStyle={{
                          backgroundColor: '#020617',
                          border: '1px solid #334155',
                          borderRadius: '16px',
                          fontSize: '11px',
                          color: '#fff'
                        }}
                        formatter={(value: any, name: any) => [
                          `R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                          name
                        ]}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                      />
                      <Bar dataKey="Receitas" fill="#34d399" radius={[4, 4, 0, 0]} barSize={24} />
                      <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 4.3 Formulário de Cadastro de Lançamentos */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Novo Lançamento</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Registre entradas de serviços concluídos ou compras de consumíveis</p>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Descrição */}
                  <div className="md:col-span-5 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Descrição</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Instalação Split Daikin - Ap 15"
                      value={newTxDesc}
                      onChange={(e) => setNewTxDesc(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition"
                    />
                  </div>

                  {/* Valor */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Valor (R$)</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={newTxValue}
                      onChange={(e) => setNewTxValue(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition font-mono"
                    />
                  </div>

                  {/* Data */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Data do Serviço</label>
                    <input
                      type="date"
                      required
                      value={newTxDate}
                      onChange={(e) => setNewTxDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition"
                    />
                  </div>
                </div>

                {/* Tipo de Transação (Segmented Control para evitar pills estáticos) */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                  <div className="space-y-1.5 w-full sm:w-auto">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Classificação</span>
                    <div className="flex p-0.5 bg-slate-950 rounded-xl border border-slate-800 w-full sm:w-48">
                      <button
                        type="button"
                        onClick={() => setNewTxType('in')}
                        className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition ${newTxType === 'in' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                      >
                        Receita (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewTxType('out')}
                        className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition ${newTxType === 'out' ? 'bg-rose-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                      >
                        Despesa (-)
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingTx}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {isAddingTx ? 'Adicionando...' : 'Confirmar Lançamento'}
                  </button>
                </div>
              </form>
            </div>

            {/* 4.4 Sincronização em Tempo Real de Histórico de Lançamentos */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Histórico Geral de Lançamentos</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Sincronizado em tempo real com seu banco de dados na nuvem</p>
              </div>

              <div className="divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto pr-1 space-y-1">
                {revenueItems.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">Nenhum lançamento cadastrado no sistema.</p>
                ) : (
                  revenueItems.map((item) => {
                    const formattedDate = item.date ? new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR') : '';
                    return (
                      <div key={item.id} className="py-3.5 flex items-center justify-between hover:bg-slate-950/25 px-2 rounded-2xl transition group">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white leading-tight">{item.desc}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span>{formattedDate}</span>
                            <span>·</span>
                            <span className={item.type === 'in' ? 'text-emerald-500/70' : 'text-rose-500/70'}>
                              {item.type === 'in' ? 'Receita' : 'Despesa'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-black font-mono tabular-nums ${item.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.type === 'in' ? '+' : '-'} R$ {parseFloat(String(item.value)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(item.id)}
                            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                            title="Remover lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* 5. ABA: CLIENTES & PMOC */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            {/* Card de Lembrete Automático de Preventiva */}
            <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <BellRing size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Lembretes de Manutenção Preventiva</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        WHATSAPP PRO
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Notificação automática após conclusão de OS (3 ou 6 meses)</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white border border-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                    title="Configurar modelo do texto do WhatsApp com variáveis dinâmicas"
                  >
                    <SlidersHorizontal size={15} />
                    <span>Personalizar Mensagem</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowOSModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer shrink-0"
                  >
                    <Plus size={16} />
                    <span>Novo Lembrete / OS</span>
                  </button>
                </div>
              </div>

              {/* Lista de Lembretes Agendados */}
              <div className="space-y-3 pt-2">
                {reminders.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Nenhum lembrete de preventiva agendado ainda.</p>
                ) : (
                  reminders.map((rem) => {
                    const nextDateStr = calculateNextMaintenanceDate(
                      typeof rem.serviceDate === 'string' ? rem.serviceDate : new Date(rem.serviceDate).toISOString().split('T')[0],
                      rem.monthsInterval
                    );
                    const formattedNextDate = new Date(nextDateStr + 'T12:00:00').toLocaleDateString('pt-BR');
                    
                    const daysBefore = rem.reminderDaysBefore ?? 0;
                    const alertDateStr = rem.alertDate || calculateReminderAlertDate(nextDateStr, daysBefore);
                    const formattedAlertDate = new Date(alertDateStr + 'T12:00:00').toLocaleDateString('pt-BR');

                    const now = new Date();
                    const isDueTodayOrPast = now >= new Date(nextDateStr + 'T00:00:00');
                    const isAlertTriggered = now >= new Date(alertDateStr + 'T00:00:00');
                    const waLink = generateWhatsAppReminderLink(
                      {
                        ...rem,
                        technicianName: profile?.name || user?.displayName || 'Técnico Especialista',
                        companyName: profile?.empresa || 'Amigo Refrigerista Pro',
                        reminderDaysBefore: daysBefore
                      },
                      waTemplate
                    );

                    return (
                      <div
                        key={rem.id}
                        className={`p-4 rounded-2xl border transition space-y-3 ${
                          isDueTodayOrPast 
                            ? 'bg-rose-950/25 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                            : isAlertTriggered
                              ? 'bg-amber-950/30 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                              : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {rem.orderNumber && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  #{rem.orderNumber}
                                </span>
                              )}
                              <h4 className="text-sm font-bold text-white">{rem.clientName}</h4>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                                {rem.monthsInterval} MESES
                              </span>
                              {daysBefore > 0 && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  {daysBefore}d ANTES
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{rem.equipment}</p>
                            {rem.clientAddress && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin size={11} className="text-slate-500" />
                                <span>{rem.clientAddress}</span>
                              </p>
                            )}
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Próxima Preventiva:</span>
                            <span className={`text-xs font-mono font-bold ${
                              isDueTodayOrPast 
                                ? 'text-rose-400 animate-pulse' 
                                : isAlertTriggered 
                                  ? 'text-amber-400 font-extrabold' 
                                  : 'text-sky-300'
                            }`}>
                              {formattedNextDate} {isDueTodayOrPast ? '🚨 (VENCIMENTO HOJE!)' : isAlertTriggered ? `⏰ (AVISO ANTECIPADO: ${daysBefore}d antes)` : ''}
                            </span>
                            {daysBefore > 0 && !isDueTodayOrPast && (
                              <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                                Disparo do aviso: {formattedAlertDate}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <span className="text-[11px] text-slate-500 font-mono">Tel: {rem.clientPhone}</span>
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              setReminders(prev => prev.map(r => r.id === rem.id ? { ...r, status: 'sent' } : r));
                              toast.success('Gerando conversa no WhatsApp com mensagem de lembrete pronta!');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-md cursor-pointer"
                          >
                            <MessageSquare size={16} />
                            <span>Enviar Mensagem no WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Histórico de Ordens de Serviço (OS) */}
            <div
              id="service-order-container"
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                    <FileText size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Histórico de Ordens de Serviço (OS)</h3>
                    <p className="text-xs text-slate-400">Serviços executados com numeração automática e clientes vinculados</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowOSModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus size={15} />
                  <span>Nova OS</span>
                </button>
              </div>

              <div className="space-y-3 pt-2">
                {serviceOrders.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-800 rounded-2xl text-center">
                    <p className="text-xs text-slate-500">Nenhuma ordem de serviço registrada.</p>
                  </div>
                ) : (
                  serviceOrders.map((os) => {
                    const formattedDate = new Date(os.serviceDate + 'T12:00:00').toLocaleDateString('pt-BR');

                    return (
                      <div key={os.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 hover:border-slate-700 transition">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                #{os.orderNumber || os.id}
                              </span>
                              <h4 className="text-sm font-bold text-white">{os.clientName}</h4>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                OS CONCLUÍDA
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{os.equipment}</p>
                            {os.clientAddress && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin size={11} className="text-slate-500" />
                                <span>{os.clientAddress}</span>
                              </p>
                            )}
                          </div>

                          <div className="text-left sm:text-right text-xs">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Data do Serviço:</span>
                            <span className="font-mono font-bold text-slate-300">{formattedDate}</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Phone size={12} className="text-slate-500" />
                            <span className="font-mono">{os.clientPhone}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                const orderSlug = encodeURIComponent(os.orderNumber || os.id);
                                const url = `${window.location.origin}/os/${orderSlug}`;
                                if (navigator.share) {
                                  try {
                                    await navigator.share({
                                      title: `Ordem de Serviço #${os.orderNumber || os.id}`,
                                      text: `Confira os detalhes da OS #${os.orderNumber || os.id} (${os.equipment}) para ${os.clientName}.`,
                                      url,
                                    });
                                    return;
                                  } catch (err) {
                                    if ((err as Error)?.name === 'AbortError') return;
                                  }
                                }
                                await navigator.clipboard.writeText(url);
                                toast.success(`Link da OS #${os.orderNumber || os.id} copiado!`);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition flex items-center gap-1.5 font-bold text-[11px] cursor-pointer"
                              title="Compartilhar Ordem de Serviço"
                            >
                              <Share2 size={13} />
                              <span>Compartilhar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const orderSlug = encodeURIComponent(os.orderNumber || os.id);
                                const url = `${window.location.origin}/os/${orderSlug}`;
                                navigator.clipboard.writeText(url);
                                toast.success('Link direto da OS copiado para a área de transferência!');
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                              title="Copiar Link Direto"
                            >
                              <Copy size={14} />
                            </button>
                            <Link
                              href={`/os/${encodeURIComponent(os.orderNumber || os.id)}`}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1 font-bold text-[11px]"
                              title="Abrir Visualização Detalhada da OS"
                            >
                              <ExternalLink size={12} />
                              <span>Ver OS</span>
                            </Link>
                            {os.autoScheduleReminder ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Lembrete Ativo ({os.maintenanceIntervalMonths}m • {os.reminderDaysBefore || 3}d antes)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                                Sem Lembrete Preventivo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-sky-400" />
                    <span>Gestão de Clientes & PMOC</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Histórico técnico, datas de manutenção preventiva e relatórios</p>
                </div>
              </div>

              <div className="space-y-3">
                {clients.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                    <Users className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-300">Nenhum cliente cadastrado ainda.</p>
                    <p className="text-[11px] text-slate-500">Cadastre clientes ou gere Ordens de Serviço para gerenciar manutenções e PMOC do zero.</p>
                  </div>
                ) : (
                  clients.map((c) => (
                  <div key={c.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{c.name}</h4>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={13} className="text-sky-400" />
                          <span>{c.address}</span>
                        </p>
                      </div>
                      <a href={`tel:${c.phone}`} className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition">
                        <Phone size={16} />
                      </a>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Equipamentos Vinculados:</span>
                      {c.equipment?.map((eq: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-200">{eq.brand} {eq.model}</span>
                            <span className="text-[10px] text-cyan-400 ml-2">({eq.capacity})</span>
                          </div>
                          <span className="text-[10px] text-slate-500">Última rev: {eq.lastMaintenance}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )))}
              </div>
            </div>
          </div>
        )}

        {/* 6. ABA: CONFIGURAÇÕES, E-MAIL SMTP & DADOS DA EMPRESA */}
        {activeTab === 'settings' && (
          <SettingsTab
            onOpenUpgradeModal={() => setShowUpgradeModal(true)}
          />
        )}

        {/* 7. ABA: SUPORTE ADMIN (CANAL EXCLUSIVO & CHAT) */}
        {activeTab === 'suporte-admin' && (
          <AdminSupportChatView onBack={() => setActiveTab('dash')} />
        )}
        {/* ABA DE ESTOQUE DO INSTALADOR */}
        {activeTab === 'estoque' && (
          <StockTab
            dbStockItems={stockItems}
            onSaveToDb={handleSaveStockItem}
            onUpdateQtyInDb={handleUpdateStockQuantity}
            onDeleteFromDb={handleDeleteStockItem}
          />
        )}

        {/* ABA DE TABELA DE PREÇOS / ORÇAMENTOS */}
        {activeTab === 'precos' && (
          <div className="space-y-6 bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-400" />
                  <span>Tabela de Preços & Orçamentos</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Consulte e crie orçamentos rápidos para enviar aos clientes</p>
              </div>
              <button
                onClick={() => {
                  const clientName = prompt('Nome do Cliente:');
                  const amount = prompt('Valor Total (R$):');
                  const equipment = prompt('Equipamento / Serviço:');
                  if (clientName && amount) {
                    handleSaveQuote({
                      clientName,
                      totalAmount: parseFloat(amount) || 0,
                      equipment: equipment || 'Instalação / Manutenção',
                      status: 'pendente',
                    });
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5"
              >
                <Plus size={14} />
                Novo Orçamento
              </button>
            </div>

            {quotes.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                <Tag className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">Nenhum orçamento ou preço cadastrado no Supabase ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {quotes.map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-white">{q.clientName}</p>
                      <p className="text-[10px] text-slate-500">{q.equipment || 'Serviço de Refrigeração'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-400">R$ {Number(q.totalAmount).toFixed(2)}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{q.status || 'Pendente'}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteQuote(q.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs font-bold p-2"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Navegação Inferior (BottomNav) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        isSupportOrAdmin={isSupportOrAdmin}
      />

      {/* Modal de Configurações e Gerenciamento de Assinatura */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                  <Crown size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Minha Conta & Assinatura</h3>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Card do Plano Atual */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Plano Atual:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${
                  profile?.subscription?.plan === 'pro_trial'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : profile?.isVip
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : profile?.subscription?.plan === 'free'
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {profile?.subscription?.plan === 'pro_trial' 
                    ? 'PRO TRIAL (LICENÇA)' 
                    : profile?.subscription?.plan === 'pro_paid'
                    ? 'PRO ASSINANTE'
                    : profile?.isVip
                    ? 'VIP VITALÍCIO'
                    : profile?.subscription?.plan?.toUpperCase() || 'GRATUITO'}
                </span>
              </div>

              {profile?.subscription?.licenseKeyUsed && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Licença Ativada:</span>
                  <span className="font-mono font-bold text-cyan-400">{profile.subscription.licenseKeyUsed}</span>
                </div>
              )}

              {profile?.subscription?.startDate && profile?.subscription?.endDate && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Vigência da Licença:</span>
                  <span className="font-mono text-slate-300">
                    {profile.subscription.startDate} até {profile.subscription.endDate}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Status da Conta:</span>
                <span className={`font-bold ${profile?.subscription?.status === 'cancelled' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {profile?.subscription?.status === 'cancelled' ? 'Cancelamento Agendado' : 'Ativo e Liberado'}
                </span>
              </div>
            </div>

            {/* Resgatar Licença / Upgrade */}
            <button
              type="button"
              onClick={() => {
                setShowSettingsModal(false);
                setShowUpgradeModal(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Gift size={16} />
              <span>Resgatar Licença Gratuita / Fazer Upgrade</span>
            </button>

            {/* Ação de Cancelamento de Assinatura */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white">Gerenciar Cobrança Recorrente</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ao cancelar, a renovação automática será desativada. Você continuará utilizando todos os recursos PRO até o fim do período já pago.
              </p>

              {profile?.subscription?.status === 'cancelled' ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                  Sua renovação já foi cancelada. Não haverá novas cobranças em seu cartão ou PIX.
                </div>
              ) : (
                <button
                  onClick={handleCancelSubscription}
                  disabled={isCancellingSub}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCancellingSub ? (
                    <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Cancelar Renovação da Assinatura</span>
                  )}
                </button>
              )}
            </div>

            {/* Sair da Conta */}
            <button
              onClick={async () => {
                await signOut();
                setShowSettingsModal(false);
                toast.success('Você saiu da sua conta.');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={16} />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Agendamento de Lembrete Automático de Preventiva */}
      {showOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <CalendarCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Criar Nova Ordem de Serviço (OS)</h3>
                  <p className="text-xs text-slate-400">Geração automática de número de OS e cadastro de cliente</p>
                </div>
              </div>
              <button
                onClick={() => setShowOSModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-4 text-xs text-left max-h-[75vh] overflow-y-auto pr-1">
              {/* Badge de Número Automático da OS */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-950 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Número da OS (Automático)</span>
                  <span className="text-sm font-mono font-black text-white">#{nextOrderNumber}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  SISTEMA PRO
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dona Maria Silveira"
                  value={remClientName}
                  onChange={(e) => setRemClientName(e.target.value)}
                  className="w-full px-3.5 py-3 text-base sm:text-xs min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">WhatsApp do Cliente (com DDD) *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: (11) 98765-4321 ou 5584999998888"
                  value={remClientPhone}
                  onChange={(e) => setRemClientPhone(e.target.value)}
                  className="w-full px-3.5 py-3 text-base sm:text-xs min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  E-mail do Cliente (Opcional - para envio automático de OS)
                </label>
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={remClientEmail}
                  onChange={(e) => setRemClientEmail(e.target.value)}
                  className="w-full px-3.5 py-3 text-base sm:text-xs min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Endereço do Cliente / Local</label>
                <input
                  type="text"
                  placeholder="Ex: Av. Brasil, 1500 - Apto 42, Jardins"
                  value={remClientAddress}
                  onChange={(e) => setRemClientAddress(e.target.value)}
                  className="w-full px-3.5 py-3 text-base sm:text-xs min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  💡 O cliente será cadastrado automaticamente com este endereço e equipamento.
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Equipamento Servido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Split Inverter LG 12.000 BTUs"
                  value={remEquipment}
                  onChange={(e) => setRemEquipment(e.target.value)}
                  className="w-full px-3.5 py-3 text-base sm:text-xs min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Data da Realização do Serviço *</label>
                <input
                  type="date"
                  required
                  value={remServiceDate}
                  onChange={(e) => setRemServiceDate(e.target.value)}
                  className="w-full px-3.5 py-3 text-base sm:text-xs min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Periodicidade da Manutenção Preventiva *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRemMonths(3)}
                    className={`py-2.5 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                      remMonths === 3 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-black">3 MESES</span>
                    <span className="text-[9px] text-slate-400">Comercial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRemMonths(6)}
                    className={`py-2.5 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                      remMonths === 6 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-black">6 MESES</span>
                    <span className="text-[9px] text-slate-400">Residencial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRemMonths(12)}
                    className={`py-2.5 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                      remMonths === 12 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-black">12 MESES</span>
                    <span className="text-[9px] text-slate-400">Anual PMOC</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <input
                    type="checkbox"
                    id="autoScheduleReminder"
                    checked={autoScheduleReminder}
                    onChange={(e) => setAutoScheduleReminder(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="autoScheduleReminder" className="font-bold cursor-pointer text-white">
                    Agendar Lembrete de Preventiva Automaticamente no WhatsApp
                  </label>
                </div>

                {/* Seletor de Antecedência do Lembrete */}
                {autoScheduleReminder && (
                  <div className="pt-2 border-t border-slate-900 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                        <Clock size={13} className="text-emerald-400" />
                        <span>Antecedência do Disparo do Lembrete</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {remDaysBefore === 0 ? 'No dia do vencimento' : `${remDaysBefore} dias antes`}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { days: 0, label: '0 dias', sub: 'no dia' },
                        { days: 3, label: '3 dias', sub: 'ideal' },
                        { days: 5, label: '5 dias', sub: 'antes' },
                        { days: 7, label: '7 dias', sub: '1 sem' },
                        { days: 15, label: '15 dias', sub: '2 sem' }
                      ].map((item) => (
                        <button
                          key={item.days}
                          type="button"
                          onClick={() => setRemDaysBefore(item.days)}
                          className={`py-2 px-1 rounded-xl text-center border text-[11px] transition cursor-pointer flex flex-col items-center justify-center ${
                            remDaysBefore === item.days
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          <span className="font-bold">{item.label}</span>
                          <span className="text-[9px] opacity-80">{item.sub}</span>
                        </button>
                      ))}
                    </div>

                    {/* Prévia da data calculada */}
                    {(() => {
                      const targetDate = calculateNextMaintenanceDate(remServiceDate, remMonths);
                      const alertDate = calculateReminderAlertDate(targetDate, remDaysBefore);
                      const formattedTarget = new Date(targetDate + 'T12:00:00').toLocaleDateString('pt-BR');
                      const formattedAlert = new Date(alertDate + 'T12:00:00').toLocaleDateString('pt-BR');

                      return (
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-[10px] space-y-1 font-mono">
                          <div className="flex items-center justify-between text-slate-300">
                            <span>🎯 Data de Vencimento:</span>
                            <strong className="text-white">{formattedTarget}</strong>
                          </div>
                          <div className="flex items-center justify-between text-emerald-400">
                            <span>🔔 Lembrete será ativado em:</span>
                            <strong>{formattedAlert} {remDaysBefore > 0 ? `(${remDaysBefore} dias antes)` : '(no dia)'}</strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Observações da OS (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Higienização profunda das serpentinas, teste de pressão e troca do capacitor."
                  value={remNotes}
                  onChange={(e) => setRemNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                <CalendarCheck size={16} />
                <span>Salvar e Gerar OS #{nextOrderNumber}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Botão de Ação Flutuante (FAB) para criar Novo Serviço de qualquer aba */}
      <button
        type="button"
        onClick={() => setShowOSModal(true)}
        className="fixed bottom-20 right-4 sm:bottom-24 sm:right-8 z-40 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-[0_10px_35px_rgba(16,185,129,0.45)] flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-emerald-300/40 group backdrop-blur-sm"
        title="Criar Nova Ordem de Serviço"
      >
        <div className="w-6 h-6 rounded-lg bg-slate-950/20 flex items-center justify-center group-hover:rotate-90 transition-transform shrink-0">
          <Plus size={16} strokeWidth={3} className="text-slate-950" />
        </div>
        <span className="font-black tracking-wide hidden sm:inline">Novo Serviço (OS)</span>
        <span className="font-black tracking-wide sm:hidden">Nova OS</span>
      </button>

      {/* Modal de Conexão com Conta Google Real */}
      <GoogleConnectModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        initialEmail={emailInput || savedGoogleEmail}
        initialName={nameInput || savedGoogleName}
        onConnect={async (email, name) => {
          setEmailInput(email);
          setNameInput(name);
          setSavedGoogleEmail(email);
          setSavedGoogleName(name);
          const { data, error } = await signInWithGoogle(email, name);
          if (error) {
            throw error;
          }

          // Verificação pós-login com Google: Checa campos obrigatórios (nome, email) no banco
          const loggedUid = data?.user?.id;
          const dbUser = loggedUid ? await getUserProfileAction(loggedUid).catch(() => null) : null;
          const finalName = dbUser?.name?.trim() || name.trim();
          const finalEmail = dbUser?.email?.trim() || email.trim();

          if (!finalName || !finalEmail || finalName === 'Técnico' || finalName === 'Usuário') {
            toast.error(
              'Atenção: Os campos obrigatórios do seu perfil (Nome e E-mail) estão vazios no banco de dados. Atualize seus dados!',
              { duration: 8000, id: 'google-modal-incomplete' }
            );
            setShowProfileUpdateModal(true);
          } else {
            toast.success(`Conta Google conectada com sucesso! Bem-vindo(a), ${finalName}!`);
          }
        }}
      />

      {/* Modal de Atualização de Campos Obrigatórios de Perfil */}
      <ProfileUpdateModal
        isOpen={showProfileUpdateModal}
        onClose={() => setShowProfileUpdateModal(false)}
        currentName={profile?.name || user?.displayName || nameInput}
        currentEmail={profile?.email || user?.email || emailInput}
        onSave={async (newName, newEmail) => {
          if (user?.uid) {
            await updateUserProfileAction({
              uid: user.uid,
              email: newEmail,
              name: newName,
              photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=0284c7&color=fff&size=150&bold=true`
            });
            await updateProfileData({ name: newName, email: newEmail });
            await refreshProfile();
          }
        }}
      />

      {/* Modal de Personalização do Modelo de WhatsApp */}
      <WhatsAppTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        currentTemplate={waTemplate}
        onSaveTemplate={handleSaveWaTemplate}
        technicianName={profile?.name || user?.displayName}
      />

      {/* Componente de Prompt de Instalação PWA */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Liberar Recursos Pró ou Resgatar Licença"
        description="Tenha diagnósticos ilimitados com IA, Ordens de Serviço completas com QR Code PMOC e lembretes inteligentes de manutenção preventiva."
      />

      {/* Modal de Suporte ao Cliente */}
      <ClientSupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />

      <InstallPrompt />
      <Footer />
    </div>
  );
}
