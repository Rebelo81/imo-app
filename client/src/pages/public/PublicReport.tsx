import { useState, useRef, useMemo, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { UAParser } from 'ua-parser-js';
import { calcularDetalhamentoTotalPago, calcularSaldoDevedor, calcularVendaProjetada, calcularTIRExcel } from "@/lib/financial";
import { calcularDespesasVenda } from "@/lib/expense-calculator";

import AmortizationTable from "@/components/projections/AmortizationTable";
import FinanciamentoPlantaCharts from "@/components/projections/FinanciamentoPlantaCharts";
import FinanciamentoTotais from "@/components/projections/FinanciamentoTotais";

// Create a simple data URL for the placeholder image
const propertyPlaceholderImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23f5f7fa' /%3E%3Crect x='150' y='150' width='500' height='300' fill='%23e4e7eb' rx='8' ry='8' /%3E%3Cpath d='M350,200 L450,200 L450,300 L350,300 Z' fill='%23c5c9d0' /%3E%3Cpath d='M250,250 L330,250 L330,400 L250,400 Z' fill='%23c5c9d0' /%3E%3Cpath d='M470,250 L550,250 L550,400 L470,400 Z' fill='%23c5c9d0' /%3E%3Cpath d='M150,400 L650,400 L400,150 Z' fill='%23a4acb8' /%3E%3Ctext x='400' y='475' font-family='Arial, sans-serif' font-size='24' text-anchor='middle' fill='%2364748b'%3EImagem não disponível%3C/text%3E%3C/svg%3E";

import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
  BarChart as RechartsBarChart,
  Bar,
  Legend,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  ReferenceLine
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Printer, 
  User,
  ArrowUpRight, 
  TrendingUp, 
  Home, 
  Calendar, 
  DollarSign,
  CircleDollarSign,
  BarChart as BarChartIcon, 
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Building,
  Eye,
  Landmark,
  ArrowRight,
  Clock,
  BarChart3,
  Info,
  FileText,
  ShoppingCart,
  CalendarClock,
  Wallet,
  PiggyBank,
  ArrowUpDown,
  FileSpreadsheet,
  Filter,
  EyeOff,
  Key,
  PencilIcon,
  Calculator,
  Save,
  ChevronRight,
  PercentIcon,
  CreditCard,
  Repeat,
  CheckCircle2,
  PlusCircle,
  MoreHorizontal,
  Check,
  AlertTriangle,
  Target,
  Banknote,
  Wrench,
  Lightbulb,
  ChevronDown,
  BarChart4,
  X,
  Monitor,
  Smartphone
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatPercentage, formatDate, formatShortCurrency, formatAppreciationPercentage } from "@/lib/utils";
import { PROJECTION_STRATEGY, type Projection } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Definindo o tipo para os cenários
type Scenario = 'conservador' | 'padrao' | 'otimista' | 'conservative' | 'realistic' | 'optimistic';

