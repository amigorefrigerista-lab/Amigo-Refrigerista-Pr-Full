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
  Activity,
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
  Minus,
  Check,
  X,
  XCircle
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
import ServiceOrderPdfExporter, {
  ServiceOrderData,
  ServiceOrderPdfExporterRef,
} from '@/components/ServiceOrderPdfExporter';
import { CustomerSignatureModal } from '@/components/CustomerSignatureModal';
import { ServiceOrderQrScannerModal } from '@/components/ServiceOrderQrScannerModal';
import { ServiceOrderQrGeneratorModal } from '@/components/ServiceOrderQrGeneratorModal';
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
  updateInstallationDetailsAction,
  saveCustomerSignatureAction,
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
            customerNotes: d.customerNotes || '',
            customerSignature: d.customerSignature || null,
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
  const [defaultOrderStatus, setDefaultOrderStatus] = useState<'Pending' | 'In Progress' | 'Completed'>('Completed');
  const [editingOsId, setEditingOsId] = useState<string | null>(null);
  const [editOsClientName, setEditOsClientName] = useState('');
  const [editOsAddress, setEditOsAddress] = useState('');
  const [editOsEquipment, setEditOsEquipment] = useState('');
  const [signingOsId, setSigningOsId] = useState<string | null>(null);
  const [defaultCustomerSignature, setDefaultCustomerSignature] = useState<string | null>(null);
  const [defaultCustomerNotes, setDefaultCustomerNotes] = useState<string>('');
  const [headerSaving, setHeaderSaving] = useState(false);
  const [headerSavedSuccess, setHeaderSavedSuccess] = useState(false);
  const [osStatusTransitioning, setOsStatusTransitioning] = useState(false);
  const [savingOsCardId, setSavingOsCardId] = useState<string | null>(null);
  const [savedOsCardId, setSavedOsCardId] = useState<string | null>(null);
  const [isOsQrScannerOpen, setIsOsQrScannerOpen] = useState(false);
  const [qrGeneratorOrder, setQrGeneratorOrder] = useState<{
    orderNumber: string;
    clientName: string;
    clientPhone?: string | null;
    equipment: string;
    status: string;
  } | null>(null);
  const osPdfExporterRef = useRef<ServiceOrderPdfExporterRef>(null);

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
            {(() => {
              const currentOs = serviceOrders[0];
              const activeContainerStatus = currentOs?.status || defaultOrderStatus;
              const containerBorderClass =
                activeContainerStatus === 'Pending'
                  ? 'border-amber-500/60 shadow-[0_20px_50px_rgba(245,158,11,0.16)]'
                  : activeContainerStatus === 'In Progress'
                  ? 'border-blue-500/60 shadow-[0_20px_50px_rgba(59,130,246,0.16)]'
                  : 'border-emerald-500/60 shadow-[0_20px_50px_rgba(16,185,129,0.16)]';
              const containerPulseRingClass =
                activeContainerStatus === 'Pending'
                  ? 'ring-2 ring-amber-400/50 scale-[1.003]'
                  : activeContainerStatus === 'In Progress'
                  ? 'ring-2 ring-blue-400/50 scale-[1.003]'
                  : 'ring-2 ring-emerald-400/50 scale-[1.003]';
              const containerHeaderBg =
                activeContainerStatus === 'Pending'
                  ? 'bg-amber-950/90 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                  : activeContainerStatus === 'In Progress'
                  ? 'bg-sky-950/90 border-sky-500/50 shadow-[0_0_30px_rgba(14,165,233,0.2)]'
                  : 'bg-emerald-950/90 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]';

              const currentOsPdfData: ServiceOrderData = {
                orderNumber: currentOs?.orderNumber || currentOs?.id || nextOrderNumber,
                clientName: currentOs?.clientName || 'Cliente Amigo',
                clientPhone: currentOs?.clientPhone || null,
                address: currentOs?.clientAddress || null,
                equipment: currentOs?.equipment || 'Equipamento de Ar-Condicionado',
                brand: 'Inverter / Climatização',
                btus: '12.000 BTU/h',
                serviceType: 'instalacao',
                status: activeContainerStatus,
                dateStr: currentOs?.serviceDate
                  ? new Date(currentOs.serviceDate + 'T12:00:00').toLocaleDateString('pt-BR')
                  : new Date().toLocaleDateString('pt-BR'),
                warrantyMonths: 12,
                value: null,
                notes:
                  currentOs?.notes ||
                  'Higienização completa da serpentina, turbina e bandeja de condensado; verificação de pressão do fluido e aperto de bornes elétricos.',
                customerNotes:
                  currentOs?.customerNotes ?? defaultCustomerNotes ?? '',
                checklistItems: [
                  'Higienização bactericida e fungicida com desincrustante biodegradável',
                  'Teste de superaquecimento e vazamentos na linha frigorígena',
                  'Checagem de consumo elétrico e estanqueidade do dreno',
                ],
                customerSignature:
                  currentOs?.customerSignature || defaultCustomerSignature || null,
              };

              return (
                <div
                  id="service-order-container"
                  data-status={activeContainerStatus}
                  data-status-transitioning={osStatusTransitioning ? 'true' : 'false'}
                  className={`relative bg-slate-900 border-2 rounded-3xl p-6 space-y-4 transition-colors transition-all duration-700 ease-in-out ${containerBorderClass} ${
                    osStatusTransitioning ? containerPulseRingClass : 'ring-0 ring-transparent scale-100'
                  }`}
                >
                  {/* Interactive Step-Progress Bar no topo de #service-order-container */}
                  <div
                    id="service-order-step-progress"
                    role="group"
                    aria-label="Service Order Status Step Progress"
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/85 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
                        Step Progress · Status da OS
                      </span>
                      <span className="text-[10px] font-mono font-bold text-sky-400">
                        Clique em uma etapa para atualizar o status
                      </span>
                    </div>

                    <div className="relative">
                      <div className="hidden sm:block absolute top-1/2 left-10 right-10 -translate-y-1/2 h-1 rounded-full bg-slate-800 overflow-hidden pointer-events-none">
                        <div
                          className={`h-full transition-all duration-700 ease-in-out ${
                            activeContainerStatus === 'Pending'
                              ? 'w-0 bg-amber-400'
                              : activeContainerStatus === 'In Progress'
                              ? 'w-1/2 bg-blue-400'
                              : 'w-full bg-emerald-400'
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:gap-3 relative z-10">
                        {(
                          [
                            {
                              key: 'Pending' as const,
                              step: 1,
                              label: 'Pending',
                              sub: 'Pendente',
                              Icon: Clock,
                              activeClass:
                                'bg-amber-950/95 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.28)] scale-[1.01]',
                              passedClass:
                                'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:border-amber-400',
                              badgeClass: 'bg-amber-400 text-slate-950',
                            },
                            {
                              key: 'In Progress' as const,
                              step: 2,
                              label: 'In Progress',
                              sub: 'Em Andamento',
                              Icon: Activity,
                              activeClass:
                                'bg-blue-950/95 border-blue-400 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.28)] scale-[1.01]',
                              passedClass:
                                'bg-blue-950/40 border-blue-500/40 text-blue-300 hover:border-blue-400',
                              badgeClass: 'bg-blue-400 text-slate-950',
                            },
                            {
                              key: 'Completed' as const,
                              step: 3,
                              label: 'Completed',
                              sub: 'Concluída',
                              Icon: CheckCircle2,
                              activeClass:
                                'bg-emerald-950/95 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.28)] scale-[1.01]',
                              passedClass:
                                'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:border-emerald-400',
                              badgeClass: 'bg-emerald-400 text-slate-950',
                            },
                          ] as const
                        ).map((item) => {
                          const statusOrder = {
                            Pending: 1,
                            'In Progress': 2,
                            Completed: 3,
                          };
                          const currentRank = statusOrder[activeContainerStatus];
                          const isCurrent = activeContainerStatus === item.key;
                          const isPassed = currentRank > item.step;
                          const StepIcon = item.Icon;

                          return (
                            <button
                              key={item.key}
                              type="button"
                              aria-pressed={isCurrent}
                              data-step={item.key}
                              onClick={async () => {
                                const newSt = item.key;
                                setDefaultOrderStatus(newSt);
                                setOsStatusTransitioning(true);
                                setTimeout(() => setOsStatusTransitioning(false), 750);
                                setServiceOrders((prev) =>
                                  prev.length > 0
                                    ? prev.map((osItem, idx) =>
                                        idx === 0 ? { ...osItem, status: newSt } : osItem
                                      )
                                    : prev
                                );
                                if (currentOs?.id) {
                                  const dbSt =
                                    newSt === 'Pending'
                                      ? 'pendente'
                                      : newSt === 'In Progress'
                                      ? 'em_andamento'
                                      : 'concluido';
                                  try {
                                    await updateInstallationStatusAction(
                                      String(currentOs.id),
                                      dbSt
                                    );
                                  } catch {}
                                }
                                toast.success(`Status atualizado para: ${newSt}`);
                              }}
                              className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 px-2.5 py-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border text-left transition-all duration-500 cursor-pointer ${
                                isCurrent
                                  ? item.activeClass
                                  : isPassed
                                  ? item.passedClass
                                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition-all duration-500 ${
                                  isCurrent
                                    ? item.badgeClass
                                    : isPassed
                                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {isPassed ? (
                                  <CheckCircle2 size={13} />
                                ) : (
                                  <StepIcon size={13} />
                                )}
                              </span>
                              <div className="min-w-0 text-center sm:text-left">
                                <span className="text-[11px] sm:text-xs font-black block leading-tight truncate">
                                  {item.label}
                                </span>
                                <span className="text-[9px] opacity-75 hidden min-[420px]:block leading-tight truncate">
                                  {item.sub}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <header
                    id="service-order-header"
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-colors transition-all duration-700 ease-in-out ${containerHeaderBg}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-sky-400 transition-colors duration-700 ease-in-out">
                        <FileText size={22} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Histórico de Ordens de Serviço (OS)</h3>
                        <p className="text-xs text-slate-300">Serviços executados com numeração automática e clientes vinculados</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <select
                        aria-label="Status"
                        value={activeContainerStatus}
                        onChange={(e) => {
                          const newSt = e.target.value as 'Pending' | 'In Progress' | 'Completed';
                          setDefaultOrderStatus(newSt);
                          setOsStatusTransitioning(true);
                          setTimeout(() => setOsStatusTransitioning(false), 750);
                          setServiceOrders((prev) =>
                            prev.length > 0
                              ? prev.map((item, idx) => (idx === 0 ? { ...item, status: newSt } : item))
                              : prev
                          );
                          toast.success(`Status atualizado para: ${newSt}`);
                        }}
                          className="px-3 py-2 rounded-xl bg-slate-950/90 border border-white/20 text-white font-bold text-xs transition-colors transition-all duration-700 ease-in-out focus:outline-none focus:border-sky-400 cursor-pointer"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            setQrGeneratorOrder({
                              orderNumber: currentOs?.orderNumber || currentOs?.id || nextOrderNumber,
                              clientName: currentOs?.clientName || 'Cliente Amigo',
                              clientPhone: currentOs?.clientPhone || null,
                              equipment: currentOs?.equipment || 'Equipamento de Ar-Condicionado',
                              status: activeContainerStatus,
                            })
                          }
                          className="px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Gerar QR Code exclusivo para a página pública desta OS"
                        >
                          <QrCode size={14} className="text-indigo-300" />
                          <span>Generate QR Code</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const orderNo = currentOs?.orderNumber || currentOs?.id || nextOrderNumber;
                            const clientNm = currentOs?.clientName || 'Cliente Amigo';
                            const equipNm = currentOs?.equipment || 'Equipamento de Ar-Condicionado';
                            const url = `${window.location.origin}/os/${encodeURIComponent(orderNo)}`;
                            const textMsg = `Olá, ${clientNm}! Confira o comprovante e certificado de garantia da sua Ordem de Serviço #${orderNo} (${equipNm}): ${url}`;

                            if (navigator.share) {
                              try {
                                await navigator.share({
                                  title: `Ordem de Serviço #${orderNo} — ${clientNm}`,
                                  text: `Olá, ${clientNm}! Confira o comprovante e certificado de garantia da sua Ordem de Serviço #${orderNo} (${equipNm}):`,
                                  url,
                                });
                                return;
                              } catch (err) {
                                if ((err as Error)?.name === 'AbortError') return;
                              }
                            }

                            let cleanPhone = (currentOs?.clientPhone || '').replace(/\D/g, '');
                            if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                              cleanPhone = '55' + cleanPhone;
                            }
                            const waUrl = cleanPhone
                              ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`
                              : `https://wa.me/?text=${encodeURIComponent(textMsg)}`;

                            await navigator.clipboard.writeText(url).catch(() => {});
                            const a = document.createElement('a');
                            a.href = waUrl;
                            a.target = '_blank';
                            a.rel = 'noopener noreferrer';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
                          title="Compartilhar link da OS via Web Share API / WhatsApp para o celular do cliente"
                        >
                          <MessageSquare size={14} />
                          <span>Share via WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsOsQrScannerOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-sky-400/40 text-sky-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Escanear QR Code da OS com a câmera para consultar status"
                        >
                          <QrCode size={14} className="text-sky-400" />
                          <span>Scan QR Code</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSigningOsId(currentOs?.id || '__default__')}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Coletar assinatura do cliente"
                        >
                          <Edit size={14} />
                          <span>Customer Signature</span>
                        </button>

                        <button
                          type="button"
                          disabled={headerSaving}
                          data-saved={headerSavedSuccess ? 'true' : 'false'}
                          onClick={async () => {
                            setHeaderSaving(true);
                            try {
                              const targetOs = serviceOrders[0];
                              const nextClientName =
                                editingOsId && targetOs && editingOsId === targetOs.id && editOsClientName.trim()
                                  ? editOsClientName.trim()
                                  : targetOs?.clientName || 'Cliente Amigo';
                              const nextAddress =
                                editingOsId && targetOs && editingOsId === targetOs.id
                                  ? editOsAddress.trim()
                                  : targetOs?.clientAddress || '';
                              const nextEquipment =
                                editingOsId && targetOs && editingOsId === targetOs.id && editOsEquipment.trim()
                                  ? editOsEquipment.trim()
                                  : targetOs?.equipment || 'Equipamento de Ar-Condicionado';
                              const nextCustNotes = targetOs
                                ? targetOs.customerNotes || ''
                                : defaultCustomerNotes;

                              if (targetOs) {
                                setServiceOrders((prev) =>
                                  prev.map((item, idx) =>
                                    idx === 0
                                      ? {
                                          ...item,
                                          clientName: nextClientName,
                                          clientAddress: nextAddress,
                                          equipment: nextEquipment,
                                          customerNotes: nextCustNotes,
                                          status: activeContainerStatus,
                                        }
                                      : item
                                  )
                                );
                              }
                              if (editingOsId) {
                                setEditingOsId(null);
                              }

                              const dbStatus =
                                activeContainerStatus === 'Pending'
                                  ? 'pendente'
                                  : activeContainerStatus === 'In Progress'
                                  ? 'em_andamento'
                                  : 'concluido';

                              await updateInstallationDetailsAction({
                                id: targetOs?.id || nextOrderNumber,
                                orderNumber: targetOs?.orderNumber || nextOrderNumber,
                                userUid: user?.uid || 'public',
                                clientName: nextClientName,
                                address: nextAddress,
                                equipment: nextEquipment,
                                status: dbStatus,
                                notes: targetOs?.notes || '',
                                customerNotes: nextCustNotes,
                                customerSignature:
                                  targetOs?.customerSignature || defaultCustomerSignature || null,
                              });

                              setHeaderSavedSuccess(true);
                              setTimeout(() => setHeaderSavedSuccess(false), 3000);
                              toast.success(
                                'Alterações e Customer Notes salvos no banco de dados com sucesso!'
                              );
                            } finally {
                              setHeaderSaving(false);
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all duration-300 flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            headerSavedSuccess
                              ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300/70 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-[1.03]'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                          } disabled:opacity-60`}
                          title="Salvar Customer Notes e campos atualizados no banco de dados"
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {headerSaving ? (
                              <motion.span
                                key="saving"
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.6 }}
                                transition={{ duration: 0.18 }}
                                className="flex items-center gap-1.5"
                              >
                                <RefreshCw size={14} className="animate-spin" />
                                <span>Saving...</span>
                              </motion.span>
                            ) : headerSavedSuccess ? (
                              <motion.span
                                key="saved"
                                initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.6 }}
                                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                                className="flex items-center gap-1.5"
                              >
                                <CheckCircle2 size={14} strokeWidth={2.8} />
                                <span>Saved!</span>
                              </motion.span>
                            ) : (
                              <motion.span
                                key="save"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.18 }}
                                className="flex items-center gap-1.5"
                              >
                                <CheckCircle2 size={14} />
                                <span>Save</span>
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>

                        <button
                          type="button"
                          onClick={() => osPdfExporterRef.current?.exportPdf()}
                          className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
                          title="Exportar Ordem de Serviço atual para PDF"
                        >
                          <Download size={14} />
                          <span>Export to PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowOSModal(true)}
                          className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Plus size={15} />
                          <span>Nova OS</span>
                        </button>
                      </div>
                    </header>

                    <div className="hidden" aria-hidden="true">
                      <ServiceOrderPdfExporter ref={osPdfExporterRef} order={currentOsPdfData} />
                    </div>

                    {/* Customer Notes Text Area no #service-order-container */}
                    {(() => {
                      const MIN_PROFESSIONAL_NOTE_LENGTH = 20;
                      const currentNoteText = currentOs
                        ? currentOs.customerNotes || ''
                        : defaultCustomerNotes;
                      const trimmedLength = currentNoteText.trim().length;
                      const meetsMinRequirement = trimmedLength >= MIN_PROFESSIONAL_NOTE_LENGTH;

                      return (
                        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <label
                              htmlFor="service-order-customer-notes"
                              className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block"
                            >
                              Customer Notes · Observações do Cliente e Condição do Equipamento
                            </label>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-mono font-bold transition-colors ${
                                  meetsMinRequirement ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {trimmedLength}/{MIN_PROFESSIONAL_NOTE_LENGTH} mín. caracteres
                              </span>
                              <span className="text-[10px] font-mono text-sky-400">
                                Incluso no PDF
                              </span>
                            </div>
                          </div>

                          <div className="relative">
                            <textarea
                              id="service-order-customer-notes"
                              aria-label="Customer Notes"
                              aria-invalid={!meetsMinRequirement}
                              rows={3}
                              value={currentNoteText}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDefaultCustomerNotes(val);
                                if (serviceOrders.length > 0) {
                                  setServiceOrders((prev) =>
                                    prev.map((item, idx) =>
                                      idx === 0 ? { ...item, customerNotes: val } : item
                                    )
                                  );
                                }
                              }}
                              placeholder="Registre solicitações específicas do cliente ou observações sobre a condição do equipamento (mín. 20 caracteres para nota técnica profissional)..."
                              className={`w-full pl-3 pr-11 py-2.5 pb-7 rounded-xl bg-slate-900 border text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition resize-y ${
                                meetsMinRequirement
                                  ? 'border-emerald-500/60 focus:border-emerald-400'
                                  : 'border-rose-500/50 focus:border-rose-400'
                              }`}
                            />

                            {/* Visual validation icon (check/cross) inside the Customer Notes textarea */}
                            <div
                              data-testid="customer-notes-validation-icon"
                              data-valid={meetsMinRequirement ? 'true' : 'false'}
                              title={
                                meetsMinRequirement
                                  ? 'Nota técnica profissional válida (comprimento mínimo atingido)'
                                  : `Comprimento insuficiente: mínimo de ${MIN_PROFESSIONAL_NOTE_LENGTH} caracteres necessários para uma nota profissional`
                              }
                              className={`pointer-events-none absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 ${
                                meetsMinRequirement
                                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                                  : 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                              }`}
                            >
                              {meetsMinRequirement ? (
                                <Check
                                  size={14}
                                  strokeWidth={3}
                                  aria-label="Valid professional note length"
                                />
                              ) : (
                                <X
                                  size={14}
                                  strokeWidth={3}
                                  aria-label="Insufficient professional note length"
                                />
                              )}
                            </div>

                            {/* Status indicator badge inside bottom-right of textarea */}
                            <div
                              className={`pointer-events-none absolute bottom-2 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 border transition-all duration-300 ${
                                meetsMinRequirement
                                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                                  : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
                              }`}
                            >
                              {meetsMinRequirement ? (
                                <>
                                  <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                                  <span>Nota profissional válida</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={11} className="text-rose-400 shrink-0" />
                                  <span>
                                    Faltam {MIN_PROFESSIONAL_NOTE_LENGTH - trimmedLength} caracteres
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Customer Signature Section no #service-order-container */}
                    <section
                      id="customer-signature-section"
                      aria-label="Customer Signature"
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Customer Signature · Assinatura do Cliente
                          </span>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Abra o canvas para o cliente assinar o aceite do serviço e salvar o Base64 no banco de dados
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSigningOsId(currentOs?.id || '__default__')}
                            className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit size={14} className="text-sky-400" />
                            <span>
                              {currentOs?.customerSignature || defaultCustomerSignature
                                ? 'Update Signature'
                                : 'Open Signature Canvas'}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div
                        onClick={() => setSigningOsId(currentOs?.id || '__default__')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSigningOsId(currentOs?.id || '__default__');
                          }
                        }}
                        className="w-full rounded-xl border border-dashed border-slate-700 hover:border-sky-500/50 bg-slate-900/70 p-3 flex flex-col items-center justify-center min-h-[84px] cursor-pointer transition group"
                      >
                        {currentOs?.customerSignature || defaultCustomerSignature ? (
                          <div className="flex flex-col items-center gap-1.5 w-full">
                            <div className="bg-white rounded-lg px-4 py-2 max-w-xs w-full flex items-center justify-center shadow-sm">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={currentOs?.customerSignature || defaultCustomerSignature || ''}
                                alt="Customer Signature"
                                className="max-h-14 object-contain"
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              <span>
                                Assinatura Base64 salva no banco de dados (Clique para atualizar)
                              </span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-sky-300 transition">
                            <Edit size={16} className="text-sky-400/80" />
                            <span className="text-xs font-semibold">
                              Clique para abrir o canvas de assinatura do cliente (Customer Signature)
                            </span>
                          </div>
                        )}
                      </div>
                    </section>

              <div className="space-y-3 pt-2">
                {serviceOrders.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-800 rounded-2xl text-center">
                    <p className="text-xs text-slate-500">Nenhuma ordem de serviço registrada.</p>
                  </div>
                ) : (
                  serviceOrders.map((os) => {
                    const formattedDate = new Date(os.serviceDate + 'T12:00:00').toLocaleDateString('pt-BR');
                    const osStatus = os.status || 'Completed';
                    const osHeaderBg =
                      osStatus === 'Pending'
                        ? 'bg-amber-950/85 border-amber-500/45 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                        : osStatus === 'In Progress'
                        ? 'bg-sky-950/85 border-sky-500/45 shadow-[0_0_20px_rgba(14,165,233,0.12)]'
                        : 'bg-emerald-950/85 border-emerald-500/45 shadow-[0_0_20px_rgba(16,185,129,0.12)]';
                    const osBadgeClass =
                      osStatus === 'Pending'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : osStatus === 'In Progress'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                    return (
                      <div
                        key={os.id}
                        data-order-number={os.orderNumber || os.id}
                        className="p-3.5 min-[400px]:p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 hover:border-slate-700 transition"
                      >
                        {/* Cabeçalho do Card da OS com cor de fundo dinâmica e transição CSS suave baseada no Status */}
                        <div
                          className={`flex flex-col min-[400px]:flex-row min-[400px]:items-center justify-between gap-2.5 p-3 rounded-xl border transition-all duration-500 ease-in-out ${osHeaderBg}`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-slate-950/70 text-white border border-white/15">
                              #{os.orderNumber || os.id}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${osBadgeClass}`}>
                              {osStatus}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                              Status:
                            </label>
                            <select
                              aria-label={`Status da OS ${os.orderNumber || os.id}`}
                              value={osStatus}
                              onChange={async (e) => {
                                const nextStatus = e.target.value as 'Pending' | 'In Progress' | 'Completed';
                                setServiceOrders((prev) =>
                                  prev.map((item) =>
                                    item.id === os.id ? { ...item, status: nextStatus } : item
                                  )
                                );
                                try {
                                  const dbStatus =
                                    nextStatus === 'Pending'
                                      ? 'pendente'
                                      : nextStatus === 'In Progress'
                                      ? 'em_andamento'
                                      : 'concluido';
                                  await updateInstallationStatusAction(String(os.id), dbStatus);
                                } catch {}
                                toast.success(`Status da OS #${os.orderNumber || os.id} alterado para ${nextStatus}`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-white/20 text-white text-xs font-bold focus:outline-none focus:border-sky-400 cursor-pointer"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>

                            {editingOsId === os.id ? (
                              <button
                                type="button"
                                onClick={() => setEditingOsId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                                title="Cancelar edição"
                              >
                                Cancel
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingOsId(os.id);
                                  setEditOsClientName(os.clientName);
                                  setEditOsAddress(os.clientAddress || '');
                                  setEditOsEquipment(os.equipment);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-white/20 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Editar dados da OS"
                              >
                                <Edit size={12} className="text-sky-400" />
                                <span>Edit</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={savingOsCardId === os.id}
                              data-saved={savedOsCardId === os.id ? 'true' : 'false'}
                              onClick={async () => {
                                setSavingOsCardId(os.id);
                                try {
                                  const nextClientName =
                                    editingOsId === os.id && editOsClientName.trim()
                                      ? editOsClientName.trim()
                                      : os.clientName;
                                  const nextAddress =
                                    editingOsId === os.id
                                      ? editOsAddress.trim()
                                      : os.clientAddress || '';
                                  const nextEquipment =
                                    editingOsId === os.id && editOsEquipment.trim()
                                      ? editOsEquipment.trim()
                                      : os.equipment;

                                  setServiceOrders((prev) =>
                                    prev.map((item) =>
                                      item.id === os.id
                                        ? {
                                            ...item,
                                            clientName: nextClientName,
                                            clientAddress: nextAddress,
                                            equipment: nextEquipment,
                                          }
                                        : item
                                    )
                                  );
                                  if (editingOsId === os.id) {
                                    setEditingOsId(null);
                                  }

                                  const dbStatus =
                                    osStatus === 'Pending'
                                      ? 'pendente'
                                      : osStatus === 'In Progress'
                                      ? 'em_andamento'
                                      : 'concluido';

                                  await updateInstallationDetailsAction({
                                    id: os.id,
                                    orderNumber: os.orderNumber || os.id,
                                    userUid: user?.uid || 'public',
                                    clientName: nextClientName,
                                    address: nextAddress,
                                    equipment: nextEquipment,
                                    status: dbStatus,
                                    notes: os.notes || '',
                                    customerNotes: os.customerNotes || '',
                                    customerSignature: os.customerSignature || null,
                                  });

                                  setSavedOsCardId(os.id);
                                  setTimeout(() => {
                                    setSavedOsCardId((prev) => (prev === os.id ? null : prev));
                                  }, 3000);

                                  toast.success(
                                    `OS #${os.orderNumber || os.id} e Customer Notes salvos no banco de dados!`
                                  );
                                } finally {
                                  setSavingOsCardId(null);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg font-black text-xs transition-all duration-300 flex items-center gap-1 cursor-pointer ${
                                savedOsCardId === os.id
                                  ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300/70 shadow-[0_0_16px_rgba(16,185,129,0.45)] scale-[1.03]'
                                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                              }`}
                              title="Salvar Customer Notes e alterações no banco de dados"
                            >
                              <CheckCircle2
                                size={13}
                                className={
                                  savedOsCardId === os.id
                                    ? 'transition-transform duration-300 scale-110'
                                    : ''
                                }
                              />
                              <span>
                                {savingOsCardId === os.id
                                  ? 'Saving...'
                                  : savedOsCardId === os.id
                                  ? 'Saved!'
                                  : 'Save'}
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-[1fr_auto] gap-3">
                          {/* Dados do Cliente */}
                          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1.5 min-w-0">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                              Dados do Cliente
                            </span>
                            {editingOsId === os.id ? (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  aria-label="Nome do Cliente"
                                  value={editOsClientName}
                                  onChange={(e) => setEditOsClientName(e.target.value)}
                                  placeholder="Nome do Cliente"
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-sky-500/50 text-xs font-bold text-white focus:outline-none focus:border-sky-400"
                                />
                                <input
                                  type="text"
                                  aria-label="Endereço do Cliente"
                                  value={editOsAddress}
                                  onChange={(e) => setEditOsAddress(e.target.value)}
                                  placeholder="Endereço do Cliente"
                                  className="w-full px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[11px] text-slate-200 focus:outline-none focus:border-sky-400"
                                />
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-sm font-bold text-white break-words">{os.clientName}</h4>
                                </div>
                                {os.clientAddress && (
                                  <p className="text-[11px] text-slate-400 flex items-start gap-1 mt-1 break-words">
                                    <MapPin size={11} className="text-sky-400 shrink-0 mt-0.5" />
                                    <span>{os.clientAddress}</span>
                                  </p>
                                )}
                              </>
                            )}
                          </div>

                          {/* Equipamento & Data */}
                          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between gap-2 min-w-0">
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                                Equipamento
                              </span>
                              {editingOsId === os.id ? (
                                <input
                                  type="text"
                                  aria-label="Equipamento"
                                  value={editOsEquipment}
                                  onChange={(e) => setEditOsEquipment(e.target.value)}
                                  placeholder="Equipamento"
                                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-sky-500/50 text-xs font-semibold text-white focus:outline-none focus:border-sky-400"
                                />
                              ) : (
                                <p className="text-xs font-semibold text-white flex items-center gap-1.5 mt-0.5 break-words">
                                  <Wrench size={12} className="text-sky-400 shrink-0" />
                                  <span>{os.equipment}</span>
                                </p>
                              )}
                            </div>
                            <div className="text-left sm:text-right text-xs pt-1 border-t border-slate-800/60">
                              <span className="text-[10px] font-bold text-slate-500 uppercase mr-1.5">Data:</span>
                              <span className="font-mono font-bold text-slate-300">{formattedDate}</span>
                            </div>
                          </div>
                        </div>

                        {/* Customer Notes Field dentro do Card da OS */}
                        {(() => {
                          const MIN_OS_NOTE_LENGTH = 20;
                          const osNoteText = os.customerNotes || '';
                          const osNoteTrimmedLen = osNoteText.trim().length;
                          const isOsNoteValid = osNoteTrimmedLen >= MIN_OS_NOTE_LENGTH;

                          return (
                            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1.5">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <label
                                  htmlFor={`customer-notes-${os.id}`}
                                  className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block"
                                >
                                  Customer Notes · Observações do Cliente e Condição do Equipamento
                                </label>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[9px] font-mono font-bold ${
                                      isOsNoteValid ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {osNoteTrimmedLen}/{MIN_OS_NOTE_LENGTH} mín.
                                  </span>
                                  <span className="text-[9px] font-mono text-sky-400">
                                    Incluso no PDF
                                  </span>
                                </div>
                              </div>
                              <div className="relative">
                                <textarea
                                  id={`customer-notes-${os.id}`}
                                  aria-label={`Customer Notes da OS ${os.orderNumber || os.id}`}
                                  aria-invalid={!isOsNoteValid}
                                  rows={2}
                                  value={osNoteText}
                                  onChange={(e) => {
                                    const nextNotes = e.target.value;
                                    setServiceOrders((prev) =>
                                      prev.map((item) =>
                                        item.id === os.id
                                          ? { ...item, customerNotes: nextNotes }
                                          : item
                                      )
                                    );
                                  }}
                                  placeholder="Registre solicitações do cliente ou observações sobre a condição do equipamento (mín. 20 caracteres)..."
                                  className={`w-full pl-2.5 pr-9 py-1.5 pb-6 rounded-lg bg-slate-950 border text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition resize-y ${
                                    isOsNoteValid
                                      ? 'border-emerald-500/60 focus:border-emerald-400'
                                      : 'border-rose-500/50 focus:border-rose-400'
                                  }`}
                                />
                                <div
                                  data-valid={isOsNoteValid ? 'true' : 'false'}
                                  title={
                                    isOsNoteValid
                                      ? 'Nota técnica profissional válida'
                                      : `Mínimo de ${MIN_OS_NOTE_LENGTH} caracteres para nota profissional`
                                  }
                                  className={`pointer-events-none absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-300 ${
                                    isOsNoteValid
                                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                      : 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                                  }`}
                                >
                                  {isOsNoteValid ? (
                                    <Check size={12} strokeWidth={3} />
                                  ) : (
                                    <X size={12} strokeWidth={3} />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Customer Signature Field dentro do Card da OS */}
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                              Customer Signature · Assinatura do Cliente
                            </span>
                            {os.customerSignature ? (
                              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                <span>Assinatura registrada ({os.clientName})</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                Aguardando assinatura de conformidade do cliente
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {os.customerSignature && (
                              <div className="bg-white rounded-md px-2.5 py-1 flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={os.customerSignature}
                                  alt={`Assinatura de ${os.clientName}`}
                                  className="h-7 object-contain"
                                />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setSigningOsId(os.id)}
                              className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Edit size={12} />
                              <span>{os.customerSignature ? 'Update Signature' : 'Customer Signature'}</span>
                            </button>
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
                              onClick={() =>
                                setQrGeneratorOrder({
                                  orderNumber: os.orderNumber || os.id,
                                  clientName: os.clientName,
                                  clientPhone: os.clientPhone,
                                  equipment: os.equipment,
                                  status: osStatus,
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1.5 font-bold text-[11px] cursor-pointer"
                              title="Gerar QR Code exclusivo desta OS"
                            >
                              <QrCode size={13} />
                              <span>QR Code</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const orderSlug = encodeURIComponent(os.orderNumber || os.id);
                                const url = `${window.location.origin}/os/${orderSlug}`;
                                const textMsg = `Olá, ${os.clientName}! Confira os detalhes da OS #${os.orderNumber || os.id} (${os.equipment}): ${url}`;
                                if (navigator.share) {
                                  try {
                                    await navigator.share({
                                      title: `Ordem de Serviço #${os.orderNumber || os.id}`,
                                      text: `Olá, ${os.clientName}! Confira os detalhes da OS #${os.orderNumber || os.id} (${os.equipment}):`,
                                      url,
                                    });
                                    return;
                                  } catch (err) {
                                    if ((err as Error)?.name === 'AbortError') return;
                                  }
                                }
                                let cleanPhone = (os.clientPhone || '').replace(/\D/g, '');
                                if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                                  cleanPhone = '55' + cleanPhone;
                                }
                                const waUrl = cleanPhone
                                  ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`
                                  : `https://wa.me/?text=${encodeURIComponent(textMsg)}`;
                                await navigator.clipboard.writeText(url).catch(() => {});
                                const a = document.createElement('a');
                                a.href = waUrl;
                                a.target = '_blank';
                                a.rel = 'noopener noreferrer';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition flex items-center gap-1.5 font-bold text-[11px] cursor-pointer"
                              title="Share via WhatsApp (Web Share API)"
                            >
                              <MessageSquare size={13} />
                              <span>Share via WhatsApp</span>
                            </button>
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

              <CustomerSignatureModal
                isOpen={signingOsId !== null}
                onClose={() => setSigningOsId(null)}
                onSave={async (signatureDataUrl) => {
                  const targetOrder =
                    signingOsId === '__default__'
                      ? serviceOrders[0]
                      : serviceOrders.find((item) => item.id === signingOsId) || serviceOrders[0];

                  setDefaultCustomerSignature(signatureDataUrl);
                  if (serviceOrders.length > 0) {
                    setServiceOrders((prev) =>
                      prev.map((item, idx) =>
                        (signingOsId === '__default__' && idx === 0) || item.id === signingOsId
                          ? { ...item, customerSignature: signatureDataUrl }
                          : item
                      )
                    );
                  }

                  try {
                    await saveCustomerSignatureAction({
                      id: targetOrder?.id || nextOrderNumber,
                      orderNumber: targetOrder?.orderNumber || nextOrderNumber,
                      userUid: user?.uid || 'public',
                      clientName: targetOrder?.clientName || 'Cliente Amigo',
                      equipment: targetOrder?.equipment || 'Equipamento de Ar-Condicionado',
                      customerSignature: signatureDataUrl,
                    });
                    toast.success('Assinatura Base64 do cliente salva no banco de dados com sucesso!');
                  } catch {
                    toast.success('Assinatura do cliente registrada na Ordem de Serviço!');
                  }
                }}
                clientName={
                  serviceOrders.find((item) => item.id === signingOsId)?.clientName ||
                  serviceOrders[0]?.clientName ||
                  'Cliente'
                }
                orderNumber={
                  serviceOrders.find((item) => item.id === signingOsId)?.orderNumber ||
                  serviceOrders[0]?.orderNumber ||
                  nextOrderNumber
                }
                initialSignature={
                  signingOsId === '__default__'
                    ? defaultCustomerSignature
                    : serviceOrders.find((item) => item.id === signingOsId)?.customerSignature || null
                }
              />

              <ServiceOrderQrScannerModal
                isOpen={isOsQrScannerOpen}
                onClose={() => setIsOsQrScannerOpen(false)}
                localOrders={serviceOrders}
                currentOrderFallback={{
                  orderNumber: serviceOrders[0]?.orderNumber || nextOrderNumber,
                  status: serviceOrders[0]?.status || defaultOrderStatus,
                  clientName: serviceOrders[0]?.clientName || 'Cliente Amigo',
                  equipment: serviceOrders[0]?.equipment || 'Equipamento de Ar-Condicionado',
                  dateStr: serviceOrders[0]?.serviceDate
                    ? new Date(serviceOrders[0].serviceDate + 'T12:00:00').toLocaleDateString('pt-BR')
                    : new Date().toLocaleDateString('pt-BR'),
                }}
                onOrderResolved={(resolved) => {
                  const matchedCard = document.querySelector(
                    `[data-order-number="${resolved.orderNumber}"]`
                  );
                  if (matchedCard) {
                    matchedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                  toast.success(
                    `OS #${resolved.orderNumber} localizada — Status: ${resolved.status}`
                  );
                }}
              />

              {/* Floating Action Button (FAB) para QR Code Scanner dentro de #service-order-container */}
              <div className="sticky bottom-4 z-30 flex justify-end pointer-events-none pt-2">
                <button
                  id="service-order-qr-fab"
                  type="button"
                  onClick={() => setIsOsQrScannerOpen(true)}
                  aria-label="Scan Service Order QR Code"
                  title="Escanear QR Code para localizar Ordem de Serviço existente rapidamente"
                  className="pointer-events-auto group flex items-center gap-2.5 pl-4 pr-5 py-3.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs shadow-[0_10px_30px_rgba(14,165,233,0.45)] hover:shadow-[0_12px_36px_rgba(14,165,233,0.65)] border border-white/25 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <span className="p-1.5 rounded-full bg-slate-950/30 border border-white/20 flex items-center justify-center">
                    <QrCode size={18} className="text-white group-hover:rotate-6 transition-transform" />
                  </span>
                  <span className="tracking-wide">Scan OS QR</span>
                </button>
              </div>

              <ServiceOrderQrGeneratorModal
                isOpen={qrGeneratorOrder !== null}
                onClose={() => setQrGeneratorOrder(null)}
                orderNumber={qrGeneratorOrder?.orderNumber || nextOrderNumber}
                clientName={qrGeneratorOrder?.clientName}
                clientPhone={qrGeneratorOrder?.clientPhone}
                equipment={qrGeneratorOrder?.equipment}
                status={qrGeneratorOrder?.status}
              />
            </div>
              );
            })()}

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
