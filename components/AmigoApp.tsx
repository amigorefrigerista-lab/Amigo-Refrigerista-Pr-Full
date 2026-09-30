'use client';

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';

const DashTab = lazy(() => import('@/components/tabs/DashTab'));
const ErrorsTab = lazy(() => import('@/components/tabs/ErrorsTab'));
const CalcTab = lazy(() => import('@/components/tabs/CalcTab'));
const FinanceTab = lazy(() => import('@/components/tabs/FinanceTab'));
const ClientsTab = lazy(() => import('@/components/tabs/ClientsTab'));
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
  Globe
} from 'lucide-react';
import { 
  MaintenanceReminder, 
  generateWhatsAppReminderLink, 
  calculateNextMaintenanceDate,
  calculateReminderAlertDate,
  ServiceOrder
} from '@/lib/reminderUtils';
import { RecurringRevenueCard } from '@/components/RecurringRevenueCard';
import { VipWelcomeBanner } from '@/components/VipWelcomeBanner';
import { UpgradeModal } from '@/components/UpgradeModal';
import { InstallPrompt } from '@/components/InstallPrompt';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  syncUserAction,
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
  const { user, profile, loading: authLoading, isAdmin, isSupportOrAdmin, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut } = useAuth();
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState('dash');
  const [calcSubTab, setCalcSubTab] = useState<'sh_sub' | 'thermal' | 'pt_table'>('sh_sub');

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
        if (data && data.length > 0) {
          setClients(data);
        }
      })
      .catch(console.error);

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
        }
      })
      .catch(console.error);

    // Buscar Histórico de Diagnósticos
    getDiagnosesAction(user.uid)
      .then((logs) => {
        if (logs && logs.length > 0) {
          setDiagnosisHistory(logs);
        }
      })
      .catch(console.error);
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
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
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

  // Subscription & Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isCancellingSub, setIsCancellingSub] = useState(false);

  // Lembretes de Manutenção Preventiva State
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([
    {
      id: 'rem-1',
      clientName: 'Dr. Marcos Silveira',
      clientPhone: '5511987654321',
      equipment: 'Split Daikin Inverter 12.000 BTU/h',
      serviceDate: '2026-03-28',
      monthsInterval: 6,
      status: 'pending',
      createdAt: '2026-03-28'
    },
    {
      id: 'rem-2',
      clientName: 'Academia Fit Life',
      clientPhone: '5511912345678',
      equipment: 'Cassete Carrier 60.000 BTU/h',
      serviceDate: '2026-06-28',
      monthsInterval: 3,
      status: 'pending',
      createdAt: '2026-06-28'
    }
  ]);

  const [showOSModal, setShowOSModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [remClientName, setRemClientName] = useState('');
  const [remClientPhone, setRemClientPhone] = useState('');
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

  // Financial State with Expanded Mock Data for Offline/New Users
  const [revenueItems, setRevenueItems] = useState<any[]>([
    { id: 't1', desc: 'Instalação Tri-Split - Condomínio Alpha', value: 2450, date: '2026-09-28', type: 'in' },
    { id: 't2', desc: 'Higienização + PMOC Academia Fit', value: 1200, date: '2026-09-24', type: 'in' },
    { id: 't3', desc: 'Instalação Split Inverter 12k - Dr. Marcos', value: 650, date: '2026-09-21', type: 'in' },
    { id: 't4', desc: 'Compra de Tubo de Cobre 1/4 e 3/8', value: 420, date: '2026-09-20', type: 'out' },
    { id: 't5', desc: 'Manutenção Corretiva VRF Shopping', value: 3400, date: '2026-08-15', type: 'in' },
    { id: 't6', desc: 'Ferramentas de Vácuo Pro', value: 950, date: '2026-08-10', type: 'out' },
    { id: 't7', desc: 'Recarga de Gás R410A de 13.6kg', value: 680, date: '2026-08-02', type: 'out' },
    { id: 't8', desc: 'PMOC Anual Escritório Advocacia', value: 2800, date: '2026-07-22', type: 'in' },
    { id: 't9', desc: 'Troca de compressor 36000 BTU', value: 1450, date: '2026-07-15', type: 'in' },
    { id: 't10', desc: 'Compra de Peças de Reposição e Filtros', value: 550, date: '2026-07-08', type: 'out' },
    { id: 't11', desc: 'Instalação K7 48k Cassete - Galpão', value: 3100, date: '2026-06-25', type: 'in' },
    { id: 't12', desc: 'Pagamento Auxiliar Diária', value: 300, date: '2026-06-24', type: 'out' },
    { id: 't13', desc: 'Curso de Atualização Inverter Daikin', value: 450, date: '2026-06-05', type: 'out' }
  ]);

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

  // Clients State
  const [clients, setClients] = useState<any[]>([
    {
      id: 'c1',
      name: 'Dr. Marcos Silveira',
      phone: '(11) 98765-4321',
      address: 'Av. Paulista, 1000 - Cj 42, SP',
      equipment: [
        { brand: 'Daikin', model: 'FTXM35M', capacity: '12.000 BTU/h', gas: 'R32', lastMaintenance: '2026-08-10' }
      ]
    },
    {
      id: 'c2',
      name: 'Academia Fit Life',
      phone: '(11) 91234-5678',
      address: 'Rua das Flores, 450 - Moema, SP',
      equipment: [
        { brand: 'Carrier', model: '42XQL060515LC', capacity: '60.000 BTU/h', gas: 'R410A', lastMaintenance: '2026-09-15' },
        { brand: 'Midea', model: '42MACA36M5', capacity: '36.000 BTU/h', gas: 'R410A', lastMaintenance: '2026-09-15' }
      ]
    }
  ]);

  // Superheating Calculation
  const shCalculations = useMemo(() => {
    // Estimativas de temperatura de saturação para R410A e R22
    const pSuction = parseFloat(suctionPressure) || 0;
    const tSuction = parseFloat(suctionTemp) || 0;
    const pLiquid = parseFloat(liquidPressure) || 0;
    const tLiquid = parseFloat(liquidTemp) || 0;

    let evapSatTemp = 0;
    let condSatTemp = 0;

    if (selectedGas === 'R410A') {
      evapSatTemp = (pSuction * 0.1) - 6.5;
      condSatTemp = (pLiquid * 0.08) + 21;
    } else {
      evapSatTemp = (pSuction * 0.16) - 9;
      condSatTemp = (pLiquid * 0.11) + 18;
    }

    const superheat = tSuction - evapSatTemp;
    const subcooling = condSatTemp - tLiquid;

    return {
      evapSatTemp: evapSatTemp.toFixed(1),
      condSatTemp: condSatTemp.toFixed(1),
      superheat: superheat.toFixed(1),
      subcooling: subcooling.toFixed(1),
      shStatus: superheat >= 4 && superheat <= 8 ? 'Ideal (4°C a 8°C)' : superheat < 4 ? 'Baixo (Risco de Golpe de Líquido)' : 'Alto (Falta de fluido ou restrição)',
      scStatus: subcooling >= 5 && subcooling <= 10 ? 'Ideal (5°C a 10°C)' : subcooling < 5 ? 'Baixo (Falta de refrigerante)' : 'Alto (Excesso de refrigerante)'
    };
  }, [suctionPressure, suctionTemp, liquidPressure, liquidTemp, selectedGas]);

  // Thermal Load Calculation
  const calculatedBtu = useMemo(() => {
    const area = parseFloat(areaM2) || 0;
    const people = parseFloat(peopleCount) || 1;
    const watts = parseFloat(electronicWatts) || 0;
    const basePerM2 = sunExposure === 'afternoon' ? 800 : 600;
    const loadPeople = (people - 1) * 600;
    const loadElectronics = (watts / 100) * 340;
    const total = (area * basePerM2) + Math.max(0, loadPeople) + loadElectronics;
    return Math.ceil(total / 1000) * 1000;
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

      setServiceOrders(prev => [newOS, ...prev]);
      setShowOSModal(false);

      // Limpa campos
      setRemClientName('');
      setRemClientPhone('');
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
      <div className="min-h-screen bg-[#070e1c] text-white flex items-center justify-center p-4 py-8">
        <Toaster position="top-center" richColors theme="dark" />
        <div className="max-w-md w-full bg-slate-900/90 border border-sky-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
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

          {/* Botão rápido do Google / 1-Clique */}
          <button
            onClick={async () => {
              try {
                setIsGoogleLoading(true);
                const { error } = await signInWithGoogle(emailInput, nameInput);
                if (error) {
                  toast.error(error.message || 'Falha na autenticação rápida');
                } else {
                  toast.success('Acesso em 1 clique realizado com sucesso!');
                }
              } catch (err: any) {
                toast.error(err.message || 'Falha na autenticação rápida');
              } finally {
                setIsGoogleLoading(false);
              }
            }}
            disabled={isGoogleLoading}
            type="button"
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-75 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2.5 shadow-md cursor-pointer"
          >
            {isGoogleLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Conectando em 1 clique...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>{authMode === 'register' ? 'Criar Conta com 1 Clique (Google)' : 'Entrar com Google em 1 Clique'}</span>
              </>
            )}
          </button>

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
                <label className="text-slate-300 font-semibold block mb-1">Senha</label>
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

          <div className="text-center pt-2">
            <Link href="/privacidade" className="text-[11px] text-slate-500 hover:text-sky-400 transition flex items-center justify-center gap-1">
              <Shield size={12} />
              <span>Privacidade e Segurança de Dados (Play Store Data Safety)</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070e1c] text-white pb-28 pt-16">
      <Toaster position="top-center" richColors theme="dark" />
      
      {/* Header com os botões de Suporte, Admin e Novo Serviço */}
      <Header 
        onOpenSettings={() => setShowSettingsModal(true)} 
        onNewService={() => setShowOSModal(true)}
      />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Banner de Boas-Vindas */}
        {profile?.role === 'admin' || (profile as any)?.isVip || profile?.subscription?.isLifetimeFree || profile?.subscription?.plan === 'pro_trial' || profile?.subscription?.plan === 'pro_paid' || profile?.subscription?.plan === 'pro' ? (
          <VipWelcomeBanner 
            name={profile?.name || user.displayName || user.email?.split('@')[0] || 'Técnico VIP'} 
            isTrial={profile?.subscription?.plan === 'pro_trial'}
            licenseCode={profile?.subscription?.licenseKeyUsed}
            endDate={profile?.subscription?.endDate}
          />
        ) : (
          <div className="bg-gradient-to-r from-sky-950/70 via-slate-900 to-slate-900 border border-sky-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    ⚡ Técnico HVAC-R
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{user.email}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Olá, {user.displayName || user.email?.split('@')[0]}!
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Diagnósticos por IA, cálculo de superaquecimento, tabela PxT e ordens de serviço.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0"
                >
                  <Gift size={15} />
                  <span>Resgatar Licença / Upgrade</span>
                </button>

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                  >
                    <ShieldCheck size={16} className="text-amber-400" />
                    <span>Painel Admin</span>
                  </Link>
                )}
                {isSupportOrAdmin && (
                  <Link
                    href="/suporte-central"
                    className="px-4 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.25)]"
                  >
                    <Headset size={16} className="text-indigo-400" />
                    <span>Suporte</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

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
            <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
              <button
                onClick={() => setCalcSubTab('sh_sub')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  calcSubTab === 'sh_sub' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400'
                }`}
              >
                Superaquecimento & Sub-resfriamento
              </button>
              <button
                onClick={() => setCalcSubTab('thermal')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  calcSubTab === 'thermal' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400'
                }`}
              >
                Cálculo de BTU/h
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

                <button
                  onClick={() => setShowOSModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer shrink-0"
                >
                  <Plus size={16} />
                  <span>Novo Lembrete / OS</span>
                </button>
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
                    const waLink = generateWhatsAppReminderLink({
                      ...rem,
                      reminderDaysBefore: daysBefore
                    });

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
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
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
                {clients.map((c) => (
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
                ))}
              </div>
            </div>
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
                <label className="text-slate-300 font-semibold block mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dona Maria Silveira"
                  value={remClientName}
                  onChange={(e) => setRemClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">WhatsApp do Cliente (com DDD) *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: (11) 98765-4321 ou 5584999998888"
                  value={remClientPhone}
                  onChange={(e) => setRemClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Endereço do Cliente / Local</label>
                <input
                  type="text"
                  placeholder="Ex: Av. Brasil, 1500 - Apto 42, Jardins"
                  value={remClientAddress}
                  onChange={(e) => setRemClientAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  💡 O cliente será cadastrado automaticamente com este endereço e equipamento.
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Equipamento Servido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Split Inverter LG 12.000 BTUs"
                  value={remEquipment}
                  onChange={(e) => setRemEquipment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Data da Realização do Serviço *</label>
                <input
                  type="date"
                  required
                  value={remServiceDate}
                  onChange={(e) => setRemServiceDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition font-mono"
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
        className="fixed bottom-20 right-4 sm:bottom-24 sm:right-8 z-40 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-[0_10px_30px_rgba(16,185,129,0.45)] flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer border border-emerald-300/40"
        title="Criar Novo Serviço (Nova OS)"
      >
        <Plus size={18} strokeWidth={3} className="text-slate-950" />
        <span className="hidden sm:inline font-black tracking-wide">Novo Serviço (OS)</span>
        <span className="sm:hidden font-black">Novo Serviço</span>
      </button>

      {/* Componente de Prompt de Instalação PWA */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Liberar Recursos Pró ou Resgatar Licença"
        description="Tenha diagnósticos ilimitados com IA, Ordens de Serviço completas com QR Code PMOC e lembretes inteligentes de manutenção preventiva."
      />

      <InstallPrompt />
    </div>
  );
}