export default function PublicReport() {
  // Método mais direto - extrair publicId diretamente da URL atual
  const currentPath = window.location.pathname;
  const pathParts = currentPath.split('/');
  const reportIndex = pathParts.findIndex(part => part === 'report');
  const publicId = reportIndex !== -1 && reportIndex + 1 < pathParts.length 
    ? pathParts[reportIndex + 1] 
    : null;

  console.log('PublicReport Debug:', {
    currentPath,
    pathParts,
    reportIndex,
    publicId,
    fullUrl: window.location.href
  });

  // Estados para controle de cenários por estratégia
  const [futureSaleScenario, setFutureSaleScenario] = useState<Scenario>('padrao');
  const [appreciationScenario, setAppreciationScenario] = useState<Scenario>('padrao');
  const [rentalYieldScenario, setRentalYieldScenario] = useState<Scenario>('padrao');
  // Cenário para a visão completa
  const [completeScenario, setCompleteScenario] = useState<Scenario>('padrao');
  
  // Estado para controlar o período de análise em anos (para a aba de Valorização Patrimonial)
  const [selectedTimeframe, setSelectedTimeframe] = useState<number>(10);
  
  // Estados para controlar visibilidade do eixo Y nos gráficos mobile
  const [showYAxisEvolucao, setShowYAxisEvolucao] = useState<boolean>(false);
  const [showYAxisDetalhamento, setShowYAxisDetalhamento] = useState<boolean>(false);
  
  // Detecção de mobile
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // Estado para controlar a notificação mobile
  const [showMobileNotification, setShowMobileNotification] = useState<boolean>(false);
  
  // Estado para controlar a expansão dos detalhes
  const [expandedDetails, setExpandedDetails] = useState<{
    totalPago: boolean;
    saldoDevedor: boolean;
    despesasVenda: boolean;
  }>({
    totalPago: false,
    saldoDevedor: false,
    despesasVenda: false
  });
  
  // Função para alternar a exibição de detalhes
  const toggleDetails = (section: keyof typeof expandedDetails) => {
    setExpandedDetails(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Registrar quando a última atualização ocorreu
  const lastUpdateRef = useRef(new Date());
  
  // Estado para controlar a seção ativa no scroll
  const [activeSection, setActiveSection] = useState<string>('compra');
  
  const reportRef = useRef<HTMLDivElement>(null);

  // Buscar dados do relatório público primeiro
  const { data: publicReportData, isLoading, error } = useQuery({
    queryKey: ['/api/public/report', publicId],
    queryFn: async () => {
      if (!publicId) {
        throw new Error('PublicId não encontrado na URL');
      }
      console.log('Fazendo fetch com publicId:', publicId);
      const response = await fetch(`/api/public/report/${publicId}`);
      if (!response.ok) {
        throw new Error('Relatório não encontrado');
      }
      return response.json();
    },
    enabled: !!publicId,
  });

  // Sistema simplificado de registro de acesso único
  const accessRegisteredRef = useRef<boolean>(false);

  // Função para obter informações do dispositivo/browser
  const getDeviceInfo = () => {
    const parser = UAParser();
    const result = parser;
    
    const browser = result.browser.name || 'Unknown';
    const os = result.os.name || 'Unknown';
    const deviceType = result.device.type || 'desktop';
    
    const deviceModel = result.device.model || null;
    const deviceVendor = result.device.vendor || null;
    const fullDeviceModel = deviceVendor && deviceModel 
      ? `${deviceVendor} ${deviceModel}` 
      : deviceModel || 'Desconhecido';

    return { 
      browser, 
      os, 
      deviceType,
      deviceModel: fullDeviceModel
    };
  };

  // Função para registrar acesso único
  const registerAccess = async () => {
    if (!publicId || accessRegisteredRef.current) return;

    try {
      const deviceInfo = getDeviceInfo();
      
      const response = await fetch('/api/public/report/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
          browser: deviceInfo.browser,
          device_type: deviceInfo.deviceType,
          device_model: deviceInfo.deviceModel,
          os: deviceInfo.os
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && !result.skipped) {
          console.log('Acesso registrado com sucesso:', result.id);
          accessRegisteredRef.current = true;
        } else if (result.skipped) {
          console.log('Registro pulado:', result.reason);
          accessRegisteredRef.current = true;
        }
      }
    } catch (error) {
      console.error('Erro ao registrar acesso:', error);
    }
  };

  // Registrar acesso único quando o componente carrega
  useEffect(() => {
    if (publicId && !accessRegisteredRef.current) {
      console.log('Registrando acesso para publicId:', publicId);
      registerAccess();
    }
  }, [publicId]);

  // Detectar se é mobile e mostrar notificação apenas no carregamento inicial
  useEffect(() => {
    const isMobileDevice = window.innerWidth < 768;
    setIsMobile(isMobileDevice);
    
    // Mostrar notificação apenas se for mobile no carregamento inicial
    if (isMobileDevice) {
      setShowMobileNotification(true);
    }
  }, []);

  // Detectar mudanças no tamanho da tela apenas para ajustar o layout (sem afetar notificação)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Auto-ocultar notificação após 10 segundos
  useEffect(() => {
    if (showMobileNotification) {
      const timer = setTimeout(() => {
        setShowMobileNotification(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [showMobileNotification]);

  // Helper function to get rental adjustment rate by scenario
  const getReajusteAluguelByScenario = (projection: any, scenario: Scenario = 'padrao') => {
    try {
      if (!projection) {
        // Valores padrão por cenário em caso de projeção não definida
        return scenario === 'conservador' ? '3.0' : 
               scenario === 'otimista' ? '8.0' : '5.0';
      }
      
      if (scenario === 'conservador') {
        return Number(projection.conservador_aluguel_reajuste_anual || 3).toFixed(1);
      } else if (scenario === 'otimista') {
        return Number(projection.otimista_aluguel_reajuste_anual || 8).toFixed(1);
      } else {
        // Padrão
        return Number(projection.padrao_aluguel_reajuste_anual || 5).toFixed(1);
      }
    } catch (error) {
      console.error('Erro ao obter taxa de reajuste do aluguel:', error);
      // Valores padrão por cenário em caso de erro
      return scenario === 'conservador' ? '3.0' : 
             scenario === 'otimista' ? '8.0' : '5.0';
    }
  };

  const projection = publicReportData?.projection;
  const user = publicReportData?.user;
  
  // Adicionar calculosProjecao que está sendo usado na seção de Venda Futura
  const calculosProjecao = projection?.calculationResults?.calculosProjecao || [];

  // Estado para armazenar os valores da TIR
  const [tirValues, setTirValues] = useState<{
    padrao: { mensal: number; anual: number };
    conservador: { mensal: number; anual: number };
    otimista: { mensal: number; anual: number };
    isLoading: boolean;
  }>({
    padrao: { mensal: 0, anual: 0 },
    conservador: { mensal: 0, anual: 0 },
    otimista: { mensal: 0, anual: 0 },
    isLoading: true
  });

  // Handle print function - defined after query to avoid initialization issues
  const handlePrint = useReactToPrint({
    content: () => reportRef.current,
    documentTitle: `Relatório de Investimento - ${publicReportData?.projection?.title || 'Relatório'}`,
  });

  // Função para calcular valor final com valorização composta
  const calculateFinalValue = (initialValue: number, annualRate: number, years: number) => {
    // Calcula o valor final usando a fórmula de valorização composta correta
    // Valor anterior + (Valor anterior * taxa)
    let currentValue = initialValue;
    for (let year = 1; year <= years; year++) {
      currentValue = currentValue + (currentValue * annualRate);
    }
    return currentValue;
  };

  // Função para calcular o rendimento mensal líquido
  const calculateMonthlyNetIncome = (
    rentalIncome: number, 
    occupancyRate: number, 
    managementFee: number, 
    maintenanceFee: number
  ): number => {
    // Rendimento Mensal Líquido = (Renda Mensal Bruta * Taxa de Ocupação) - (Renda Mensal Bruta * Taxa de Ocupação * Taxa de Administração) - (Renda Mensal Bruta * Taxa de Ocupação * Manutenção Mensal)
    const grossIncomeWithOccupancy = rentalIncome * (occupancyRate / 100);
    const managementCost = grossIncomeWithOccupancy * (managementFee / 100);
    const maintenanceCost = grossIncomeWithOccupancy * (maintenanceFee / 100);
    
    return grossIncomeWithOccupancy - managementCost - maintenanceCost;
  };

  // Função para calcular o rendimento anual líquido
  const calculateAnnualNetIncome = (monthlyNetIncome: number): number => {
    // Rendimento Anual Líquido = Rendimento Mensal Líquido * 12
    return monthlyNetIncome * 12;
  };

  // Função para gerar dados de fluxo de aluguel
  const generateRentalFlowData = (
    projection: any,
    calculosProjecao: any[] | undefined,
    yearlyRentalData: any[] | undefined,
    deliveryMonths: number,
    years: number,
    scenario: Scenario = 'padrao'
  ) => {
    // Estrutura para armazenar os dados agregados anualmente
    const yearlyData: {
      year: number;    // Número do ano
      label: string;   // Rótulo do ano para exibição
      payments: number; // Total de pagamentos no ano (parcelas, entrada, reforços, chaves)
      rental: number;  // Rendimento de aluguel anual
    }[] = [];
    
    // Verificar se temos dados válidos para os cálculos
    if (!calculosProjecao || calculosProjecao.length === 0) {
      console.log("generateRentalFlowData: Sem cálculos disponíveis para o gráfico");
      return [];
    }
    
    // Adaptar o cenário para o formato do banco
    let scenarioAdaptado = scenario;
    if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
    if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
    if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';
    
    // Sempre usar os cálculos do cenário padrão, independente do cenário selecionado
    // Isso é necessário porque os cenários compartilham a mesma estrutura de cronograma
    // mas diferem nas taxas de ocupação, administração, valores e reajustes
    let calculosDoScenario = calculosProjecao.filter(c => !c.cenario || c.cenario === 'padrao');
    
    if (calculosDoScenario.length === 0) {
      console.log("generateRentalFlowData: Sem cálculos para o cenário padrão", { 
        scenario,
        scenarioAdaptado,
        calculosDisponiveis: calculosProjecao.length,
        cenariosDisponiveis: [...new Set(calculosProjecao.map(c => c.cenario || 'sem_cenario'))]
      });
      
      // Tentar pegar qualquer cálculo disponível se não encontrar os do cenário padrão
      calculosDoScenario = calculosProjecao;
      
      if (calculosDoScenario.length === 0) {
        return [];
      }
    }
    
    // Obter a taxa de reajuste de aluguel anual de acordo com o cenário
    let taxaReajusteAluguel = 0;
    try {
      if (scenarioAdaptado === 'padrao') {
        taxaReajusteAluguel = parseFloat(String(projection.padrao_aluguel_reajuste_anual || '5')) / 100;
      } else if (scenarioAdaptado === 'conservador') {
        taxaReajusteAluguel = parseFloat(String(projection.conservador_aluguel_reajuste_anual || '4')) / 100;
      } else if (scenarioAdaptado === 'otimista') {
        taxaReajusteAluguel = parseFloat(String(projection.otimista_aluguel_reajuste_anual || '6')) / 100;
      }
    } catch (error) {
      console.error("Erro ao obter taxa de reajuste do aluguel:", error);
      taxaReajusteAluguel = 0.05; // Valor padrão caso ocorra erro
    }
    
    console.log("generateRentalFlowData: Taxa de reajuste anual do aluguel:", {
      cenario: scenarioAdaptado,
      taxa: taxaReajusteAluguel,
      taxaPercentual: `${(taxaReajusteAluguel * 100).toFixed(2)}%`
    });
    
    // Calcular o valor mensal de aluguel para o cenário
    let valorMensalAluguel = 0;
    try {
      if (scenarioAdaptado === 'padrao') {
        valorMensalAluguel = parseFloat(String(projection.padrao_aluguel_valor_mensal || '0'));
      } else if (scenarioAdaptado === 'conservador') {
        valorMensalAluguel = parseFloat(String(projection.conservador_aluguel_valor_mensal || '0'));
      } else if (scenarioAdaptado === 'otimista') {
        valorMensalAluguel = parseFloat(String(projection.otimista_aluguel_valor_mensal || '0'));
      }
    } catch (error) {
      console.error("Erro ao obter valor mensal do aluguel:", error);
    }
    
    // Calcular as taxas do aluguel (ocupação, administração, manutenção)
    let taxaOcupacao = 1;
    let taxaAdministracao = 0;
    let custoManutencao = 0;
    
    try {
      if (scenarioAdaptado === 'padrao') {
        taxaOcupacao = parseFloat(String(projection.padrao_aluguel_ocupacao || '100')) / 100;
        taxaAdministracao = parseFloat(String(projection.padrao_aluguel_taxa_administracao || '8')) / 100;
        custoManutencao = parseFloat(String(projection.padrao_aluguel_manutencao || '150'));
      } else if (scenarioAdaptado === 'conservador') {
        taxaOcupacao = parseFloat(String(projection.conservador_aluguel_ocupacao || '90')) / 100;
        taxaAdministracao = parseFloat(String(projection.conservador_aluguel_taxa_administracao || '10')) / 100;
        custoManutencao = parseFloat(String(projection.conservador_aluguel_manutencao || '200'));
      } else if (scenarioAdaptado === 'otimista') {
        taxaOcupacao = parseFloat(String(projection.otimista_aluguel_ocupacao || '100')) / 100;
        taxaAdministracao = parseFloat(String(projection.otimista_aluguel_taxa_administracao || '6')) / 100;
        custoManutencao = parseFloat(String(projection.otimista_aluguel_manutencao || '100'));
      }
    } catch (error) {
      console.error("Erro ao obter taxas do aluguel:", error);
    }
    
    // Converter mês da entrega para ano e mês correspondente
    const deliveryYear = Math.ceil(deliveryMonths / 12);
    const deliveryMonthInYear = deliveryMonths % 12 || 12; // 1-12 (janeiro = 1)
    
    // Cálculo correto de meses restantes no ano após a entrega
    // Considerando sempre a partir do mês seguinte à entrega até o final do ano
    // Exemplo: entrega no mês 40 (ano 4, mês 4) - contamos do mês 41 ao mês 48 = 8 meses
    // Como solicitado: "acrescente sempre um mes a mais que o mes da entrega"
    const yearEndMonth = deliveryYear * 12;
    const monthsAfterDeliveryInDeliveryYear = yearEndMonth - deliveryMonths;
    
    console.log("generateRentalFlowData: Dados da entrega:", {
      mesEntrega: deliveryMonths,
      anoEntrega: deliveryYear,
      mesNoAnoEntrega: deliveryMonthInYear,
      mesesAposEntregaNoAnoEntrega: monthsAfterDeliveryInDeliveryYear,
      mesFinalDoAno: yearEndMonth
    });
    
    // Calcular valor mensal líquido do aluguel
    // Fórmula correta: Valor com ocupação - (Valor com ocupação × Administração) - (Valor com ocupação × Manutenção%)
    const custoManutencaoPercentual = custoManutencao / 100; // Convertendo para percentual se for valor monetário
    const valorBrutoComOcupacao = valorMensalAluguel * taxaOcupacao;
    const valorAdministracao = valorBrutoComOcupacao * taxaAdministracao;
    const valorManutencao = valorBrutoComOcupacao * custoManutencaoPercentual;
    const valorMensalLiquido = valorBrutoComOcupacao - valorAdministracao - valorManutencao;
    
    console.log("generateRentalFlowData: Valor mensal líquido calculado:", {
      valorMensal: valorMensalAluguel,
      ocupacao: taxaOcupacao,
      valorBrutoComOcupacao: valorBrutoComOcupacao,
      administracao: taxaAdministracao,
      valorAdministracao: valorAdministracao,
      manutencao: custoManutencao,
      manutencaoPercentual: custoManutencaoPercentual,
      valorManutencao: valorManutencao, 
      valorLiquido: valorMensalLiquido
    });
    
    // Calcular pagamentos por ano
    for (let year = 1; year <= years; year++) {
      const startMonth = (year - 1) * 12;
      const endMonth = year * 12 - 1;
      
      // 1. Calcular pagamentos do ano (parcelas, entrada, reforços, chaves)
      const calculosDoAno = calculosDoScenario.filter(c => 
        c.mes >= startMonth && c.mes <= endMonth
      );
      
      let yearlyPayments = 0;
      
      calculosDoAno.forEach(calculo => {
        // Para a entrada no mês 0
        if (calculo.mes === 0) {
          yearlyPayments += parseFloat(String(calculo.valorEntrada || 0));
        }
        
        // Para parcelas normais
        yearlyPayments += parseFloat(String(calculo.parcelaCorrigida || 0));
        
        // Para reforços
        yearlyPayments += parseFloat(String(calculo.reforcoCorrigido || 0));
        
        // Para pagamento de chaves (apenas no mês de entrega)
        if (calculo.mes === deliveryMonths) {
          yearlyPayments += parseFloat(String(calculo.chavesCorrigido || 0));
        }
      });
      
      // 2. Calcular rendimentos do ano (apenas após a entrega do imóvel)
      let yearlyRental = 0;
      
      // Calcular o valor anual do aluguel com base no ano
      if (year > deliveryYear) {
        // Anos completos após a entrega - aplica reajuste anual composto
        // Ano 5 (primeiro ano completo após a entrega) = valorMensalLiquido * (1 + taxa) * 12
        // Ano 6 (segundo ano completo após a entrega) = valorMensalLiquido * (1 + taxa)^2 * 12
        
        // Calcular quantos anos após o ano da entrega (ano 4 = 0, ano 5 = 1, etc)
        const anosAposEntrega = year - deliveryYear;
        
        // Aplicar o fator de reajuste composto para os anos completos após entrega
        const fatorReajuste = Math.pow(1 + taxaReajusteAluguel, anosAposEntrega);
        yearlyRental = valorMensalLiquido * fatorReajuste * 12;
        
        console.log(`Cálculo para o ano ${year} (${anosAposEntrega} anos após entrega):`, {
          valorBase: valorMensalLiquido,
          taxaReajuste: taxaReajusteAluguel,
          formula: `${valorMensalLiquido} * (1 + ${taxaReajusteAluguel})^${anosAposEntrega} * 12`,
          fatorReajuste: fatorReajuste,
          valorMensalReajustado: valorMensalLiquido * fatorReajuste,
          valorAnual: yearlyRental
        });
      } 
      else if (year === deliveryYear) {
        // Ano da entrega - calcula valor proporcional aos meses restantes no ano
        // No caso de entrega no mês 40, contaremos exatamente 7 meses (meses 41-47) para fechar o ano
        
        // Regra especial: meses para calcular = 12 - (mês no ano + 1)
        // Exemplo: mês 40 (que é mês 4 no ano 4) => 12 - (4 + 1) = 7 meses
        const mesesRestantesAposEntrega = 12 - (deliveryMonthInYear + 1);
        yearlyRental = valorMensalLiquido * mesesRestantesAposEntrega;
        
        console.log("Cálculo para o ano da entrega:", {
          mesEntrega: deliveryMonths,
          mesNoAno: deliveryMonthInYear,
          formula: `12 - (${deliveryMonthInYear} + 1) = ${mesesRestantesAposEntrega}`,
          mesesRestantes: mesesRestantesAposEntrega,
          valorMensal: valorMensalLiquido,
          total: yearlyRental
        });
      }
      
      // 3. Adicionar dados do ano ao array
      yearlyData.push({
        year,
        label: `Ano ${year}`,
        payments: yearlyPayments,
        rental: yearlyRental
      });
    }
    
    console.log("generateRentalFlowData: Dados anuais gerados", { 
      anos: yearlyData.length,
      primeiroAno: yearlyData[0],
      anoEntrega: yearlyData[deliveryYear - 1],
      ultimoAno: yearlyData[yearlyData.length - 1],
      cenario: scenario
    });
    
    return yearlyData;
  };

  // Função para obter taxa de valorização por cenário
  const getAppreciationRate = (scenario: string) => {
    // Buscar SEMPRE valores diretamente do banco nos campos específicos, sem fallback
    if (scenario === 'conservador') {
      if (projection?.conservador_valorizacao_taxa_anual) {
        const rate = parseFloat(projection.conservador_valorizacao_taxa_anual) / 100;
        console.log('Taxa anual conservadora:', rate);
        return rate;
      }
      console.error('Taxa de valorização do cenário conservador não encontrada');
      return 0; // Retorna 0 se não encontrar (será tratado na interface)
    } else if (scenario === 'otimista') {
      if (projection?.otimista_valorizacao_taxa_anual) {
        const rate = parseFloat(projection.otimista_valorizacao_taxa_anual) / 100;
        console.log('Taxa anual otimista:', rate);
        return rate;
      }
      console.error('Taxa de valorização do cenário otimista não encontrada');
      return 0; // Retorna 0 se não encontrar (será tratado na interface)
    } else {
      // Cenário padrão
      if (projection?.padrao_valorizacao_taxa_anual) {
        const rate = parseFloat(projection.padrao_valorizacao_taxa_anual) / 100;
        console.log('Taxa anual padrão:', rate);
        return rate;
      }
      console.error('Taxa de valorização do cenário padrão não encontrada');
      return 0; // Retorna 0 se não encontrar (será tratado na interface)
    }
  };

  // Função para gerar dados de valorização patrimonial
  const generateAppreciationData = (initialValue: number, annualRate: number, years: number) => {
    const data = [];
    let currentValue = initialValue;
    
    // Ano zero é sempre o valor inicial
    data.push({
      year: 0,
      value: currentValue
    });
    
    // Calcula a valorização para cada ano subsequente
    for (let year = 1; year <= years; year++) {
      // Fórmula: Valor atual = Valor anterior + (Valor anterior * Taxa)
      currentValue = currentValue + (currentValue * annualRate);
      
      data.push({
        year,
        value: currentValue
      });
    }
    
    return data;
  };

  // Função para gerar dados de detalhamento anual de valorização
  const generateYearlyDetailsData = (initialValue: number, annualRate: number, years: number) => {
    const data = [];
    let previousValue = initialValue;
    
    for (let year = 1; year <= years; year++) {
      // Calcula o valor atual usando a fórmula de valorização: Valor anterior + (Valor anterior * Taxa)
      const currentValue = previousValue + (previousValue * annualRate);
      // A valorização é a diferença entre o valor atual e o anterior
      const appreciation = currentValue - previousValue;
      
      data.push({
        year,
        appreciation
      });
      
      previousValue = currentValue;
    }
    
    return data;
  };

  // Função para gerar dados de tabela de valorização
  const generateTableData = (initialValue: number, annualRate: number, years: number) => {
    const data = [];
    let currentValue = initialValue;
    
    // Ano zero é sempre o valor inicial
    data.push({
      year: 0,
      value: currentValue,
      appreciation: 0,
      percent: 0
    });
    
    // Calcula a valorização para cada ano subsequente
    for (let year = 1; year <= years; year++) {
      // Fórmula: Valor atual = Valor anterior + (Valor anterior * Taxa)
      const appreciation = currentValue * annualRate;
      const nextValue = currentValue + appreciation;
      
      data.push({
        year,
        value: nextValue,
        appreciation: appreciation,
        percent: annualRate
      });
      
      currentValue = nextValue;
    }
    
    return data;
  };

  // Effect para calcular TIR quando a projeção estiver carregada
  useEffect(() => {
    if (!projection?.id) return;

    const loadTIR = async () => {
      try {
        setTirValues(prev => ({ ...prev, isLoading: true }));

        // Detectar os cenários preenchidos com base nos campos da projeção
        const cenariosDisponiveis = [];

        if (projection?.padrao_venda_prazo) {
          cenariosDisponiveis.push("padrao");
        }

        if (projection?.conservador_venda_prazo) {
          cenariosDisponiveis.push("conservador");
        }

        if (projection?.otimista_venda_prazo) {
          cenariosDisponiveis.push("otimista");
        }
        
        console.log("Cenários disponíveis para TIR:", cenariosDisponiveis);
        
        // Objeto para armazenar os resultados de todos os cenários
        const resultados: any = {
          padrao: { mensal: 0, anual: 0 },
          conservador: { mensal: 0, anual: 0 },
          otimista: { mensal: 0, anual: 0 },
          isLoading: false
        };
        
        // Só chamar calcularTIR(...) para cenários que estão na lista cenariosDisponiveis
        for (const cenario of cenariosDisponiveis) {
          try {
            const response = await fetch(`/api/tir/calcular?projectionId=${projection.id}&scenario=${cenario}`);
            
            if (response.ok) {
              const result = await response.json();
              console.log(`TIR calculada com sucesso para cenário ${cenario}:`, result);
              
              // Converter para números se necessário e multiplicar por 100 para formato percentual
              const mensalValue = typeof result.tirMensal === 'string' 
                ? parseFloat(result.tirMensal) * 100 
                : result.tirMensal * 100;
                
              // A TIR anual já vem em formato decimal (0.18 = 18%)
              const anualValue = typeof result.tirAnual === 'string' 
                ? parseFloat(result.tirAnual) * 100 
                : result.tirAnual * 100;
              
              console.log(`Valores TIR convertidos para cenário ${cenario}:`, {
                mensal: mensalValue,
                anual: anualValue
              });
              
              // Armazena os valores processados no objeto de resultados
              resultados[cenario] = { 
                mensal: mensalValue,
                anual: anualValue
              };
            } else {
              console.error(`Erro ao calcular TIR para cenário ${cenario}:`, response.statusText);
            }
          } catch (cenarioError) {
            console.error(`Erro ao processar TIR para cenário ${cenario}:`, cenarioError);
          }
        }
        
        // Atualiza o estado com todos os valores calculados
        setTirValues({
          ...resultados,
          isLoading: false
        });
      } catch (error) {
        console.error("Erro ao calcular TIR:", error);
        setTirValues({
          padrao: { mensal: 0, anual: 0 },
          conservador: { mensal: 0, anual: 0 },
          otimista: { mensal: 0, anual: 0 },
          isLoading: false
        });
      }
    };

    loadTIR();
  }, [projection?.id]);

  useEffect(() => {
    const sections = ['compra', 'venda-futura', 'valorizacao', 'locacao'];

    const scrollContainer = document.querySelector('[data-scroll-container]') || window;
    
    const handleScroll = () => {
      const scrollTop = scrollContainer === window ? window.scrollY : (scrollContainer as Element).scrollTop;
      
      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          const offsetTop = scrollContainer === window ? rect.top + window.scrollY : rect.top + (scrollContainer as Element).scrollTop;
          
          if (scrollTop >= offsetTop - 100) {
            setActiveSection(sectionId);
          }
        }
      }
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (error || !projection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Relatório não encontrado</h1>
          <p className="text-gray-600">O link pode ter expirado ou sido removido.</p>
        </div>
      </div>
    );
  }

  // Usar dados calculados da projeção
  const clientName = projection.client?.name || "Cliente não informado";
  const propertyTitle = projection.propertyName || projection.property?.name || "Imóvel não informado";
  const propertyAddress = [
    projection.address || projection.property?.address,
    projection.neighborhood || projection.property?.neighborhood,
    projection.city || projection.property?.city,
    projection.state
  ].filter(Boolean).join(", ") || "Endereço não informado";

  // Verificar quais estratégias estão ativas
  const strategies = Array.isArray(projection.strategies) ? projection.strategies : [];
  const hasFutureSale = strategies.includes(PROJECTION_STRATEGY.FUTURE_SALE) || strategies.includes('FUTURE_SALE');
  const hasAppreciation = strategies.includes(PROJECTION_STRATEGY.ASSET_APPRECIATION) || strategies.includes('ASSET_APPRECIATION');
  const hasRentalYield = strategies.includes(PROJECTION_STRATEGY.RENTAL_YIELD) || strategies.includes('RENTAL_YIELD');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notificação Mobile */}
      {showMobileNotification && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4">
          <Alert className="bg-blue-50 border-blue-200 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 justify-center">
                <Monitor className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <AlertDescription className="text-blue-800 text-sm text-center">
                  Para uma melhor visualização do relatório, sugerimos abrir o link em um desktop, notebook ou tablet.
                </AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileNotification(false)}
                className="text-blue-600 hover:text-blue-800 flex-shrink-0 h-auto p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {/* Header moderno e centralizado - Responsivo */}
      <div className="bg-white shadow-sm" style={{ paddingTop: isMobile ? '8px' : '0px' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-[0px] pb-[0px]">
          <div className="flex flex-col items-center text-center space-y-4 sm:space-y-5">
            {/* Logo da empresa - responsivo */}
            <div className="flex-shrink-0">
              {user?.photo ? (
                <img 
                  src={user.photo} 
                  alt={user.company || user.name}
                  className="w-16 h-16 sm:w-32 sm:h-32 rounded-xl sm:rounded-3xl object-cover shadow-md sm:shadow-xl ring-1 sm:ring-4 ring-gray-50"
                />
              ) : (
                <div className="w-16 h-16 sm:w-32 sm:h-32 rounded-xl sm:rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-md sm:shadow-xl ring-1 sm:ring-4 ring-gray-50">
                  <span className="text-slate-700 font-bold text-lg sm:text-4xl">
                    {(user?.company || user?.name || 'R').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            {/* Informações da empresa - responsivas */}
            <div className="space-y-2 sm:space-y-3 max-w-2xl px-2">
              {/* Nome da empresa */}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {user?.company || 'Imobiliária'}
                </h1>
                <div className="mt-1.5 sm:mt-2 mx-auto w-16 sm:w-20 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              </div>
              
              {/* Nome do corretor */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Corretor Responsável
                </p>
                <p className="text-base sm:text-lg font-semibold text-gray-800">
                  {user?.name || 'Nome não informado'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Linha decorativa sutil */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
      </div>

      {/* Conteúdo do relatório - Responsivo */}
      <div className="max-w-7xl mx-auto px-0 sm:px-4 py-6 sm:py-8">
        <div ref={reportRef} className="space-y-6 sm:space-y-8 bg-white rounded-none sm:rounded-lg border-0 sm:border">
          {/* Cabeçalho do relatório com logo e título - Responsivo */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b pb-0 sm:pb-1 space-y-2 sm:space-y-0">
            <div className="text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold">Análise de Investimento</h2>
              <p className="text-slate-500 text-sm">Criado em {formatDate(projection.createdAt)}</p>
            </div>

          </div>
          
          {/* Card do imóvel - Design ultra moderno e minimalista */}
          <div className="relative overflow-hidden rounded-lg mb-3">
            {/* Borda superior mais fina e elegante */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-primary z-10"></div>
            
            {/* Card principal com sombra */}
            <div className="bg-white shadow-md p-0 relative mt-2 border border-slate-100">
              {projection.property?.imageUrl ? (
                /* Layout com imagem - Responsivo */
                <div className="grid grid-cols-12 gap-0">
                  {/* Coluna de informações - Responsivo */}
                  <div className="col-span-12 lg:col-span-8 p-0">
                    {/* Header com título e tags - Responsivo */}
                    <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Cod. #{projection.id}
                        </span>
                      </div>
                      {/* Título do imóvel apenas se existir */}
                      {propertyTitle && <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">{propertyTitle}</h3>}
                    </div>
                    
                    {/* Informações do imóvel - Responsivo */}
                    <div className="px-4 sm:px-6 py-3">
                      {/* Exibir preço somente se existir */}
                      {projection.listPrice ? (
                        <div className="flex flex-wrap items-baseline gap-2 mb-3">
                          <span className="text-lg sm:text-xl font-bold text-primary">{formatCurrency(projection.listPrice)}</span>
                          {(projection.propertyArea || projection.area_imovel || projection.property?.area) && (
                            <span className="text-sm text-slate-500">• {projection.propertyArea || projection.area_imovel || projection.property?.area} m²</span>
                          )}
                        </div>
                      ) : null}
                      
                      {/* Linha horizontal decorativa - exibida apenas se tiver informações acima */}
                      {(projection.listPrice || projection.propertyArea || projection.area_imovel || projection.property?.area) && (
                        <div className="w-12 h-0.5 bg-slate-200 mb-3"></div>
                      )}
                      
                      {/* Informações detalhadas - Grid responsivo */}
                      <div className="grid grid-cols-1 gap-y-3 gap-x-6">
                        {/* Endereço - exibido apenas se existir */}
                        {propertyAddress && (
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 mt-0.5">
                              <Building className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-slate-500">Endereço</p>
                              <p className="font-medium text-slate-800 text-sm break-words">{propertyAddress}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Cliente - exibido apenas se existir */}
                        {clientName && (
                          <div className="flex items-center gap-2">
                            <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100">
                              <User className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-slate-500">Cliente</p>
                              <p className="font-medium text-slate-800 text-sm">{clientName}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Descrição do Imóvel - apenas se existir */}
                        {(projection.propertyDescription || projection.descricao_imovel || projection.property?.description) && (
                          <div className="flex items-start gap-2 mt-2">
                            <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 mt-0.5">
                              <FileText className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-slate-500">Descrição</p>
                              <p className="font-medium text-slate-800 text-sm break-words">{projection.propertyDescription || projection.descricao_imovel || projection.property?.description}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Área de ações - Responsivo */}
                    <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 border-t border-slate-100">
                      {projection.property?.websiteUrl && (
                        <a 
                          href={projection.property.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex h-9 sm:h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none"
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          <span>Site do Imóvel</span>
                        </a>
                      )}
                      
                      <a 
                        href={`https://www.google.com/maps/search/${encodeURIComponent(propertyAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 sm:h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none"
                      >
                        <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                        <span>Ver no Mapa</span>
                      </a>
                    </div>
                  </div>
                  {/* Coluna da imagem - Responsivo */}
                  <div className="col-span-12 lg:col-span-4 relative h-[200px] lg:h-[280px] overflow-hidden p-2 sm:p-3">
                    <div className="relative h-full w-full rounded-md overflow-hidden bg-slate-50">
                      <img 
                        src={projection.property.imageUrl} 
                        alt={propertyTitle}
                        className="h-full w-full object-contain"
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-black/5 to-transparent"></div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Layout alternativo com imagem placeholder quando não tem imagem */
                <div className="grid grid-cols-12 gap-0">
                  {/* Coluna de informações (100% quando não há imagem) */}
                  <div className="col-span-12 p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          {projection.property?.propertyType || projection.property?.type ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {projection.property?.propertyType || (
                                projection.property?.type === "residential" ? "Residencial" :
                                projection.property?.type === "commercial" ? "Comercial" :
                                projection.property?.type === "land" ? "Terreno" : null
                              )}
                            </span>
                          ) : null}
                          {projection.id && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Cod. #{projection.id}
                            </span>
                          )}
                        </div>
                        {propertyTitle && <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-3">{propertyTitle}</h3>}
                      </div>
                    </div>
                    
                    <div className="w-12 h-0.5 bg-slate-200 my-3"></div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      {projection.listPrice && (
                        <div>
                          <p className="text-xs text-slate-500">Valor</p>
                          <p className="font-semibold text-primary">{formatCurrency(projection.listPrice)}</p>
                        </div>
                      )}
                      
                      {projection.property?.area && (
                        <div>
                          <p className="text-xs text-slate-500">Área</p>
                          <p className="font-semibold">{projection.property.area} m²</p>
                        </div>
                      )}
                      
                      {propertyAddress && (
                        <div className="col-span-2">
                          <p className="text-xs text-slate-500">Endereço</p>
                          <p className="font-semibold">{propertyAddress}</p>
                        </div>
                      )}
                      
                      {/* Descrição do Imóvel (adicionado) */}
                      {projection.property?.description && (
                        <div className="col-span-4 mt-2">
                          <p className="text-xs text-slate-500">Descrição</p>
                          <p className="font-medium text-slate-700">{projection.property.description}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                      {projection.property?.websiteUrl && (
                        <a 
                          href={projection.property.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none"
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          <span>Site do Imóvel</span>
                        </a>
                      )}
                      
                      <a 
                        href={`https://www.google.com/maps/search/${encodeURIComponent(propertyAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none"
                      >
                        <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                        <span>Ver no Mapa</span>
                      </a>
                      
                      {clientName && (
                        <div className="ml-auto text-xs text-slate-500">
                          Cliente: <span className="font-medium text-slate-700">{clientName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navegação contínua com scroll - Responsiva */}
          <div className="sticky top-0 z-50 bg-white px-3 sm:px-6 py-4 sm:py-6 border-b mt-2 mb-2">
            {/* Navegação das seções - Scroll horizontal no mobile */}
            <div className="flex justify-start sm:justify-center gap-4 sm:gap-8 overflow-x-auto pb-2 sm:pb-0">
            <a 
              href="#compra" 
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-lg font-semibold transition-colors hover:text-primary whitespace-nowrap ${
                activeSection === 'compra' ? 'font-bold text-primary' : 'text-slate-600'
              }`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('compra')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Dados da Compra</span>
              <span className="sm:hidden">Compra</span>
            </a>
            {hasFutureSale && (
              <a 
                href="#venda-futura" 
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-lg font-semibold transition-colors hover:text-primary whitespace-nowrap ${
                  activeSection === 'venda-futura' ? 'font-bold text-primary' : 'text-slate-600'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('venda-futura')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Venda Futura</span>
                <span className="sm:hidden">Venda</span>
              </a>
            )}
            {hasAppreciation && (
              <a 
                href="#valorizacao" 
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-lg font-semibold transition-colors hover:text-primary whitespace-nowrap ${
                  activeSection === 'valorizacao' ? 'font-bold text-primary' : 'text-slate-600'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('valorizacao')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <BarChartIcon className="h-4 w-4" />
                Valorização
              </a>
            )}
            {hasRentalYield && (
              <a 
                href="#locacao" 
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-lg font-semibold transition-colors hover:text-primary whitespace-nowrap ${
                  activeSection === 'locacao' ? 'font-bold text-primary' : 'text-slate-600'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('locacao')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Home className="h-4 w-4" />
                Locação
              </a>
            )}
            </div>
            
            {/* Seletor de cenário global - Responsivo */}
            {(projection?.selectedScenarios || []).length > 1 && (
              <div className="flex flex-col sm:flex-row justify-center items-center border-t border-gray-100 mt-1 mb-1 pt-1 sm:pt-4 pb-1 sm:pb-4 gap-1 sm:gap-1">
                <span className="text-gray-600 text-sm font-semibold">Cenários:</span>
                <div className="flex rounded-md overflow-hidden border border-gray-200">
                  {(projection?.selectedScenarios || []).includes("conservador") && (
                    <Button
                      variant={completeScenario === 'conservador' ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-none text-xs sm:text-sm px-3 sm:px-4"
                      onClick={() => {
                        setCompleteScenario('conservador');
                        setFutureSaleScenario('conservador');
                        setAppreciationScenario('conservador');
                        setRentalYieldScenario('conservador');
                        console.log("Alterando cenário global para: conservador");
                        lastUpdateRef.current = new Date();
                      }}
                    >
                      Conservador
                    </Button>
                  )}
                  
                  {(projection?.selectedScenarios || []).includes("padrao") && (
                    <Button
                      variant={completeScenario === 'padrao' ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-none text-xs sm:text-sm px-3 sm:px-4"
                      onClick={() => {
                        setCompleteScenario('padrao');
                        setFutureSaleScenario('padrao');
                        setAppreciationScenario('padrao');
                        setRentalYieldScenario('padrao');
                        console.log("Alterando cenário global para: padrao");
                        lastUpdateRef.current = new Date();
                      }}
                    >
                      Padrão
                    </Button>
                  )}
                  
                  {(projection?.selectedScenarios || []).includes("otimista") && (
                    <Button
                      variant={completeScenario === 'otimista' ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-none text-xs sm:text-sm px-3 sm:px-4"
                      onClick={() => {
                        setCompleteScenario('otimista');
                        setFutureSaleScenario('otimista');
                        setAppreciationScenario('otimista');
                        setRentalYieldScenario('otimista');
                        console.log("Alterando cenário global para: otimista");
                        lastUpdateRef.current = new Date();
                      }}
                    >
                      Otimista
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
            
          {/* Seções contínuas do relatório - substituindo as abas */}
          <div className="space-y-6">
            
            {/* Seção: Dados de Compra */}
            <section id="compra" className="space-y-8">
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                    Dados da Compra
                  </CardTitle>
                  <CardDescription>
                    Análise do financiamento na planta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Dados da Compra - 2 Colunas no Mobile */}
                  <div className="mb-8 -mx-6 px-6 md:mx-0 md:px-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-4">
                      {/* Valor do Imóvel */}
                      <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
                          <Home className="h-3 w-3 md:h-4 md:w-4 text-green-600 flex-shrink-0" />
                          <span className="text-xs md:text-sm">Valor do Imóvel</span>
                        </div>
                        <div className="text-sm md:text-lg font-bold break-words leading-tight">
                          {formatCurrency(parseFloat(projection.listPrice) || 0)}
                        </div>
                      </div>
                      
                      {/* Valor da Entrada */}
                      <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
                          <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-blue-600 flex-shrink-0" />
                          <span className="text-xs md:text-sm">Valor da Entrada</span>
                        </div>
                        <div className="text-sm md:text-lg font-bold break-words leading-tight">
                          {formatCurrency(parseFloat(projection.downPayment) || 0)}
                        </div>
                      </div>
                      
                      {/* Prazo Pagamento */}
                      <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
                          <CalendarClock className="h-3 w-3 md:h-4 md:w-4 text-purple-600 flex-shrink-0" />
                          <span className="text-xs md:text-sm">Prazo Pagamento</span>
                        </div>
                        <div className="text-sm md:text-lg font-bold leading-tight">
                          {projection.paymentMonths || 60}
                          <span className="text-xs font-normal text-slate-500 ml-1">meses</span>
                        </div>
                      </div>
                      
                      {/* Prazo de Entrega */}
                      <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
                          <Key className="h-3 w-3 md:h-4 md:w-4 text-amber-600 flex-shrink-0" />
                          <span className="text-xs md:text-sm">Prazo de Entrega</span>
                        </div>
                        <div className="text-sm md:text-lg font-bold leading-tight">
                          {projection.deliveryMonths || 40}
                          <span className="text-xs font-normal text-slate-500 ml-1">meses</span>
                        </div>
                      </div>
                      
                      {/* Taxa até Chaves */}
                      <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
                          <PercentIcon className="h-3 w-3 md:h-4 md:w-4 text-indigo-600 flex-shrink-0" />
                          <span className="text-xs md:text-sm">Taxa até Chaves</span>
                        </div>
                        <div className="text-sm md:text-lg font-bold leading-tight">
                          {projection.monthlyCorrection || 0.2}%
                          <span className="text-xs font-normal text-slate-500 ml-1">ao mês</span>
                        </div>
                      </div>
                      
                      {/* Taxa após Chaves */}
                      <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
                          <PercentIcon className="h-3 w-3 md:h-4 md:w-4 text-cyan-600 flex-shrink-0" />
                          <span className="text-xs md:text-sm">Taxa após Chaves</span>
                        </div>
                        <div className="text-sm md:text-lg font-bold leading-tight">
                          {projection.postDeliveryCorrection || 0.3}%
                          <span className="text-xs font-normal text-slate-500 ml-1">ao mês</span>
                        </div>
                      </div>
                      
                      {/* Valor Chaves */}
                      <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
                          <Key className="h-3 w-3 md:h-4 md:w-4 text-yellow-600 flex-shrink-0" />
                          <span className="text-xs md:text-sm">Valor Chaves</span>
                        </div>
                        <div className="text-sm md:text-lg font-bold break-words leading-tight">
                          {formatCurrency(parseFloat(projection.keysValue) || 0)}
                        </div>
                      </div>
                      
                      {/* Valor Reforços */}
                      <div className="bg-white rounded-lg border p-1.5 md:p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-1 md:gap-2 mb-1 text-xs text-slate-600">
                          <Banknote className="h-3 w-3 md:h-4 md:w-4 text-green-600 flex-shrink-0" />
                          <span className="text-xs md:text-sm">Valor Reforços</span>
                        </div>
                        <div className="text-sm md:text-lg font-bold break-words leading-tight">
                          {formatCurrency(parseFloat(projection.bonusValue) || 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gráficos e tabelas do financiamento na planta */}
                  <div className="space-y-6">
                    <FinanciamentoPlantaCharts projectionId={projection.id} />
                    <FinanciamentoTotais projectionId={projection.id} />
                    <AmortizationTable projectionId={projection.id} />
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Seção: Venda Futura */}
            {hasFutureSale && (
              <section id="venda-futura" className="space-y-8">

                <Card className="shadow-sm overflow-hidden border-0 bg-white">

                  <CardHeader className="pb-4 border-b">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                      <div className="flex flex-col">
                        <CardTitle className="flex items-center text-lg sm:text-xl text-gray-900">
                          <div className="bg-blue-50 p-1.5 rounded-lg mr-3 flex-shrink-0">
                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                          </div>
                          <span className="break-words">Análise de Investimento: Venda Futura</span>
                        </CardTitle>
                        <CardDescription className="mt-1 text-slate-500 text-sm">
                          Projeção financeira detalhada para aquisição e venda futura do imóvel
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium px-3 py-1 self-start sm:self-auto text-xs sm:text-sm">
                        Simulação Completa
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6">
                    {/* Cards de Informações Principais - Layout Responsivo */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                      {/* Card Valor do Imóvel */}
                      <Card className="bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 overflow-hidden relative">
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500"></div>
                        <CardContent className="p-1.5 md:p-5">
                          <div className="flex items-start">
                            <div className="mr-1 md:mr-3 mt-0.5 flex-shrink-0">
                              <div className="p-1 md:p-2 rounded-md bg-blue-50">
                                <Home className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs md:text-xs uppercase tracking-wider font-medium text-slate-500 block">Valor do Imóvel</span>
                              <div className="text-sm md:text-2xl font-bold mt-1 md:mt-1.5 text-slate-800 break-words leading-tight">
                                {(() => {
                                  // Usar o campo listPrice que contém o valor do imóvel
                                  const valorImovel = parseFloat(projection.listPrice || "0");

                                  return valorImovel 
                                    ? formatCurrency(valorImovel)
                                    : "R$ 0,00";
                                })()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Card Valor de Venda */}
                      <Card className="bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 overflow-hidden relative">
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-green-500"></div>
                        <CardContent className="p-1.5 md:p-5">
                          <div className="flex items-start">
                            <div className="mr-1 md:mr-3 mt-0.5">
                              <div className="p-1 md:p-2 rounded-md bg-green-50">
                                <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <span className="text-xs md:text-xs uppercase tracking-wider font-medium text-slate-500">Valor de Venda</span>
                              <div className="text-sm md:text-2xl font-bold mt-1 md:mt-1.5 text-slate-800 break-words leading-tight">
                                {(() => {
                                  // Calcular venda projetada usando a nova função
                                  const resultadoVendaProjetada = calcularVendaProjetada(
                                    projection,
                                    completeScenario // Usando o cenário global
                                  );

                                  console.log("Venda Projetada calculada no card principal", {
                                    scenario: completeScenario,
                                    valor: resultadoVendaProjetada.valorVendaProjetada,
                                    formatado: formatCurrency(resultadoVendaProjetada.valorVendaProjetada)
                                  });

                                  return formatCurrency(resultadoVendaProjetada.valorVendaProjetada);
                                })()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Card Prazo */}
                      <Card className="bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 overflow-hidden relative">
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-purple-500"></div>
                        <CardContent className="p-1.5 md:p-5">
                          <div className="flex items-start">
                            <div className="mr-1 md:mr-3 mt-0.5">
                              <div className="p-1 md:p-2 rounded-md bg-purple-50">
                                <Clock className="h-3 w-3 md:h-4 md:w-4 text-purple-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <span className="text-xs md:text-xs uppercase tracking-wider font-medium text-slate-500">MES DA VENDA</span>
                              <div className="text-sm md:text-2xl font-bold mt-1 md:mt-1.5 text-slate-800 flex items-baseline leading-tight">
                                <span>
                                  {(() => {
                                    // Obter mês da venda de acordo com o cenário atual
                                    let mesVenda = 0;

                                    // Log para debug
                                    // Log detalhado para debug
                                    console.log("Buscando mês da venda:", {
                                      cenario: completeScenario,
                                      padraoVendaPrazo: projection.padrao_venda_prazo,
                                      conservadorVendaPrazo: projection.conservador_venda_prazo,
                                      otimistaVendaPrazo: projection.otimista_venda_prazo,
                                      projectionId: projection.id,
                                      projecaoCompleta: projection
                                    });

                                    switch(completeScenario) {
                                      case 'conservative':
                                      case 'conservador':
                                        // Para cenário conservador, usar o valor conservador_venda_prazo do banco
                                        mesVenda = projection.conservador_venda_prazo ? 
                                          parseInt(projection.conservador_venda_prazo.toString()) : 
                                          (projection.deliveryMonths || 36);
                                        console.log("Usando valor CONSERVADOR:", mesVenda);
                                        break;
                                      case 'optimistic':
                                      case 'otimista':
                                        // Para cenário otimista, usar o valor otimista_venda_prazo do banco
                                        mesVenda = projection.otimista_venda_prazo ? 
                                          parseInt(projection.otimista_venda_prazo.toString()) : 
                                          (projection.deliveryMonths || 36);
                                        console.log("Usando valor OTIMISTA:", mesVenda);
                                        break;
                                      case 'padrao':
                                      case 'realistic':
                                      default:
                                        // Para cenário padrão, usar o valor padrao_venda_prazo do banco
                                        mesVenda = projection.padrao_venda_prazo ? 
                                          parseInt(projection.padrao_venda_prazo.toString()) : 
                                          (projection.deliveryMonths || 36);
                                        console.log("Usando valor PADRÃO:", mesVenda);
                                        break;
                                    }

                                    return mesVenda;
                                  })()}
                                </span>
                                <span className="text-xs ml-1.5 text-slate-500">meses</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Card Custo Total */}
                      <Card className="bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 overflow-hidden relative">
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500"></div>
                        <CardContent className="p-1.5 md:p-5">
                          <div className="flex items-start">
                            <div className="mr-1 md:mr-3 mt-0.5">
                              <div className="p-1 md:p-2 rounded-md bg-red-50">
                                <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <span className="text-xs md:text-xs uppercase tracking-wider font-medium text-slate-500">Custo Total</span>
                              <div className="text-sm md:text-2xl font-bold mt-1 md:mt-1.5 text-slate-800 break-words leading-tight">
                                {(() => {
                                  // Calcula o custo total baseado na função calcularDetalhamentoTotalPago
                                  const detalhesPagamento = calcularDetalhamentoTotalPago(
                                    projection,
                                    projection.calculationResults?.calculosProjecao || [],
                                    completeScenario // Usando o cenário global
                                  );

                                  return formatCurrency(detalhesPagamento.total);
                                })()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Segunda linha: Métricas de Retorno */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      {/* Métricas de Retorno */}
                      <div className="flex flex-col">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                          <div className="bg-indigo-50 p-1 rounded-md mr-2">
                            <PercentIcon className="h-4 w-4 text-indigo-600" />
                          </div>
                          Métricas de Retorno
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Lucro Líquido Card */}
                          <Card className="bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 overflow-hidden relative">
                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500"></div>
                            <CardContent className="p-1.5 md:p-5">
                              <div className="flex items-start">
                                <div className="mr-1 md:mr-3 mt-0.5">
                                  <div className="p-1 md:p-2 rounded-md bg-blue-50">
                                    <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <span className="text-xs md:text-xs uppercase tracking-wider font-medium text-slate-500">Lucro Líquido</span>
                                  <div className="text-sm md:text-2xl font-bold mt-1 md:mt-1.5 text-slate-800 break-words leading-tight">
                                    {(() => {
                                      // Usar o valor da venda projetada calculado pela função calcularVendaProjetada
                                      const resultadoVendaProjetada = calcularVendaProjetada(
                                        projection,
                                        completeScenario
                                      );

                                      // Obter os valores para o cálculo do Lucro Bruto
                                      const valorVendaProjetada = resultadoVendaProjetada.valorVendaProjetada;

                                      // Calcular o total pago (como valor negativo)
                                      const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                        projection,
                                        calculosProjecao,
                                        completeScenario
                                      );
                                      const totalPago = -detalhamentoTotalPago.total;

                                      // Obter ou calcular o saldo devedor
                                      const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                        ? calculosProjecao 
                                        : projection.calculationResults?.calculosProjecao || [];

                                      const saldoDevedorResult = calcularSaldoDevedor(
                                        projection,
                                        calculosParaUsar,
                                        completeScenario
                                      );
                                      const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;

                                      // Calcular as despesas de venda usando a função auxiliar (como valor negativo)
                                      const despesasCalculadas = calcularDespesasVenda(
                                        projection,
                                        valorVendaProjetada,
                                        completeScenario
                                      );
                                      
                                      const despesasVenda = -despesasCalculadas.total;

                                      // Calcular o lucro bruto: Venda Projetada + Total Pago + Saldo Devedor + Despesas de Vendas
                                      const lucroBruto = valorVendaProjetada + totalPago + saldoDevedor + despesasVenda;

                                      // Calcular o imposto de renda (valor negativo se lucro bruto for positivo)
                                      let impostoRenda = 0;
                                      if (lucroBruto > 0) {
                                        // Obter a taxa de imposto de acordo com o cenário
                                        let taxaImposto = 0;

                                        if (completeScenario === 'padrao') {
                                          taxaImposto = parseFloat(projection.padrao_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'conservador') {
                                          taxaImposto = parseFloat(projection.conservador_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'otimista') {
                                          taxaImposto = parseFloat(projection.otimista_venda_impostos || '15') / 100;
                                        }

                                        // Calcular o imposto como um valor negativo
                                        impostoRenda = -(lucroBruto * taxaImposto);
                                      }

                                      // Calcular o lucro líquido: Lucro Bruto + Imposto de Renda (já é negativo)
                                      const lucroLiquido = lucroBruto + impostoRenda;

                                      return formatCurrency(lucroLiquido);
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* ROI Card */}
                          <Card className="bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 overflow-hidden relative">
                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-purple-500"></div>
                            <CardContent className="p-1.5 md:p-5">
                              <div className="flex items-start">
                                <div className="mr-1 md:mr-3 mt-0.5">
                                  <div className="p-1 md:p-2 rounded-md bg-purple-50">
                                    <PercentIcon className="h-3 w-3 md:h-4 md:w-4 text-purple-600" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center">
                                    <span className="text-xs md:text-xs uppercase tracking-wider font-medium text-slate-500">ROI</span>
                                    <Badge className="ml-1 md:ml-2 text-[8px] md:text-[9px] px-1 py-0 bg-purple-100 text-purple-800 hover:bg-purple-100 border-0 hidden md:inline-block">Retorno sobre Investimento</Badge>
                                  </div>
                                  <div className="text-sm md:text-2xl font-bold mt-1 md:mt-1.5 text-slate-800 break-words leading-tight">
                                    {(() => {
                                      // Calculate ROI using the formula: Lucro Líquido / Total Pago (até a venda)

                                      // 1. Get Lucro Líquido (Net Profit)
                                      // Usar o valor da venda projetada calculado pela função calcularVendaProjetada
                                      const resultadoVendaProjetada = calcularVendaProjetada(
                                        projection,
                                        completeScenario
                                      );

                                      // Obter os valores para o cálculo do Lucro Bruto
                                      const valorVendaProjetada = resultadoVendaProjetada.valorVendaProjetada;

                                      // Calcular o total pago (como valor negativo)
                                      const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                        projection,
                                        calculosProjecao,
                                        completeScenario
                                      );
                                      const totalPago = detalhamentoTotalPago.total; // Valor positivo para denominador do ROI
                                      const totalPagoNegativo = -totalPago; // Valor negativo para cálculo do lucro

                                      // Obter ou calcular o saldo devedor
                                      const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                        ? calculosProjecao 
                                        : projection.calculationResults?.calculosProjecao || [];

                                      const saldoDevedorResult = calcularSaldoDevedor(
                                        projection,
                                        calculosParaUsar,
                                        completeScenario
                                      );
                                      const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;

                                      // Calcular as despesas de venda usando a função auxiliar (como valor negativo)
                                      const despesasCalculadas = calcularDespesasVenda(
                                        projection,
                                        valorVendaProjetada,
                                        completeScenario
                                      );
                                      
                                      const despesasVenda = -despesasCalculadas.total;

                                      // Calcular o lucro bruto: Venda Projetada + Total Pago + Saldo Devedor + Despesas de Vendas
                                      const lucroBruto = valorVendaProjetada + totalPagoNegativo + saldoDevedor + despesasVenda;

                                      // Calcular o imposto de renda (valor negativo se lucro bruto for positivo)
                                      let impostoRenda = 0;
                                      if (lucroBruto > 0) {
                                        // Obter a taxa de imposto de acordo com o cenário
                                        let taxaImposto = 0;

                                        if (completeScenario === 'padrao') {
                                          taxaImposto = parseFloat(projection.padrao_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'conservador') {
                                          taxaImposto = parseFloat(projection.conservador_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'otimista') {
                                          taxaImposto = parseFloat(projection.otimista_venda_impostos || '15') / 100;
                                        }

                                        // Calcular o imposto como um valor negativo
                                        impostoRenda = -(lucroBruto * taxaImposto);
                                      }

                                      // Calcular o lucro líquido: Lucro Bruto + Imposto de Renda (já é negativo)
                                      const lucroLiquido = lucroBruto + impostoRenda;

                                      // 2. Calculate ROI: (Lucro Líquido / Total Pago) * 100
                                      // Calculamos o ROI como valor decimal primeiro
                                      const roiDecimal = totalPago > 0 ? (lucroLiquido / totalPago) : 0;
                                      // Convertendo para percentual multiplicando por 100 para exibição no console
                                      const roiPercentage = roiDecimal * 100;

                                      console.log("Cálculo do ROI (card):", {
                                        lucroLiquido,
                                        totalPago,
                                        roiDecimal,
                                        roiPercentage
                                      });

                                      // A função formatPercentage divide por 100 internamente, então precisamos multiplicar por 100 antes
                                      return formatPercentage(roiPercentage);
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* TIR Cards - Seguindo padrão da seção de locação */}
                      <div className="flex flex-col">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                          <div className="bg-green-50 p-1 rounded-md mr-2">
                            <LineChartIcon className="h-4 w-4 text-green-600" />
                          </div>
                          Taxa Interna de Retorno (TIR)
                        </h3>

                        {/* Cards da TIR em Grid Responsivo */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                          {/* Card TIR Mensal */}
                          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="text-xs font-medium text-slate-500">TIR Mensal</h4>
                                  <div className="mt-2 flex items-baseline">
                                    <span className="text-sm md:text-2xl font-bold text-green-600">
                                      {tirValues.isLoading ? (
                                        <div className="flex items-center">
                                          <span className="text-slate-300">--.--%</span>
                                          <div className="animate-spin ml-2 h-3 w-3 border-2 border-green-600 rounded-full border-t-transparent"></div>
                                        </div>
                                      ) : (
                                        formatPercentage(tirValues[completeScenario].mensal)
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">rentabilidade mensal</p>
                                </div>
                                <div className="p-1.5 rounded-md bg-green-50">
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Card TIR Anual */}
                          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="text-xs font-medium text-slate-500">TIR Anual</h4>
                                  <div className="mt-2 flex items-baseline">
                                    <span className="text-sm md:text-2xl font-bold text-blue-600">
                                      {tirValues.isLoading ? (
                                        <div className="flex items-center">
                                          <span className="text-slate-300">--.--%</span>
                                          <div className="animate-spin ml-2 h-3 w-3 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                                        </div>
                                      ) : (
                                        formatPercentage(tirValues[completeScenario].anual)
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">rentabilidade anual</p>
                                </div>
                                <div className="p-1.5 rounded-md bg-blue-50">
                                  <LineChartIcon className="h-4 w-4 text-blue-500" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>

                    {/* Demonstrativo do Resultado - Redesigned */}
                    <Card className="shadow-sm border border-slate-200 bg-white mb-8 overflow-hidden">
                      <CardHeader className="pb-2 border-b bg-slate-50">
                        <CardTitle className="text-base flex items-center text-slate-700">
                          <div className="bg-indigo-100 p-1 rounded-md mr-2">
                            <PieChartIcon className="h-4 w-4 text-indigo-600" />
                          </div>
                          Demonstrativo do Resultado
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                          {/* Tabela de valores - Redesigned */}
                          <div className="col-span-1 md:col-span-7 p-1.5 md:p-6 border-r border-slate-100">
                            <div className="space-y-0">
                              {/* Header */}
                              <div className="grid grid-cols-2 pb-4 mb-2 border-b border-slate-200">
                                <div className="text-sm font-semibold text-slate-600">Descrição</div>
                                <div className="text-sm font-semibold text-slate-600 text-right">Valor</div>
                              </div>

                              {/* Venda Projetada */}
                              <div className="grid grid-cols-2 py-3 border-b border-slate-100">
                                <div className="flex items-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></div>
                                  <span className="text-sm font-medium text-slate-700">Venda Projetada</span>
                                </div>
                                <div className="text-sm font-semibold text-right text-green-600">
                                  {(() => {
                                    // Calcular venda projetada de acordo com o cenário atual
                                    const resultadoVendaProjetada = calcularVendaProjetada(
                                      projection,
                                      completeScenario // Usando o cenário global
                                    );

                                    console.log("Venda Projetada calculada", {
                                      scenario: completeScenario,
                                      valor: resultadoVendaProjetada.valorVendaProjetada,
                                      formatado: formatCurrency(resultadoVendaProjetada.valorVendaProjetada)
                                    });

                                    // Exibir o resultado formatado
                                    return formatCurrency(resultadoVendaProjetada.valorVendaProjetada);
                                  })()}
                                </div>
                              </div>

                              {/* Total Pago - Com Detalhes expandíveis */}
                              <div className="py-3 border-b border-slate-100">
                                <div className="grid grid-cols-2">
                                  <div className="flex items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></div>
                                    <span className="text-sm font-medium text-slate-700">Total Pago <span className="text-xs font-normal text-slate-500">(até a venda)</span></span>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 ml-1 p-0" 
                                      onClick={() => toggleDetails('totalPago')}
                                    >
                                      <ChevronDown className={`h-3.5 w-3.5 text-blue-500 transition-transform ${expandedDetails.totalPago ? "rotate-180" : ""}`} />
                                    </Button>
                                  </div>
                                  <div className="text-sm font-medium text-right text-red-500">
                                    {(() => {
                                      // Usar os cálculos carregados separadamente pela consulta
                                      console.log("Calculando Total Pago (valor principal)", {
                                        temCalculosAPI: !!calculosProjecao,
                                        qtdCalculosAPI: calculosProjecao?.length,
                                        temCalculosProjection: !!projection.calculationResults?.calculosProjecao,
                                        qtdCalculosProjection: projection.calculationResults?.calculosProjecao?.length,
                                        scenario: completeScenario
                                      });

                                      // Priorizar os cálculos da consulta separada, como fallback usar os da projeção
                                      const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                        ? calculosProjecao 
                                        : projection.calculationResults?.calculosProjecao || [];

                                      const detalhesPagamento = calcularDetalhamentoTotalPago(
                                        projection,
                                        calculosParaUsar,
                                        completeScenario // Usando o cenário global
                                      );

                                      console.log("Resultado do Total Pago (valor principal)", {
                                        fonte: calculosProjecao && calculosProjecao.length > 0 ? "API separada" : "Projection",
                                        valores: detalhesPagamento,
                                        formatado: formatCurrency(detalhesPagamento.total)
                                      });

                                      return "-" + formatCurrency(detalhesPagamento.total);
                                    })()}
                                  </div>
                                </div>

                                {/* Detalhamento expandível */}
                                {expandedDetails.totalPago && (
                                  <div className="mt-2 bg-slate-50 p-3 rounded-md text-xs">
                                    <h5 className="font-semibold text-slate-700 mb-2">Detalhamento do Total Pago</h5>
                                    {(() => {
                                      // Usar os cálculos carregados separadamente
                                      const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                        ? calculosProjecao 
                                        : projection.calculationResults?.calculosProjecao || [];

                                      const detalhesPagamento = calcularDetalhamentoTotalPago(
                                        projection,
                                        calculosParaUsar,
                                        completeScenario // Usando o cenário global
                                      );

                                      return (
                                        <div className="space-y-1">
                                          <div className="flex justify-between">
                                            <span className="text-slate-600">Total Entrada:</span>
                                            <span className="font-medium">
                                              {formatCurrency(detalhesPagamento.totalEntrada)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-600">Total Parcelas Corrigidas:</span>
                                            <span className="font-medium">
                                              {formatCurrency(detalhesPagamento.totalParcelasCorrigidas)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-600">Total Reforços Corrigidos:</span>
                                            <span className="font-medium">
                                              {formatCurrency(detalhesPagamento.totalReforcosCorrigidos)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-600">Total Chaves Corrigido:</span>
                                            <span className="font-medium">
                                              {formatCurrency(detalhesPagamento.totalChavesCorrigido)}
                                            </span>
                                          </div>
                                          <div className="border-t pt-1 mt-1">
                                            <div className="flex justify-between font-medium">
                                              <span className="text-slate-800">Total Pago:</span>
                                              <span className="text-red-500">
                                                {formatCurrency(detalhesPagamento.total)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                    <div className="mt-2 text-slate-500">
                                      <p>Valores calculados com base na tabela de amortização até o mês da venda ({(() => {
                                        // Obter o mês da venda baseado no cenário atual
                                        const getPrazoVenda = () => {
                                          switch(completeScenario) {
                                            case 'conservative':
                                            case 'conservador':
                                              return parseInt(projection.conservador_venda_prazo) || projection.deliveryMonths || 36;
                                            case 'optimistic':
                                            case 'otimista':
                                              return parseInt(projection.otimista_venda_prazo) || projection.deliveryMonths || 36;
                                            case 'padrao':
                                            case 'realistic':
                                            default:
                                              return parseInt(projection.padrao_venda_prazo) || projection.deliveryMonths || 36;
                                          }
                                        };
                                        return getPrazoVenda();
                                      })() || 36} meses)</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Saldo Devedor - Com Detalhes expandíveis */}
                              <div className="py-3 border-b border-slate-100">
                                <div className="grid grid-cols-2">
                                  <div className="flex items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2"></div>
                                    <span className="text-sm font-medium text-slate-700">Saldo Devedor</span>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 ml-1 p-0" 
                                      onClick={() => toggleDetails('saldoDevedor')}
                                    >
                                      <ChevronDown className={`h-3.5 w-3.5 text-blue-500 transition-transform ${expandedDetails.saldoDevedor ? "rotate-180" : ""}`} />
                                    </Button>
                                  </div>
                                  <div className="text-sm font-medium text-right text-orange-500">
                                    {(() => {
                                      // Calcular saldo devedor usando a função apropriada
                                      console.log("Calculando Saldo Devedor (valor principal)", {
                                        temCalculosAPI: !!calculosProjecao,
                                        qtdCalculosAPI: calculosProjecao?.length,
                                        temCalculosProjection: !!projection.calculationResults?.calculosProjecao,
                                        qtdCalculosProjection: projection.calculationResults?.calculosProjecao?.length,
                                        scenario: completeScenario
                                      });

                                      // Priorizar os cálculos da consulta separada, como fallback usar os da projeção
                                      const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                        ? calculosProjecao 
                                        : projection.calculationResults?.calculosProjecao || [];

                                      const saldoDevedor = calcularSaldoDevedor(
                                        projection,
                                        calculosParaUsar,
                                        completeScenario // Usando o cenário global
                                      );

                                      console.log("Resultado do Saldo Devedor (valor principal)", {
                                        valor: saldoDevedor.saldoDevedorCorrigido,
                                        formatado: formatCurrency(saldoDevedor.saldoDevedorCorrigido)
                                      });

                                      return "-" + formatCurrency(saldoDevedor.saldoDevedorCorrigido);
                                    })()}
                                  </div>
                                </div>

                                {/* Detalhamento expandível */}
                                {expandedDetails.saldoDevedor && (
                                  <div className="mt-2 bg-slate-50 p-3 rounded-md text-xs">
                                    <h5 className="font-semibold text-slate-700 mb-2">Detalhamento do Saldo Devedor</h5>
                                    <div className="space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-slate-600">Saldo Devedor Corrigido:</span>
                                        <span className="font-medium">
                                          {(() => {
                                            // Usar os cálculos carregados separadamente
                                            const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                              ? calculosProjecao 
                                              : projection.calculationResults?.calculosProjecao || [];

                                            // Calcular saldo devedor usando a função apropriada
                                            const saldoDevedor = calcularSaldoDevedor(
                                              projection,
                                              calculosParaUsar,
                                              completeScenario // Usando o cenário global
                                            );
                                            return formatCurrency(saldoDevedor.saldoDevedorCorrigido);
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-2 text-slate-500">
                                      <p>Saldo devedor corresponde ao valor restante corrigido no mês da venda</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Despesas de Vendas - Com Detalhes expandíveis */}
                              <div className="py-3 border-b border-slate-100">
                                <div className="grid grid-cols-2">
                                  <div className="flex items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></div>
                                    <span className="text-sm font-medium text-slate-700">Despesas de Vendas</span>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 ml-1 p-0" 
                                      onClick={() => toggleDetails('despesasVenda')}
                                    >
                                      <ChevronDown className={`h-3.5 w-3.5 text-blue-500 transition-transform ${expandedDetails.despesasVenda ? "rotate-180" : ""}`} />
                                    </Button>
                                  </div>
                                  <div className="text-sm font-medium text-right text-red-500">
                                    {(() => {
                                      // Usar o valor da venda projetada calculado pela função calcularVendaProjetada
                                      const resultadoVendaProjetada = calcularVendaProjetada(
                                        projection,
                                        completeScenario
                                      );

                                      // Calcular comissão e custos com base nesse valor usando nossa função auxiliar
                                      const valorVendaProjetada = resultadoVendaProjetada.valorVendaProjetada;

                                      // Usar a função auxiliar para calcular todos os componentes das despesas
                                      const despesasCalculadas = calcularDespesasVenda(
                                        projection,
                                        valorVendaProjetada,
                                        completeScenario
                                      );

                                      const totalDespesas = despesasCalculadas.total;

                                      console.log("Despesas de venda calculadas", {
                                        valorVendaProjetada,
                                        comissao: despesasCalculadas.comissaoVenda,
                                        custosAdicionais: despesasCalculadas.custosAdicionais,
                                        outrosCustos: despesasCalculadas.outrosCustos,
                                        totalDespesas
                                      });

                                      return "-" + formatCurrency(totalDespesas);
                                    })()}
                                  </div>
                                </div>

                                {/* Detalhamento expandível */}
                                {expandedDetails.despesasVenda && (
                                  <div className="mt-2 bg-slate-50 p-3 rounded-md text-xs">
                                    <h5 className="font-semibold text-slate-700 mb-2">Memória de Cálculo - Despesas de Venda</h5>
                                    <div className="space-y-1">
                                      {/* Comissão de venda - usando valor fixo de 6% */}
                                      {(() => {
                                        // Usar o valor da venda projetada calculado pela função calcularVendaProjetada
                                        const resultadoVendaProjetada = calcularVendaProjetada(
                                          projection,
                                          completeScenario
                                        );

                                        // Calcular comissão e custos com base nesse valor usando nossa função auxiliar
                                        const valorVendaProjetada = resultadoVendaProjetada.valorVendaProjetada;

                                        // Usar a função auxiliar para calcular todos os componentes das despesas
                                        const despesasCalculadas = calcularDespesasVenda(
                                          projection,
                                          valorVendaProjetada,
                                          completeScenario
                                        );

                                        // Extrair os valores individuais para exibição
                                        const comissaoVenda = despesasCalculadas.comissaoVenda;
                                        const custosAdicionais = despesasCalculadas.custosAdicionais;
                                        const outrosCustos = despesasCalculadas.outrosCustos;
                                        const totalDespesas = despesasCalculadas.total;

                                        return (
                                          <>
                                            <div className="flex justify-between">
                                              <span className="text-slate-600">Comissão de venda</span>
                                              <span className="font-medium">
                                                {formatCurrency(comissaoVenda)}
                                              </span>
                                            </div>
                                            {/* Custos Adicionais - usando valor fixo de 2% */}
                                            <div className="flex justify-between">
                                              <span className="text-slate-600">Custos Adicionais</span>
                                              <span className="font-medium">
                                                {formatCurrency(custosAdicionais)}
                                              </span>
                                            </div>
                                            {/* Outros Custos (Manutenção) */}
                                            <div className="flex justify-between">
                                              <span className="text-slate-600">Outros Custos (Manutenção)</span>
                                              <span className="font-medium">
                                                {formatCurrency(despesasCalculadas.outrosCustos)}
                                              </span>
                                            </div>
                                            <div className="border-t pt-1 mt-1">
                                              <div className="flex justify-between font-medium">
                                                <span className="text-slate-800">Total:</span>
                                                <span className="text-red-500">
                                                  {formatCurrency(totalDespesas)}
                                                </span>
                                              </div>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                    <div className="mt-2 text-slate-500">
                                      <p>Valores calculados com base nos percentuais definidos sobre o valor de venda</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Lucro Bruto */}
                              <div className="grid grid-cols-2 py-3 bg-slate-50 rounded-md my-2">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                                  <span className="text-sm font-semibold text-slate-700">Lucro Bruto</span>
                                </div>
                                <div className="text-sm font-semibold text-right text-blue-600">
                                  {(() => {
                                    // Usar o valor da venda projetada calculado pela função calcularVendaProjetada
                                    const resultadoVendaProjetada = calcularVendaProjetada(
                                      projection,
                                      completeScenario
                                    );

                                    // Obter os valores para o cálculo
                                    const valorVendaProjetada = resultadoVendaProjetada.valorVendaProjetada;

                                    // Calcular o total pago (como valor negativo)
                                    const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                      projection,
                                      calculosProjecao,
                                      completeScenario
                                    );
                                    const totalPago = -detalhamentoTotalPago.total;

                                    // Obter ou calcular o saldo devedor
                                    // Priorizar os cálculos da consulta separada, como fallback usar os da projeção
                                    const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                      ? calculosProjecao 
                                      : projection.calculationResults?.calculosProjecao || [];

                                    const saldoDevedorResult = calcularSaldoDevedor(
                                      projection,
                                      calculosParaUsar,
                                      completeScenario
                                    );
                                    const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;

                                    // Calcular as despesas de venda usando a função auxiliar (como valor negativo)
                                    const despesasCalculadas = calcularDespesasVenda(
                                      projection,
                                      valorVendaProjetada,
                                      completeScenario
                                    );

                                    // Obter os custos de manutenção do cenário correspondente
                                    let outrosCustos = 0;
                                    if (completeScenario === 'padrao') {
                                      outrosCustos = parseFloat(projection.padrao_venda_custos_manutencao || '0');
                                    } else if (completeScenario === 'conservador') {
                                      outrosCustos = parseFloat(projection.conservador_venda_custos_manutencao || '0');
                                    } else if (completeScenario === 'otimista') {
                                      outrosCustos = parseFloat(projection.otimista_venda_custos_manutencao || '0');
                                    }

                                    const despesasVenda = -(despesasCalculadas.total + outrosCustos);

                                    // Usar a fórmula exata: Venda Projetada + Total Pago + Saldo Devedor + Despesas de Vendas
                                    // Onde os três últimos já são valores negativos
                                    const lucroBruto = valorVendaProjetada + totalPago + saldoDevedor + despesasVenda;

                                    console.log("Cálculo do Lucro Bruto:", {
                                      valorVendaProjetada,
                                      totalPago,
                                      saldoDevedor,
                                      despesasVenda,
                                      resultado: lucroBruto
                                    });

                                    return formatCurrency(lucroBruto);
                                  })()}
                                </div>
                              </div>

                              {/* Imposto de Renda */}
                              <div className="grid grid-cols-2 py-3 border-b border-slate-100">
                                <div className="flex items-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></div>
                                  <span className="text-sm font-medium text-slate-700">
                                    Imposto de Renda <span className="text-xs font-normal text-slate-500">(Ganho de Capital)</span>
                                  </span>
                                </div>
                                <div className="text-sm font-medium text-right text-red-500">
                                  {(() => {
                                    // Calculamos o Lucro Bruto primeiro
                                    const resultadoVendaProjetada = calcularVendaProjetada(
                                      projection,
                                      completeScenario
                                    );

                                    // Obter os valores para o cálculo
                                    const valorVendaProjetada = resultadoVendaProjetada.valorVendaProjetada;

                                    // Calcular o total pago (como valor negativo)
                                    const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                      projection,
                                      calculosProjecao,
                                      completeScenario
                                    );
                                    const totalPago = -detalhamentoTotalPago.total;

                                    // Obter ou calcular o saldo devedor
                                    const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                      ? calculosProjecao 
                                      : projection.calculationResults?.calculosProjecao || [];

                                    const saldoDevedorResult = calcularSaldoDevedor(
                                      projection,
                                      calculosParaUsar,
                                      completeScenario
                                    );
                                    const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;

                                    // Calcular as despesas de venda usando a função auxiliar (como valor negativo)
                                    const despesasCalculadas = calcularDespesasVenda(
                                      projection,
                                      valorVendaProjetada,
                                      completeScenario
                                    );

                                    // Obter os custos de manutenção do cenário correspondente
                                    let outrosCustos = 0;
                                    if (completeScenario === 'padrao') {
                                      outrosCustos = parseFloat(projection.padrao_venda_custos_manutencao || '0');
                                    } else if (completeScenario === 'conservador') {
                                      outrosCustos = parseFloat(projection.conservador_venda_custos_manutencao || '0');
                                    } else if (completeScenario === 'otimista') {
                                      outrosCustos = parseFloat(projection.otimista_venda_custos_manutencao || '0');
                                    }

                                    const despesasVenda = -(despesasCalculadas.total + outrosCustos);

                                    // Calcular o lucro bruto
                                    const lucroBruto = valorVendaProjetada + totalPago + saldoDevedor + despesasVenda;

                                    // Se o lucro bruto for negativo, o imposto é zero
                                    if (lucroBruto <= 0) {
                                      return "-R$ 0,00";
                                    }

                                    // Obter a taxa de imposto de acordo com o cenário
                                    let taxaImposto = 0;

                                    if (completeScenario === 'padrao') {
                                      taxaImposto = parseFloat(projection.padrao_venda_impostos || '15') / 100;
                                      console.log("Taxa de imposto cenário PADRAO:", {
                                        valor_original: projection.padrao_venda_impostos,
                                        projection_id: projection.id,
                                        taxa_final: taxaImposto
                                      });
                                    } else if (completeScenario === 'conservador') {
                                      taxaImposto = parseFloat(projection.conservador_venda_impostos || '15') / 100;
                                      console.log("Taxa de imposto cenário CONSERVADOR:", {
                                        valor_original: projection.conservador_venda_impostos,
                                        projection_id: projection.id,
                                        taxa_final: taxaImposto
                                      });
                                    } else if (completeScenario === 'otimista') {
                                      taxaImposto = parseFloat(projection.otimista_venda_impostos || '15') / 100;
                                      console.log("Taxa de imposto cenário OTIMISTA:", {
                                        valor_original: projection.otimista_venda_impostos,
                                        projection_id: projection.id,
                                        taxa_final: taxaImposto
                                      });
                                    }

                                    // Calcular o imposto com base no lucro bruto e na taxa
                                    const impostoRenda = lucroBruto * taxaImposto;

                                    console.log("Cálculo do Imposto de Renda:", {
                                      lucroBruto,
                                      cenario: completeScenario,
                                      taxaImposto: taxaImposto * 100 + "%",
                                      impostoRenda
                                    });

                                    return "-" + formatCurrency(impostoRenda);
                                  })()}
                                </div>
                              </div>

                              {/* Resultados Finais */}
                              <div className="mt-6 pt-4 border-t border-slate-200">
                                {/* Lucro Líquido */}
                                <div className="grid grid-cols-2 py-2">
                                  <div className="flex items-center">
                                    <span className="text-base font-bold text-slate-800">Lucro Líquido</span>
                                  </div>
                                  <div className="text-base font-bold text-right text-primary">
                                    {(() => {
                                      // Usar a mesma lógica dos CARDS para calcular o lucro líquido
                                      // Valor da venda projetada
                                      const resultadoVendaProjetada = calcularVendaProjetada(
                                        projection,
                                        completeScenario
                                      );
                                      const valorVendaProjetada = resultadoVendaProjetada.valorVendaProjetada;
                                      
                                      // Calcular o total pago (como valor negativo)
                                      const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                        projection,
                                        calculosProjecao,
                                        completeScenario
                                      );
                                      const totalPago = -detalhamentoTotalPago.total;
                                      
                                      // Obter ou calcular o saldo devedor
                                      const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                        ? calculosProjecao 
                                        : projection.calculationResults?.calculosProjecao || [];
                                        
                                      const saldoDevedorResult = calcularSaldoDevedor(
                                        projection,
                                        calculosParaUsar,
                                        completeScenario
                                      );
                                      const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;
                                      
                                      // Calcular as despesas de venda
                                      const despesasCalculadas = calcularDespesasVenda(
                                        projection,
                                        valorVendaProjetada,
                                        completeScenario
                                      );
                                      const despesasVenda = -despesasCalculadas.total;
                                      
                                      // Calcular o lucro bruto
                                      const lucroBruto = valorVendaProjetada + totalPago + saldoDevedor + despesasVenda;
                                      
                                      // Calcular o imposto de renda
                                      let impostoRenda = 0;
                                      if (lucroBruto > 0) {
                                        let taxaImposto = 0;
                                        
                                        if (completeScenario === 'padrao') {
                                          taxaImposto = parseFloat(projection.padrao_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'conservador') {
                                          taxaImposto = parseFloat(projection.conservador_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'otimista') {
                                          taxaImposto = parseFloat(projection.otimista_venda_impostos || '15') / 100;
                                        }
                                        
                                        impostoRenda = -(lucroBruto * taxaImposto);
                                      }
                                      
                                      // Calcular o lucro líquido
                                      const lucroLiquido = lucroBruto + impostoRenda;
                                      
                                      return formatCurrency(lucroLiquido);
                                    })()}
                                  </div>
                                </div>

                                {/* ROI */}
                                <div className="grid grid-cols-2 py-2">
                                  <div className="flex items-center">
                                    <span className="text-base font-bold text-slate-800">ROI</span>
                                  </div>
                                  <div className="text-base font-bold text-right text-primary">
                                    {(() => {
                                      // Usar a mesma lógica dos CARDS para calcular o ROI
                                      // Valor da venda projetada
                                      const resultadoVendaProjetada = calcularVendaProjetada(
                                        projection,
                                        completeScenario
                                      );
                                      const valorVendaProjetada = resultadoVendaProjetada.valorVendaProjetada;
                                      
                                      // Calcular o total pago
                                      const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                        projection,
                                        calculosProjecao,
                                        completeScenario
                                      );
                                      const totalPago = detalhamentoTotalPago.total; // Valor positivo para denominador do ROI
                                      const totalPagoNegativo = -totalPago; // Valor negativo para cálculo do lucro
                                      
                                      // Obter ou calcular o saldo devedor
                                      const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                        ? calculosProjecao 
                                        : projection.calculationResults?.calculosProjecao || [];
                                        
                                      const saldoDevedorResult = calcularSaldoDevedor(
                                        projection,
                                        calculosParaUsar,
                                        completeScenario
                                      );
                                      const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;
                                      
                                      // Calcular as despesas de venda
                                      const despesasCalculadas = calcularDespesasVenda(
                                        projection,
                                        valorVendaProjetada,
                                        completeScenario
                                      );
                                      const despesasVenda = -despesasCalculadas.total;
                                      
                                      // Calcular o lucro bruto
                                      const lucroBruto = valorVendaProjetada + totalPagoNegativo + saldoDevedor + despesasVenda;
                                      
                                      // Calcular o imposto de renda
                                      let impostoRenda = 0;
                                      if (lucroBruto > 0) {
                                        let taxaImposto = 0;
                                        
                                        if (completeScenario === 'padrao') {
                                          taxaImposto = parseFloat(projection.padrao_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'conservador') {
                                          taxaImposto = parseFloat(projection.conservador_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'otimista') {
                                          taxaImposto = parseFloat(projection.otimista_venda_impostos || '15') / 100;
                                        }
                                        
                                        impostoRenda = -(lucroBruto * taxaImposto);
                                      }
                                      
                                      // Calcular o lucro líquido
                                      const lucroLiquido = lucroBruto + impostoRenda;
                                      
                                      // Calcular o ROI
                                      const roiDecimal = totalPago > 0 ? (lucroLiquido / totalPago) : 0;
                                      const roiPercentage = roiDecimal * 100;
                                      
                                      return formatPercentage(roiPercentage);
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Gráfico de pizza redesenhado - Mais elegante */}
                          <div className="col-span-1 md:col-span-5 bg-gradient-to-br from-white to-slate-50 p-6 flex flex-col">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                              <PieChartIcon className="h-4 w-4 mr-2 text-indigo-500" />
                              Composição do Resultado
                            </h4>
                            <div className="flex-grow">
                              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <RechartsPieChart>
                                  <Pie
                                    data={[
                                      { 
                                        name: 'Venda Projetada', 
                                        value: (() => {
                                          // Usar o valor da venda projetada calculado pela função calcularVendaProjetada
                                          const resultadoVendaProjetada = calcularVendaProjetada(
                                            projection,
                                            completeScenario
                                          );
                                          return resultadoVendaProjetada.valorVendaProjetada;
                                        })(),
                                        fill: '#10B981' // Verde
                                      },
                                      { 
                                        name: 'Total Pago', 
                                        value: (() => {
                                          // Calcular o total pago usando a função calcularDetalhamentoTotalPago
                                          const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                            projection,
                                            calculosProjecao,
                                            completeScenario
                                          );
                                          return detalhamentoTotalPago.total;
                                        })(),
                                        fill: '#4F46E5' // Azul/Roxo
                                      },
                                      { 
                                        name: 'Lucro Líquido', 
                                        value: (() => {
                                          // Usar a mesma lógica dos CARDS para calcular o lucro líquido
                                          const resultadoVendaProjetada = calcularVendaProjetada(
                                            projection,
                                            completeScenario
                                          );
                                          const valorVendaProjetada = resultadoVendaProjetada.valorVendaProjetada;
                                          
                                          const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                            projection,
                                            calculosProjecao,
                                            completeScenario
                                          );
                                          const totalPago = -detalhamentoTotalPago.total;
                                          
                                          const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                            ? calculosProjecao 
                                            : projection.calculationResults?.calculosProjecao || [];
                                            
                                          const saldoDevedorResult = calcularSaldoDevedor(
                                            projection,
                                            calculosParaUsar,
                                            completeScenario
                                          );
                                          const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;
                                          
                                          const despesasCalculadas = calcularDespesasVenda(
                                            projection,
                                            valorVendaProjetada,
                                            completeScenario
                                          );
                                          const despesasVenda = -despesasCalculadas.total;
                                          
                                          const lucroBruto = valorVendaProjetada + totalPago + saldoDevedor + despesasVenda;
                                          
                                          let impostoRenda = 0;
                                          if (lucroBruto > 0) {
                                            let taxaImposto = 0;
                                            
                                            if (completeScenario === 'padrao') {
                                              taxaImposto = parseFloat(projection.padrao_venda_impostos || '15') / 100;
                                            } else if (completeScenario === 'conservador') {
                                              taxaImposto = parseFloat(projection.conservador_venda_impostos || '15') / 100;
                                            } else if (completeScenario === 'otimista') {
                                              taxaImposto = parseFloat(projection.otimista_venda_impostos || '15') / 100;
                                            }
                                            
                                            impostoRenda = -(lucroBruto * taxaImposto);
                                          }
                                          
                                          const lucroLiquido = lucroBruto + impostoRenda;
                                          
                                          return lucroLiquido;
                                        })(),
                                        fill: '#F97316' // Laranja
                                      }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    innerRadius={60}
                                    paddingAngle={3}
                                    dataKey="value"
                                    cornerRadius={4}
                                    stroke="none"
                                    label={({ name, value, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                                      // Calcular a posição do rótulo
                                      const RADIAN = Math.PI / 180;
                                      const radius = 25 + innerRadius + (outerRadius - innerRadius) * 0.8;
                                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                      const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                      // Calcular valor de venda projetada para a porcentagem
                                      const resultadoVendaProjetada = calcularVendaProjetada(
                                        projection,
                                        completeScenario
                                      );
                                      const valorTotal = resultadoVendaProjetada.valorVendaProjetada;
                                      const percentOfTotal = ((value / valorTotal) * 100).toFixed(1) + "%";

                                      return (
                                        <text 
                                          x={x} 
                                          y={y} 
                                          textAnchor={x > cx ? 'start' : 'end'} 
                                          dominantBaseline="central"
                                          style={{
                                            fontWeight: 'bold',
                                            fontSize: '10px',
                                            fill: '#334155' // slate-700
                                          }}
                                        >
                                          {formatCurrency(value)} ({percentOfTotal})
                                        </text>
                                      );
                                    }}
                                    labelLine={true}
                                  >
                                    {[
                                      { 
                                        name: 'Venda Projetada', 
                                        fill: '#10B981',
                                        value: (() => {
                                          const resultadoVendaProjetada = calcularVendaProjetada(
                                            projection,
                                            completeScenario
                                          );
                                          return resultadoVendaProjetada.valorVendaProjetada;
                                        })()
                                      },
                                      { 
                                        name: 'Total Pago', 
                                        fill: '#4F46E5',
                                        value: (() => {
                                          const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                            projection,
                                            calculosProjecao,
                                            completeScenario
                                          );
                                          return detalhamentoTotalPago.total;
                                        })()
                                      },
                                      { 
                                        name: 'Lucro Líquido', 
                                        fill: '#F97316',
                                        value: (() => {
                                          // Usar a mesma lógica dos CARDS para calcular o lucro líquido
                                          const resultadoVendaProjetada = calcularVendaProjetada(
                                            projection,
                                            completeScenario
                                          );
                                          const valorVendaProjetada = resultadoVendaProjetada.valorVendaProjetada;
                                          
                                          const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                            projection,
                                            calculosProjecao,
                                            completeScenario
                                          );
                                          const totalPago = -detalhamentoTotalPago.total;
                                          
                                          const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                            ? calculosProjecao 
                                            : projection.calculationResults?.calculosProjecao || [];
                                            
                                          const saldoDevedorResult = calcularSaldoDevedor(
                                            projection,
                                            calculosParaUsar,
                                            completeScenario
                                          );
                                          const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;
                                          
                                          const despesasCalculadas = calcularDespesasVenda(
                                            projection,
                                            valorVendaProjetada,
                                            completeScenario
                                          );
                                          const despesasVenda = -despesasCalculadas.total;
                                          
                                          const lucroBruto = valorVendaProjetada + totalPago + saldoDevedor + despesasVenda;
                                          
                                          let impostoRenda = 0;
                                          if (lucroBruto > 0) {
                                            let taxaImposto = 0;
                                            
                                            if (completeScenario === 'padrao') {
                                              taxaImposto = parseFloat(projection.padrao_venda_impostos || '15') / 100;
                                            } else if (completeScenario === 'conservador') {
                                              taxaImposto = parseFloat(projection.conservador_venda_impostos || '15') / 100;
                                            } else if (completeScenario === 'otimista') {
                                              taxaImposto = parseFloat(projection.otimista_venda_impostos || '15') / 100;
                                            }
                                            
                                            impostoRenda = -(lucroBruto * taxaImposto);
                                          }
                                          
                                          const lucroLiquido = lucroBruto + impostoRenda;
                                          
                                          return lucroLiquido;
                                        })()
                                      }
                                    ].map((entry, index) => (
                                      <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.fill} 
                                      />
                                    ))}
                                  </Pie>
                                  <ChartTooltip 
                                    formatter={(value) => [formatCurrency(value), '']}
                                    contentStyle={{ 
                                      borderRadius: '6px', 
                                      border: '1px solid #E2E8F0',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                  />
                                  <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle" 
                                    iconSize={6}
                                    wrapperStyle={{ 
                                      fontSize: '9px',
                                      paddingTop: '8px'
                                    }}
                                    formatter={(value) => {
                                      // Mostrar apenas o nome do item, sem valores ou porcentagens
                                      return (
                                        <span className="text-[10px] md:text-xs text-slate-700 truncate">
                                          {value}
                                        </span>
                                      );
                                    }}
                                  />
                                </RechartsPieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Fluxo de Caixa Resumido - Redesenhado */}
                    <Card className="shadow-sm border border-slate-200 bg-white overflow-hidden">
                      <CardHeader className="pb-2 border-b bg-slate-50">
                        <CardTitle className="text-base flex items-center text-slate-700">
                          <div className="bg-blue-100 p-1 rounded-md mr-2">
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                          </div>
                          Fluxo de Caixa Resumido
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {/* Tabela de fluxo de caixa - Design melhorado */}
                        <div className="p-6">
                          <div className="overflow-auto rounded-xl shadow-sm border border-slate-100">
                            <table className="w-full border-separate border-spacing-0">
                              <thead className="bg-gradient-to-r from-blue-50 to-slate-50">
                                <tr>
                                  <th className="text-left text-xs md:text-sm font-semibold text-slate-700 p-2 md:p-4 border-b border-slate-200">Descrição</th>
                                  {(() => {
                                    // Determinar o mês da venda de acordo com o cenário
                                    const getMesDaVenda = (scenario: string) => {
                                      // Adaptar o cenário do parâmetro para o formato do banco
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';

                                      // Verificar a estrutura da projeção
                                      const projecaoNova = projection.activeScenario && projection.selectedScenarios;

                                      if (projecaoNova) {
                                        switch(scenarioAdaptado) {
                                          case 'conservador':
                                            return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista':
                                            return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao':
                                          default:
                                            return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      } else {
                                        // Projeção antiga
                                        switch(scenarioAdaptado) {
                                          case 'conservador':
                                            return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista':
                                            return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao':
                                          default:
                                            return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      }
                                    };

                                    // Obter mês de venda do cenário atual
                                    const mesVenda = getMesDaVenda(completeScenario);

                                    // Calcular quantos anos precisamos mostrar com base no mês de venda
                                    const numeroDeAnos = Math.ceil(mesVenda / 12);

                                    // Gerar colunas de anos dinamicamente
                                    const colunas = [];
                                    for (let i = 1; i <= numeroDeAnos; i++) {
                                      colunas.push(
                                        <th 
                                          key={`ano-${i}`} 
                                          className="text-center text-xs md:text-sm font-semibold text-slate-700 p-2 md:p-4 border-b border-slate-200"
                                        >
                                          <div className="px-1 md:px-2 py-1 bg-blue-100/50 rounded-md inline-block min-w-[60px] md:min-w-[80px]">
                                            Ano {i}
                                          </div>
                                        </th>
                                      );
                                    }

                                    return colunas;
                                  })()}
                                </tr>
                              </thead>
                              <tbody>
                                {/* Valor Compra */}
                                <tr>
                                  <td className="text-xs md:text-sm font-medium text-slate-700 py-2 md:py-4 border-b border-slate-100 pl-2 md:pl-4">
                                    <div className="flex items-center">
                                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-400 rounded-full mr-1.5 md:mr-2"></span>
                                      Valor Compra
                                    </div>
                                  </td>
                                  {(() => {
                                    // Determinar o mês da venda de acordo com o cenário
                                    const getMesDaVenda = (scenario: string) => {
                                      // Adaptar o cenário do parâmetro para o formato do banco
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';

                                      const projecaoNova = projection.activeScenario && projection.selectedScenarios;
                                      if (projecaoNova) {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      } else {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      }
                                    };

                                    // Obter mês de venda do cenário atual
                                    const mesVenda = getMesDaVenda(completeScenario);

                                    // Calcular quantos anos precisamos mostrar com base no mês de venda
                                    const numeroDeAnos = Math.ceil(mesVenda / 12);

                                    // Valor para mostrar
                                    const valorCompra = parseFloat(projection.listPrice) || 0;

                                    // Gerar colunas de anos dinamicamente
                                    const colunas = [];
                                    for (let i = 1; i <= numeroDeAnos; i++) {
                                      colunas.push(
                                        <td 
                                          key={`valor-compra-ano-${i}`} 
                                          className="text-center text-xs md:text-sm font-medium text-slate-800 py-2 md:py-3 border-b border-slate-100 px-2 md:px-4"
                                        >
                                          {i === 1 ? (
                                            <span className="px-2 md:px-3 py-1 bg-slate-50 rounded-md inline-block">
                                              {formatCurrency(valorCompra)}
                                            </span>
                                          ) : "—"}
                                        </td>
                                      );
                                    }

                                    return colunas;
                                  })()}
                                </tr>

                                {/* Valor Entrada */}
                                <tr>
                                  <td className="text-xs md:text-sm font-medium text-slate-700 py-2 md:py-3 border-b border-slate-100 pr-2 md:pr-4">Valor Entrada</td>
                                  {(() => {
                                    // Determinar o mês da venda de acordo com o cenário
                                    const getMesDaVenda = (scenario: string) => {
                                      // Adaptar o cenário do parâmetro para o formato do banco
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';

                                      const projecaoNova = projection.activeScenario && projection.selectedScenarios;
                                      if (projecaoNova) {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      } else {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      }
                                    };

                                    // Obter mês de venda do cenário atual
                                    const mesVenda = getMesDaVenda(completeScenario);

                                    // Calcular quantos anos precisamos mostrar com base no mês de venda
                                    const numeroDeAnos = Math.ceil(mesVenda / 12);

                                    // Usar os cálculos para garantir valores dinâmicos
                                    const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                      ? calculosProjecao 
                                      : projection.calculationResults?.calculosProjecao || [];

                                    // Encontrar a entrada no mês 0 (que é a entrada)
                                    const entradaCalculo = calculosParaUsar.find(calculo => calculo.mes === 0);
                                    const valorEntrada = entradaCalculo ? 
                                      parseFloat(String(entradaCalculo.valorEntrada || '0')) : 
                                      parseFloat(projection.downPayment) || 0;

                                    // Gerar colunas de anos dinamicamente
                                    const colunas = [];
                                    for (let i = 1; i <= numeroDeAnos; i++) {
                                      colunas.push(
                                        <td 
                                          key={`entrada-ano-${i}`} 
                                          className="text-center text-xs md:text-sm font-medium text-slate-800 py-3 border-b border-slate-100 px-4"
                                        >
                                          {i === 1 ? formatCurrency(valorEntrada) : "—"}
                                        </td>
                                      );
                                    }

                                    return colunas;
                                  })()}
                                </tr>

                                {/* Total Parcelas */}
                                <tr>
                                  <td className="text-xs md:text-sm font-medium text-slate-700 py-2 md:py-3 border-b border-slate-100 pr-2 md:pr-4">Total Parcelas</td>
                                  {(() => {
                                    // Determinar o mês da venda de acordo com o cenário
                                    const getMesDaVenda = (scenario: string) => {
                                      // Adaptar o cenário do parâmetro para o formato do banco
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';

                                      const projecaoNova = projection.activeScenario && projection.selectedScenarios;
                                      if (projecaoNova) {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      } else {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      }
                                    };

                                    // Obter mês de venda do cenário atual
                                    const mesVenda = getMesDaVenda(completeScenario);

                                    // Calcular quantos anos precisamos mostrar com base no mês de venda
                                    const numeroDeAnos = Math.ceil(mesVenda / 12);

                                    // Usar os cálculos para garantir valores dinâmicos
                                    const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                      ? calculosProjecao 
                                      : projection.calculationResults?.calculosProjecao || [];

                                    // Gerar colunas de parcelas por ano dinamicamente
                                    const colunas = [];
                                    for (let i = 1; i <= numeroDeAnos; i++) {
                                      // Calcular intervalo de meses para o ano atual
                                      const mesInicio = (i - 1) * 12 + 1;
                                      const mesFim = i * 12;

                                      // Calcular total de parcelas do ano
                                      const parcelasAno = calculosParaUsar
                                        .filter(calculo => calculo.mes >= mesInicio && calculo.mes <= mesFim)
                                        .reduce((sum, calculo) => sum + parseFloat(String(calculo.parcelaCorrigida || '0')), 0);

                                      colunas.push(
                                        <td 
                                          key={`parcelas-ano-${i}`} 
                                          className="text-center text-xs md:text-sm font-medium text-red-600 py-3 border-b border-slate-100 px-4"
                                        >
                                          {parcelasAno > 0 ? (
                                            <span className="px-3 py-1 bg-red-50 rounded-md inline-block text-red-600">
                                              -{formatCurrency(parcelasAno)}
                                            </span>
                                          ) : "—"}
                                        </td>
                                      );
                                    }

                                    return colunas;
                                  })()}
                                </tr>

                                {/* Total Reforços */}
                                <tr>
                                  <td className="text-xs md:text-sm font-medium text-slate-700 py-2 md:py-3 border-b border-slate-100 pr-2 md:pr-4">Total Reforços</td>
                                  {(() => {
                                    // Determinar o mês da venda de acordo com o cenário
                                    const getMesDaVenda = (scenario: string) => {
                                      // Adaptar o cenário do parâmetro para o formato do banco
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';

                                      const projecaoNova = projection.activeScenario && projection.selectedScenarios;
                                      if (projecaoNova) {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      } else {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      }
                                    };

                                    // Obter mês de venda do cenário atual
                                    const mesVenda = getMesDaVenda(completeScenario);

                                    // Calcular quantos anos precisamos mostrar com base no mês de venda
                                    const numeroDeAnos = Math.ceil(mesVenda / 12);

                                    // Usar os cálculos para garantir valores dinâmicos
                                    const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                      ? calculosProjecao 
                                      : projection.calculationResults?.calculosProjecao || [];

                                    // Gerar colunas de reforços por ano dinamicamente
                                    const colunas = [];
                                    for (let i = 1; i <= numeroDeAnos; i++) {
                                      // Calcular intervalo de meses para o ano atual
                                      const mesInicio = (i - 1) * 12 + 1;
                                      const mesFim = i * 12;

                                      // Calcular total de reforços do ano
                                      const reforcosAno = calculosParaUsar
                                        .filter(calculo => calculo.mes >= mesInicio && calculo.mes <= mesFim)
                                        .reduce((sum, calculo) => sum + parseFloat(String(calculo.reforcoCorrigido || '0')), 0);

                                      colunas.push(
                                        <td 
                                          key={`reforcos-ano-${i}`} 
                                          className="text-center text-xs md:text-sm font-medium text-red-600 py-3 border-b border-slate-100 px-4"
                                        >
                                          {reforcosAno > 0 ? "-" + formatCurrency(reforcosAno) : "—"}
                                        </td>
                                      );
                                    }

                                    return colunas;
                                  })()}
                                </tr>

                                {/* Chaves */}
                                <tr>
                                  <td className="text-xs md:text-sm font-medium text-slate-700 py-2 md:py-3 border-b border-slate-100 pr-2 md:pr-4">Chaves</td>
                                  {(() => {
                                    // Determinar o mês da venda de acordo com o cenário
                                    const getMesDaVenda = (scenario: string) => {
                                      // Adaptar o cenário do parâmetro para o formato do banco
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';

                                      const projecaoNova = projection.activeScenario && projection.selectedScenarios;
                                      if (projecaoNova) {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      } else {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      }
                                    };

                                    // Obter mês de venda do cenário atual
                                    const mesVenda = getMesDaVenda(completeScenario);

                                    // Calcular quantos anos precisamos mostrar com base no mês de venda
                                    const numeroDeAnos = Math.ceil(mesVenda / 12);

                                    // Usar os cálculos para garantir valores dinâmicos
                                    const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                      ? calculosProjecao 
                                      : projection.calculationResults?.calculosProjecao || [];

                                    // Prazo de entrega
                                    const prazoEntrega = projection.deliveryMonths || parseInt(String(projection.deliveryTime)) || 0;

                                    // Calcular em qual ano cai a entrega
                                    const anoEntrega = Math.ceil(prazoEntrega / 12);

                                    // Buscar valor das chaves
                                    const chavesCalculo = calculosParaUsar.find(calculo => calculo.mes === prazoEntrega);
                                    const valorChaves = chavesCalculo ? parseFloat(String(chavesCalculo.chavesCorrigido || '0')) : 0;

                                    // Gerar colunas de chaves por ano dinamicamente
                                    const colunas = [];
                                    for (let i = 1; i <= numeroDeAnos; i++) {
                                      colunas.push(
                                        <td 
                                          key={`chaves-ano-${i}`} 
                                          className="text-center text-xs md:text-sm font-medium text-red-600 py-3 border-b border-slate-100 px-4"
                                        >
                                          {(i === anoEntrega && valorChaves > 0) ? "-" + formatCurrency(valorChaves) : "—"}
                                        </td>
                                      );
                                    }

                                    return colunas;
                                  })()}
                                </tr>

                                {/* Venda Projetada */}
                                <tr>
                                  <td className="text-sm font-medium text-slate-700 py-4 border-b border-slate-100 pl-4">
                                    <div className="flex items-center">
                                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                      Venda Projetada
                                    </div>
                                  </td>
                                  {(() => {
                                    // Determinar o mês da venda de acordo com o cenário
                                    const getMesDaVenda = (scenario: string) => {
                                      // Adaptar o cenário do parâmetro para o formato do banco
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';

                                      const projecaoNova = projection.activeScenario && projection.selectedScenarios;
                                      if (projecaoNova) {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      } else {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      }
                                    };

                                    // Obter mês de venda do cenário atual
                                    const mesVenda = getMesDaVenda(completeScenario);

                                    // Calcular quantos anos precisamos mostrar com base no mês de venda
                                    const numeroDeAnos = Math.ceil(mesVenda / 12);

                                    // Determinar em qual ano cai a venda
                                    const anoVenda = Math.ceil(mesVenda / 12);

                                    // Calcular o valor da venda projetada
                                    const resultadoVendaProjetada = calcularVendaProjetada(projection, completeScenario);

                                    // Gerar colunas de anos dinamicamente
                                    const colunas = [];
                                    for (let i = 1; i <= numeroDeAnos; i++) {
                                      colunas.push(
                                        <td 
                                          key={`venda-projetada-ano-${i}`} 
                                          className="text-center text-sm font-medium text-green-600 py-3 border-b border-slate-100 px-4"
                                        >
                                          {i === anoVenda ? (
                                            <span className="px-3 py-1 bg-green-50 rounded-md inline-block text-green-600 font-medium">
                                              +{formatCurrency(resultadoVendaProjetada.valorVendaProjetada)}
                                            </span>
                                          ) : "—"}
                                        </td>
                                      );
                                    }

                                    return colunas;
                                  })()}
                                </tr>

                                {/* Despesas de Venda - Usando valores do DRE */}
                                <tr>
                                  <td className="text-xs md:text-sm font-medium text-slate-700 py-2 md:py-3 border-b border-slate-100 pr-2 md:pr-4">Despesas de Venda</td>
                                  {(() => {
                                    // Determinar o mês da venda de acordo com o cenário
                                    const getMesDaVenda = (scenario: string) => {
                                      // Adaptar o cenário do parâmetro para o formato do banco
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';

                                      const projecaoNova = projection.activeScenario && projection.selectedScenarios;
                                      if (projecaoNova) {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      } else {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      }
                                    };

                                    // Obter mês de venda do cenário atual
                                    const mesVenda = getMesDaVenda(completeScenario);

                                    // Calcular quantos anos precisamos mostrar com base no mês de venda
                                    const numeroDeAnos = Math.ceil(mesVenda / 12);

                                    // Determinar em qual ano cai a venda
                                    const anoVenda = Math.ceil(mesVenda / 12);

                                    // Obter as despesas de venda do DRE
                                    let despesasVendaTotal = 0;

                                    // Verificar qual cenário estamos usando
                                    if (completeScenario === 'padrao' || completeScenario === 'realistic') {
                                      // Usar o futureValue do cenário padrão se disponível
                                      if (projection.calculationResults?.futureSale?.saleExpenses) {
                                        despesasVendaTotal = projection.calculationResults.futureSale.saleExpenses;
                                      }
                                    } else if (completeScenario === 'conservador' || completeScenario === 'conservative') {
                                      // Usar o resultado do cenário conservador
                                      if (projection.calculationResults?.conservador?.futureSale?.saleExpenses) {
                                        despesasVendaTotal = projection.calculationResults.conservador.futureSale.saleExpenses;
                                      }
                                    } else if (completeScenario === 'otimista' || completeScenario === 'optimistic') {
                                      // Usar o resultado do cenário otimista
                                      if (projection.calculationResults?.otimista?.futureSale?.saleExpenses) {
                                        despesasVendaTotal = projection.calculationResults.otimista.futureSale.saleExpenses;
                                      }
                                    }

                                    // Se não encontrou valor no DRE, calcular novamente
                                    if (despesasVendaTotal === 0) {
                                      // Primeiro, precisamos calcular o valor de venda projetada
                                      const resultadoVendaProjetada = calcularVendaProjetada(projection, completeScenario);
                                      const valorVendaProjetada = resultadoVendaProjetada.valorVendaProjetada;

                                      // Então, calculamos as despesas passando os parâmetros corretos
                                      const despesasVenda = calcularDespesasVenda(
                                        projection,
                                        valorVendaProjetada,
                                        completeScenario
                                      );

                                      despesasVendaTotal = despesasVenda.total;
                                    }

                                    // Gerar colunas de anos dinamicamente
                                    const colunas = [];
                                    for (let i = 1; i <= numeroDeAnos; i++) {
                                      colunas.push(
                                        <td 
                                          key={`despesas-venda-ano-${i}`} 
                                          className="text-center text-xs md:text-sm font-medium text-red-600 py-3 border-b border-slate-100 px-4"
                                        >
                                          {i === anoVenda ? (
                                            <span className="px-3 py-1 bg-red-50 rounded-md inline-block text-red-600 font-medium">
                                              -{formatCurrency(despesasVendaTotal)}
                                            </span>
                                          ) : "—"}
                                        </td>
                                      );
                                    }

                                    return colunas;
                                  })()}
                                </tr>

                                {/* Saldo Devedor */}
                                <tr>
                                  <td className="text-xs md:text-sm font-medium text-slate-700 py-2 md:py-3 border-b border-slate-100 pr-2 md:pr-4">Saldo Devedor</td>
                                  {(() => {
                                    // Determinar o mês da venda de acordo com o cenário
                                    const getMesDaVenda = (scenario: string) => {
                                      // Adaptar o cenário do parâmetro para o formato do banco
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';

                                      const projecaoNova = projection.activeScenario && projection.selectedScenarios;
                                      if (projecaoNova) {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      } else {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      }
                                    };

                                    // Obter mês de venda do cenário atual
                                    const mesVenda = getMesDaVenda(completeScenario);

                                    // Calcular quantos anos precisamos mostrar com base no mês de venda
                                    const numeroDeAnos = Math.ceil(mesVenda / 12);

                                    // Determinar em qual ano cai a venda
                                    const anoVenda = Math.ceil(mesVenda / 12);

                                    // Obter os cálculos
                                    const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                      ? calculosProjecao 
                                      : projection.calculationResults?.calculosProjecao || [];

                                    // Calcular o saldo devedor no momento da venda
                                    const saldoDevedorResult = calcularSaldoDevedor(
                                      projection,
                                      calculosParaUsar,
                                      completeScenario
                                    );

                                    // Gerar colunas de anos dinamicamente
                                    const colunas = [];
                                    for (let i = 1; i <= numeroDeAnos; i++) {
                                      colunas.push(
                                        <td 
                                          key={`saldo-devedor-ano-${i}`} 
                                          className="text-center text-xs md:text-sm font-medium text-red-600 py-3 border-b border-slate-100 px-4"
                                        >
                                          {i === anoVenda ? (
                                            <span className="px-3 py-1 bg-red-50 rounded-md inline-block text-red-600 font-medium">
                                              -{formatCurrency(saldoDevedorResult.saldoDevedorCorrigido)}
                                            </span>
                                          ) : "—"}
                                        </td>
                                      );
                                    }

                                    return colunas;
                                  })()}
                                </tr>

                                {/* Total no ano */}
                                <tr className="bg-slate-50">
                                  <td className="text-sm font-semibold text-slate-800 py-4 rounded-l-md pl-4 pr-4">Total no ano</td>
                                  {(() => {
                                    // Determinar o mês da venda de acordo com o cenário
                                    const getMesDaVenda = (scenario: string) => {
                                      // Adaptar o cenário do parâmetro para o formato do banco
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';

                                      const projecaoNova = projection.activeScenario && projection.selectedScenarios;
                                      if (projecaoNova) {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      } else {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      }
                                    };

                                    // Obter mês de venda do cenário atual
                                    const mesVenda = getMesDaVenda(completeScenario);

                                    // Calcular quantos anos precisamos mostrar com base no mês de venda
                                    const numeroDeAnos = Math.ceil(mesVenda / 12);

                                    // Usar os cálculos para garantir valores dinâmicos
                                    const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                      ? calculosProjecao 
                                      : projection.calculationResults?.calculosProjecao || [];

                                    // Obter a entrada no mês 0
                                    const entradaCalculo = calculosParaUsar.find(calculo => calculo.mes === 0);
                                    const valorEntrada = entradaCalculo ? parseFloat(String(entradaCalculo.valorEntrada || '0')) : parseFloat(projection.downPayment) || 0;

                                    // Verificar o prazo de entrega (para as chaves)
                                    const prazoEntrega = projection.deliveryMonths || parseInt(String(projection.deliveryTime)) || 0;

                                    // Função para calcular o total de um ano específico
                                    const calcularTotalAno = (ano: number) => {
                                      const mesInicio = (ano - 1) * 12 + 1;
                                      const mesFim = ano * 12;

                                      // Total de parcelas do ano
                                      const parcelasAno = calculosParaUsar
                                        .filter(calculo => calculo.mes >= mesInicio && calculo.mes <= mesFim)
                                        .reduce((sum, calculo) => sum + parseFloat(String(calculo.parcelaCorrigida || '0')), 0);

                                      // Total de reforços do ano
                                      const reforcosAno = calculosParaUsar
                                        .filter(calculo => calculo.mes >= mesInicio && calculo.mes <= mesFim)
                                        .reduce((sum, calculo) => sum + parseFloat(String(calculo.reforcoCorrigido || '0')), 0);

                                      // Verificar se há pagamento de chaves no ano
                                      let valorChavesAno = 0;
                                      if (prazoEntrega >= mesInicio && prazoEntrega <= mesFim) {
                                        const chavesCalculo = calculosParaUsar.find(calculo => calculo.mes === prazoEntrega);
                                        valorChavesAno = chavesCalculo ? parseFloat(String(chavesCalculo.chavesCorrigido || '0')) : 0;
                                      }

                                      // Adicionar entrada apenas para o primeiro ano
                                      let totalSaidaAno = (ano === 1 ? valorEntrada : 0) + parcelasAno + reforcosAno + valorChavesAno;
                                      let totalEntradaAno = 0;

                                      // Verificar se é o ano da venda para mostrar o lucro bruto
                                      const isAnoVenda = mesVenda >= mesInicio && mesVenda <= mesFim;

                                      // Se a venda ocorrer neste ano, calcular lucro bruto para exibir
                                      if (isAnoVenda) {
                                        // Primeiro calculamos a venda projetada
                                        const resultadoVendaProjetada = calcularVendaProjetada(projection, completeScenario);
                                        const valorVenda = resultadoVendaProjetada.valorVendaProjetada;

                                        // Calculamos o total pago
                                        const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                          projection,
                                          calculosParaUsar,
                                          completeScenario
                                        );
                                        const totalPago = -detalhamentoTotalPago.total; // Tornamos negativo para a fórmula

                                        // Calculamos o saldo devedor
                                        const saldoDevedorResult = calcularSaldoDevedor(
                                          projection,
                                          calculosParaUsar,
                                          completeScenario
                                        );
                                        const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido; // Tornamos negativo para a fórmula

                                        // Calculamos as despesas de venda
                                        const despesasVenda = calcularDespesasVenda(
                                          projection,
                                          valorVenda,
                                          completeScenario
                                        );

                                        // Calcular o lucro bruto usando a mesma fórmula em todos os cenários
                                        // Fórmula: Venda + totalPago + saldoDevedor - despesasVenda.total
                                        const lucroBruto = valorVenda + totalPago + saldoDevedor - despesasVenda.total;

                                        console.log("Lucro bruto calculado para tabela:", {
                                          valorVenda,
                                          totalPago,
                                          saldoDevedor,
                                          despesasVendaTotal: despesasVenda.total,
                                          lucroBruto,
                                          scenario: completeScenario
                                        });

                                        // Usar o lucro bruto como totalAno
                                        totalEntradaAno = lucroBruto;
                                        totalSaidaAno = 0; // Zerar as saídas pois estamos mostrando diretamente o lucro bruto
                                      }

                                      return {
                                        totalAno: totalEntradaAno - totalSaidaAno,
                                        isUltimoAno: ano === numeroDeAnos,
                                        isAnoVenda: isAnoVenda
                                      };
                                    };

                                    // Gerar colunas de totais por ano dinamicamente
                                    const colunas = [];
                                    for (let i = 1; i <= numeroDeAnos; i++) {
                                      const { totalAno, isUltimoAno, isAnoVenda } = calcularTotalAno(i);

                                      colunas.push(
                                        <td 
                                          key={`total-ano-${i}`} 
                                          className={`text-center text-sm font-semibold py-4 px-4 ${isUltimoAno ? 'rounded-r-md' : ''}`}
                                        >
                                          {/* Mostrar "Lucro Bruto" no ano da venda */}
                                          {isAnoVenda ? (
                                            <div className="bg-green-50 rounded-md py-2 px-3">
                                              <div className="text-xs text-green-700 mb-1">Lucro Bruto:</div>
                                              <span className="text-green-600 font-bold">{formatCurrency(totalAno)}</span>
                                            </div>
                                          ) : (
                                            // Formato padrão para outros anos
                                            (totalAno >= 0 ? <span className="text-green-600">{formatCurrency(totalAno)}</span> : <span className="text-red-600">-{formatCurrency(Math.abs(totalAno))}</span>)
                                          )}
                                        </td>
                                      );
                                    }

                                    return colunas;
                                  })()}
                                </tr>

                                {/* Taxas / Impostos - Nova linha */}
                                <tr>
                                  <td className="text-xs md:text-sm font-medium text-slate-700 py-2 md:py-3 border-b border-slate-100 pl-2 md:pl-4">
                                    <div className="flex items-center">
                                      <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                      Taxas / Impostos
                                    </div>
                                  </td>
                                  {(() => {
                                    // Determinar o mês da venda
                                    const getMesDaVenda = (scenario: string) => {
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';

                                      const projecaoNova = projection.activeScenario && projection.selectedScenarios;
                                      if (projecaoNova) {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      } else {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      }
                                    };

                                    // Obter mês de venda do cenário atual
                                    const mesVenda = getMesDaVenda(completeScenario);

                                    // Calcular quantos anos precisamos mostrar
                                    const numeroDeAnos = Math.ceil(mesVenda / 12);

                                    // Usar os cálculos para garantir valores dinâmicos
                                    const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                      ? calculosProjecao 
                                      : projection.calculationResults?.calculosProjecao || [];

                                    // Gerar colunas para os anos
                                    const colunas = [];
                                    for (let i = 1; i <= numeroDeAnos; i++) {
                                      const mesInicio = (i - 1) * 12 + 1;
                                      const mesFim = i * 12;
                                      const isAnoVenda = mesVenda >= mesInicio && mesVenda <= mesFim;

                                      if (isAnoVenda) {
                                        // Calculamos o valor de impostos somente no ano da venda
                                        const resultadoVendaProjetada = calcularVendaProjetada(projection, completeScenario);
                                        const valorVenda = resultadoVendaProjetada.valorVendaProjetada;

                                        const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                          projection,
                                          calculosParaUsar,
                                          completeScenario
                                        );
                                        const totalPago = -detalhamentoTotalPago.total;

                                        const saldoDevedorResult = calcularSaldoDevedor(
                                          projection,
                                          calculosParaUsar,
                                          completeScenario
                                        );
                                        const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;

                                        const despesasVenda = calcularDespesasVenda(
                                          projection,
                                          valorVenda,
                                          completeScenario
                                        );

                                        // Calcular o lucro bruto
                                        const lucroBruto = valorVenda + totalPago + saldoDevedor - despesasVenda.total;

                                        // Obter a taxa de imposto de acordo com o cenário
                                        let taxaImposto = 0;
                                        if (completeScenario === 'padrao') {
                                          taxaImposto = parseFloat(projection.padrao_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'conservador') {
                                          taxaImposto = parseFloat(projection.conservador_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'otimista') {
                                          taxaImposto = parseFloat(projection.otimista_venda_impostos || '15') / 100;
                                        }

                                        // Calcular o imposto de renda
                                        const impostoRenda = lucroBruto > 0 ? lucroBruto * taxaImposto : 0;

                                        colunas.push(
                                          <td 
                                            key={`impostos-ano-${i}`} 
                                            className="text-center text-xs md:text-sm font-medium text-red-600 py-3 border-b border-slate-100 px-4"
                                          >
                                            <span className="px-3 py-1 bg-red-50 rounded-md inline-block text-red-600">
                                              -{formatCurrency(impostoRenda)}
                                            </span>
                                          </td>
                                        );
                                      } else {
                                        // Para anos sem venda, mostrar traço
                                        colunas.push(
                                          <td 
                                            key={`impostos-ano-${i}`} 
                                            className="text-center text-xs md:text-sm font-medium text-slate-800 py-3 border-b border-slate-100 px-4"
                                          >
                                            —
                                          </td>
                                        );
                                      }
                                    }

                                    return colunas;
                                  })()}
                                </tr>

                                {/* Lucro Líquido - Nova linha */}
                                <tr>
                                  <td className="text-sm font-semibold text-slate-700 py-4 pl-4">
                                    <div className="flex items-center">
                                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                      Lucro Líquido
                                    </div>
                                  </td>
                                  {(() => {
                                    // Determinar o mês da venda
                                    const getMesDaVenda = (scenario: string) => {
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';

                                      const projecaoNova = projection.activeScenario && projection.selectedScenarios;
                                      if (projecaoNova) {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      } else {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      }
                                    };

                                    // Obter mês de venda do cenário atual
                                    const mesVenda = getMesDaVenda(completeScenario);

                                    // Calcular quantos anos precisamos mostrar
                                    const numeroDeAnos = Math.ceil(mesVenda / 12);

                                    // Usar os cálculos para garantir valores dinâmicos
                                    const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                      ? calculosProjecao 
                                      : projection.calculationResults?.calculosProjecao || [];

                                    // Gerar colunas para os anos
                                    const colunas = [];
                                    for (let i = 1; i <= numeroDeAnos; i++) {
                                      const mesInicio = (i - 1) * 12 + 1;
                                      const mesFim = i * 12;
                                      const isAnoVenda = mesVenda >= mesInicio && mesVenda <= mesFim;

                                      if (isAnoVenda) {
                                        // Calculamos o lucro líquido somente no ano da venda
                                        const resultadoVendaProjetada = calcularVendaProjetada(projection, completeScenario);
                                        const valorVenda = resultadoVendaProjetada.valorVendaProjetada;

                                        const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                          projection,
                                          calculosParaUsar,
                                          completeScenario
                                        );
                                        const totalPago = -detalhamentoTotalPago.total;

                                        const saldoDevedorResult = calcularSaldoDevedor(
                                          projection,
                                          calculosParaUsar,
                                          completeScenario
                                        );
                                        const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;

                                        const despesasVenda = calcularDespesasVenda(
                                          projection,
                                          valorVenda,
                                          completeScenario
                                        );

                                        // Calcular o lucro bruto
                                        const lucroBruto = valorVenda + totalPago + saldoDevedor - despesasVenda.total;

                                        // Obter a taxa de imposto de acordo com o cenário
                                        let taxaImposto = 0;
                                        if (completeScenario === 'padrao') {
                                          taxaImposto = parseFloat(projection.padrao_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'conservador') {
                                          taxaImposto = parseFloat(projection.conservador_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'otimista') {
                                          taxaImposto = parseFloat(projection.otimista_venda_impostos || '15') / 100;
                                        }

                                        // Calcular o imposto de renda
                                        const impostoRenda = lucroBruto > 0 ? lucroBruto * taxaImposto : 0;

                                        // Calcular o lucro líquido
                                        const lucroLiquido = lucroBruto - impostoRenda;

                                        colunas.push(
                                          <td 
                                            key={`lucro-liquido-ano-${i}`} 
                                            className="text-center text-xs md:text-sm font-semibold py-4 px-4"
                                          >
                                            <div className="bg-green-50 rounded-md py-2 px-3">
                                              <span className="text-green-600 font-bold">{formatCurrency(lucroLiquido)}</span>
                                            </div>
                                          </td>
                                        );
                                      } else {
                                        // Para anos sem venda, mostrar traço
                                        colunas.push(
                                          <td 
                                            key={`lucro-liquido-ano-${i}`} 
                                            className="text-center text-xs md:text-sm font-medium text-slate-800 py-4 px-4"
                                          >
                                            —
                                          </td>
                                        );
                                      }
                                    }

                                    return colunas;
                                  })()}
                                </tr>

                                {/* ROI - Nova linha */}
                                <tr>
                                  <td className="text-xs md:text-sm font-medium text-slate-700 py-2 md:py-3 border-b border-slate-100 pl-2 md:pl-4">
                                    <div className="flex items-center">
                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                      ROI
                                    </div>
                                  </td>
                                  {(() => {
                                    // Determinar o mês da venda
                                    const getMesDaVenda = (scenario: string) => {
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic' || scenario === 'padrao') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative' || scenario === 'conservador') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic' || scenario === 'otimista') scenarioAdaptado = 'otimista';

                                      const projecaoNova = projection.activeScenario && projection.selectedScenarios;
                                      if (projecaoNova) {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      } else {
                                        switch(scenarioAdaptado) {
                                          case 'conservador': return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'otimista': return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                          case 'padrao': default: return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                        }
                                      }
                                    };

                                    // Obter mês de venda do cenário atual
                                    const mesVenda = getMesDaVenda(completeScenario);

                                    // Calcular quantos anos precisamos mostrar
                                    const numeroDeAnos = Math.ceil(mesVenda / 12);

                                    // Usar os cálculos para garantir valores dinâmicos
                                    const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                      ? calculosProjecao 
                                      : projection.calculationResults?.calculosProjecao || [];

                                    // Gerar colunas para os anos
                                    const colunas = [];
                                    for (let i = 1; i <= numeroDeAnos; i++) {
                                      const mesInicio = (i - 1) * 12 + 1;
                                      const mesFim = i * 12;
                                      const isAnoVenda = mesVenda >= mesInicio && mesVenda <= mesFim;

                                      if (isAnoVenda) {
                                        // Calculamos o ROI somente no ano da venda
                                        const resultadoVendaProjetada = calcularVendaProjetada(projection, completeScenario);
                                        const valorVenda = resultadoVendaProjetada.valorVendaProjetada;

                                        const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                          projection,
                                          calculosParaUsar,
                                          completeScenario
                                        );
                                        const totalPago = detalhamentoTotalPago.total; // Usamos positivo para o ROI

                                        const saldoDevedorResult = calcularSaldoDevedor(
                                          projection,
                                          calculosParaUsar,
                                          completeScenario
                                        );
                                        const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;

                                        const despesasVenda = calcularDespesasVenda(
                                          projection,
                                          valorVenda,
                                          completeScenario
                                        );

                                        // Calcular o lucro bruto
                                        const lucroBruto = valorVenda + (-totalPago) + saldoDevedor - despesasVenda.total;

                                        // Obter a taxa de imposto de acordo com o cenário
                                        let taxaImposto = 0;
                                        if (completeScenario === 'padrao') {
                                          taxaImposto = parseFloat(projection.padrao_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'conservador') {
                                          taxaImposto = parseFloat(projection.conservador_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'otimista') {
                                          taxaImposto = parseFloat(projection.otimista_venda_impostos || '15') / 100;
                                        }

                                        // Calcular o imposto de renda
                                        const impostoRenda = lucroBruto > 0 ? lucroBruto * taxaImposto : 0;

                                        // Calcular o lucro líquido
                                        const lucroLiquido = lucroBruto - impostoRenda;

                                        // Calcular o ROI
                                        const roi = (lucroLiquido / totalPago) * 100;

                                        colunas.push(
                                          <td 
                                            key={`roi-ano-${i}`} 
                                            className="text-center text-xs md:text-sm font-semibold py-3 border-b border-slate-100 px-4"
                                          >
                                            <div className="bg-blue-50 rounded-md py-2 px-3">
                                              <span className="text-blue-600 font-bold">{roi.toFixed(2)}%</span>
                                            </div>
                                          </td>
                                        );
                                      } else {
                                        // Para anos sem venda, mostrar traço
                                        colunas.push(
                                          <td 
                                            key={`roi-ano-${i}`} 
                                            className="text-center text-xs md:text-sm font-medium text-slate-800 py-3 border-b border-slate-100 px-4"
                                          >
                                            —
                                          </td>
                                        );
                                      }
                                    }

                                    return colunas;
                                  })()}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Gráfico de fluxo financeiro redesenhado com dados da tabela */}
                        <div className="hidden md:block border-t border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
                          <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center">
                            <div className="bg-blue-100 p-1.5 rounded-md mr-2 shadow-sm">
                              <BarChart3 className="h-4 w-4 text-blue-600" />
                            </div>
                            Evolução do Fluxo Financeiro
                          </h4>

                          <div className="h-[350px] bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart
                                data={(() => {
                                  // Obtém o mês da venda baseado no cenário atual
                                  const getMesDaVenda = () => {
                                    if (completeScenario === 'conservador') {
                                      return parseInt(String(projection.conservador_venda_prazo)) || projection.deliveryMonths || 36;
                                    } else if (completeScenario === 'otimista') {
                                      return parseInt(String(projection.otimista_venda_prazo)) || projection.deliveryMonths || 36;
                                    } else {
                                      return parseInt(String(projection.padrao_venda_prazo)) || projection.deliveryMonths || 36;
                                    }
                                  };

                                  const mesVenda = getMesDaVenda();
                                  const numeroDeAnos = Math.ceil(mesVenda / 12);

                                  // Usar os cálculos da projeção atual
                                  const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
                                    ? calculosProjecao 
                                    : projection.calculationResults?.calculosProjecao || [];

                                  // Calcular a entrada total do primeiro ano
                                  const entradaCalculo = calculosParaUsar.find(calculo => calculo.mes === 0);
                                  const valorEntrada = entradaCalculo ? parseFloat(String(entradaCalculo.valorEntrada || '0')) : parseFloat(projection.downPayment) || 0;

                                  // Função para calcular totais anuais
                                  const calcularTotaisAnuais = () => {
                                    const dadosAnuais = [];

                                    for (let ano = 1; ano <= numeroDeAnos; ano++) {
                                      const mesInicio = (ano - 1) * 12 + 1;
                                      const mesFim = ano * 12;

                                      // Parcelas do ano
                                      const parcelasAno = calculosParaUsar
                                        .filter(calculo => calculo.mes >= mesInicio && calculo.mes <= mesFim)
                                        .reduce((sum, calculo) => sum + parseFloat(String(calculo.parcelaCorrigida || '0')), 0);

                                      // Reforços do ano
                                      const reforcosAno = calculosParaUsar
                                        .filter(calculo => calculo.mes >= mesInicio && calculo.mes <= mesFim)
                                        .reduce((sum, calculo) => sum + parseFloat(String(calculo.reforcoCorrigido || '0')), 0);

                                      // Chaves do ano
                                      const prazoEntrega = projection.deliveryMonths || parseInt(String(projection.deliveryTime)) || 0;
                                      let valorChavesAno = 0;
                                      if (prazoEntrega >= mesInicio && prazoEntrega <= mesFim) {
                                        const chavesCalculo = calculosParaUsar.find(calculo => calculo.mes === prazoEntrega);
                                        valorChavesAno = chavesCalculo ? parseFloat(String(chavesCalculo.chavesCorrigido || '0')) : 0;
                                      }

                                      // Verificar se é o ano da venda
                                      const isAnoVenda = mesVenda >= mesInicio && mesVenda <= mesFim;

                                      // Valores para o gráfico
                                      let entradaAno = 0;
                                      let investimentoAno = (ano === 1 ? valorEntrada : 0) + parcelasAno + reforcosAno + valorChavesAno;
                                      let lucroLiquidoAno = 0;

                                      // Se for o ano da venda, calcular lucro líquido e impostos
                                      if (isAnoVenda) {
                                        // Calcular venda projetada
                                        const resultadoVendaProjetada = calcularVendaProjetada(projection, completeScenario);
                                        const valorVenda = resultadoVendaProjetada.valorVendaProjetada;

                                        // Calcular total pago
                                        const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                          projection,
                                          calculosParaUsar,
                                          completeScenario
                                        );
                                        const totalPago = -detalhamentoTotalPago.total;

                                        // Calcular saldo devedor
                                        const saldoDevedorResult = calcularSaldoDevedor(
                                          projection,
                                          calculosParaUsar,
                                          completeScenario
                                        );
                                        const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;

                                        // Calcular despesas de venda
                                        const despesasVenda = calcularDespesasVenda(
                                          projection,
                                          valorVenda,
                                          completeScenario
                                        );

                                        // Calcular lucro bruto
                                        const lucroBruto = valorVenda + totalPago + saldoDevedor - despesasVenda.total;

                                        // Obter taxa de imposto pelo cenário
                                        let taxaImposto = 0;
                                        if (completeScenario === 'padrao') {
                                          taxaImposto = parseFloat(projection.padrao_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'conservador') {
                                          taxaImposto = parseFloat(projection.conservador_venda_impostos || '15') / 100;
                                        } else if (completeScenario === 'otimista') {
                                          taxaImposto = parseFloat(projection.otimista_venda_impostos || '15') / 100;
                                        }

                                        // Calcular imposto de renda
                                        const impostoRenda = lucroBruto > 0 ? lucroBruto * taxaImposto : 0;

                                        // Lucro líquido
                                        lucroLiquidoAno = lucroBruto - impostoRenda;
                                        entradaAno = valorVenda;
                                      }

                                      // Se for o ano da venda, calcular também o lucro bruto
                                      let lucroBrutoAno = 0;
                                      if (isAnoVenda) {
                                        // Calcular venda projetada
                                        const resultadoVendaProjetada = calcularVendaProjetada(projection, completeScenario);
                                        const valorVenda = resultadoVendaProjetada.valorVendaProjetada;

                                        // Calcular total pago
                                        const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
                                          projection,
                                          calculosParaUsar,
                                          completeScenario
                                        );
                                        const totalPago = -detalhamentoTotalPago.total;

                                        // Calcular saldo devedor
                                        const saldoDevedorResult = calcularSaldoDevedor(
                                          projection,
                                          calculosParaUsar,
                                          completeScenario
                                        );
                                        const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;

                                        // Calcular despesas de venda
                                        const despesasVenda = calcularDespesasVenda(
                                          projection,
                                          valorVenda,
                                          completeScenario
                                        );

                                        // Calcular lucro bruto
                                        lucroBrutoAno = valorVenda + totalPago + saldoDevedor - despesasVenda.total;
                                      }

                                      // Adicionar dados ao array
                                      dadosAnuais.push({
                                        year: `Ano ${ano}${isAnoVenda ? ' (Venda)' : ''}`,
                                        fluxoNegativo: -investimentoAno,
                                        lucroBruto: isAnoVenda ? lucroBrutoAno : 0,
                                        lucroLiquido: isAnoVenda ? lucroLiquidoAno : 0,
                                        // Calcular o acumulado
                                        acumulado: (dadosAnuais[ano-2]?.acumulado || 0) - investimentoAno + (isAnoVenda ? lucroLiquidoAno : 0)
                                      });
                                    }

                                    return dadosAnuais;
                                  };

                                  return calcularTotaisAnuais();
                                })()}
                                margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
                              >
                                <defs>
                                  <linearGradient id="colorFluxoNegativo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.2}/>
                                  </linearGradient>
                                  <linearGradient id="colorLucroBruto" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                                  </linearGradient>
                                  <linearGradient id="colorLucroLiquido" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#059669" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#059669" stopOpacity={0.2}/>
                                  </linearGradient>
                                  <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.2}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                <XAxis 
                                  dataKey="year" 
                                  axisLine={{ stroke: '#E2E8F0' }}
                                  tickLine={false}
                                  tick={{ fontSize: 12, fill: '#64748B' }}
                                />
                                <YAxis 
                                  tickFormatter={(value) => formatCurrency(Math.abs(value)).replace('R$', '')}
                                  axisLine={{ stroke: '#E2E8F0' }}
                                  tickLine={false}
                                  tick={{ fontSize: 12, fill: '#64748B' }}
                                />
                                <ChartTooltip 
                                  formatter={(value, name) => {
                                    const absValue = Math.abs(value);
                                    if (name === 'fluxoNegativo') return [formatCurrency(absValue), 'Saídas'];
                                    if (name === 'lucroBruto') return [formatCurrency(absValue), 'Lucro Bruto'];
                                    if (name === 'lucroLiquido') return [formatCurrency(absValue), 'Lucro Líquido'];
                                    if (name === 'acumulado') return [formatCurrency(absValue), value < 0 ? 'Saldo Acumulado (Negativo)' : 'Saldo Acumulado (Positivo)'];
                                    return [formatCurrency(absValue), name];
                                  }}
                                  contentStyle={{ 
                                    borderRadius: '8px', 
                                    border: '1px solid #E2E8F0',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                    backgroundColor: 'rgba(255,255,255,0.95)'
                                  }}
                                  labelStyle={{
                                    fontWeight: 'bold',
                                    color: '#334155'
                                  }}
                                />
                                <Legend 
                                  verticalAlign="top" 
                                  height={36}
                                  formatter={(value) => {
                                    if (value === 'fluxoNegativo') return 'Saídas';
                                    if (value === 'lucroBruto') return 'Lucro Bruto';
                                    if (value === 'lucroLiquido') return 'Lucro Líquido';
                                    if (value === 'acumulado') return 'Saldo Acumulado';
                                    return value;
                                  }}
                                  iconType="circle"
                                  iconSize={10}
                                  wrapperStyle={{
                                    paddingTop: '10px',
                                    paddingBottom: '10px'
                                  }}
                                />
                                <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                                <Bar 
                                  dataKey="fluxoNegativo" 
                                  barSize={24} 
                                  fill="url(#colorFluxoNegativo)" 
                                  opacity={0.9} 
                                  radius={[4, 4, 0, 0]}
                                  stackId="a"
                                />
                                <Bar 
                                  dataKey="lucroBruto" 
                                  barSize={24} 
                                  fill="url(#colorLucroBruto)" 
                                  opacity={0.9} 
                                  radius={[4, 4, 0, 0]}
                                  stackId="b"
                                />
                                <Bar 
                                  dataKey="lucroLiquido" 
                                  barSize={24} 
                                  fill="url(#colorLucroLiquido)" 
                                  opacity={0.9}
                                  radius={[4, 4, 0, 0]}
                                  stackId="c"
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="acumulado" 
                                  stroke="#6366F1" 
                                  strokeWidth={3}
                                  dot={{ stroke: '#6366F1', strokeWidth: 2, r: 5, fill: 'white' }}
                                  activeDot={{ stroke: '#6366F1', strokeWidth: 2, r: 7, fill: 'white' }}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>


                        </div>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Seção: Valorização Patrimonial */}
            {hasAppreciation && (
              <section id="valorizacao" className="space-y-8">


                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center">
                      <ArrowUpRight className="h-5 w-5 mr-2 text-primary" />
                      Valorização Patrimonial
                    </CardTitle>
                    <CardDescription>
                      Análise da valorização do imóvel ao longo do tempo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Timeline de Análise */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                          <div className="bg-teal-50 p-1 rounded-md mr-2">
                            <Clock className="h-4 w-4 text-teal-600" />
                          </div>
                          Período de Análise
                        </h3>

                        {/* Seletor de período */}
                        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                          {[5, 10, 15].map((years) => (
                            <button
                              key={years}
                              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                                selectedTimeframe === years
                                  ? "bg-white text-slate-800 shadow-sm font-medium"
                                  : "text-slate-600 hover:bg-slate-200"
                              }`}
                              onClick={() => setSelectedTimeframe(years)}
                            >
                              {years} anos
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cards iniciais com métricas principais */}
                      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4 mb-8">
                        {/* Card Valor Inicial */}
                        <Card className="bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 overflow-hidden relative">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500"></div>
                          <CardContent className="p-1.5 md:p-5">
                            <div className="flex items-start">
                              <div className="mr-1 md:mr-3 mt-0.5 flex-shrink-0">
                                <div className="p-1 md:p-2 rounded-md bg-blue-50">
                                  <Home className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs md:text-xs uppercase tracking-wider font-medium text-slate-500 block h-4 flex items-center">Valor Inicial</span>
                                <div className="text-xs md:text-2xl font-bold mt-1 md:mt-1.5 text-slate-800 break-words leading-tight">
                                  {projection.calculationResults?.assetAppreciation?.initialValue 
                                    ? formatCurrency(projection.calculationResults.assetAppreciation.initialValue)
                                    : "R$ 0,00"}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Card Valor Final Projetado */}
                        <Card className="bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 overflow-hidden relative">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-green-500"></div>
                          <CardContent className="p-1.5 md:p-5">
                            <div className="flex items-start">
                              <div className="mr-1 md:mr-3 mt-0.5">
                                <div className="p-1 md:p-2 rounded-md bg-green-50">
                                  <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <span className="text-xs md:text-xs uppercase tracking-wider font-medium text-slate-500 h-4 flex items-center">Valor Final ({selectedTimeframe} anos)</span>
                                <div className="text-xs md:text-2xl font-bold mt-1 md:mt-1.5 text-slate-800 break-words leading-tight">
                                  {projection.calculationResults?.assetAppreciation?.initialValue 
                                    ? formatCurrency(
                                        calculateFinalValue(
                                          projection.calculationResults.assetAppreciation.initialValue,
                                          // Usar diretamente a taxa do banco de dados para o cenário
                                          getAppreciationRate(appreciationScenario),
                                          selectedTimeframe
                                        )
                                      )
                                    : "R$ 0,00"}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Card Valorização Total */}
                        <Card className="bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 overflow-hidden relative">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-purple-500"></div>
                          <CardContent className="p-1.5 md:p-5">
                            <div className="flex items-start">
                              <div className="mr-1 md:mr-3 mt-0.5">
                                <div className="p-1 md:p-2 rounded-md bg-purple-50">
                                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-purple-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <span className="text-xs md:text-xs uppercase tracking-wider font-medium text-slate-500 h-4 flex items-center">Valorização Total</span>
                                <div className="text-xs md:text-2xl font-bold mt-1 md:mt-1.5 text-slate-800 break-words leading-tight">
                                  {projection.calculationResults?.assetAppreciation?.initialValue 
                                    ? formatAppreciationPercentage(
                                        (calculateFinalValue(
                                          projection.calculationResults.assetAppreciation.initialValue,
                                          // Usar diretamente a taxa do banco de dados para o cenário
                                          getAppreciationRate(appreciationScenario),
                                          selectedTimeframe
                                        ) / projection.calculationResults.assetAppreciation.initialValue) - 1
                                      )
                                    : "0%"}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Card Valorização Anual */}
                        <Card className="bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 overflow-hidden relative">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500"></div>
                          <CardContent className="p-1.5 md:p-5">
                            <div className="flex items-start">
                              <div className="mr-1 md:mr-3 mt-0.5">
                                <div className="p-1 md:p-2 rounded-md bg-amber-50">
                                  <Calendar className="h-3 w-3 md:h-4 md:w-4 text-amber-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <span className="text-xs md:text-xs uppercase tracking-wider font-medium text-slate-500 h-4 flex items-center">Valorização Anual</span>
                                <div className="text-xs md:text-2xl font-bold mt-1 md:mt-1.5 text-slate-800 break-words leading-tight">
                                  {/* Mostrar diretamente a taxa de valorização do banco de dados baseado no cenário */}
                                  {formatAppreciationPercentage(getAppreciationRate(appreciationScenario))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Evolução do Valor do Imóvel - Gráfico */}
                    <Card className="shadow-lg border border-slate-200 bg-white mb-8 overflow-hidden rounded-xl">
                      <CardHeader className="pb-2 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                        <CardTitle className="text-base flex items-center text-slate-700">
                          <div className="flex items-center">
                            <div className="bg-blue-500 p-1.5 rounded-md mr-2 shadow-sm">
                              <LineChartIcon className="h-4 w-4 text-white" />
                            </div>
                            Evolução do Valor do Imóvel
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 bg-gradient-to-b from-white to-slate-50">
                        {/* Botão para mostrar/ocultar valores Y - apenas mobile */}
                        <div className="md:hidden mb-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs px-2 py-1 h-7"
                            onClick={() => setShowYAxisEvolucao(!showYAxisEvolucao)}
                          >
                            {showYAxisEvolucao ? 'Ocultar Valores' : 'Mostrar Valores'}
                            <Eye className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                        <div className="h-[280px] md:h-[380px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={generateAppreciationData(
                                projection.calculationResults?.assetAppreciation?.initialValue || 300000,
                                // Usar diretamente a taxa do banco de dados para o cenário
                                getAppreciationRate(appreciationScenario),
                                selectedTimeframe
                              )}
                              margin={{ 
                                top: 20, 
                                right: isMobile ? 5 : 30, 
                                left: isMobile ? (showYAxisEvolucao ? 20 : 5) : 20, 
                                bottom: 30 
                              }}
                            >
                              <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.7} />
                                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.2} />
                                </linearGradient>
                                <filter id="shadow" height="200%">
                                  <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#60A5FA" floodOpacity="0.3"/>
                                </filter>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                              <XAxis 
                                dataKey="year" 
                                axisLine={{ stroke: '#E2E8F0' }}
                                tickLine={false}
                                tick={{ fontSize: isMobile ? 9 : 12, fill: '#64748B', fontWeight: 500 }}
                                padding={{ left: 10, right: 10 }}
                              />
                              <YAxis 
                                hide={isMobile && !showYAxisEvolucao}
                                tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                                axisLine={{ stroke: '#E2E8F0' }}
                                tickLine={false}
                                tick={{ fontSize: isMobile ? 9 : 12, fill: '#64748B', fontWeight: 500 }}
                                domain={['dataMin - 50000', 'dataMax + 50000']}
                                width={isMobile ? 60 : 80}
                              />
                              <ChartTooltip 
                                formatter={(value) => [formatCurrency(value), 'Valor do Imóvel']}
                                contentStyle={{ 
                                  borderRadius: '12px', 
                                  border: '1px solid #E2E8F0',
                                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                  padding: isMobile ? '8px' : '12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                  fontWeight: 500,
                                  fontSize: isMobile ? '10px' : '12px'
                                }}
                                labelFormatter={(label) => `Ano ${label}`}
                                cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '5 5' }}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#4F46E5" 
                                strokeWidth={isMobile ? 2 : 3}
                                fillOpacity={1} 
                                fill="url(#colorValue)" 
                                filter="url(#shadow)"
                                activeDot={{ 
                                  r: isMobile ? 6 : 9, 
                                  stroke: '#4F46E5',
                                  strokeWidth: isMobile ? 2 : 3,
                                  fill: 'white',
                                  strokeOpacity: 0.8,
                                  filter: "drop-shadow(0px 2px 3px rgba(59, 130, 246, 0.5))"
                                }}
                              />
                              <ReferenceLine 
                                y={projection.calculationResults?.assetAppreciation?.initialValue || 0} 
                                label={{ 
                                  value: 'Valor Inicial',
                                  position: 'insideTopLeft',
                                  fill: '#4F46E5',
                                  fontSize: isMobile ? 10 : 12,
                                  fontWeight: 600,
                                  offset: 15
                                }} 
                                stroke="#64748B" 
                                strokeDasharray="3 3"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                      </CardContent>
                    </Card>

                    {/* Detalhamento da Valorização Anual */}
                    <Card className="shadow-lg border border-slate-200 bg-white mb-8 overflow-hidden rounded-xl">
                      <CardHeader className="pb-2 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
                        <CardTitle className="text-base flex items-center text-slate-700">
                          <div className="flex items-center">
                            <div className="bg-purple-500 p-1.5 rounded-md mr-2 shadow-sm">
                              <BarChart3 className="h-4 w-4 text-white" />
                            </div>
                            Detalhamento da Valorização Anual
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="p-6 bg-gradient-to-b from-white to-slate-50">
                          {/* Botão para mostrar/ocultar valores Y - apenas mobile */}
                          <div className="md:hidden mb-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs px-2 py-1 h-7"
                              onClick={() => setShowYAxisDetalhamento(!showYAxisDetalhamento)}
                            >
                              {showYAxisDetalhamento ? 'Ocultar Valores' : 'Mostrar Valores'}
                              <Eye className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                          <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsBarChart
                                data={generateYearlyDetailsData(
                                  projection.calculationResults?.assetAppreciation?.initialValue || 300000,
                                  // Usar diretamente a taxa do banco de dados para o cenário
                                  getAppreciationRate(appreciationScenario),
                                  selectedTimeframe
                                )}
                                margin={{ 
                                  top: 20, 
                                  right: isMobile ? 5 : 30, 
                                  left: isMobile ? (showYAxisDetalhamento ? 20 : 5) : 20, 
                                  bottom: 20 
                                }}
                                barGap={2}
                                barCategoryGap={8}
                              >
                                <defs>
                                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.8} />
                                  </linearGradient>
                                  <filter id="barShadow" height="200%">
                                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8B5CF6" floodOpacity="0.3"/>
                                  </filter>
                                </defs>

                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis 
                                  dataKey="year" 
                                  axisLine={{ stroke: '#E2E8F0' }}
                                  tickLine={false}
                                  tick={{ fontSize: isMobile ? 9 : 12, fill: '#64748B', fontWeight: 500 }}
                                  padding={{ left: 10, right: 10 }}
                                />
                                <YAxis 
                                  hide={isMobile && !showYAxisDetalhamento}
                                  tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                                  axisLine={{ stroke: '#E2E8F0' }}
                                  tickLine={false}
                                  tick={{ fontSize: isMobile ? 9 : 12, fill: '#64748B', fontWeight: 500 }}
                                  width={isMobile ? 60 : 80}
                                />
                                <ChartTooltip 
                                  formatter={(value) => [formatCurrency(value), 'Valorização no Ano']}
                                  contentStyle={{ 
                                    borderRadius: '12px', 
                                    border: '1px solid #E2E8F0',
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                    padding: isMobile ? '8px' : '12px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                    fontWeight: 500,
                                    fontSize: isMobile ? '10px' : '12px'
                                  }}
                                  labelFormatter={(label) => `Ano ${label}`}
                                  cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                                />
                                <Legend 
                                  align="right"
                                  verticalAlign="top"
                                  iconType="circle"
                                  iconSize={isMobile ? 6 : 10}
                                  wrapperStyle={{ 
                                    paddingBottom: '10px',
                                    fontSize: isMobile ? '9px' : '12px'
                                  }}
                                  formatter={(value) => {
                                    if (value === "appreciation") return "Valorização no Ano";
                                    return value;
                                  }}
                                />
                                <Bar 
                                  dataKey="appreciation" 
                                  name="appreciation"
                                  fill="url(#barGradient)" 
                                  radius={[8, 8, 0, 0]} 
                                  barSize={selectedTimeframe > 10 ? (isMobile ? 18 : 22) : (isMobile ? 28 : 32)}
                                  animationDuration={1000}
                                  filter="url(#barShadow)"
                                >
                                  {generateYearlyDetailsData(
                                    projection.calculationResults?.assetAppreciation?.initialValue || 300000,
                                    getAppreciationRate(appreciationScenario),
                                    selectedTimeframe
                                  ).map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill="url(#barGradient)" 
                                    />
                                  ))}
                                </Bar>
                              </RechartsBarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Tabela de detalhamento */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 border-y border-slate-200">
                              <tr>
                                <th className="py-2 md:py-4 px-2 md:px-6 text-left text-xs md:text-sm font-semibold text-slate-700 rounded-tl-lg">Ano</th>
                                <th className="py-2 md:py-4 px-2 md:px-6 text-right text-xs md:text-sm font-semibold text-slate-700">Valor do Imóvel</th>
                                <th className="py-2 md:py-4 px-2 md:px-6 text-right text-xs md:text-sm font-semibold text-slate-700">Valorização</th>
                                <th className="py-2 md:py-4 px-1 md:px-6 text-right text-xs md:text-sm font-semibold text-slate-700 rounded-tr-lg">
                                  <span className="hidden md:inline">Percentual</span>
                                  <span className="md:hidden">%</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {generateTableData(
                                projection.calculationResults?.assetAppreciation?.initialValue || 300000,
                                // Usar diretamente a taxa do banco de dados para o cenário
                                getAppreciationRate(appreciationScenario),
                                selectedTimeframe
                              ).map((row, index) => (
                                <tr 
                                  key={index} 
                                  className={index % 2 === 0 
                                    ? "bg-white hover:bg-slate-50 transition duration-150" 
                                    : "bg-slate-50 hover:bg-slate-100 transition duration-150"
                                  }
                                >
                                  <td className="py-2 md:py-4 px-2 md:px-6 font-medium text-slate-700">
                                    <div className="flex items-center">
                                      <span className="h-4 w-4 md:h-6 md:w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mr-1 md:mr-2 text-xs font-semibold">
                                        {row.year}
                                      </span>
                                      <span className="text-xs md:text-sm hidden md:inline">Ano {row.year}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 md:py-4 px-2 md:px-6 text-right text-slate-700 font-medium text-xs md:text-sm">{formatCurrency(row.value)}</td>
                                  <td className="py-2 md:py-4 px-2 md:px-6 text-right">
                                    <span className="px-2 md:px-3 py-1 rounded-full bg-green-50 text-green-700 font-medium text-xs md:text-sm">
                                      {formatCurrency(row.appreciation)}
                                    </span>
                                  </td>
                                  <td className="py-2 md:py-4 px-1 md:px-6 text-right text-slate-700 font-medium text-xs md:text-sm">{formatAppreciationPercentage(row.percent)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>


                  </CardContent>
                </Card>
              </section>
            )}

            {/* Seção: Rentabilidade com Locação */}
            {hasRentalYield && (
              <section id="locacao" className="space-y-8">


                {/* Card principal com título e descrição */}
                <Card className="shadow-md border border-slate-200 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b pb-4">
                    <CardTitle className="flex items-center text-xl">
                      <div className="mr-3 bg-primary/10 p-1.5 rounded-full">
                        <Repeat className="h-5 w-5 text-primary" />
                      </div>
                      Rentabilidade com Locação
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Análise detalhada do retorno através da locação do imóvel no cenário <span className="font-medium capitalize">{rentalYieldScenario}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {/* Parâmetros do investimento - Nova seção */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="bg-slate-100 p-1.5 rounded-md">
                          <FileText className="h-5 w-5 text-slate-600" />
                        </div>
                        <h3 className="text-md font-medium text-slate-700">Parâmetros do Investimento</h3>
                      </div>

                      {/* Cards com parâmetros em grid - Visual mais sutil */}
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                        {/* Card Renda Mensal Bruta (movido de baixo) */}
                        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-xs font-medium text-slate-500">Renda Mensal Bruta</h4>
                                <div className="mt-2 flex items-baseline">
                                  <span className="text-sm md:text-2xl font-bold text-slate-800">
                                    {rentalYieldScenario === 'padrao' && projection.padrao_aluguel_valor_mensal
                                      ? formatCurrency(parseFloat(projection.padrao_aluguel_valor_mensal))
                                      : rentalYieldScenario === 'conservador' && projection.conservador_aluguel_valor_mensal
                                      ? formatCurrency(parseFloat(projection.conservador_aluguel_valor_mensal))
                                      : rentalYieldScenario === 'otimista' && projection.otimista_aluguel_valor_mensal
                                      ? formatCurrency(parseFloat(projection.otimista_aluguel_valor_mensal))
                                      : "R$ 0,00"}
                                  </span>
                                </div>
                              </div>
                              <div className="p-1.5 rounded-md bg-green-50">
                                <Banknote className="h-4 w-4 text-green-500" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>



                        {/* Card Taxa de Ocupação */}
                        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-xs font-medium text-slate-500">Taxa de Ocupação</h4>
                                <div className="mt-2 flex items-baseline">
                                  <span className="text-sm md:text-2xl font-bold text-slate-800">
                                    {rentalYieldScenario === 'padrao' && projection.padrao_aluguel_ocupacao
                                      ? `${parseFloat(projection.padrao_aluguel_ocupacao)}%`
                                      : rentalYieldScenario === 'conservador' && projection.conservador_aluguel_ocupacao
                                      ? `${parseFloat(projection.conservador_aluguel_ocupacao)}%`
                                      : rentalYieldScenario === 'otimista' && projection.otimista_aluguel_ocupacao
                                      ? `${parseFloat(projection.otimista_aluguel_ocupacao)}%`
                                      : "0%"}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">anual média</p>
                              </div>
                              <div className="p-1.5 rounded-md bg-blue-50">
                                <PercentIcon className="h-4 w-4 text-blue-500" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Card Taxa de Administração */}
                        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-xs font-medium text-slate-500">Taxa de Administração</h4>
                                <div className="mt-2 flex items-baseline">
                                  <span className="text-sm md:text-2xl font-bold text-slate-800">
                                    {rentalYieldScenario === 'padrao' && projection.padrao_aluguel_taxa_administracao
                                      ? `${parseFloat(projection.padrao_aluguel_taxa_administracao)}%`
                                      : rentalYieldScenario === 'conservador' && projection.conservador_aluguel_taxa_administracao
                                      ? `${parseFloat(projection.conservador_aluguel_taxa_administracao)}%`
                                      : rentalYieldScenario === 'otimista' && projection.otimista_aluguel_taxa_administracao
                                      ? `${parseFloat(projection.otimista_aluguel_taxa_administracao)}%`
                                      : "0%"}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">do valor do aluguel</p>
                              </div>
                              <div className="p-1.5 rounded-md bg-amber-50">
                                <Building className="h-4 w-4 text-amber-500" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Card Custos de Manutenção */}
                        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-xs font-medium text-slate-500">Manutenção Mensal</h4>
                                <div className="mt-2 flex items-baseline">
                                  <span className="text-sm md:text-2xl font-bold text-slate-800">
                                    {rentalYieldScenario === 'padrao' && projection.padrao_aluguel_manutencao
                                      ? `${parseFloat(projection.padrao_aluguel_manutencao)}%`
                                      : rentalYieldScenario === 'conservador' && projection.conservador_aluguel_manutencao
                                      ? `${parseFloat(projection.conservador_aluguel_manutencao)}%`
                                      : rentalYieldScenario === 'otimista' && projection.otimista_aluguel_manutencao
                                      ? `${parseFloat(projection.otimista_aluguel_manutencao)}%`
                                      : "0%"}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">do valor do aluguel</p>
                              </div>
                              <div className="p-1.5 rounded-md bg-rose-50">
                                <Wallet className="h-4 w-4 text-rose-500" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Card Reajuste de Aluguel Anual */}
                        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-xs font-medium text-slate-500">Reajuste Anual</h4>
                                <div className="mt-1.5 flex items-baseline">
                                  <span className="text-lg font-bold text-slate-800">
                                    {rentalYieldScenario === 'padrao' && projection.padrao_aluguel_reajuste_anual
                                      ? `${parseFloat(projection.padrao_aluguel_reajuste_anual)}%`
                                      : rentalYieldScenario === 'conservador' && projection.conservador_aluguel_reajuste_anual
                                      ? `${parseFloat(projection.conservador_aluguel_reajuste_anual)}%`
                                      : rentalYieldScenario === 'otimista' && projection.otimista_aluguel_reajuste_anual
                                      ? `${parseFloat(projection.otimista_aluguel_reajuste_anual)}%`
                                      : "0%"}
                                  </span>
                                </div>
                              </div>
                              <div className="p-1.5 rounded-md bg-indigo-50">
                                <TrendingUp className="h-4 w-4 text-indigo-500" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>


                      </div>
                    </div>

                    {/* Resumo financeiro principal */}
                    <div className="mb-8">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                          <div className="bg-blue-50 p-1.5 rounded-md mr-2.5">
                            <BarChartIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          Resumo Financeiro
                        </h3>
                      </div>

                      {/* Cards com métricas principais em grid visualmente melhorada */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {/* Card Investimento Total */}
                        <Card className="bg-gradient-to-br from-white to-blue-50 border-slate-200 hover:shadow-md transition-all duration-300 overflow-hidden">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-slate-500">Investimento Total</h4>
                                <div className="mt-2 flex items-baseline">
                                  <span className="text-sm md:text-3xl font-bold text-slate-800">
                                    {projection.listPrice 
                                      ? formatCurrency(
                                          Number(projection.listPrice) - Number(projection.discount || 0)
                                        )
                                      : "R$ 0,00"}
                                  </span>
                                </div>
                              </div>
                              <div className="p-1.5 rounded-md bg-blue-100">
                                <CreditCard className="h-4 w-4 text-blue-600" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Card Investimento Total Corrigido */}
                        <Card className="bg-gradient-to-br from-white to-rose-50 border-slate-200 hover:shadow-md transition-all duration-300 overflow-hidden">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-slate-500">Investimento Total Corrigido</h4>
                                <div className="mt-2 flex items-baseline">
                                  <span className="text-sm md:text-3xl font-bold text-slate-800">
                                    {(() => {
                                        // Verificar se temos os dados do banco na projeção
                                        if (!projection.calculationResults?.calculosProjecao) {
                                          return "R$ 0,00";
                                        }

                                        // Calcular o valor total corrigido diretamente da tabela de cálculos
                                        const calculos = projection.calculationResults.calculosProjecao;
                                        if (calculos.length === 0) return "R$ 0,00";

                                        // Para investimento total corrigido, sempre usar dados do cenário 'padrao'
                                        // pois o valor do investimento não varia entre cenários
                                        const calculosCenario = calculos.filter(c => c.scenario === 'padrao');

                                        if (calculosCenario.length === 0) return "R$ 0,00";

                                        // Calcular o total somando:
                                        // 1. Valor de entrada (apenas do mês 0)
                                        // 2. Soma de todas as parcelas corrigidas
                                        // 3. Soma de todos os reforços corrigidos
                                        // 4. Soma de todos os valores de chaves corrigidos
                                        let totalEntrada = 0;
                                        let totalParcelas = 0;
                                        let totalReforcos = 0;
                                        let totalChaves = 0;

                                        calculosCenario.forEach(calculo => {
                                          // Usar os nomes corretos dos campos conforme estrutura do banco
                                          if (calculo.mes === 0) {
                                            totalEntrada += Number(calculo.valorEntrada || 0);
                                          }
                                          totalParcelas += Number(calculo.parcelaCorrigida || 0);
                                          totalReforcos += Number(calculo.reforcoCorrigido || 0);
                                          totalChaves += Number(calculo.chavesCorrigido || 0);
                                        });

                                        const valorTotalCorrigido = totalEntrada + totalParcelas + totalReforcos + totalChaves;

                                        return formatCurrency(valorTotalCorrigido);
                                      })()}
                                  </span>
                                </div>
                              </div>
                              <div className="p-1.5 rounded-md bg-rose-100">
                                <Wallet className="h-4 w-4 text-rose-600" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Card Renda Mensal Líquida */}
                        <Card className="bg-gradient-to-br from-white to-teal-50 border-slate-200 hover:shadow-md transition-all duration-300 overflow-hidden">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-slate-500">Renda Mensal Líquida</h4>
                                <div className="mt-2 flex items-baseline">
                                  <span className="text-sm md:text-3xl font-bold text-slate-800">
                                    {(() => {
                                      // Obter valores do cenário ativo
                                      let monthlyRent = 0;
                                      let occupancyRate = 95;
                                      let managementFee = 8;
                                      let maintenanceCosts = 0;

                                      if (rentalYieldScenario === 'padrao') {
                                        monthlyRent = projection.padrao_aluguel_valor_mensal ? parseFloat(projection.padrao_aluguel_valor_mensal) : 0;
                                        occupancyRate = projection.padrao_aluguel_ocupacao ? parseFloat(projection.padrao_aluguel_ocupacao) : 95;
                                        managementFee = projection.padrao_aluguel_taxa_administracao ? parseFloat(projection.padrao_aluguel_taxa_administracao) : 8;
                                        maintenanceCosts = projection.padrao_aluguel_manutencao ? parseFloat(projection.padrao_aluguel_manutencao) : 0;
                                      } else if (rentalYieldScenario === 'conservador') {
                                        monthlyRent = projection.conservador_aluguel_valor_mensal ? parseFloat(projection.conservador_aluguel_valor_mensal) : 0;
                                        occupancyRate = projection.conservador_aluguel_ocupacao ? parseFloat(projection.conservador_aluguel_ocupacao) : 90;
                                        managementFee = projection.conservador_aluguel_taxa_administracao ? parseFloat(projection.conservador_aluguel_taxa_administracao) : 8;
                                        maintenanceCosts = projection.conservador_aluguel_manutencao ? parseFloat(projection.conservador_aluguel_manutencao) : 0;
                                      } else if (rentalYieldScenario === 'otimista') {
                                        monthlyRent = projection.otimista_aluguel_valor_mensal ? parseFloat(projection.otimista_aluguel_valor_mensal) : 0;
                                        occupancyRate = projection.otimista_aluguel_ocupacao ? parseFloat(projection.otimista_aluguel_ocupacao) : 98;
                                        managementFee = projection.otimista_aluguel_taxa_administracao ? parseFloat(projection.otimista_aluguel_taxa_administracao) : 7;
                                        maintenanceCosts = projection.otimista_aluguel_manutencao ? parseFloat(projection.otimista_aluguel_manutencao) : 0;
                                      }

                                      // Usar a função existente para calcular o rendimento mensal líquido
                                      const netIncome = calculateMonthlyNetIncome(
                                        monthlyRent,
                                        occupancyRate,
                                        managementFee,
                                        maintenanceCosts
                                      );

                                      return formatCurrency(netIncome);
                                    })()}
                                  </span>
                                </div>
                              </div>
                              <div className="p-1.5 rounded-md bg-teal-100">
                                <CircleDollarSign className="h-4 w-4 text-teal-600" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Card Renda Anual Líquida */}
                        <Card className="bg-gradient-to-br from-white to-indigo-50 border-slate-200 hover:shadow-md transition-all duration-300 overflow-hidden">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-slate-500">Renda Anual Líquida</h4>
                                <div className="mt-2 flex items-baseline">
                                  <span className="text-sm md:text-3xl font-bold text-slate-800">
                                    {(() => {
                                      // Obter valores do cenário ativo
                                      let monthlyRent = 0;
                                      let occupancyRate = 95;
                                      let managementFee = 8;
                                      let maintenanceCosts = 0;

                                      if (rentalYieldScenario === 'padrao') {
                                        monthlyRent = projection.padrao_aluguel_valor_mensal ? parseFloat(projection.padrao_aluguel_valor_mensal) : 0;
                                        occupancyRate = projection.padrao_aluguel_ocupacao ? parseFloat(projection.padrao_aluguel_ocupacao) : 95;
                                        managementFee = projection.padrao_aluguel_taxa_administracao ? parseFloat(projection.padrao_aluguel_taxa_administracao) : 8;
                                        maintenanceCosts = projection.padrao_aluguel_manutencao ? parseFloat(projection.padrao_aluguel_manutencao) : 0;
                                      } else if (rentalYieldScenario === 'conservador') {
                                        monthlyRent = projection.conservador_aluguel_valor_mensal ? parseFloat(projection.conservador_aluguel_valor_mensal) : 0;
                                        occupancyRate = projection.conservador_aluguel_ocupacao ? parseFloat(projection.conservador_aluguel_ocupacao) : 90;
                                        managementFee = projection.conservador_aluguel_taxa_administracao ? parseFloat(projection.conservador_aluguel_taxa_administracao) : 8;
                                        maintenanceCosts = projection.conservador_aluguel_manutencao ? parseFloat(projection.conservador_aluguel_manutencao) : 0;
                                      } else if (rentalYieldScenario === 'otimista') {
                                        monthlyRent = projection.otimista_aluguel_valor_mensal ? parseFloat(projection.otimista_aluguel_valor_mensal) : 0;
                                        occupancyRate = projection.otimista_aluguel_ocupacao ? parseFloat(projection.otimista_aluguel_ocupacao) : 98;
                                        managementFee = projection.otimista_aluguel_taxa_administracao ? parseFloat(projection.otimista_aluguel_taxa_administracao) : 7;
                                        maintenanceCosts = projection.otimista_aluguel_manutencao ? parseFloat(projection.otimista_aluguel_manutencao) : 0;
                                      }

                                      // Primeiro calcular o rendimento mensal líquido
                                      const monthlyNetIncome = calculateMonthlyNetIncome(
                                        monthlyRent,
                                        occupancyRate,
                                        managementFee,
                                        maintenanceCosts
                                      );

                                      // Depois calcular o rendimento anual líquido
                                      const annualNetIncome = calculateAnnualNetIncome(monthlyNetIncome);

                                      return formatCurrency(annualNetIncome);
                                    })()}
                                  </span>
                                </div>
                              </div>
                              <div className="p-1.5 rounded-md bg-indigo-100">
                                <CalendarClock className="h-4 w-4 text-indigo-600" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* ROI Cards - Nova seção de cards com design mais compacto */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {/* Card ROI Mensal */}
                        <Card className="bg-gradient-to-br from-white to-purple-50 border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center mb-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 rounded-lg bg-purple-100 flex items-center justify-center">
                                  <TrendingUp className="h-4 w-4 text-purple-600" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-700">Cap Rate Mensal</h4>
                              </div>
                              <p className="text-xs text-slate-500">Taxa de capitalização mensal</p>
                            </div>
                            <div className="mt-2 text-center">
                              <span className="text-2xl font-bold text-slate-800">
                                {(() => {
                                  // Calcular o investimento total corrigido dinamicamente
                                  // Sempre usar dados do cenário 'padrao' pois o valor do investimento não varia entre cenários
                                  let investimentoTotalCorrigido = 0;
                                  if (projection.calculationResults?.calculosProjecao) {
                                    const calculos = projection.calculationResults.calculosProjecao;
                                    const calculosCenario = calculos.filter(c => c.scenario === 'padrao');

                                    let totalEntrada = 0;
                                    let totalParcelas = 0;
                                    let totalReforcos = 0;
                                    let totalChaves = 0;

                                    calculosCenario.forEach(calculo => {
                                      if (calculo.mes === 0) {
                                        totalEntrada += Number(calculo.valorEntrada || 0);
                                      }
                                      totalParcelas += Number(calculo.parcelaCorrigida || 0);
                                      totalReforcos += Number(calculo.reforcoCorrigido || 0);
                                      totalChaves += Number(calculo.chavesCorrigido || 0);
                                    });

                                    investimentoTotalCorrigido = totalEntrada + totalParcelas + totalReforcos + totalChaves;
                                  }

                                  // Obter valores do cenário ativo
                                  let monthlyRent = 0;
                                  let occupancyRate = 95;
                                  let managementFee = 8;
                                  let maintenanceCosts = 0;

                                  if (rentalYieldScenario === 'padrao') {
                                    monthlyRent = projection.padrao_aluguel_valor_mensal ? parseFloat(projection.padrao_aluguel_valor_mensal) : 0;
                                    occupancyRate = projection.padrao_aluguel_ocupacao ? parseFloat(projection.padrao_aluguel_ocupacao) : 95;
                                    managementFee = projection.padrao_aluguel_taxa_administracao ? parseFloat(projection.padrao_aluguel_taxa_administracao) : 8;
                                    maintenanceCosts = projection.padrao_aluguel_manutencao ? parseFloat(projection.padrao_aluguel_manutencao) : 0;
                                  } else if (rentalYieldScenario === 'conservador') {
                                    monthlyRent = projection.conservador_aluguel_valor_mensal ? parseFloat(projection.conservador_aluguel_valor_mensal) : 0;
                                    occupancyRate = projection.conservador_aluguel_ocupacao ? parseFloat(projection.conservador_aluguel_ocupacao) : 90;
                                    managementFee = projection.conservador_aluguel_taxa_administracao ? parseFloat(projection.conservador_aluguel_taxa_administracao) : 8;
                                    maintenanceCosts = projection.conservador_aluguel_manutencao ? parseFloat(projection.conservador_aluguel_manutencao) : 0;
                                  } else if (rentalYieldScenario === 'otimista') {
                                    monthlyRent = projection.otimista_aluguel_valor_mensal ? parseFloat(projection.otimista_aluguel_valor_mensal) : 0;
                                    occupancyRate = projection.otimista_aluguel_ocupacao ? parseFloat(projection.otimista_aluguel_ocupacao) : 98;
                                    managementFee = projection.otimista_aluguel_taxa_administracao ? parseFloat(projection.otimista_aluguel_taxa_administracao) : 7;
                                    maintenanceCosts = projection.otimista_aluguel_manutencao ? parseFloat(projection.otimista_aluguel_manutencao) : 0;
                                  }

                                  // Calcular o rendimento mensal líquido
                                  const monthlyNetIncome = calculateMonthlyNetIncome(
                                    monthlyRent,
                                    occupancyRate,
                                    managementFee,
                                    maintenanceCosts
                                  );

                                  // Calcular o ROI mensal (%)
                                  const monthlyROI = (monthlyNetIncome / investimentoTotalCorrigido) * 100;

                                  // Formatar com duas casas decimais + %
                                  return monthlyROI.toFixed(2).replace('.', ',') + '%';
                                })()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-center">Porcentagem de retorno mensal sobre o investimento total corrigido</p>
                          </CardContent>
                        </Card>

                        {/* Card ROI Anual */}
                        <Card className="bg-gradient-to-br from-white to-amber-50 border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center mb-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 rounded-lg bg-amber-100 flex items-center justify-center">
                                  <ArrowUpRight className="h-4 w-4 text-amber-600" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-700">Cap Rate Anual</h4>
                              </div>
                              <p className="text-xs text-slate-500">Taxa de capitalização anual</p>
                            </div>
                            <div className="mt-2 text-center">
                              <span className="text-2xl font-bold text-slate-800">
                                {(() => {
                                  // Calcular o investimento total corrigido dinamicamente
                                  // Sempre usar dados do cenário 'padrao' pois o valor do investimento não varia entre cenários
                                  let investimentoTotalCorrigido = 0;
                                  if (projection.calculationResults?.calculosProjecao) {
                                    const calculos = projection.calculationResults.calculosProjecao;
                                    const calculosCenario = calculos.filter(c => c.scenario === 'padrao');

                                    let totalEntrada = 0;
                                    let totalParcelas = 0;
                                    let totalReforcos = 0;
                                    let totalChaves = 0;

                                    calculosCenario.forEach(calculo => {
                                      if (calculo.mes === 0) {
                                        totalEntrada += Number(calculo.valorEntrada || 0);
                                      }
                                      totalParcelas += Number(calculo.parcelaCorrigida || 0);
                                      totalReforcos += Number(calculo.reforcoCorrigido || 0);
                                      totalChaves += Number(calculo.chavesCorrigido || 0);
                                    });

                                    investimentoTotalCorrigido = totalEntrada + totalParcelas + totalReforcos + totalChaves;
                                  }

                                  // Obter valores do cenário ativo
                                  let monthlyRent = 0;
                                  let occupancyRate = 95;
                                  let managementFee = 8;
                                  let maintenanceCosts = 0;

                                  if (rentalYieldScenario === 'padrao') {
                                    monthlyRent = projection.padrao_aluguel_valor_mensal ? parseFloat(projection.padrao_aluguel_valor_mensal) : 0;
                                    occupancyRate = projection.padrao_aluguel_ocupacao ? parseFloat(projection.padrao_aluguel_ocupacao) : 95;
                                    managementFee = projection.padrao_aluguel_taxa_administracao ? parseFloat(projection.padrao_aluguel_taxa_administracao) : 8;
                                    maintenanceCosts = projection.padrao_aluguel_manutencao ? parseFloat(projection.padrao_aluguel_manutencao) : 0;
                                  } else if (rentalYieldScenario === 'conservador') {
                                    monthlyRent = projection.conservador_aluguel_valor_mensal ? parseFloat(projection.conservador_aluguel_valor_mensal) : 0;
                                    occupancyRate = projection.conservador_aluguel_ocupacao ? parseFloat(projection.conservador_aluguel_ocupacao) : 90;
                                    managementFee = projection.conservador_aluguel_taxa_administracao ? parseFloat(projection.conservador_aluguel_taxa_administracao) : 8;
                                    maintenanceCosts = projection.conservador_aluguel_manutencao ? parseFloat(projection.conservador_aluguel_manutencao) : 0;
                                  } else if (rentalYieldScenario === 'otimista') {
                                    monthlyRent = projection.otimista_aluguel_valor_mensal ? parseFloat(projection.otimista_aluguel_valor_mensal) : 0;
                                    occupancyRate = projection.otimista_aluguel_ocupacao ? parseFloat(projection.otimista_aluguel_ocupacao) : 98;
                                    managementFee = projection.otimista_aluguel_taxa_administracao ? parseFloat(projection.otimista_aluguel_taxa_administracao) : 7;
                                    maintenanceCosts = projection.otimista_aluguel_manutencao ? parseFloat(projection.otimista_aluguel_manutencao) : 0;
                                  }

                                  // Primeiro calcular o rendimento mensal líquido
                                  const monthlyNetIncome = calculateMonthlyNetIncome(
                                    monthlyRent,
                                    occupancyRate,
                                    managementFee,
                                    maintenanceCosts
                                  );

                                  // Depois calcular o rendimento anual líquido
                                  const annualNetIncome = calculateAnnualNetIncome(monthlyNetIncome);

                                  // Calcular o ROI anual (%)
                                  const annualROI = (annualNetIncome / investimentoTotalCorrigido) * 100;

                                  // Formatar com duas casas decimais + %
                                  return annualROI.toFixed(2).replace('.', ',') + '%';
                                })()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-center">Porcentagem de retorno anual sobre o investimento total corrigido</p>
                          </CardContent>
                        </Card>
                      </div>


                    </div>

                    {/* Fluxo de Caixa - Visualização repaginada */}
                    <div className="mb-10">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 p-1.5 rounded-md">
                            <LineChartIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-800">Fluxo de Caixa ao Longo do Tempo</h3>
                        </div>

                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-slate-500 font-medium text-center">Período de análise</p>
                          <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg w-fit">
                            {[5, 10, 15].map((years) => (
                              <button
                                key={years}
                                className={`text-sm px-3.5 py-1.5 rounded-md transition-colors ${
                                  selectedTimeframe === years
                                    ? "bg-white text-slate-800 shadow-sm font-medium"
                                    : "text-slate-600 hover:bg-slate-200"
                                }`}
                                onClick={() => setSelectedTimeframe(years)}
                              >
                                {years} anos
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Card className="border-slate-200">
                        <CardContent className="p-6">
                          {/* Título do gráfico */}
                          <div className="mb-4 flex items-center justify-between">
                            <h4 className="text-sm font-medium text-slate-700">Evolução Anual do Investimento</h4>
                            <Badge variant="outline" className="text-xs bg-slate-50 hover:bg-slate-100">
                              {rentalYieldScenario === 'conservador' ? 'Conservador' : 
                               rentalYieldScenario === 'otimista' ? 'Otimista' : 'Padrão'}
                            </Badge>
                          </div>

                          {/* Gráfico principal */}
                          <div className="h-[380px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart
                                data={generateRentalFlowData(
                                  projection,
                                  projection.calculationResults?.calculosProjecao,
                                  projection.calculationResults?.rentalYield?.rentalYieldYearly,
                                  projection.calculationResults?.financiamentoPlanta?.resumo?.prazoEntrega || 36,
                                  selectedTimeframe,
                                  rentalYieldScenario
                                )}
                                margin={{ top: 25, right: 25, left: 5, bottom: 25 }}
                              >
                                {/* Definições de gradientes mais modernos */}
                                <defs>
                                  <linearGradient id="colorPayments" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.85} />
                                    <stop offset="100%" stopColor="#F87171" stopOpacity={0.75} />
                                  </linearGradient>
                                  <linearGradient id="colorRental" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.95} />
                                    <stop offset="100%" stopColor="#818CF8" stopOpacity={0.75} />
                                  </linearGradient>
                                  <filter id="shadow" height="150%">
                                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#94A3B8" floodOpacity="0.2"/>
                                  </filter>
                                </defs>

                                {/* Grid de fundo minimalista */}
                                <CartesianGrid 
                                  stroke="#E2E8F0" 
                                  strokeDasharray="3 3" 
                                  vertical={false} 
                                  opacity={0.3} 
                                  strokeWidth={0.5}
                                />

                                {/* Eixo X (anos) */}
                                <XAxis 
                                  dataKey="label" 
                                  axisLine={{ stroke: '#E2E8F0', strokeWidth: 1 }}
                                  tickLine={false}
                                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                                  padding={{ left: 15, right: 15 }}
                                />

                                {/* Eixo Y (valores monetários) */}
                                <YAxis 
                                  yAxisId="left"
                                  tickFormatter={(value) => value >= 1000000 
                                    ? `${(value/1000000).toFixed(1)}M` 
                                    : value >= 1000 
                                      ? `${(value/1000).toFixed(0)}K` 
                                      : value.toString()
                                  }
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                                  width={40}
                                />

                                {/* Tooltip moderno e claro */}
                                <ChartTooltip 
                                  formatter={(value, name) => {
                                    if (name === "payments") return [formatCurrency(value), "Pagamentos"];
                                    if (name === "rental") return [formatCurrency(value), "Rendimentos"];
                                    return [value, name];
                                  }}
                                  contentStyle={{ 
                                    borderRadius: '12px', 
                                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                    border: '1px solid #E2E8F0',
                                    boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
                                    padding: '12px 16px',
                                    fontSize: '13px'
                                  }}
                                  itemStyle={{ 
                                    padding: '5px 0',
                                    fontWeight: 500
                                  }}
                                  labelStyle={{
                                    marginBottom: '6px',
                                    fontWeight: 600,
                                    color: '#334155'
                                  }}
                                  cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />

                                {/* Legenda minimalista */}
                                <Legend 
                                  align="center"
                                  verticalAlign="top"
                                  iconType="circle"
                                  iconSize={isMobile ? 6 : 10}
                                  wrapperStyle={{
                                    paddingBottom: '16px',
                                    fontSize: isMobile ? '9px' : '12px',
                                    fontWeight: 500
                                  }}
                                  formatter={(value) => {
                                    if (isMobile) return ""; // Remove text on mobile
                                    if (value === "payments") return "Soma de todos os pagamentos corrigidos para cada ano";
                                    if (value === "rental") return "Rendimento líquido anual com reajuste";
                                    return value;
                                  }}
                                />

                                {/* Barras de pagamentos (saídas de caixa) */}
                                <Bar 
                                  yAxisId="left"
                                  dataKey="payments" 
                                  name="payments"
                                  fill="url(#colorPayments)" 
                                  barSize={25}
                                  radius={[5, 5, 0, 0]}
                                  filter="url(#shadow)"
                                />

                                {/* Barras de rendimentos (entradas de caixa) */}
                                <Bar 
                                  yAxisId="left"
                                  dataKey="rental" 
                                  name="rental"
                                  fill="url(#colorRental)" 
                                  barSize={25}
                                  radius={[5, 5, 0, 0]}
                                  filter="url(#shadow)"
                                />

                                {/* Linha de referência no zero */}
                                <ReferenceLine 
                                  y={0} 
                                  yAxisId="left"
                                  stroke="#94A3B8"
                                  strokeWidth={1}
                                  strokeDasharray="4 4"
                                />

                                {/* Linha vertical marcando entrega do imóvel */}
                                <ReferenceLine
                                  x={`Ano ${Math.ceil(projection.calculationResults?.financiamentoPlanta?.resumo?.prazoEntrega / 12) || 4}`}
                                  yAxisId="left"
                                  stroke="#3B82F6"
                                  strokeWidth={1.5}
                                  strokeDasharray="5 3"
                                  label={{
                                    value: "Entrega",
                                    position: "top",
                                    fill: "#1E40AF",
                                    fontSize: 12,
                                    fontWeight: 500
                                  }}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Resumo explicativo */}
                          <div className="mt-6 flex flex-col space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex-1 flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm bg-red-400"></div>
                                <span className="font-medium">Pagamentos (-):</span> 
                                <span className="hidden md:inline">Soma de todos os pagamentos corrigidos do financiamento no ano ({projection.monthlyCorrection || 0.5}% a.m.)</span>
                              </div>
                              <div className="flex-1 flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm bg-indigo-400"></div>
                                <span className="font-medium">Rendimentos (+):</span> 
                                <span className="hidden md:inline">Rendimento líquido anual com reajuste de {getReajusteAluguelByScenario(projection, rentalYieldScenario)}% a partir do 2º ano após entrega</span>
                              </div>
                            </div>
                            <div className="mt-3 space-y-2 text-xs text-slate-600">
                              <p className="font-medium">Entrega do imóvel e rendimentos:</p>
                              <ul className="list-disc pl-4 space-y-1">
                                <li>A entrega do imóvel ocorre no mês {projection.calculationResults?.financiamentoPlanta?.resumo?.prazoEntrega || 40} (linha azul vertical no Ano {Math.ceil(projection.calculationResults?.financiamentoPlanta?.resumo?.prazoEntrega / 12) || 4})</li>
                                <li>No ano da entrega, o rendimento é calculado considerando apenas os meses restantes após a entrega</li>
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Análise Anual de Rendimentos - Design reformulado */}
                    <div className="mb-10">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="bg-green-100 p-1.5 rounded-md">
                          <BarChart3 className="h-5 w-5 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">Análise Anual de Rendimentos</h3>
                      </div>

                      <Card className="border-slate-200">
                        <CardContent className="p-6">
                          <div className="overflow-hidden rounded-lg border border-blue-50 shadow-sm bg-white">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-blue-50/80 text-blue-900">
                                  <tr>
                                    <th className="py-2 md:py-3 px-2 md:px-5 text-left font-medium text-xs md:text-xs border-b border-blue-100">Ano</th>
                                    <th className="py-2 md:py-3 px-2 md:px-5 text-right font-medium text-xs md:text-xs border-b border-blue-100">
                                      <span className="hidden md:inline">Financiamento</span>
                                      <span className="md:hidden">Finc.</span>
                                    </th>
                                    <th className="py-2 md:py-3 px-2 md:px-5 text-right font-medium text-xs md:text-xs border-b border-blue-100">
                                      <span className="hidden md:inline">Renda Bruta</span>
                                      <span className="md:hidden">R.Bruta</span>
                                    </th>
                                    <th className="py-2 md:py-3 px-2 md:px-5 text-right font-medium text-xs md:text-xs border-b border-blue-100">
                                      <span className="hidden md:inline">Despesas</span>
                                      <span className="md:hidden">Desp.</span>
                                    </th>
                                    <th className="py-2 md:py-3 px-2 md:px-5 text-right font-medium text-xs md:text-xs border-b border-blue-100">
                                      <span className="hidden md:inline">Renda Líquida</span>
                                      <span className="md:hidden">R.Líq.</span>
                                    </th>
                                    <th className="py-2 md:py-3 px-2 md:px-5 text-right font-medium text-xs md:text-xs border-b border-blue-100 bg-blue-100/50">
                                      <span className="hidden md:inline">Resultado</span>
                                      <span className="md:hidden">Result.</span>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-blue-50">
                                  {/* Função personalizada que gera os dados financeiros anuais */}
                                  {(() => {
                                    // Definir a função generateYearlyFinancialDetailTable aqui dentro se ela não estiver disponível globalmente
                                    const generateFinancialData = (projection: any, calculosProjecao: any[] | undefined, deliveryMonths: number, years: number, scenario: Scenario = 'padrao') => {
                                      // Adaptar o cenário para o formato do banco
                                      let scenarioAdaptado = scenario;
                                      if (scenario === 'realistic') scenarioAdaptado = 'padrao';
                                      if (scenario === 'conservative') scenarioAdaptado = 'conservador';
                                      if (scenario === 'optimistic') scenarioAdaptado = 'otimista';

                                      // Se não temos cálculos, retornar array vazio com a estrutura esperada
                                      if (!calculosProjecao || calculosProjecao.length === 0) {
                                        return Array(years).fill(0).map((_, i) => ({
                                          year: i + 1,
                                          grossIncome: 0,
                                          financing: 0,
                                          rentalExpenses: 0,
                                          yearResult: 0
                                        }));
                                      }

                                      // Usar os cálculos do cenário padrão para todos os cenários
                                      const calculosDoScenario = calculosProjecao.filter(c => !c.cenario || c.cenario === 'padrao');

                                      if (calculosDoScenario.length === 0) {
                                        console.log("Sem cálculos para o cenário padrão");
                                        return Array(years).fill(0).map((_, i) => ({
                                          year: i + 1,
                                          grossIncome: 0,
                                          financing: 0,
                                          rentalExpenses: 0,
                                          yearResult: 0
                                        }));
                                      }

                                      // Obter todos os parâmetros de aluguel para o cenário selecionado
                                      let valorMensalAluguel = 0;
                                      let taxaOcupacao = 1;
                                      let taxaAdministracao = 0;
                                      let custoManutencao = 0;
                                      let taxaReajusteAluguel = 0;

                                      try {
                                        // Valor do aluguel mensal
                                        if (scenarioAdaptado === 'padrao') {
                                          valorMensalAluguel = parseFloat(String(projection.padrao_aluguel_valor_mensal || '0'));
                                          taxaOcupacao = parseFloat(String(projection.padrao_aluguel_ocupacao || '100')) / 100;
                                          taxaAdministracao = parseFloat(String(projection.padrao_aluguel_taxa_administracao || '8')) / 100;
                                          custoManutencao = parseFloat(String(projection.padrao_aluguel_manutencao || '150')) / 100;
                                          taxaReajusteAluguel = parseFloat(String(projection.padrao_aluguel_reajuste_anual || '5')) / 100;
                                        } else if (scenarioAdaptado === 'conservador') {
                                          valorMensalAluguel = parseFloat(String(projection.conservador_aluguel_valor_mensal || '0'));
                                          taxaOcupacao = parseFloat(String(projection.conservador_aluguel_ocupacao || '90')) / 100;
                                          taxaAdministracao = parseFloat(String(projection.conservador_aluguel_taxa_administracao || '10')) / 100;
                                          custoManutencao = parseFloat(String(projection.conservador_aluguel_manutencao || '200')) / 100;
                                          taxaReajusteAluguel = parseFloat(String(projection.conservador_aluguel_reajuste_anual || '4')) / 100;
                                        } else if (scenarioAdaptado === 'otimista') {
                                          valorMensalAluguel = parseFloat(String(projection.otimista_aluguel_valor_mensal || '0'));
                                          taxaOcupacao = parseFloat(String(projection.otimista_aluguel_ocupacao || '100')) / 100;
                                          taxaAdministracao = parseFloat(String(projection.otimista_aluguel_taxa_administracao || '6')) / 100;
                                          custoManutencao = parseFloat(String(projection.otimista_aluguel_manutencao || '100')) / 100;
                                          taxaReajusteAluguel = parseFloat(String(projection.otimista_aluguel_reajuste_anual || '6')) / 100;
                                        }
                                      } catch (error) {
                                        console.error("Erro ao obter parâmetros de aluguel:", error);
                                      }

                                      // Converter mês da entrega para ano e mês correspondente
                                      const deliveryYear = Math.ceil(deliveryMonths / 12);
                                      const deliveryMonthInYear = deliveryMonths % 12 || 12; // 1-12 (janeiro = 1)
                                      const mesesRestantesAposEntrega = 12 - (deliveryMonthInYear + 1);

                                      // Estrutura de resultado
                                      const yearlyData = [];

                                      // Para cada ano, calcular os valores
                                      for (let year = 1; year <= years; year++) {
                                        const startMonth = (year - 1) * 12;
                                        const endMonth = year * 12 - 1;

                                        // 1. Calcular pagamentos do financiamento no ano
                                        const calculosDoAno = calculosDoScenario.filter(c => 
                                          c.mes >= startMonth && c.mes <= endMonth
                                        );

                                        let yearlyFinancing = 0;

                                        calculosDoAno.forEach(calculo => {
                                          // Para a entrada no mês 0
                                          if (calculo.mes === 0 && year === 1) {
                                            yearlyFinancing += parseFloat(String(calculo.valorEntrada || 0));
                                          }

                                          // Para parcelas normais
                                          yearlyFinancing += parseFloat(String(calculo.parcelaCorrigida || 0));

                                          // Para reforços
                                          yearlyFinancing += parseFloat(String(calculo.reforcoCorrigido || 0));

                                          // Para pagamento de chaves (apenas no mês de entrega)
                                          if (calculo.mes === deliveryMonths) {
                                            yearlyFinancing += parseFloat(String(calculo.chavesCorrigido || 0));
                                          }
                                        });

                                        // 2. Calcular a renda bruta do aluguel (com taxa de ocupação e reajustes)
                                        let rendaBruta = 0;

                                        if (year > deliveryYear) {
                                          // Anos completos após a entrega - aplica reajuste anual composto
                                          const anosAposEntrega = year - deliveryYear;
                                          const fatorReajuste = Math.pow(1 + taxaReajusteAluguel, anosAposEntrega);

                                          // B) Renda Bruta = renda mensal bruta * taxa de ocupação, com os reajustes (+)
                                          rendaBruta = valorMensalAluguel * fatorReajuste * taxaOcupacao * 12;
                                        } 
                                        else if (year === deliveryYear) {
                                          // Ano da entrega - calcula valor proporcional aos meses restantes no ano
                                          rendaBruta = valorMensalAluguel * taxaOcupacao * mesesRestantesAposEntrega;
                                        }

                                        // 3. Calcular as despesas do aluguel
                                        // D) Despesas do aluguel = (renda mensal bruta * taxa de ocupação, com os reajustes )*(taxa de administração + taxa de manutençao)
                                        const despesasAluguel = rendaBruta * (taxaAdministracao + custoManutencao);

                                        // 4. Calcular o resultado do ano
                                        // Resultado do ano = B - (C + D)
                                        const resultadoAno = rendaBruta - (yearlyFinancing + despesasAluguel);

                                        // 5. Calcular a renda líquida de aluguel (renda bruta - despesas de aluguel)
                                        const rendaLiquidaAluguel = rendaBruta - despesasAluguel;

                                        // 6. Adicionar ao array de resultados
                                        yearlyData.push({
                                          year,
                                          financing: yearlyFinancing,
                                          grossIncome: rendaBruta,
                                          rentalExpenses: despesasAluguel,
                                          netRentalIncome: rendaLiquidaAluguel,
                                          yearResult: resultadoAno
                                        });
                                      }

                                      return yearlyData;
                                    };

                                    // Chamar a função e obter os dados
                                    const financialData = generateFinancialData(
                                      projection,
                                      projection.calculationResults?.calculosProjecao,
                                      projection.calculationResults?.financiamentoPlanta?.resumo?.prazoEntrega || 36,
                                      selectedTimeframe,
                                      rentalYieldScenario
                                    );

                                    // Mapear para exibição na tabela
                                    // Pegar o ano de entrega para destacar
                                    const deliveryYear = Math.ceil(
                                      (projection.calculationResults?.financiamentoPlanta?.resumo?.prazoEntrega || 36) / 12
                                    );

                                    return financialData.map((row, index) => {
                                      // Verificar se é o ano de entrega do imóvel
                                      const isDeliveryYear = row.year === deliveryYear;

                                      // Definir classe de fundo baseada no resultado
                                      let resultBgClass = "bg-transparent";
                                      if (row.yearResult >= 0) {
                                        resultBgClass = "bg-emerald-50/50";
                                      } else if (row.yearResult < 0) {
                                        resultBgClass = "bg-amber-50/50";
                                      }

                                      return (
                                        <tr key={index} 
                                            className={`
                                              ${index % 2 === 0 ? "bg-white" : "bg-slate-50/30"} 
                                              ${isDeliveryYear ? "bg-blue-50/40 border-l-4 border-blue-400" : ""}
                                              hover:bg-blue-50/50 transition-colors duration-150
                                            `}>
                                          <td className={`py-2 md:py-3 px-2 md:px-5 font-medium text-xs md:text-sm ${isDeliveryYear ? "text-blue-700" : "text-slate-700"}`}>
                                            {row.year}
                                            {isDeliveryYear && 
                                              <span className="ml-1 md:ml-2 text-xs px-1 md:px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                <span className="hidden md:inline">Entrega</span>
                                                <span className="md:hidden">E</span>
                                              </span>
                                            }
                                          </td>
                                          <td className="py-2 md:py-3 px-2 md:px-5 text-right text-slate-600 font-medium text-xs md:text-sm">-{formatCurrency(row.financing)}</td>
                                          <td className="py-2 md:py-3 px-2 md:px-5 text-right text-blue-600 font-medium text-xs md:text-sm">{formatCurrency(row.grossIncome)}</td>
                                          <td className="py-2 md:py-3 px-2 md:px-5 text-right text-slate-600 font-medium text-xs md:text-sm">-{formatCurrency(row.rentalExpenses)}</td>
                                          <td className="py-2 md:py-3 px-2 md:px-5 text-right text-emerald-600 font-medium text-xs md:text-sm">{formatCurrency(row.netRentalIncome)}</td>
                                          <td className={`py-2 md:py-3 px-2 md:px-5 text-right font-semibold text-xs md:text-sm ${resultBgClass}`}
                                            style={{ 
                                              color: row.yearResult >= 0 ? '#059669' : '#9a3412',
                                            }}>
                                            {formatCurrency(row.yearResult)}
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                  {/* Nota: Foi removido o bloco de código que duplicava a tabela e limitava os anos visíveis.
                                    Agora todos os anos são exibidos sem limitação ou duplicação. */}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Legenda minimalista da tabela */}
                          <div className="mt-5 px-2 md:px-4 py-2 md:py-3 border border-slate-200 rounded-md bg-slate-50/30 shadow-sm flex flex-wrap justify-center gap-x-3 md:gap-x-6 gap-y-1 md:gap-y-2 text-xs">
                            <div className="flex items-center gap-1 md:gap-1.5">
                              <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-slate-600"></div>
                              <span className="text-slate-600 font-medium text-xs">
                                <span className="hidden md:inline">Financiamento (-): </span>
                                <span className="md:hidden">Finc. (-)</span>
                              </span>
                              <span className="text-slate-500 text-xs hidden md:inline">Saídas com parcelas do imóvel</span>
                            </div>
                            <div className="flex items-center gap-1 md:gap-1.5">
                              <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-blue-600"></div>
                              <span className="text-blue-600 font-medium text-xs">
                                <span className="hidden md:inline">Renda Bruta (+):</span>
                                <span className="md:hidden">R.Bruta (+)</span>
                              </span>
                              <span className="text-slate-500 text-xs hidden md:inline">Entradas com aluguel</span>
                            </div>
                            <div className="flex items-center gap-1 md:gap-1.5">
                              <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-slate-600"></div>
                              <span className="text-slate-600 font-medium text-xs">
                                <span className="hidden md:inline">Despesas (-):</span>
                                <span className="md:hidden">Desp. (-)</span>
                              </span>
                              <span className="text-slate-500 text-xs hidden md:inline">Saídas de administração e manutenção</span>
                            </div>
                            <div className="flex items-center gap-1 md:gap-1.5">
                              <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-emerald-600"></div>
                              <span className="text-emerald-600 font-medium text-xs">
                                <span className="hidden md:inline">Renda Líquida (+):</span>
                                <span className="md:hidden">R.Líq. (+)</span>
                              </span>
                              <span className="text-slate-500 text-xs hidden md:inline">Aluguel após deduzir despesas</span>
                            </div>
                            <div className="flex items-center gap-1 md:gap-1.5">
                              <div className="flex gap-1">
                                <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-emerald-500"></div>
                                <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-amber-600"></div>
                              </div>
                              <span className="text-slate-700 font-medium text-xs">
                                <span className="hidden md:inline">Resultado (+/-):</span>
                                <span className="md:hidden">Result.</span>
                              </span>
                              <span className="text-slate-500 text-xs hidden md:inline">Balanço final do ano</span>
                              <span className="text-emerald-600 font-medium ml-1 text-xs hidden md:inline">(positivo)</span>
                              <span className="text-amber-600 font-medium ml-1 text-xs hidden md:inline">(negativo)</span>
                            </div>
                            <div className="flex items-center gap-1 md:gap-1.5 pt-1 border-t border-slate-200 mt-1 w-full justify-center">
                              <div className="h-2 w-2 md:h-3 md:w-3 bg-blue-50/40 border-l-2 border-blue-400 rounded-sm"></div>
                              <span className="text-blue-700 font-medium ml-1 text-xs">
                                <span className="hidden md:inline">Ano de entrega do imóvel</span>
                                <span className="md:hidden">Entrega</span>
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>


                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        </div>
      </div>



      {/* Footer com logo da ROImob */}
      <div className="bg-white border-t py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <img 
            src="/assets/logo-full-400x100.png" 
            alt="ROImob" 
            className="h-12 w-auto mx-auto mb-2"
          />
          <p className="text-sm text-gray-600">Plataforma de Análise de Investimentos Imobiliários</p>
          <p className="text-xs text-gray-500 mt-2">
            Este relatório foi gerado por {user?.company || user?.name}
          </p>
        </div>
      </div>
    </div>
  );
}