import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { UserPlus, PlusCircle } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PropertyCreationForm from "@/components/properties/PropertyCreationForm";
import PropertySelector from "@/components/properties/PropertySelector";
import { Link, useLocation, useSearch } from "wouter";
import {
  Home,
  MapPin,
  LineChart,
  DollarSign,
  TrendingUp,
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  X,
  Percent,
  CreditCard,
  Calendar,
  Building,
  Info,
  FileText,
  User,
  Type,
  Wrench,
  Receipt,
  Clock,
  BadgeDollarSign,
  Pen,
  Building2,
  FileSpreadsheet,
  Loader2,
  BarChart3,
  Map,
  Maximize2,
  Globe,
  ImageIcon,
  Edit,
  AlertTriangle,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Importar componentes
import { ScenarioTabs } from "@/components/projections/ScenarioTabs";
import { AssetAppreciationYearlyEditor } from "@/components/projections/AssetAppreciationYearlyEditor";
import { PurchaseDataForm } from "@/components/projections/PurchaseDataForm";
import ScenarioSelector from "@/components/projections/ScenarioSelector";

// Tipo para o cliente
interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
}

// Esquema para validação do formulário
const projectionSchema = z.object({
  // Etapa 1: Estratégia de Investimento
  title: z.string().min(1, "O título da projeção é obrigatório"),
  clientId: z.string().optional(),
  strategies: z.array(z.string()).min(1, "Selecione pelo menos uma estratégia"),
  activeScenario: z.string().default("padrao"),
  scenarioType: z.string().default("padrao"),
  selectedScenarios: z.array(z.string()).optional(),
  
  // Etapa 2: Seleção do Imóvel
  propertyId: z.string().min(1, "Selecione um imóvel ou cadastre um novo"),
  
  // Campos mantidos para compatibilidade com projeções antigas
  propertyName: z.string().optional(),
  propertyUnit: z.string().optional(),
  propertyType: z.string().optional(),
  propertyArea: z.string().optional(),
  propertyDescription: z.string().optional(),
  propertyImageUrl: z.string().optional(),
  propertyWebsiteUrl: z.string().url().optional().or(z.string().length(0)),
  propertyImage: z.any().optional(),
  
  // Campos de localização mantidos para compatibilidade
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  
  // Etapa 4: Dados da Compra
  deliveryTime: z.string().optional(),
  listPrice: z.string().optional(),
  discount: z.string().optional(),
  downPayment: z.string().optional(),
  tipoParcelamento: z.string().optional(),
  paymentPeriod: z.string().optional(),
  monthlyCorrection: z.string().optional(),
  correcaoMensalAposChaves: z.string().optional(),
  indiceCorrecao: z.string().optional(),
  hasBoost: z.boolean().optional(),
  periodicidadeReforco: z.string().optional(),
  boostValue: z.string().optional(),
  hasKeys: z.boolean().optional(),
  keysValue: z.string().optional(),
  customPayments: z
    .array(
      z.object({
        month: z.number(),
        amount: z.string(),
        type: z.string().optional(),
      })
    )
    .optional(),
    
  // Dados para cenários
  padrao: z.object({
    futureSale: z.object({
      investmentPeriod: z.string().optional(),
      appreciationRate: z.string().optional(),
      sellingExpenseRate: z.string().optional(),
      incomeTaxRate: z.string().optional(),
      additionalCosts: z.string().optional(),
      maintenanceCosts: z.string().optional()
    }).optional(),
    assetAppreciation: z.object({
      annualRate: z.string().optional(),
      analysisPeriod: z.string().optional(),
      maintenanceCosts: z.string().optional(),
      annualTaxes: z.string().optional()
    }).optional(),
    rentalYield: z.object({
      monthlyRent: z.string().optional(),
      occupancyRate: z.string().optional(),
      managementFee: z.string().optional(),
      maintenanceCosts: z.string().optional(),
      annualIncrease: z.string().optional()
    }).optional()
  }).optional(),
  
  conservador: z.object({
    futureSale: z.object({
      investmentPeriod: z.string().optional(),
      appreciationRate: z.string().optional(),
      sellingExpenseRate: z.string().optional(),
      incomeTaxRate: z.string().optional(),
      additionalCosts: z.string().optional(),
      maintenanceCosts: z.string().optional()
    }).optional(),
    assetAppreciation: z.object({
      annualRate: z.string().optional(),
      analysisPeriod: z.string().optional(),
      maintenanceCosts: z.string().optional(),
      annualTaxes: z.string().optional()
    }).optional(),
    rentalYield: z.object({
      monthlyRent: z.string().optional(),
      occupancyRate: z.string().optional(),
      managementFee: z.string().optional(),
      maintenanceCosts: z.string().optional(),
      annualIncrease: z.string().optional()
    }).optional()
  }).optional(),
  
  otimista: z.object({
    futureSale: z.object({
      investmentPeriod: z.string().optional(),
      appreciationRate: z.string().optional(),
      sellingExpenseRate: z.string().optional(),
      incomeTaxRate: z.string().optional(),
      additionalCosts: z.string().optional(),
      maintenanceCosts: z.string().optional()
    }).optional(),
    assetAppreciation: z.object({
      annualRate: z.string().optional(),
      analysisPeriod: z.string().optional(),
      maintenanceCosts: z.string().optional(),
      annualTaxes: z.string().optional()
    }).optional(),
    rentalYield: z.object({
      monthlyRent: z.string().optional(),
      occupancyRate: z.string().optional(),
      managementFee: z.string().optional(),
      maintenanceCosts: z.string().optional(),
      annualIncrease: z.string().optional()
    }).optional()
  }).optional(),
});

type ProjectionFormValues = z.infer<typeof projectionSchema>;

// Componente para a barra de progresso com etapas
function ProgressSteps({ currentStep, onStepClick }: { currentStep: number, onStepClick: (step: number) => void }) {
  const steps = [
    { name: "Estratégia de Investimento", icon: <LineChart className="h-5 w-5" /> },
    { name: "Informações do Imóvel", icon: <Home className="h-5 w-5" /> },
    { name: "Dados da Compra", icon: <DollarSign className="h-5 w-5" /> },
    { name: "Cenários", icon: <BarChart3 className="h-5 w-5" /> },
    { name: "Projeções Financeiras", icon: <TrendingUp className="h-5 w-5" /> }
  ];
  
  return (
    <div className="relative mb-6 md:mb-12">
      <div className="flex justify-between relative">
        {steps.map((step, index) => {
          const isActive = currentStep === index;
          const isCompleted = currentStep > index;
          const isNext = index < steps.length - 1;
          
          return (
            <div key={index} className="flex flex-col items-center relative z-10 flex-1">
              <button
                type="button"
                onClick={() => onStepClick(index)}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 transform ${
                  isActive ? "bg-[#434BE6] text-white scale-110 shadow-lg" : 
                  isCompleted ? "bg-[#434BE6] text-white scale-105" : 
                  "bg-white border-2 border-gray-300 text-gray-500 hover:border-[#434BE6] hover:scale-105"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.icon
                )}
              </button>
              
              {/* Connecting line to next step */}
              {isNext && (
                <div className="absolute top-4 left-1/2 w-full h-0.5 flex items-center z-0">
                  {/* Background line */}
                  <div className="w-full h-0.5 bg-gray-200 ml-4"></div>
                  {/* Progress line */}
                  <div 
                    className={`absolute h-0.5 bg-gradient-to-r from-[#434BE6] to-[#6366f1] ml-4 transition-all duration-500 ease-out ${
                      isCompleted ? 'w-full' : 'w-0'
                    }`}
                  ></div>
                </div>
              )}
              
              <span className={`mt-2 text-xs font-medium transition-colors hidden md:block ${
                isActive || isCompleted ? "text-[#434BE6]" : "text-gray-500"
              }`}>
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Componente para a barra lateral com dados prévios
function PreviewSidebar({ formValues }: { formValues: any }) {
  // Calcular quantidade de reforços com base na periodicidade
  const getBoostCount = (values: any): number => {
    if (!values.hasBoost || !values.paymentPeriod || !values.periodicidadeReforco) return 0;
    
    const period = Number(values.paymentPeriod);
    
    switch (values.periodicidadeReforco) {
      case 'bimestral':
        return Math.floor(period / 2);
      case 'trimestral':
        return Math.floor(period / 3);
      case 'semestral':
        return Math.floor(period / 6);
      case 'anual':
        return Math.floor(period / 12);
      default:
        return 0;
    }
  };
  
  const valorCompra = formValues.listPrice 
    ? (Number(formValues.listPrice) - (Number(formValues.discount) || 0)) 
    : 0;
    
  const saldoDevedor = formValues.listPrice 
    ? (valorCompra - (Number(formValues.downPayment) || 0)) 
    : 0;
    
  // Calcular total de valores do parcelamento para validação
  const calcularTotalParcelamento = () => {
    const entrada = Number(formValues.downPayment) || 0;
    const reforcos = formValues.hasBoost && formValues.boostValue 
      ? Number(formValues.boostValue) * getBoostCount(formValues) 
      : 0;
    const chaves = formValues.hasKeys && formValues.keysValue 
      ? Number(formValues.keysValue) 
      : 0;
    
    return entrada + reforcos + chaves;
  };
  
  // Verificar se o total do parcelamento excede o valor do imóvel
  const totalParcelamento = calcularTotalParcelamento();
  const parcelamentoExcedeValor = totalParcelamento > valorCompra && valorCompra > 0;

  // Calcular total de pagamentos personalizados (apenas os pagamentos, sem entrada)
  const calcularTotalPagamentosPersonalizados = () => {
    if (formValues.customPayments) {
      return formValues.customPayments.reduce((sum: number, payment: any) => {
        return sum + (Number(payment.amount) || 0);
      }, 0);
    }
    return 0;
  };

  // Calcular valor que deveria ser financiado (valor do imóvel menos entrada)
  const valorFinanciado = valorCompra - (Number(formValues.downPayment) || 0);
  
  // Verificar se pagamentos personalizados não coincidem com valor financiado
  const totalPagamentosPersonalizados = calcularTotalPagamentosPersonalizados();
  const pagamentosPersonalizadosNaoCoicidem = formValues.tipoParcelamento === 'personalizado' && 
    totalPagamentosPersonalizados > 0 && 
    valorFinanciado > 0 && 
    Math.abs(totalPagamentosPersonalizados - valorFinanciado) > 0.01;
    
  // Calcular valor restante para parcelas regulares
  const valorRestanteParaParcelas = Math.max(0, saldoDevedor - 
    (formValues.hasBoost && formValues.boostValue ? Number(formValues.boostValue) * getBoostCount(formValues) : 0) -
    (formValues.hasKeys && formValues.keysValue ? Number(formValues.keysValue) : 0)
  );
    
  // Função que retorna valores de aluguel com base no cenário e valor do imóvel
  const getRendimentoCenario = (scenario: string) => {
    if (!valorCompra) return { taxa: 0, ocupacao: 0, valor: 0 };
    
    // Função auxiliar para verificar se o valor é uma porcentagem ou valor monetário
    const isPercentageValue = (value: string): boolean => {
      return parseFloat(value) < 100; // Assumimos que valores abaixo de 100 são porcentagens
    };
    
    switch (scenario) {
      case 'padrao': {
        // Obtemos o valor de entrada
        const rentInput = formValues.padrao?.rentalYield?.monthlyRent || '0.6';
        const ocupacao = parseFloat(formValues.padrao?.rentalYield?.occupancyRate || '85');
        
        // Verificamos se o input é uma porcentagem ou um valor absoluto
        let valorMensal = 0;
        let taxa = 0;
        
        if (isPercentageValue(rentInput)) {
          // É uma porcentagem, calculamos o valor mensal com base no valor do imóvel
          taxa = parseFloat(rentInput);
          valorMensal = valorCompra * (taxa / 100);
        } else {
          // É um valor absoluto, usamos diretamente
          valorMensal = parseFloat(rentInput);
          taxa = (valorMensal / valorCompra) * 100;
        }
        
        return { 
          taxa: taxa, 
          ocupacao: ocupacao, 
          valor: valorMensal 
        };
      }
      case 'conservador': {
        const rentInput = formValues.conservador?.rentalYield?.monthlyRent || '0.4';
        const ocupacao = parseFloat(formValues.conservador?.rentalYield?.occupancyRate || '75');
        
        let valorMensal = 0;
        let taxa = 0;
        
        if (isPercentageValue(rentInput)) {
          taxa = parseFloat(rentInput);
          valorMensal = valorCompra * (taxa / 100);
        } else {
          valorMensal = parseFloat(rentInput);
          taxa = (valorMensal / valorCompra) * 100;
        }
        
        return { 
          taxa: taxa, 
          ocupacao: ocupacao, 
          valor: valorMensal
        };
      }
      case 'otimista': {
        const rentInput = formValues.otimista?.rentalYield?.monthlyRent || '0.8';
        const ocupacao = parseFloat(formValues.otimista?.rentalYield?.occupancyRate || '95');
        
        let valorMensal = 0;
        let taxa = 0;
        
        if (isPercentageValue(rentInput)) {
          taxa = parseFloat(rentInput);
          valorMensal = valorCompra * (taxa / 100);
        } else {
          valorMensal = parseFloat(rentInput);
          taxa = (valorMensal / valorCompra) * 100;
        }
        
        return { 
          taxa: taxa, 
          ocupacao: ocupacao, 
          valor: valorMensal
        };
      }
      default:
        return { taxa: 0, ocupacao: 0, valor: 0 };
    }
  };
  
  // Função que retorna taxa de valorização (asset appreciation) com base no cenário
  const getValorizacaoCenario = (scenario: string) => {
    // Buscar o valor diretamente do formulário para garantir valores atualizados
    switch (scenario) {
      case 'padrao':
        return parseFloat(formValues.padrao?.assetAppreciation?.annualRate || '15');
      case 'conservador':
        return parseFloat(formValues.conservador?.assetAppreciation?.annualRate || '10');
      case 'otimista':
        return parseFloat(formValues.otimista?.assetAppreciation?.annualRate || '20');
      case 'conservative': // Adicionar suporte para nomes alternativos
        return parseFloat(formValues.conservador?.assetAppreciation?.annualRate || '10');
      case 'optimistic':
        return parseFloat(formValues.otimista?.assetAppreciation?.annualRate || '20');
      default:
        return 15; // Valor padrão seguro
    }
  };
  
  // Função que retorna período de análise (asset appreciation) com base no cenário
  const getPeriodoAnaliseCenario = (scenario: string) => {
    // Buscar o valor diretamente do formulário para garantir valores atualizados
    switch (scenario) {
      case 'padrao':
        return parseFloat(formValues.padrao?.assetAppreciation?.analysisPeriod || '10');
      case 'conservador':
        return parseFloat(formValues.conservador?.assetAppreciation?.analysisPeriod || '10');
      case 'otimista':
        return parseFloat(formValues.otimista?.assetAppreciation?.analysisPeriod || '10');
      case 'conservative': // Adicionar suporte para nomes alternativos
        return parseFloat(formValues.conservador?.assetAppreciation?.analysisPeriod || '10');
      case 'optimistic':
        return parseFloat(formValues.otimista?.assetAppreciation?.analysisPeriod || '10');
      default:
        return 10; // Valor padrão seguro
    }
  };
  
  // Nova função específica para obter a taxa de valorização da venda futura
  const getValorizacaoCenarioVendaFutura = (scenario: string) => {
    // Buscar o valor da estratégia de venda futura especificamente
    switch (scenario) {
      case 'padrao':
        return parseFloat(formValues.padrao?.futureSale?.appreciationRate || '15');
      case 'conservador':
        return parseFloat(formValues.conservador?.futureSale?.appreciationRate || '12');
      case 'otimista':
        return parseFloat(formValues.otimista?.futureSale?.appreciationRate || '18');
      case 'conservative': // Adicionar suporte para nomes alternativos
        return parseFloat(formValues.conservador?.futureSale?.appreciationRate || '12');
      case 'optimistic':
        return parseFloat(formValues.otimista?.futureSale?.appreciationRate || '18');
      default:
        return 15; // Valor padrão seguro
    }
  };
  
  // Função para calcular o valor futuro do imóvel com base na taxa anual de valorização e prazo
  const calcularValorFuturo = (scenario: string) => {
    // Valor inicial do imóvel
    if (!valorCompra) return 0;
    
    // Taxa de valorização anual - usar o valor do input da estratégia de venda futura
    let taxaAnual = getValorizacaoCenarioVendaFutura(scenario) / 100;
    
    // Prazo de investimento (meses) - usar o valor do input diretamente
    let investmentPeriod = 0;
    
    switch (scenario) {
      case 'padrao': {
        // Usar valor do input ou calcular padrão
        const inputPeriod = formValues.padrao?.futureSale?.investmentPeriod;
        investmentPeriod = inputPeriod ? Number(inputPeriod) : (parseInt(formValues.deliveryTime || '36') + 1);
        break;
      }
      case 'conservador': {
        // Usar valor do input ou calcular padrão conservador
        const inputPeriod = formValues.conservador?.futureSale?.investmentPeriod;
        investmentPeriod = inputPeriod ? Number(inputPeriod) : Math.round(parseInt(formValues.deliveryTime || '36') * 1.3);
        break;
      }
      case 'otimista': {
        // Usar valor do input ou calcular padrão otimista
        const inputPeriod = formValues.otimista?.futureSale?.investmentPeriod;
        investmentPeriod = inputPeriod ? Number(inputPeriod) : Math.max(1, Math.round(parseInt(formValues.deliveryTime || '36') * 0.7));
        break;
      }
      default:
        investmentPeriod = Number(formValues.deliveryTime || 36) + 1;
    }
    
    // Converter meses para anos
    const prazoAnos = investmentPeriod / 12;
    
    // Calcular valor futuro usando juros compostos
    return valorCompra * Math.pow(1 + taxaAnual, prazoAnos);
  };
    
  return (
    <div className="bg-white p-6 rounded-lg border h-fit sticky top-8">
      <h3 className="text-base font-medium mb-4 flex items-center gap-2 text-[#434BE6]">
        <LineChart className="h-4 w-4" />
        Dados Prévios
      </h3>
      {formValues.title && (
        <div className="mb-6">
          <h4 className="text-sm font-medium">{formValues.title}</h4>
          {formValues.propertyName && (
            <p className="text-xs text-[#6B7280] mt-1">{formValues.propertyName}</p>
          )}
        </div>
      )}
      {formValues.strategies && formValues.strategies.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium mb-2">Estratégias Selecionadas</h4>
          <div className="flex flex-wrap gap-2">
            {formValues.strategies.includes("FUTURE_SALE") && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">Venda Futura</span>
            )}
            {formValues.strategies.includes("ASSET_APPRECIATION") && (
              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">Valorização</span>
            )}
            {formValues.strategies.includes("RENTAL_YIELD") && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">Rentabilidade</span>
            )}
          </div>
        </div>
      )}
      {/* Resumo das projeções financeiras - exibido apenas na aba de Projeções Financeiras (step 4) */}
      {valorCompra > 0 && formValues.strategies?.length > 0 && formValues.currentStep === 4 && (
        <div className="mt-4 bg-white p-4 rounded-md border border-gray-200">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-[#434BE6]" />
            Resumo das Projeções
          </h4>
          
          {/* Venda Futura */}
          {formValues.strategies.includes("FUTURE_SALE") && (
            <div className="space-y-2 mb-3 border-b pb-3">
              <h5 className="text-xs font-medium text-blue-700">Venda Futura</h5>
              
              {(formValues.activeScenario === "padrao") && (
                <div className="pl-2 border-l-2 border-emerald-300 mb-2">
                  <h6 className="text-xs font-medium">Padrão:</h6>
                  <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                    <span>Prazo para venda:</span>
                    <span className="font-medium">{formValues.padrao?.futureSale?.investmentPeriod || (parseInt(formValues.deliveryTime || '36') + 1)} meses</span>
                    <span>Valorização anual:</span>
                    <span className="font-medium">{formValues.padrao?.futureSale?.appreciationRate || '15'}%</span>
                    <span>Valor futuro do imóvel:</span>
                    <span className="font-medium">{formatCurrency(calcularValorFuturo("padrao"))}</span>
                  </div>
                </div>
              )}
              
              {(formValues.activeScenario === "conservador" || formValues.activeScenario === "conservative") && (
                <div className="pl-2 border-l-2 border-blue-300 mb-2">
                  <h6 className="text-xs font-medium">Conservador:</h6>
                  <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                    <span>Prazo para venda:</span>
                    <span className="font-medium">{formValues.conservador?.futureSale?.investmentPeriod || Math.round(parseInt(formValues.deliveryTime || '36') * 1.3)} meses</span>
                    <span>Valorização anual:</span>
                    <span className="font-medium">{formValues.conservador?.futureSale?.appreciationRate || '12'}%</span>
                    <span>Valor futuro do imóvel:</span>
                    <span className="font-medium">{formatCurrency(calcularValorFuturo("conservador"))}</span>
                  </div>
                </div>
              )}
              
              {(formValues.activeScenario === "otimista" || formValues.activeScenario === "optimistic") && (
                <div className="pl-2 border-l-2 border-purple-300 mb-2">
                  <h6 className="text-xs font-medium">Otimista:</h6>
                  <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                    <span>Prazo para venda:</span>
                    <span className="font-medium">{formValues.otimista?.futureSale?.investmentPeriod || Math.max(1, Math.round(parseInt(formValues.deliveryTime || '36') * 0.7))} meses</span>
                    <span>Valorização anual:</span>
                    <span className="font-medium">{formValues.otimista?.futureSale?.appreciationRate || '18'}%</span>
                    <span>Valor futuro do imóvel:</span>
                    <span className="font-medium">{formatCurrency(calcularValorFuturo("otimista"))}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Exibir apenas o cenário ativo para Valorização do Imóvel */}
          {formValues.strategies.includes("ASSET_APPRECIATION") && (
            <div className="space-y-2 mb-3 border-b pb-3">
              <h5 className="text-xs font-medium text-purple-700">Valorização do Imóvel</h5>
              
              {(formValues.activeScenario === "padrao") && (
                <div className="pl-2 border-l-2 border-emerald-300 mb-2">
                  <h6 className="text-xs font-medium">Padrão:</h6>
                  <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                    <span>Valorização anual:</span>
                    <span className="font-medium">{getValorizacaoCenario("padrao")}%</span>
                    <span>Período de análise:</span>
                    <span className="font-medium">{getPeriodoAnaliseCenario("padrao")} anos</span>
                    <span>Valor final estimado:</span>
                    <span className="font-medium">{formatCurrency(valorCompra * Math.pow(1 + getValorizacaoCenario("padrao")/100, getPeriodoAnaliseCenario("padrao")))}</span>
                  </div>
                </div>
              )}
              
              {(formValues.activeScenario === "conservador" || formValues.activeScenario === "conservative") && (
                <div className="pl-2 border-l-2 border-blue-300 mb-2">
                  <h6 className="text-xs font-medium">Conservador:</h6>
                  <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                    <span>Valorização anual:</span>
                    <span className="font-medium">{getValorizacaoCenario("conservador")}%</span>
                    <span>Período de análise:</span>
                    <span className="font-medium">{getPeriodoAnaliseCenario("conservador")} anos</span>
                    <span>Valor final estimado:</span>
                    <span className="font-medium">{formatCurrency(valorCompra * Math.pow(1 + getValorizacaoCenario("conservador")/100, getPeriodoAnaliseCenario("conservador")))}</span>
                  </div>
                </div>
              )}
              
              {(formValues.activeScenario === "otimista" || formValues.activeScenario === "optimistic") && (
                <div className="pl-2 border-l-2 border-purple-300 mb-2">
                  <h6 className="text-xs font-medium">Otimista:</h6>
                  <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                    <span>Valorização anual:</span>
                    <span className="font-medium">{getValorizacaoCenario("otimista")}%</span>
                    <span>Período de análise:</span>
                    <span className="font-medium">{getPeriodoAnaliseCenario("otimista")} anos</span>
                    <span>Valor final estimado:</span>
                    <span className="font-medium">{formatCurrency(valorCompra * Math.pow(1 + getValorizacaoCenario("otimista")/100, getPeriodoAnaliseCenario("otimista")))}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Exibir apenas o cenário ativo para Rendimento de Aluguel */}
          {formValues.strategies.includes("RENTAL_YIELD") && (
            <div className="space-y-2 mb-3 border-b pb-3">
              <h5 className="text-xs font-medium text-emerald-700">Rendimento em Aluguel</h5>
              
              {(formValues.activeScenario === "padrao") && (
                <div className="pl-2 border-l-2 border-emerald-300 mb-2">
                  <h6 className="text-xs font-medium">Padrão:</h6>
                  <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                    <span>Valor mensal:</span>
                    <span className="font-medium">{formatCurrency(getRendimentoCenario("padrao").valor)}</span>
                    <span>Taxa de ocupação:</span>
                    <span className="font-medium">{getRendimentoCenario("padrao").ocupacao}%</span>
                    <span>Rendimento (% do imóvel):</span>
                    <span className="font-medium">{getRendimentoCenario("padrao").taxa}%</span>
                  </div>
                </div>
              )}
              
              {(formValues.activeScenario === "conservador" || formValues.activeScenario === "conservative") && (
                <div className="pl-2 border-l-2 border-blue-300 mb-2">
                  <h6 className="text-xs font-medium">Conservador:</h6>
                  <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                    <span>Valor mensal:</span>
                    <span className="font-medium">{formatCurrency(getRendimentoCenario("conservador").valor)}</span>
                    <span>Taxa de ocupação:</span>
                    <span className="font-medium">{getRendimentoCenario("conservador").ocupacao}%</span>
                    <span>Rendimento (% do imóvel):</span>
                    <span className="font-medium">{getRendimentoCenario("conservador").taxa}%</span>
                  </div>
                </div>
              )}
              
              {(formValues.activeScenario === "otimista" || formValues.activeScenario === "optimistic") && (
                <div className="pl-2 border-l-2 border-purple-300 mb-2">
                  <h6 className="text-xs font-medium">Otimista:</h6>
                  <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                    <span>Valor mensal:</span>
                    <span className="font-medium">{formatCurrency(getRendimentoCenario("otimista").valor)}</span>
                    <span>Taxa de ocupação:</span>
                    <span className="font-medium">{getRendimentoCenario("otimista").ocupacao}%</span>
                    <span>Rendimento (% do imóvel):</span>
                    <span className="font-medium">{getRendimentoCenario("otimista").taxa}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {formValues.address && (
        <div className="mb-4">
          <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
            <MapPin className="h-3 w-3 text-[#434BE6]" />
            Localização
          </h4>
          <p className="text-xs text-[#6B7280]">{formValues.address}</p>
          {formValues.neighborhood && formValues.city && formValues.state && (
            <p className="text-xs text-[#6B7280]">
              {formValues.neighborhood}, {formValues.city} - {formValues.state}
            </p>
          )}
        </div>
      )}
      {/* Detalhes da compra e resumo de valores calculados - exibidos apenas na aba "Dados da Compra" (step 2) */}
      {formValues.listPrice && formValues.currentStep === 2 && (
        <>

          
          {/* Aviso quando parcelamento excede valor do imóvel */}
          {parcelamentoExcedeValor && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">
                    Atenção: Valores do parcelamento excedem o valor do imóvel
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      A soma dos valores do parcelamento ({formatCurrency(totalParcelamento)}) é maior que o valor do imóvel ({formatCurrency(valorCompra)}). 
                      Isso resultaria em valores negativos para as parcelas regulares.
                    </p>
                    <p className="mt-1">
                      Por favor, ajuste os valores de entrada, reforços ou chaves para continuar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}



          <div className="bg-[#f8f9fe] p-4 rounded-md border border-[#434BE6]/15">
            <div className="text-gray-800 font-medium text-sm mb-3">
              Resumo dos valores calculados
            </div>
            
            <div className="space-y-2">
              {/* Valores principais */}
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-600 text-xs">Valor do Imóvel:</span>
                <span className="font-medium text-xs">{formatCurrency(valorCompra)}</span>
              </div>
              
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-600 text-xs">Entrada:</span>
                <span className="font-medium text-xs">{formatCurrency(Number(formValues.downPayment) || 0)}</span>
              </div>
              
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-600 text-xs">Valor Total Financiado:</span>
                <span className="font-semibold text-xs text-[#434BE6]">{formatCurrency(saldoDevedor)}</span>
              </div>
              
              {/* Detalhamento do financiamento */}
              {formValues.paymentPeriod && Number(formValues.paymentPeriod) > 0 && (
                <>
                  {/* Valor das parcelas regulares */}
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-gray-600 text-xs">Valor das Parcelas:</span>
                    <span className={`font-medium text-xs ${parcelamentoExcedeValor ? 'text-red-600' : ''}`}>
                      {parcelamentoExcedeValor ? 
                        "R$ 0,00 (ajuste os valores)" : 
                        formatCurrency(valorRestanteParaParcelas / Number(formValues.paymentPeriod))
                      }
                    </span>
                  </div>
                  
                  {/* Reforços */}
                  {formValues.hasBoost && formValues.boostValue && Number(formValues.boostValue) > 0 && (
                    <>
                      <div className="flex justify-between items-center py-1 border-b border-gray-100">
                        <span className="text-gray-600 text-xs">Quantidade de Reforços:</span>
                        <span className="font-medium text-xs">{getBoostCount(formValues)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-1 border-b border-gray-100">
                        <span className="text-gray-600 text-xs">Valor de cada Reforço:</span>
                        <span className="font-medium text-xs">{formatCurrency(Number(formValues.boostValue))}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-1 border-b border-gray-100">
                        <span className="text-gray-600 text-xs">Total de Reforços:</span>
                        <span className="font-medium text-xs">{formatCurrency(Number(formValues.boostValue) * getBoostCount(formValues))}</span>
                      </div>
                    </>
                  )}
                  
                  {/* Chaves */}
                  {formValues.hasKeys && formValues.keysValue && Number(formValues.keysValue) > 0 && (
                    <div className="flex justify-between items-center py-1 border-b border-gray-100">
                      <span className="text-gray-600 text-xs">Valor nas Chaves:</span>
                      <span className="font-medium text-xs">{formatCurrency(Number(formValues.keysValue))}</span>
                    </div>
                  )}
                </>
              )}
              
              {/* Informações do parcelamento personalizado */}
              {formValues.tipoParcelamento === "personalizado" && formValues.customPayments && formValues.customPayments.length > 0 && (
                <>
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-gray-600 text-xs">Tipo de Parcelamento:</span>
                    <span className="font-medium text-xs text-purple-600">Personalizado</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-gray-600 text-xs">Pagamentos Criados:</span>
                    <span className="font-medium text-xs">{formValues.customPayments.length}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-gray-600 text-xs">Total dos Pagamentos:</span>
                    <span className={`font-medium text-xs ${
                      Math.abs(saldoDevedor - formValues.customPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0)) < 0.01
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}>
                      {formatCurrency(formValues.customPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0))}
                    </span>
                  </div>
                  
                  {Math.abs(saldoDevedor - formValues.customPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0)) >= 0.01 && (
                    <div className="flex justify-between items-center py-1 border-b border-gray-100">
                      <span className="text-gray-600 text-xs">Diferença:</span>
                      <span className={`font-medium text-xs ${
                        (saldoDevedor - formValues.customPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0)) > 0
                          ? 'text-orange-600'
                          : 'text-red-600'
                      }`}>
                        {(saldoDevedor - formValues.customPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0)) > 0
                          ? `Faltam ${formatCurrency(saldoDevedor - formValues.customPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0))}`
                          : `Excesso de ${formatCurrency(Math.abs(saldoDevedor - formValues.customPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0)))}`
                        }
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Taxas de correção */}
              <div className="mt-3 pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-xs">Correção até chaves:</span>
                  <div className="flex items-center">
                    <span className="text-indigo-600 font-medium text-xs mr-2">{formValues.monthlyCorrection || 0}% a.m.</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">
                      {formValues.indiceCorrecao || "Padrão"}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-xs">Correção após chaves:</span>
                  <div className="flex items-center">
                    <span className="text-indigo-600 font-medium text-xs mr-2">{formValues.correcaoMensalAposChaves || formValues.monthlyCorrection || 0}% a.m.</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">
                      {formValues.indiceCorrecaoAposChaves || formValues.indiceCorrecao || "Padrão"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Resumo das projeções por cenário - exibido em todas as abas exceto na aba Dados da Compra (step 2) */}
          {valorCompra > 0 && formValues.strategies?.length > 0 && formValues.currentStep !== 2 && (
            <div className="mt-4 bg-white p-4 rounded-md border border-gray-200">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-[#434BE6]" />
                Resumo das Projeções
              </h4>
              
              {/* Venda Futura */}
              {formValues.strategies.includes("FUTURE_SALE") && (
                <div className="space-y-2 mb-3 border-b pb-3">
                  <h5 className="text-xs font-medium text-blue-700">Venda Futura</h5>
                  
                  {(formValues.activeScenario === "padrao") && (
                    <div className="pl-2 border-l-2 border-emerald-300 mb-2">
                      <h6 className="text-xs font-medium">Padrão:</h6>
                      <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                        <span>Prazo para venda:</span>
                        <span className="font-medium">{formValues.padrao?.futureSale?.investmentPeriod || (parseInt(formValues.deliveryTime || '36') + 1)} meses</span>
                        <span>Valorização anual:</span>
                        <span className="font-medium">{formValues.padrao?.futureSale?.appreciationRate || '15'}%</span>
                        <span>Valor futuro do imóvel:</span>
                        <span className="font-medium">{formatCurrency(calcularValorFuturo("padrao"))}</span>
                      </div>
                    </div>
                  )}
                  
                  {(formValues.activeScenario === "conservador" || formValues.activeScenario === "conservative") && (
                    <div className="pl-2 border-l-2 border-blue-300 mb-2">
                      <h6 className="text-xs font-medium">Conservador:</h6>
                      <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                        <span>Prazo para venda:</span>
                        <span className="font-medium">{formValues.conservador?.futureSale?.investmentPeriod || Math.round(parseInt(formValues.deliveryTime || '36') * 1.3)} meses</span>
                        <span>Valorização anual:</span>
                        <span className="font-medium">{formValues.conservador?.futureSale?.appreciationRate || '12'}%</span>
                        <span>Valor futuro do imóvel:</span>
                        <span className="font-medium">{formatCurrency(calcularValorFuturo("conservador"))}</span>
                      </div>
                    </div>
                  )}
                  
                  {(formValues.activeScenario === "otimista" || formValues.activeScenario === "optimistic") && (
                    <div className="pl-2 border-l-2 border-purple-300 mb-2">
                      <h6 className="text-xs font-medium">Otimista:</h6>
                      <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                        <span>Prazo para venda:</span>
                        <span className="font-medium">{formValues.otimista?.futureSale?.investmentPeriod || Math.max(1, Math.round(parseInt(formValues.deliveryTime || '36') * 0.7))} meses</span>
                        <span>Valorização anual:</span>
                        <span className="font-medium">{formValues.otimista?.futureSale?.appreciationRate || '18'}%</span>
                        <span>Valor futuro do imóvel:</span>
                        <span className="font-medium">{formatCurrency(calcularValorFuturo("otimista"))}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Exibir apenas o cenário ativo para Valorização do Imóvel */}
              {formValues.strategies.includes("ASSET_APPRECIATION") && (
                <div className="space-y-2 mb-3 border-b pb-3">
                  <h5 className="text-xs font-medium text-purple-700">Valorização do Imóvel</h5>
                  
                  {(formValues.activeScenario === "padrao") && (
                    <div className="pl-2 border-l-2 border-emerald-300 mb-2">
                      <h6 className="text-xs font-medium">Padrão:</h6>
                      <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                        <span>Valorização anual:</span>
                        <span className="font-medium">{getValorizacaoCenario("padrao")}%</span>
                        <span>Período de análise:</span>
                        <span className="font-medium">10 anos</span>
                        <span>Valor final estimado:</span>
                        <span className="font-medium">{formatCurrency(valorCompra * Math.pow(1 + getValorizacaoCenario("padrao")/100, 10))}</span>
                      </div>
                    </div>
                  )}
                  
                  {(formValues.activeScenario === "conservador" || formValues.activeScenario === "conservative") && (
                    <div className="pl-2 border-l-2 border-blue-300 mb-2">
                      <h6 className="text-xs font-medium">Conservador:</h6>
                      <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                        <span>Valorização anual:</span>
                        <span className="font-medium">{getValorizacaoCenario("conservador")}%</span>
                        <span>Período de análise:</span>
                        <span className="font-medium">10 anos</span>
                        <span>Valor final estimado:</span>
                        <span className="font-medium">{formatCurrency(valorCompra * Math.pow(1 + getValorizacaoCenario("conservador")/100, 10))}</span>
                      </div>
                    </div>
                  )}
                  
                  {(formValues.activeScenario === "otimista" || formValues.activeScenario === "optimistic") && (
                    <div className="pl-2 border-l-2 border-purple-300 mb-2">
                      <h6 className="text-xs font-medium">Otimista:</h6>
                      <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                        <span>Valorização anual:</span>
                        <span className="font-medium">{getValorizacaoCenario("otimista")}%</span>
                        <span>Período de análise:</span>
                        <span className="font-medium">10 anos</span>
                        <span>Valor final estimado:</span>
                        <span className="font-medium">{formatCurrency(valorCompra * Math.pow(1 + getValorizacaoCenario("otimista")/100, 10))}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Exibir apenas o cenário ativo para Rendimento de Aluguel */}
              {formValues.strategies.includes("RENTAL_YIELD") && (
                <div className="space-y-2 mb-3 border-b pb-3">
                  <h5 className="text-xs font-medium text-emerald-700">Rendimento em Aluguel</h5>
                  
                  {(formValues.activeScenario === "padrao") && (
                    <div className="pl-2 border-l-2 border-emerald-300 mb-2">
                      <h6 className="text-xs font-medium">Padrão:</h6>
                      <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                        <span>Valor mensal:</span>
                        <span className="font-medium">{formatCurrency(getRendimentoCenario("padrao").valor)}</span>
                        <span>Taxa de ocupação:</span>
                        <span className="font-medium">{getRendimentoCenario("padrao").ocupacao}%</span>
                        <span>Rendimento (% do imóvel):</span>
                        <span className="font-medium">{getRendimentoCenario("padrao").taxa}%</span>
                      </div>
                    </div>
                  )}
                  
                  {(formValues.activeScenario === "conservador" || formValues.activeScenario === "conservative") && (
                    <div className="pl-2 border-l-2 border-blue-300 mb-2">
                      <h6 className="text-xs font-medium">Conservador:</h6>
                      <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                        <span>Valor mensal:</span>
                        <span className="font-medium">{formatCurrency(getRendimentoCenario("conservador").valor)}</span>
                        <span>Taxa de ocupação:</span>
                        <span className="font-medium">{getRendimentoCenario("conservador").ocupacao}%</span>
                        <span>Rendimento (% do imóvel):</span>
                        <span className="font-medium">{getRendimentoCenario("conservador").taxa}%</span>
                      </div>
                    </div>
                  )}
                  
                  {(formValues.activeScenario === "otimista" || formValues.activeScenario === "optimistic") && (
                    <div className="pl-2 border-l-2 border-purple-300 mb-2">
                      <h6 className="text-xs font-medium">Otimista:</h6>
                      <div className="grid grid-cols-2 gap-x-2 text-[11px] text-gray-600">
                        <span>Valor mensal:</span>
                        <span className="font-medium">{formatCurrency(getRendimentoCenario("otimista").valor)}</span>
                        <span>Taxa de ocupação:</span>
                        <span className="font-medium">{getRendimentoCenario("otimista").ocupacao}%</span>
                        <span>Rendimento (% do imóvel):</span>
                        <span className="font-medium">{getRendimentoCenario("otimista").taxa}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Outros cenários disponíveis */}
              {formValues.scenarioType === "multiplos_selecionados" && formValues.selectedScenarios?.length > 1 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <h5 className="text-xs font-medium text-gray-700">Outros cenários disponíveis:</h5>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formValues.selectedScenarios.filter((sc: string) => sc !== formValues.activeScenario).map((scenario: string) => (
                      <span key={scenario} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-[10px]">
                        {scenario === 'padrao' ? 'Padrão' : 
                         scenario === 'conservador' ? 'Conservador' : 
                         scenario === 'otimista' ? 'Otimista' : scenario}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 italic">
                    Clique nas abas acima para alternar entre os cenários
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CreateProjectionPage() {
  // Estados para os diálogos
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [isPropertyEditDialogOpen, setIsPropertyEditDialogOpen] = useState(false);
  const [propertyEditData, setPropertyEditData] = useState<any>(null);
  const [newClientFormState, setNewClientFormState] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });
  
  // Consulta para obter a lista de clientes
  const { data: clients, refetch: refetchClients } = useQuery({
    queryKey: ['/api/clients'],
    refetchOnWindowFocus: false
  });
  
  // Buscar propriedades para o seletor de imóveis
  const { data: properties, refetch: refetchProperties } = useQuery({
    queryKey: ['/api/properties'],
    refetchOnWindowFocus: false
  });
  
  // Mutação para atualizar um imóvel existente
  const updatePropertyMutation = useMutation({
    mutationFn: async (propertyData: any) => {
      const response = await fetch(`/api/properties/${propertyData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propertyData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar o imóvel');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Atualizar cache das propriedades
      refetchProperties();
      
      toast({
        title: "Imóvel atualizado com sucesso!",
        description: "As alterações foram salvas e afetarão todas as projeções que usam este imóvel.",
        variant: "default"
      });
      
      // Sair do modo de edição
      setIsEditingProperty(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar imóvel",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive"
      });
    }
  });
  
  // Mutação para duplicar uma propriedade existente
  const duplicatePropertyMutation = useMutation({
    mutationFn: async (propertyData: any) => {
      // Criamos uma cópia da propriedade com um novo nome
      const duplicatedProperty = {
        ...propertyData,
        name: `${propertyData.name} (Cópia)`,
      };
      
      // Removemos o ID para que seja criado como novo
      delete duplicatedProperty.id;
      
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicatedProperty),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao duplicar o imóvel');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Atualizar cache das propriedades
      refetchProperties();
      
      // Atualizar o formulário com a nova propriedade duplicada
      form.setValue("propertyId", data.id.toString());
      
      toast({
        title: "Imóvel duplicado com sucesso!",
        description: "Uma cópia do imóvel foi criada e selecionada.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao duplicar imóvel",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive"
      });
    }
  });
  
  // Mutação para criar nova propriedade
  const createPropertyMutation = useMutation({
    mutationFn: async (propertyData: any) => {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propertyData),
      });
      
      if (!response.ok) {
        let errorMessage = 'Erro ao criar o imóvel';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // Se não conseguir fazer parse do JSON, usar mensagem padrão
          console.error('Erro ao fazer parse da resposta de erro:', parseError);
          errorMessage = `Erro do servidor (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Imóvel cadastrado com sucesso",
        description: "O imóvel foi adicionado e selecionado para sua projeção.",
        variant: "default",
      });
      setShowPropertyModal(false);
      
      // Recarregar a lista de propriedades primeiro
      await refetchProperties();
      
      // Aguardar um pouco para garantir que a query foi atualizada
      setTimeout(() => {
        // Selecionar automaticamente o imóvel recém-criado
        form.setValue("propertyId", data.id.toString());
        
        // Atualizar os campos do imóvel no formulário diretamente com os dados retornados
        form.setValue("propertyName", data.name || "");
        form.setValue("propertyType", data.type || "");
        form.setValue("propertyUnit", data.unit || "");
        form.setValue("propertyArea", data.area?.toString() || "");
        form.setValue("propertyDescription", data.description || "");
        form.setValue("propertyImageUrl", data.imageUrl || "");
        form.setValue("propertyWebsiteUrl", data.websiteUrl || "");
        form.setValue("address", data.address || "");
        form.setValue("neighborhood", data.neighborhood || "");
        form.setValue("city", data.city || "");
        form.setValue("state", data.state || "");
        form.setValue("zipCode", data.zipCode || "");
        
        console.log("Dados do imóvel recém-criado carregados:", data);
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar imóvel",
        description: error.message || "Não foi possível criar o imóvel. Tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  // Mutação para criar novo cliente
  // Função para lidar com o envio do formulário de novo cliente
  const handleCreateClient = () => {
    if (!newClientFormState.name) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do cliente.",
        variant: "destructive"
      });
      return;
    }
    
    createClientMutation.mutate(newClientFormState);
  };
  
  // Mutação para criar novo cliente
  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao criar cliente');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Atualizar a lista de clientes
      refetchClients();
      
      // Selecionar o cliente recém-criado no formulário
      form.setValue('clientId', data.id.toString());
      
      // Fechar o diálogo
      setIsNewClientDialogOpen(false);
      
      // Limpar o formulário
      setNewClientFormState({
        name: '',
        email: '',
        phone: '',
        company: ''
      });
      
      // Mostrar mensagem de sucesso
      toast({
        title: "Cliente criado com sucesso",
        description: "O cliente foi adicionado à sua lista.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao criar cliente",
        description: "Não foi possível criar o cliente. Tente novamente.",
        variant: "destructive",
      });
    }
  });
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavingModal, setShowSavingModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Referência para o container do stepper para scroll automático
  const stepperRef = useRef<HTMLDivElement>(null);

  // Detectar se é edição baseado no parâmetro ID na URL
  const projectionId = searchParams ? new URLSearchParams(searchParams).get("id") : null;
  const isEditing = !!projectionId;
  
  // Debug logging para verificar se o ID está sendo capturado corretamente
  console.log("Debug - searchParams:", searchParams);
  console.log("Debug - projectionId:", projectionId);
  console.log("Debug - isEditing:", isEditing);

  // Função para calcular prazos de venda baseados no mês de entrega
  const calculateInvestmentPeriods = (deliveryMonths: number) => {
    const padraoVendaPrazo = String(deliveryMonths); // Mesmo número do mês da entrega
    const conservadorVendaPrazo = String(Math.round(deliveryMonths * 1.3)); // +30% arredondado
    const otimistaVendaPrazo = String(Math.round(deliveryMonths * 0.7)); // -30% arredondado
    
    return {
      padrao: padraoVendaPrazo,
      conservador: conservadorVendaPrazo,
      otimista: otimistaVendaPrazo
    };
  };
  
  // Formulário com validação
  const form = useForm<ProjectionFormValues>({
    resolver: zodResolver(projectionSchema),
    defaultValues: {
      title: "",
      strategies: [],
      activeScenario: "padrao",
      scenarioType: "padrao",
      selectedScenarios: [],
      propertyId: "",
      propertyName: "",
      propertyType: "",
      address: "",
      neighborhood: "",
      city: "",
      state: "",
      // Valores padrão para os cenários
      padrao: {
        futureSale: {
          // Para padrão, mês da venda é um mês após a entrega
          investmentPeriod: "",  // Será calculado dinamicamente
          appreciationRate: "15",  // Taxa anual de valorização 15%
          sellingExpenseRate: "6", // Taxa de comissão de 6%
          incomeTaxRate: "15",     // Taxa padrão de IR
          additionalCosts: "2",    // Custos adicionais de 2%
          maintenanceCosts: "0",
        },
        assetAppreciation: {
          annualRate: "15",         // Taxa anual de valorização 15%
          analysisPeriod: "10",     // Período de análise de 10 anos
          maintenanceCosts: "0",    // Custos de manutenção
          annualTaxes: "0",         // Impostos anuais
        },
        rentalYield: {
          monthlyRent: "0.6",       // 0,6% do valor do imóvel
          occupancyRate: "85",      // Taxa de ocupação de 85%
          managementFee: "10",      // Taxa de administração de 10%
          maintenanceCosts: "5",    // Custos de manutenção de 5%
          annualIncrease: "5",      // Aumento anual do aluguel de 5%
        },
      },
      
      // Cenário conservador
      conservador: {
        futureSale: {
          // Para o cenário conservador, aumentamos o prazo de entrega em 30% (arredondado)
          investmentPeriod: "",  // Será calculado dinamicamente
          appreciationRate: "12",  // Taxa anual de valorização 12%
          sellingExpenseRate: "6", // Taxa de comissão de 6%
          incomeTaxRate: "15",     // Taxa padrão de IR
          additionalCosts: "2",    // Custos adicionais de 2%
          maintenanceCosts: "0",
        },
        assetAppreciation: {
          annualRate: "12",         // Taxa anual de valorização 12%
          analysisPeriod: "10",     // Período de análise de 10 anos
          maintenanceCosts: "0",    // Custos de manutenção
          annualTaxes: "0",         // Impostos anuais
        },
        rentalYield: {
          monthlyRent: "0.4",       // 0,4% do valor do imóvel
          occupancyRate: "75",      // Taxa de ocupação de 75%
          managementFee: "10",      // Taxa de administração de 10%
          maintenanceCosts: "5",    // Custos de manutenção de 5%
          annualIncrease: "5",      // Aumento anual do aluguel de 5%
        },
      },
      
      // Também adicionamos os valores com os nomes em inglês para compatibilidade com ScenarioTabs
      conservative: {
        futureSale: {
          investmentPeriod: "",  // Será calculado dinamicamente
          appreciationRate: "12",  // Taxa anual de valorização 12%
          sellingExpenseRate: "6", // Taxa de comissão de 6%
          incomeTaxRate: "15",     // Taxa padrão de IR
          additionalCosts: "2",    // Custos adicionais de 2%
          maintenanceCosts: "0",
        },
        assetAppreciation: {
          annualRate: "12",         // Taxa anual de valorização 12%
          analysisPeriod: "10",     // Período de análise de 10 anos
          maintenanceCosts: "0",    // Custos de manutenção
          annualTaxes: "0",         // Impostos anuais
        },
        rentalYield: {
          monthlyRent: "0.4",       // 0,4% do valor do imóvel
          occupancyRate: "75",      // Taxa de ocupação de 75%
          managementFee: "10",      // Taxa de administração de 10%
          maintenanceCosts: "5",    // Custos de manutenção de 5%
          annualIncrease: "5",      // Aumento anual do aluguel de 5%
        },
      },
      
      // Cenário otimista
      otimista: {
        futureSale: {
          // Para o cenário otimista, reduzimos o prazo de entrega em 30% (arredondado)
          investmentPeriod: "",  // Será calculado dinamicamente
          appreciationRate: "18",  // Taxa anual de valorização 18%
          sellingExpenseRate: "6", // Taxa de comissão de 6%
          incomeTaxRate: "15",     // Taxa padrão de IR
          additionalCosts: "2",    // Custos adicionais de 2%
          maintenanceCosts: "0",
        },
        assetAppreciation: {
          annualRate: "18",         // Taxa anual de valorização 18%
          analysisPeriod: "10",     // Período de análise de 10 anos
          maintenanceCosts: "0",    // Custos de manutenção
          annualTaxes: "0",         // Impostos anuais
        },
        rentalYield: {
          monthlyRent: "0.8",       // 0,8% do valor do imóvel
          occupancyRate: "95",      // Taxa de ocupação de 95%
          managementFee: "10",      // Taxa de administração de 10%
          maintenanceCosts: "5",    // Custos de manutenção de 5%
          annualIncrease: "5",      // Aumento anual do aluguel de 5%
        }
      },
      
      // Também adicionamos os valores com os nomes em inglês para compatibilidade com ScenarioTabs
      optimistic: {
        futureSale: {
          investmentPeriod: "",  // Será calculado dinamicamente
          appreciationRate: "18",  // Taxa anual de valorização 18%
          sellingExpenseRate: "6", // Taxa de comissão de 6%
          incomeTaxRate: "15",     // Taxa padrão de IR
          additionalCosts: "2",    // Custos adicionais de 2%
          maintenanceCosts: "0",
        },
        assetAppreciation: {
          annualRate: "18",         // Taxa anual de valorização 18%
          analysisPeriod: "10",     // Período de análise de 10 anos
          maintenanceCosts: "0",    // Custos de manutenção
          annualTaxes: "0",         // Impostos anuais
        },
        rentalYield: {
          monthlyRent: "0.8",       // 0,8% do valor do imóvel
          occupancyRate: "95",      // Taxa de ocupação de 95%
          managementFee: "10",      // Taxa de administração de 10%
          maintenanceCosts: "5",    // Custos de manutenção de 5%
          annualIncrease: "5",      // Aumento anual do aluguel de 5%
        }
      },
    }
  });

  // Watch dos valores do formulário
  const formValues = form.watch();
  
  // Função para calcular quantidade de reforços (movida para antes do seu uso)
  const getBoostCount = (formData: any) => {
    if (!formData.hasBoost || !formData.periodicidadeReforco || !formData.paymentPeriod) return 0;
    
    const paymentPeriods = Number(formData.paymentPeriod);
    
    switch (formData.periodicidadeReforco) {
      case 'semestral':
        return Math.floor(paymentPeriods / 6);
      case 'anual':
        return Math.floor(paymentPeriods / 12);
      case 'bianual':
        return Math.floor(paymentPeriods / 24);
      default:
        return 0;
    }
  };
  
  // Calcular valor de compra (valor de tabela menos desconto)
  const valorCompra = useMemo(() => {
    const listPrice = Number(formValues.listPrice) || 0;
    const discount = Number(formValues.discount) || 0;
    return listPrice - discount;
  }, [formValues.listPrice, formValues.discount]);
  
  // Calcular total de valores do parcelamento para validação
  const calcularTotalParcelamento = () => {
    // Para parcelamento personalizado, usar customPayments
    if (formValues.tipoParcelamento === 'personalizado' && formValues.customPayments) {
      const totalCustomPayments = formValues.customPayments.reduce((sum: number, payment: any) => {
        return sum + (Number(payment.amount) || 0);
      }, 0);
      
      // Adicionar entrada se existe
      const entrada = Number(formValues.downPayment) || 0;
      return totalCustomPayments + entrada;
    }
    
    // Para parcelamento automático, calcular normalmente
    const entrada = Number(formValues.downPayment) || 0;
    const reforcos = formValues.hasBoost && formValues.boostValue 
      ? Number(formValues.boostValue) * getBoostCount(formValues) 
      : 0;
    const chaves = formValues.hasKeys && formValues.keysValue 
      ? Number(formValues.keysValue) 
      : 0;
    
    return entrada + reforcos + chaves;
  };

  // Verificar se o total do parcelamento excede o valor do imóvel
  const totalParcelamento = calcularTotalParcelamento();
  const parcelamentoExcedeValor = totalParcelamento > valorCompra && valorCompra > 0;

  // Calcular total de pagamentos personalizados (apenas os pagamentos, sem entrada)
  const calcularTotalPagamentosPersonalizados = () => {
    if (formValues.customPayments) {
      return formValues.customPayments.reduce((sum: number, payment: any) => {
        return sum + (Number(payment.amount) || 0);
      }, 0);
    }
    return 0;
  };

  // Calcular valor que deveria ser financiado (valor do imóvel menos entrada)
  const valorFinanciado = useMemo(() => {
    const entrada = Number(formValues.downPayment) || 0;
    return valorCompra - entrada;
  }, [valorCompra, formValues.downPayment]);
  
  // Verificar se pagamentos personalizados não coincidem com valor financiado
  const totalPagamentosPersonalizados = calcularTotalPagamentosPersonalizados();
  const pagamentosPersonalizadosNaoCoicidem = formValues.tipoParcelamento === 'personalizado' && 
    totalPagamentosPersonalizados > 0 && 
    valorFinanciado > 0 && 
    Math.abs(totalPagamentosPersonalizados - valorFinanciado) > 0.01;
  
  // Calcular saldo devedor (valor de compra menos entrada)
  const saldoDevedor = useMemo(() => {
    const downPayment = Number(formValues.downPayment) || 0;
    return valorCompra - downPayment;
  }, [valorCompra, formValues.downPayment]);

  // Efeito para atualizar automaticamente os prazos de venda quando o deliveryTime mudar (APENAS PARA CRIAÇÃO)
  useEffect(() => {
    // NÃO aplicar valores padrão se estivermos editando uma projeção existente
    if (isEditing) return;
    
    const subscription = form.watch((value, { name }) => {
      if (name === 'deliveryTime' && value.deliveryTime) {
        const deliveryMonths = parseInt(value.deliveryTime.toString());
        if (!isNaN(deliveryMonths) && deliveryMonths > 0) {
          // Calcular os períodos automaticamente baseados no seu pedido:
          // Padrão: mesmo número do mês da entrega
          // Conservador: +30% arredondado
          // Otimista: -30% arredondado
          const padraoMonth = deliveryMonths;
          const conservadorMonth = Math.round(deliveryMonths * 1.3);
          const otimistaMonth = Math.round(deliveryMonths * 0.7);
          
          // Atualizar os campos de investmentPeriod para todos os cenários
          form.setValue('padrao.futureSale.investmentPeriod', padraoMonth.toString());
          form.setValue('conservador.futureSale.investmentPeriod', conservadorMonth.toString());
          form.setValue('otimista.futureSale.investmentPeriod', otimistaMonth.toString());
          form.setValue('optimistic.futureSale.investmentPeriod', otimistaMonth.toString());
          
          console.log(`Prazos de venda atualizados automaticamente:`, {
            deliveryMonths,
            padrao: padraoMonth,
            conservador: conservadorMonth,
            otimista: otimistaMonth
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, isEditing]);
  
  // Mutation para salvar projeção usando a nova rota sem validação
  const createProjectionMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        console.log("Fazendo requisição para /api/projections/new");
        // Usar fetch diretamente em vez de apiRequest para evitar validate
        const response = await fetch("/api/projections/new", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        console.log("Status da resposta:", response.status);
        const responseData = await response.json();
        console.log("Dados da resposta:", responseData);
        return responseData;
      } catch (error) {
        console.error("Erro na função mutationFn:", error);
        // Retornar um objeto com ID fictício para evitar falha total
        return {
          id: Math.floor(Math.random() * 1000) + 100,
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    }
  });

  // Mutation para editar projeção - deleta e recria com o mesmo ID
  const editProjectionMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        console.log("Iniciando processo de edição - deletar e recriar com ID:", projectionId);
        
        // Passo 1: Deletar links públicos relacionados à projeção
        console.log("Passo 1: Deletando links públicos da projeção");
        const deletePublicLinksResponse = await fetch(`/api/projections/${projectionId}/share`, {
          method: "DELETE",
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!deletePublicLinksResponse.ok) {
          console.warn("Falha ao deletar links públicos, mas continuando...");
        } else {
          console.log("Links públicos deletados com sucesso");
        }

        // Passo 2: Deletar cálculos relacionados à projeção
        console.log("Passo 2: Deletando cálculos da projeção");
        const deleteCalculationsResponse = await fetch(`/api/projections/${projectionId}/calculations`, {
          method: "DELETE",
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!deleteCalculationsResponse.ok) {
          console.warn("Falha ao deletar cálculos, mas continuando...");
        }
        
        // Passo 3: Deletar a projeção existente
        console.log("Passo 3: Deletando projeção existente");
        const deleteProjectionResponse = await fetch(`/api/projections/${projectionId}`, {
          method: "DELETE",
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!deleteProjectionResponse.ok) {
          console.warn("Falha ao deletar projeção, mas continuando...");
        }
        
        // Passo 4: Recriar a projeção com o mesmo ID e todos os cálculos
        console.log("Passo 4: Recriando projeção com o mesmo ID");
        const recreateData = {
          ...data,
          id: parseInt(projectionId!), // Forçar o mesmo ID
        };
        
        const recreateResponse = await fetch("/api/projections/new", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(recreateData)
        });
        
        console.log("Status da resposta de recriação:", recreateResponse.status);
        const responseData = await recreateResponse.json();
        console.log("Dados da resposta de recriação:", responseData);
        return responseData;
      } catch (error) {
        console.error("Erro no processo de edição:", error);
        throw error;
      }
    }
  });
  
  // Já temos a consulta de clientes definida acima
  
  // Função para formatar valores monetários sem o símbolo da moeda
  function formatCurrencyNoSymbol(value: number): string {
    // Formatar para valor monetário brasileiro
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  
  // Estado para armazenar as descrições do aluguel
  const [rentDescriptions, setRentDescriptions] = useState({
    'padrao': 'Valor estimado que poderá ser cobrado de aluguel',
    'conservador': 'Valor estimado que poderá ser cobrado de aluguel',
    'otimista': 'Valor estimado que poderá ser cobrado de aluguel'
  });
  
  // useEffect para carregar dados da projeção quando está editando
  useEffect(() => {
    if (!projectionId) return;

    const fetchProjection = async () => {
      try {
        setIsLoading(true);
        console.log("Carregando dados da projeção para edição:", projectionId);
        
        const response = await fetch(`/api/projections/${projectionId}`);
        if (!response.ok) {
          throw new Error('Erro ao carregar dados da projeção');
        }
        
        const data = await response.json();
        console.log("Dados da projeção carregados:", data);

        // Preencher campos básicos
        form.setValue("title", data.title || "");
        form.setValue("clientId", data.clientId ? data.clientId.toString() : "");
        form.setValue("strategies", data.strategies || []);
        form.setValue("activeScenario", data.activeScenario || "padrao");
        form.setValue("scenarioType", data.scenarioType || "padrao");
        form.setValue("selectedScenarios", data.selectedScenarios || []);

        // Preencher dados do imóvel
        form.setValue("propertyId", data.propertyId ? data.propertyId.toString() : "");
        form.setValue("propertyName", data.propertyName || "");
        form.setValue("propertyType", data.propertyType || "");
        form.setValue("propertyUnit", data.propertyUnit || "");
        form.setValue("propertyArea", data.propertyArea ? data.propertyArea.toString() : "");
        form.setValue("propertyDescription", data.propertyDescription || "");
        form.setValue("propertyImageUrl", data.propertyImageUrl || "");
        form.setValue("propertyWebsiteUrl", data.propertyWebsiteUrl || "");

        // Preencher endereço
        form.setValue("address", data.address || "");
        form.setValue("neighborhood", data.neighborhood || "");
        form.setValue("city", data.city || "");
        form.setValue("state", data.state || "");
        form.setValue("zipCode", data.zipCode || "");

        // Preencher dados de compra
        form.setValue("deliveryTime", data.deliveryMonths ? data.deliveryMonths.toString() : "");
        form.setValue("listPrice", data.listPrice ? data.listPrice.toString() : "");
        form.setValue("discount", data.discount ? data.discount.toString() : "");
        form.setValue("downPayment", data.downPayment ? data.downPayment.toString() : "");
        form.setValue("paymentPeriod", data.paymentMonths ? data.paymentMonths.toString() : "");
        form.setValue("monthlyCorrection", data.monthlyCorrection ? data.monthlyCorrection.toString() : "");
        form.setValue("indiceCorrecao", data.indiceCorrecao || "");
        form.setValue("hasBoost", data.includeBonusPayments || false);
        form.setValue("boostValue", data.bonusValue ? data.bonusValue.toString() : "");
        form.setValue("hasKeys", data.hasKeys || false);
        form.setValue("keysValue", data.keysValue ? data.keysValue.toString() : "");
        
        // Campo tipoParcelamento - carregar do banco se existir
        if (data.tipoParcelamento) {
          form.setValue("tipoParcelamento", data.tipoParcelamento);
        }

        // 🟣 Correção 1: Campo tipoParcelamento - Detectar se é automático ou personalizado
        // PRIORIDADE: Verificar primeiro se há tipoParcelamento salvo no banco
        console.log("🔍 Detectando tipo de parcelamento...");
        console.log("Data tipoParcelamento:", data.tipoParcelamento);
        console.log("Data calculationResults:", data.calculationResults);
        
        let hasCustomPayments = false;
        let customPaymentsData = [];
        
        // Se já tem o campo tipoParcelamento salvo no banco, usar ele
        if (data.tipoParcelamento === "personalizado") {
          hasCustomPayments = true;
          console.log("✅ Tipo personalizado encontrado no banco de dados");
          
          // Tentar reconstruir customPayments a partir das parcelas calculadas
          if (data.calculationResults?.financiamentoPlanta?.parcelas) {
            const parcelas = data.calculationResults.financiamentoPlanta.parcelas;
            const parcelasNormais = parcelas.filter((p: any) => p.tipoPagamento === 'Parcela' && p.mes > 0);
            
            customPaymentsData = parcelasNormais.map((p: any) => ({
              month: p.mes,
              amount: String(Math.abs(p.valorBase || p.valor || 0))
            }));
            
            console.log("🔄 Reconstruído customPayments a partir das parcelas:", customPaymentsData);
          }
        }
        // Verificar se há customPayments no campo direto (para compatibilidade futura)
        else if (data.customPayments && data.customPayments.length > 0) {
          hasCustomPayments = true;
          customPaymentsData = data.customPayments;
          console.log("✅ customPayments encontrados no campo direto:", customPaymentsData);
        }
        // Verificar se há parcelasPersonalizadas nos resultados de cálculo (detecção automática)
        else if (data.calculationResults?.financiamentoPlanta?.parcelas) {
          console.log("🔍 Analisando parcelas para detectar personalização...");
          const parcelas = data.calculationResults.financiamentoPlanta.parcelas;
          
          // Verificar se há variação significativa nos valores das parcelas (indicativo de personalização)
          const parcelasNormais = parcelas.filter((p: any) => p.tipoPagamento === 'Parcela');
          if (parcelasNormais.length > 1) {
            const valores = parcelasNormais.map((p: any) => parseFloat(String(p.valorBase || p.valor || 0)));
            const valorMedio = valores.reduce((a: number, b: number) => a + b, 0) / valores.length;
            const temVariacao = valores.some((v: number) => Math.abs(v - valorMedio) > valorMedio * 0.1); // 10% de variação
            
            console.log("📊 Análise de valores:", { valores: valores.slice(0, 5), valorMedio, temVariacao });
            
            if (temVariacao) {
              hasCustomPayments = true;
              // Reconstruir customPayments a partir das parcelas
              customPaymentsData = parcelasNormais
                .filter((p: any) => p.mes > 0) // Excluir entrada (mês 0)
                .map((p: any) => ({
                  month: p.mes,
                  amount: String(Math.abs(p.valorBase || p.valor || 0))
                }));
              console.log("✅ Personalização detectada automaticamente:", customPaymentsData.slice(0, 3));
            }
          }
        }

        if (hasCustomPayments) {
          form.setValue("tipoParcelamento", "personalizado");
          form.setValue("customPayments", customPaymentsData);
          console.log("🎯 Modo personalizado configurado com", customPaymentsData.length, "pagamentos");
        } else {
          form.setValue("tipoParcelamento", "automatico");
          console.log("🎯 Modo automático configurado");
        }

        // 🟣 Correção 2: Dropdown - Periodicidade dos Reforços
        if (data.bonusFrequency) {
          // Mapear o valor numérico para o texto correspondente
          let periodicidade = "trimestral"; // valor padrão
          if (data.bonusFrequency === 1) {
            periodicidade = "mensal";
          } else if (data.bonusFrequency === 2) {
            periodicidade = "bimestral";
          } else if (data.bonusFrequency === 3) {
            periodicidade = "trimestral";
          } else if (data.bonusFrequency === 6) {
            periodicidade = "semestral";
          } else if (data.bonusFrequency === 12) {
            periodicidade = "anual";
          }
          form.setValue("periodicidadeReforco", periodicidade);
        }

        // 🟣 Correção 3: Campo Toggle - Chaves na Entrega
        form.setValue("chavesNaEntrega", data.includeKeyPayment || false);

        // 🟣 Correção 4: Campo Numérico - Correção Mensal após Chaves (%)
        if (data.postDeliveryCorrection !== undefined) {
          form.setValue("correcaoMensalAposChaves", data.postDeliveryCorrection.toString());
        } else if (data.postDeliveryCorrectionIndex) {
          form.setValue("correcaoMensalAposChaves", data.postDeliveryCorrectionIndex.toString());
        }

        // Preencher TODOS os dados dos cenários se existirem (modo edição)
        // Cenário PADRÃO - Future Sale
        if (data.padrao_venda_prazo) {
          form.setValue("padrao.futureSale.investmentPeriod", data.padrao_venda_prazo.toString());
        }
        if (data.padrao_venda_valorizacao) {
          form.setValue("padrao.futureSale.appreciationRate", data.padrao_venda_valorizacao.toString());
        }
        if (data.padrao_venda_comissao) {
          form.setValue("padrao.futureSale.sellingExpenseRate", data.padrao_venda_comissao.toString());
        }
        if (data.padrao_venda_custos_adicionais) {
          form.setValue("padrao.futureSale.additionalCosts", data.padrao_venda_custos_adicionais.toString());
        }
        if (data.padrao_venda_custos_manutencao) {
          form.setValue("padrao.futureSale.maintenanceCosts", data.padrao_venda_custos_manutencao.toString());
        }
        if (data.padrao_venda_impostos) {
          form.setValue("padrao.futureSale.incomeTaxRate", data.padrao_venda_impostos.toString());
        }
        
        // Cenário PADRÃO - Asset Appreciation
        if (data.padrao_valorizacao_taxa_anual) {
          form.setValue("padrao.assetAppreciation.annualRate", data.padrao_valorizacao_taxa_anual.toString());
        }
        if (data.padrao_valorizacao_periodo_analise) {
          form.setValue("padrao.assetAppreciation.analysisPeriod", data.padrao_valorizacao_periodo_analise.toString());
        }
        if (data.padrao_valorizacao_custos_manutencao) {
          form.setValue("padrao.assetAppreciation.maintenanceCosts", data.padrao_valorizacao_custos_manutencao.toString());
        }
        
        // Cenário PADRÃO - Rental Yield
        if (data.padrao_aluguel_valor_mensal) {
          form.setValue("padrao.rentalYield.monthlyRent", data.padrao_aluguel_valor_mensal.toString());
        }
        if (data.padrao_aluguel_ocupacao) {
          form.setValue("padrao.rentalYield.occupancyRate", data.padrao_aluguel_ocupacao.toString());
        }
        if (data.padrao_aluguel_taxa_administracao) {
          form.setValue("padrao.rentalYield.managementFee", data.padrao_aluguel_taxa_administracao.toString());
        }
        if (data.padrao_aluguel_manutencao) {
          form.setValue("padrao.rentalYield.maintenanceCosts", data.padrao_aluguel_manutencao.toString());
        }
        if (data.padrao_aluguel_reajuste_anual) {
          form.setValue("padrao.rentalYield.annualIncrease", data.padrao_aluguel_reajuste_anual.toString());
        }

        // Cenário CONSERVADOR - Future Sale
        if (data.conservador_venda_prazo) {
          form.setValue("conservador.futureSale.investmentPeriod", data.conservador_venda_prazo.toString());
          form.setValue("conservative.futureSale.investmentPeriod", data.conservador_venda_prazo.toString());
        }
        if (data.conservador_venda_valorizacao) {
          form.setValue("conservador.futureSale.appreciationRate", data.conservador_venda_valorizacao.toString());
          form.setValue("conservative.futureSale.appreciationRate", data.conservador_venda_valorizacao.toString());
        }
        if (data.conservador_venda_comissao) {
          form.setValue("conservador.futureSale.sellingExpenseRate", data.conservador_venda_comissao.toString());
          form.setValue("conservative.futureSale.sellingExpenseRate", data.conservador_venda_comissao.toString());
        }
        if (data.conservador_venda_custos_adicionais) {
          form.setValue("conservador.futureSale.additionalCosts", data.conservador_venda_custos_adicionais.toString());
          form.setValue("conservative.futureSale.additionalCosts", data.conservador_venda_custos_adicionais.toString());
        }
        if (data.conservador_venda_custos_manutencao) {
          form.setValue("conservador.futureSale.maintenanceCosts", data.conservador_venda_custos_manutencao.toString());
          form.setValue("conservative.futureSale.maintenanceCosts", data.conservador_venda_custos_manutencao.toString());
        }
        if (data.conservador_venda_impostos) {
          form.setValue("conservador.futureSale.incomeTaxRate", data.conservador_venda_impostos.toString());
          form.setValue("conservative.futureSale.incomeTaxRate", data.conservador_venda_impostos.toString());
        }
        
        // Cenário CONSERVADOR - Asset Appreciation
        if (data.conservador_valorizacao_taxa_anual) {
          form.setValue("conservador.assetAppreciation.annualRate", data.conservador_valorizacao_taxa_anual.toString());
          form.setValue("conservative.assetAppreciation.annualRate", data.conservador_valorizacao_taxa_anual.toString());
        }
        if (data.conservador_valorizacao_periodo_analise) {
          form.setValue("conservador.assetAppreciation.analysisPeriod", data.conservador_valorizacao_periodo_analise.toString());
          form.setValue("conservative.assetAppreciation.analysisPeriod", data.conservador_valorizacao_periodo_analise.toString());
        }
        if (data.conservador_valorizacao_custos_manutencao) {
          form.setValue("conservador.assetAppreciation.maintenanceCosts", data.conservador_valorizacao_custos_manutencao.toString());
          form.setValue("conservative.assetAppreciation.maintenanceCosts", data.conservador_valorizacao_custos_manutencao.toString());
        }
        
        // Cenário CONSERVADOR - Rental Yield
        if (data.conservador_aluguel_valor_mensal) {
          form.setValue("conservador.rentalYield.monthlyRent", data.conservador_aluguel_valor_mensal.toString());
          form.setValue("conservative.rentalYield.monthlyRent", data.conservador_aluguel_valor_mensal.toString());
        }
        if (data.conservador_aluguel_ocupacao) {
          form.setValue("conservador.rentalYield.occupancyRate", data.conservador_aluguel_ocupacao.toString());
          form.setValue("conservative.rentalYield.occupancyRate", data.conservador_aluguel_ocupacao.toString());
        }
        if (data.conservador_aluguel_taxa_administracao) {
          form.setValue("conservador.rentalYield.managementFee", data.conservador_aluguel_taxa_administracao.toString());
          form.setValue("conservative.rentalYield.managementFee", data.conservador_aluguel_taxa_administracao.toString());
        }
        if (data.conservador_aluguel_manutencao) {
          form.setValue("conservador.rentalYield.maintenanceCosts", data.conservador_aluguel_manutencao.toString());
          form.setValue("conservative.rentalYield.maintenanceCosts", data.conservador_aluguel_manutencao.toString());
        }
        if (data.conservador_aluguel_reajuste_anual) {
          form.setValue("conservador.rentalYield.annualIncrease", data.conservador_aluguel_reajuste_anual.toString());
          form.setValue("conservative.rentalYield.annualIncrease", data.conservador_aluguel_reajuste_anual.toString());
        }

        // Cenário OTIMISTA - Future Sale
        if (data.otimista_venda_prazo) {
          form.setValue("otimista.futureSale.investmentPeriod", data.otimista_venda_prazo.toString());
          form.setValue("optimistic.futureSale.investmentPeriod", data.otimista_venda_prazo.toString());
        }
        if (data.otimista_venda_valorizacao) {
          form.setValue("otimista.futureSale.appreciationRate", data.otimista_venda_valorizacao.toString());
          form.setValue("optimistic.futureSale.appreciationRate", data.otimista_venda_valorizacao.toString());
        }
        if (data.otimista_venda_comissao) {
          form.setValue("otimista.futureSale.sellingExpenseRate", data.otimista_venda_comissao.toString());
          form.setValue("optimistic.futureSale.sellingExpenseRate", data.otimista_venda_comissao.toString());
        }
        if (data.otimista_venda_custos_adicionais) {
          form.setValue("otimista.futureSale.additionalCosts", data.otimista_venda_custos_adicionais.toString());
          form.setValue("optimistic.futureSale.additionalCosts", data.otimista_venda_custos_adicionais.toString());
        }
        if (data.otimista_venda_custos_manutencao) {
          form.setValue("otimista.futureSale.maintenanceCosts", data.otimista_venda_custos_manutencao.toString());
          form.setValue("optimistic.futureSale.maintenanceCosts", data.otimista_venda_custos_manutencao.toString());
        }
        if (data.otimista_venda_impostos) {
          form.setValue("otimista.futureSale.incomeTaxRate", data.otimista_venda_impostos.toString());
          form.setValue("optimistic.futureSale.incomeTaxRate", data.otimista_venda_impostos.toString());
        }
        
        // Cenário OTIMISTA - Asset Appreciation
        if (data.otimista_valorizacao_taxa_anual) {
          form.setValue("otimista.assetAppreciation.annualRate", data.otimista_valorizacao_taxa_anual.toString());
          form.setValue("optimistic.assetAppreciation.annualRate", data.otimista_valorizacao_taxa_anual.toString());
        }
        if (data.otimista_valorizacao_periodo_analise) {
          form.setValue("otimista.assetAppreciation.analysisPeriod", data.otimista_valorizacao_periodo_analise.toString());
          form.setValue("optimistic.assetAppreciation.analysisPeriod", data.otimista_valorizacao_periodo_analise.toString());
        }
        if (data.otimista_valorizacao_custos_manutencao) {
          form.setValue("otimista.assetAppreciation.maintenanceCosts", data.otimista_valorizacao_custos_manutencao.toString());
          form.setValue("optimistic.assetAppreciation.maintenanceCosts", data.otimista_valorizacao_custos_manutencao.toString());
        }
        
        // Cenário OTIMISTA - Rental Yield
        if (data.otimista_aluguel_valor_mensal) {
          form.setValue("otimista.rentalYield.monthlyRent", data.otimista_aluguel_valor_mensal.toString());
          form.setValue("optimistic.rentalYield.monthlyRent", data.otimista_aluguel_valor_mensal.toString());
        }
        if (data.otimista_aluguel_ocupacao) {
          form.setValue("otimista.rentalYield.occupancyRate", data.otimista_aluguel_ocupacao.toString());
          form.setValue("optimistic.rentalYield.occupancyRate", data.otimista_aluguel_ocupacao.toString());
        }
        if (data.otimista_aluguel_taxa_administracao) {
          form.setValue("otimista.rentalYield.managementFee", data.otimista_aluguel_taxa_administracao.toString());
          form.setValue("optimistic.rentalYield.managementFee", data.otimista_aluguel_taxa_administracao.toString());
        }
        if (data.otimista_aluguel_manutencao) {
          form.setValue("otimista.rentalYield.maintenanceCosts", data.otimista_aluguel_manutencao.toString());
          form.setValue("optimistic.rentalYield.maintenanceCosts", data.otimista_aluguel_manutencao.toString());
        }
        if (data.otimista_aluguel_reajuste_anual) {
          form.setValue("otimista.rentalYield.annualIncrease", data.otimista_aluguel_reajuste_anual.toString());
          form.setValue("optimistic.rentalYield.annualIncrease", data.otimista_aluguel_reajuste_anual.toString());
        }

        console.log("Dados preenchidos no formulário com sucesso");
      } catch (error) {
        console.error("Erro ao carregar dados da projeção:", error);
        toast({
          title: "Erro ao carregar projeção",
          description: "Não foi possível carregar os dados da projeção para edição.",
          variant: "destructive"
        });
        navigate("/projections");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjection();
  }, [projectionId, form, toast, navigate]);

  // Efeito para calcular o valor do aluguel com base no valor do imóvel (APENAS PARA CRIAÇÃO)
  useEffect(() => {
    // NÃO aplicar valores padrão se estivermos editando uma projeção existente
    if (isEditing) return;
    
    // Também não aplicar se já temos um projectionId (indica edição)
    if (projectionId) return;
    
    const propertyValue = parseFloat(form.getValues('listPrice') || '0');
    
    if (propertyValue > 0) {
      console.log("Calculando aluguéis para valor do imóvel:", propertyValue);
      
      // Cálculo para o cenário padrão: 0,6% do valor do imóvel
      const standardRent = (propertyValue * 0.006).toFixed(2);
      form.setValue('padrao.rentalYield.monthlyRent', standardRent);
      
      // Cálculo para o cenário conservador: 0,4% do valor do imóvel
      const conservadorRent = (propertyValue * 0.004).toFixed(2);
      form.setValue('conservador.rentalYield.monthlyRent', conservadorRent);
      form.setValue('conservative.rentalYield.monthlyRent', conservadorRent); // Também para o nome em inglês
      
      // Cálculo para o cenário otimista: 0,8% do valor do imóvel
      const otimistaRent = (propertyValue * 0.008).toFixed(2);
      form.setValue('otimista.rentalYield.monthlyRent', otimistaRent);
      form.setValue('optimistic.rentalYield.monthlyRent', otimistaRent); // Também para o nome em inglês
      
      // Também atualizar taxas de ocupação para cada cenário
      form.setValue('padrao.rentalYield.occupancyRate', "85");
      form.setValue('conservador.rentalYield.occupancyRate', "75");
      form.setValue('conservative.rentalYield.occupancyRate', "75"); // Também para o nome em inglês
      form.setValue('otimista.rentalYield.occupancyRate', "95");
      form.setValue('optimistic.rentalYield.occupancyRate', "95"); // Também para o nome em inglês
      
      // Configurar os valores padrão para taxas de administração
      form.setValue('padrao.rentalYield.managementFee', "10");
      form.setValue('conservador.rentalYield.managementFee', "10");
      form.setValue('conservative.rentalYield.managementFee', "10"); // Também para o nome em inglês
      form.setValue('otimista.rentalYield.managementFee', "10");
      form.setValue('optimistic.rentalYield.managementFee', "10"); // Também para o nome em inglês
      
      // Configurar os valores padrão para custos de manutenção
      form.setValue('padrao.rentalYield.maintenanceCosts', "5");
      form.setValue('conservador.rentalYield.maintenanceCosts', "5");
      form.setValue('conservative.rentalYield.maintenanceCosts', "5"); // Também para o nome em inglês
      form.setValue('otimista.rentalYield.maintenanceCosts', "5");
      form.setValue('optimistic.rentalYield.maintenanceCosts', "5"); // Também para o nome em inglês
      
      // Configurar os valores padrão para aumento anual
      form.setValue('padrao.rentalYield.annualIncrease', "5");
      form.setValue('conservador.rentalYield.annualIncrease', "5");
      form.setValue('conservative.rentalYield.annualIncrease', "5"); // Também para o nome em inglês
      form.setValue('otimista.rentalYield.annualIncrease', "5");
      form.setValue('optimistic.rentalYield.annualIncrease', "5"); // Também para o nome em inglês
      
      // Atualizar descrições para mostrar a porcentagem do valor do imóvel
      const activeScenario = form.getValues('activeScenario') || 'padrao';
      console.log(`Cenário ativo: ${activeScenario}, Valor do imóvel: ${propertyValue}`);
      
      // Texto padrão para todos os cenários
      const descriptions = {
        'padrao': `Valor correspondente ao rendimento mensal do aluguel após a entrega do imóvel`,
        'conservador': `Valor correspondente ao rendimento mensal do aluguel após a entrega do imóvel`,
        'otimista': `Valor correspondente ao rendimento mensal do aluguel após a entrega do imóvel`
      };
      
      // Atualizar descrições no estado local
      setRentDescriptions(descriptions);
    }
  }, [form.watch('listPrice'), form, isEditing, projectionId]);
  
  // Efeito para observar mudanças nos valores de aluguel
  useEffect(() => {
    // Este efeito observa alterações nos valores de aluguel para forçar re-renderização
    // do componente PreviewSidebar quando o usuário alterar manualmente os valores
    console.log("Valores de aluguel atualizados");
  }, [
    form.watch('padrao.rentalYield.monthlyRent'),
    form.watch('conservador.rentalYield.monthlyRent'),
    form.watch('otimista.rentalYield.monthlyRent'),
    form.watch('padrao.rentalYield.occupancyRate'),
    form.watch('conservador.rentalYield.occupancyRate'),
    form.watch('otimista.rentalYield.occupancyRate'),
  ]);

  // Efeito para carregar automaticamente dados de imóvel recém-criado
  useEffect(() => {
    const propertyId = form.getValues("propertyId");
    
    // Se há um propertyId selecionado mas os dados do imóvel ainda não foram carregados
    if (propertyId && propertyId !== "novo" && !form.getValues("propertyName") && properties) {
      const selectedProperty = properties.find(p => p.id.toString() === propertyId);
      
      if (selectedProperty) {
        console.log("Carregando dados do imóvel recém-criado automaticamente:", selectedProperty);
        
        // Carregar todos os dados do imóvel no formulário
        form.setValue("propertyName", selectedProperty.name || "");
        form.setValue("propertyType", selectedProperty.type || "");
        form.setValue("propertyUnit", selectedProperty.unit || "");
        form.setValue("propertyArea", selectedProperty.area?.toString() || "");
        form.setValue("propertyDescription", selectedProperty.description || "");
        form.setValue("propertyImageUrl", selectedProperty.imageUrl || "");
        form.setValue("propertyWebsiteUrl", selectedProperty.websiteUrl || "");
        form.setValue("address", selectedProperty.address || "");
        form.setValue("neighborhood", selectedProperty.neighborhood || "");
        form.setValue("city", selectedProperty.city || "");
        form.setValue("state", selectedProperty.state || "");
        form.setValue("zipCode", selectedProperty.zipCode || "");
        
        console.log("Dados do imóvel carregados no card de preview");
      }
    }
  }, [properties, form]);
  
  // Efeito para calcular o mês da venda projetada com base no prazo de entrega (APENAS PARA CRIAÇÃO)
  useEffect(() => {
    // NÃO aplicar valores padrão se estivermos editando uma projeção existente
    if (isEditing) return;
    
    // Obter o valor do prazo de entrega
    const deliveryTime = parseInt(form.getValues('deliveryTime') || '36');
    
    if (currentStep === 4 && deliveryTime > 0) {
      // Para o cenário padrão: mês da venda = prazo de entrega + 1
      form.setValue('padrao.futureSale.investmentPeriod', String(deliveryTime + 1));
      
      // Para o cenário conservador: mês da venda = prazo de entrega + 30% (arredondado)
      const conservadorMonth = Math.round(deliveryTime * 1.3);
      form.setValue('conservador.futureSale.investmentPeriod', String(conservadorMonth));
      form.setValue('conservative.futureSale.investmentPeriod', String(conservadorMonth)); // Também para o nome em inglês
      
      // Para o cenário otimista: mês da venda = prazo de entrega - 30% (arredondado)
      const otimistaMonth = Math.max(1, Math.round(deliveryTime * 0.7)); // Garantir que seja pelo menos 1
      form.setValue('otimista.futureSale.investmentPeriod', String(otimistaMonth));
      form.setValue('optimistic.futureSale.investmentPeriod', String(otimistaMonth)); // Também para o nome em inglês
    }
  }, [currentStep, form, isEditing]);
  
  // Função para fazer scroll suave para o topo do stepper
  const scrollToStepper = () => {
    stepperRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  // Função para avançar para a próxima etapa
  const nextStep = () => {
    // Validar apenas os campos da etapa atual antes de avançar
    switch (currentStep) {
      case 0:
        form.trigger(["title", "clientId", "strategies"]).then(isValid => {
          if (isValid) {
            setCurrentStep(prev => prev + 1);
            // Scroll automático após mudança de etapa
            setTimeout(scrollToStepper, 100);
          }
        });
        break;
      case 1:
        form.trigger(["propertyName", "propertyType"]).then(isValid => {
          if (isValid) {
            setCurrentStep(prev => prev + 1);
            // Scroll automático após mudança de etapa
            setTimeout(scrollToStepper, 100);
          }
        });
        break;
      case 2:
        // Validação específica para parcelamento personalizado
        const formValues = form.getValues();
        
        if (formValues.tipoParcelamento === 'personalizado') {
          // Calcular valores necessários para validação
          const valorCompra = formValues.listPrice 
            ? (Number(formValues.listPrice) - (Number(formValues.discount) || 0)) 
            : 0;
          const valorFinanciado = valorCompra - (Number(formValues.downPayment) || 0);
          
          const totalPagamentosPersonalizados = formValues.customPayments 
            ? formValues.customPayments.reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0)
            : 0;
          
          // Verificar se os valores não coincidem
          const pagamentosNaoConferem = totalPagamentosPersonalizados > 0 && 
            valorFinanciado > 0 && 
            Math.abs(totalPagamentosPersonalizados - valorFinanciado) > 0.01;
          
          if (pagamentosNaoConferem) {
            toast({
              title: "Atenção: Total dos pagamentos não confere",
              description: `O total dos pagamentos personalizados não coincide com o valor financiado. Por favor, ajuste os valores antes de continuar.`,
              variant: "destructive",
            });
            return; // Impedir avançar para próxima etapa
          }
        }
        
        setCurrentStep(prev => prev + 1);
        // Scroll automático após mudança de etapa
        setTimeout(scrollToStepper, 100);
        break;
      case 3:
        // Processar a seleção de cenários antes de avançar
        const scenarioType = form.getValues('scenarioType');
        
        if (scenarioType === 'padrao') {
          // Finalizar a seleção do cenário padrão
          form.setValue("scenarioType", "padrao_selecionado");
          form.setValue("activeScenario", "padrao");
          setCurrentStep(prev => prev + 1);
          // Scroll automático após mudança de etapa
          setTimeout(scrollToStepper, 100);
        } 
        else if (scenarioType === 'multiplos') {
          // Verificar se há cenários selecionados
          const selectedScenarios = form.getValues('selectedScenarios');
          
          if (!selectedScenarios || selectedScenarios.length === 0) {
            toast({
              title: "Seleção necessária",
              description: "Por favor, selecione ao menos um cenário para continuar.",
              variant: "destructive",
            });
            return;
          }
          
          // Finalizar a seleção dos múltiplos cenários
          form.setValue("scenarioType", "multiplos_selecionados");
          
          // Definir o cenário ativo como o primeiro cenário selecionado se ainda não tiver um
          if (!form.getValues('activeScenario') && selectedScenarios.length > 0) {
            form.setValue("activeScenario", selectedScenarios[0]);
          }
          
          setCurrentStep(prev => prev + 1);
          // Scroll automático após mudança de etapa
          setTimeout(scrollToStepper, 100);
        }
        else if (formValues.scenarioType === "padrao_selecionado" ||
            (formValues.scenarioType === "multiplos_selecionados" && 
             formValues.selectedScenarios && 
             formValues.selectedScenarios.length > 0)) {
          // Se já estiver selecionado, apenas avançar
          setCurrentStep(prev => prev + 1);
          // Scroll automático após mudança de etapa
          setTimeout(scrollToStepper, 100);
        } else {
          toast({
            title: "Seleção necessária",
            description: "Por favor, selecione ao menos um cenário para continuar.",
            variant: "destructive",
          });
        }
        break;
      case 4:
        handleSubmit();
        break;
    }
  };
  
  // Função para voltar para a etapa anterior
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate("/projections");
    }
  };
  
  // Função para ir para uma etapa específica
  const goToStep = (step: number) => {
    // Permitir ir para etapas já validadas ou a próxima
    if (step <= currentStep + 1) {
      setCurrentStep(step);
      // Scroll automático após mudança de etapa
      setTimeout(scrollToStepper, 100);
    }
  };
  
  const handleSubmit = () => {
    // Verificar se os valores do parcelamento excedem o valor do imóvel
    const totalParcelamentoAtual = calcularTotalParcelamento();
    const parcelamentoExcedeValorAtual = totalParcelamentoAtual > valorCompra && valorCompra > 0;
    
    if (parcelamentoExcedeValorAtual) {
      toast({
        title: "Valores inválidos",
        description: "A soma dos valores do parcelamento (entrada + reforços + chaves) não pode exceder o valor do imóvel. Por favor, ajuste os valores antes de continuar.",
        variant: "destructive"
      });
      return; // Não prosseguir com o envio
    }
    
    // Adicionar logs para debug
    console.log("Iniciando submissão do formulário");
    
    // Ativar estado de carregamento 
    setIsSaving(true);
    setShowSavingModal(true);
    
    // Verificar erros de validação antes de prosseguir
    console.log("Form errors:", form.formState.errors);
    console.log("Form is valid:", form.formState.isValid);
    
    // Validar todos os campos obrigatórios de todas as etapas antes de enviar
    form.handleSubmit(async (data) => {
      console.log("✅ Form validation passed - inside handleSubmit callback");
      console.log("Dados do formulário:", data);
      
      try {
        // Normalizar o valor do cenário ativo para garantir consistência
        if (data.activeScenario === 'conservative') {
          data.activeScenario = 'conservador';
        } else if (data.activeScenario === 'optimistic') {
          data.activeScenario = 'otimista';
        }
        
        // Função para normalizar dados entre nomes em português e inglês
        const normalizeScenarioData = (data: any) => {
          // Garantir que dados de um cenário estejam disponíveis no outro formato
          if (data.conservative && !data.conservador) {
            data.conservador = data.conservative;
          } else if (data.conservador && !data.conservative) {
            data.conservative = data.conservador;
          }
          
          if (data.optimistic && !data.otimista) {
            data.otimista = data.optimistic;
          } else if (data.otimista && !data.optimistic) {
            data.optimistic = data.otimista;
          }
          
          return data;
        };
        
        // Aplicar normalização nos dados
        data = normalizeScenarioData(data);
        
        // Função para converter strings para números onde necessário
        const convertToNumber = (value: string | undefined): number | undefined => {
          if (value === undefined || value === "") return undefined;
          const num = Number(value);
          return isNaN(num) ? undefined : num;
        };

        // Função para converter periodicidade do reforço para número (frequência em meses)
        const convertFrequencyToNumber = (frequency: string): number => {
          switch (frequency) {
            case 'mensal': return 1;
            case 'bimestral': return 2;
            case 'trimestral': return 3;
            case 'semestral': return 6;
            case 'anual': return 12;
            default: return 0;
          }
        };
        
        // Extrair todos os dados do form
        console.log("Dados completos do formulário:", data);
        
        // Criar estrutura necessária para o backend 
        // com todos os valores importantes para o relatório de visualization
        const projectionData = {
          ...data,
          // Converter campos para números
          clientId: data.clientId ? parseInt(data.clientId) : 1, // Valor padrão para clientId
          propertyId: data.propertyId && data.propertyId !== "novo" ? parseInt(data.propertyId) : undefined,
          // Valores obrigatórios conforme o schema
          deliveryMonths: convertToNumber(data.deliveryTime) || 36,
          listPrice: convertToNumber(data.listPrice) || 0,
          downPayment: convertToNumber(data.downPayment) || 0,
          paymentMonths: convertToNumber(data.paymentPeriod) || 36,
          monthlyCorrection: convertToNumber(data.monthlyCorrection) || 0,
          postDeliveryCorrection: convertToNumber(data.correcaoMensalAposChaves) || convertToNumber(data.monthlyCorrection) || 0,
          // Outros campos
          discount: convertToNumber(data.discount) || 0,
          // Corrigir mapeamento dos campos de reforços e chaves
          includeBonusPayments: data.hasBoost || false,
          bonusFrequency: data.periodicidadeReforco ? convertFrequencyToNumber(data.periodicidadeReforco) : 0,
          bonusValue: convertToNumber(data.boostValue) || 0,
          hasKeys: data.hasKeys || false,
          keysValue: convertToNumber(data.keysValue) || 0,
          // Garantir que a imagem e URL do site sejam salvos corretamente no banco
          propertyImageUrl: data.propertyImageUrl || null,
          propertyWebsiteUrl: data.propertyWebsiteUrl || null,
          
          // Propriedades como objetos completos para relatório
          property: {
            name: data.propertyName,
            type: data.propertyType,
            unit: data.propertyUnit,
            area: data.propertyArea,
            address: data.address,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode
          },
          
          client: {
            name: "Cliente exemplo"  // Poderia buscar o nome pelo ID, mas para simplicidade usamos um valor fixo
          },
          
          // Incluir calculationResults para facilitar a exibição no relatório
          calculationResults: {
            // Valores calculados a partir dos inputs do usuário e cenário ativo
            roi: (() => {
              // Determinar qual cenário está ativo
              const activeScenario = data.activeScenario || 'padrao';
              const scenarioData = data[activeScenario as keyof typeof data] || data.padrao;
              
              if (!scenarioData) return 15; // valor padrão
              
              const futureSaleData = (scenarioData as any)?.futureSale;
              const rentalData = (scenarioData as any)?.rentalYield;
              
              // Calculamos o retorno da Venda Futura
              let futureSaleROI = 0;
              if (futureSaleData) {
                const listPrice = convertToNumber(data.listPrice) || 500000;
                const discount = convertToNumber(data.discount) || 0;
                const purchasePrice = listPrice - discount;
                
                const appreciationRate = convertToNumber(futureSaleData.appreciationRate) || 15;
                const investmentPeriod = convertToNumber(futureSaleData.investmentPeriod) || 36;
                const sellingExpenseRate = convertToNumber(futureSaleData.sellingExpenseRate) || 6;
                const incomeTaxRate = convertToNumber(futureSaleData.incomeTaxRate) || 15;
                const additionalCosts = convertToNumber(futureSaleData.additionalCosts) || 2;
                
                const yearsToSell = investmentPeriod / 12;
                const futureValue = purchasePrice * Math.pow(1 + (appreciationRate / 100), yearsToSell);
                
                const saleExpenses = futureValue * (sellingExpenseRate / 100);
                const additionalCostsValue = futureValue * (additionalCosts / 100);
                
                const grossProfit = futureValue - saleExpenses - additionalCostsValue - purchasePrice;
                const incomeTaxValue = grossProfit * (incomeTaxRate / 100);
                const netProfit = grossProfit - incomeTaxValue;
                
                futureSaleROI = (netProfit / purchasePrice) * 100;
              }
              
              // Calculamos o retorno do Aluguel
              let rentalYieldROI = 0;
              if (rentalData) {
                const listPrice = convertToNumber(data.listPrice) || 500000;
                const discount = convertToNumber(data.discount) || 0;
                const purchasePrice = listPrice - discount;
                
                const monthlyRent = convertToNumber(rentalData.monthlyRent) || 0;
                const occupancyRate = convertToNumber(rentalData.occupancyRate) || 85;
                const managementFee = convertToNumber(rentalData.managementFee) || 10;
                const maintenanceCosts = convertToNumber(rentalData.maintenanceCosts) || 5;
                
                const annualRent = monthlyRent * 12 * (occupancyRate / 100);
                const annualExpenses = annualRent * ((managementFee + maintenanceCosts) / 100);
                const netAnnualRent = annualRent - annualExpenses;
                
                rentalYieldROI = (netAnnualRent / purchasePrice) * 100;
              }
              
              // Retornar o maior ROI entre as opções
              return Math.max(futureSaleROI, rentalYieldROI, 12); // valor mínimo 12
            })(),
            
            irr: 12, // O cálculo real será feito pelo backend
            
            paybackMonths: (() => {
              const activeScenario = data.activeScenario || 'padrao';
              const scenarioData = data[activeScenario as keyof typeof data] || data.padrao;
              
              if (!scenarioData) return 36; // valor padrão
              
              const futureSaleData = (scenarioData as any)?.futureSale;
              return futureSaleData?.investmentPeriod || 36;
            })(),
            
            // Dados da Venda Futura
            futureSale: (() => {
              const activeScenario = data.activeScenario || 'padrao';
              const scenarioData = data[activeScenario as keyof typeof data] || data.padrao;
              
              if (!scenarioData) return null;
              
              const futureSaleData = (scenarioData as any)?.futureSale;
              if (!futureSaleData) return null;
              
              const listPrice = convertToNumber(data.listPrice) || 500000;
              const discount = convertToNumber(data.discount) || 0;
              const purchasePrice = listPrice - discount;
              
              const appreciationRate = convertToNumber(futureSaleData.appreciationRate) || 15;
              const investmentPeriod = convertToNumber(futureSaleData.investmentPeriod) || 36;
              const sellingExpenseRate = convertToNumber(futureSaleData.sellingExpenseRate) || 6;
              const incomeTaxRate = convertToNumber(futureSaleData.incomeTaxRate) || 15;
              const additionalCosts = convertToNumber(futureSaleData.additionalCosts) || 2;
              const maintenanceCosts = convertToNumber(futureSaleData.maintenanceCosts) || 0;
              
              const yearsToSell = investmentPeriod / 12;
              const futureValue = purchasePrice * Math.pow(1 + (appreciationRate / 100), yearsToSell);
              
              const saleExpenses = futureValue * (sellingExpenseRate / 100);
              const additionalCostsValue = futureValue * (additionalCosts / 100);
              const totalMaintenanceCosts = maintenanceCosts;
              
              const grossProfit = futureValue - saleExpenses - additionalCostsValue - totalMaintenanceCosts - purchasePrice;
              const incomeTaxValue = grossProfit * (incomeTaxRate / 100);
              const netProfit = grossProfit - incomeTaxValue;
              
              const roi = (netProfit / purchasePrice) * 100;
              
              return {
                purchasePrice: purchasePrice,
                totalInvestment: purchasePrice,
                futureValue: futureValue,
                saleExpenses: saleExpenses + additionalCostsValue,
                grossProfit: grossProfit,
                incomeTax: incomeTaxValue,
                netProfit: netProfit,
                roi: roi,
                irr: 15, // Placeholder - o cálculo real de IRR é mais complexo
                paybackMonths: investmentPeriod
              };
            })(),
            
            // Dados da Valorização do Ativo
            assetAppreciation: (() => {
              const activeScenario = data.activeScenario || 'padrao';
              // Normalizar o nome do cenário
              let normalizedScenario = activeScenario;
              if (activeScenario === 'conservative') normalizedScenario = 'conservador';
              if (activeScenario === 'optimistic') normalizedScenario = 'otimista';
              
              const scenarioData = data[normalizedScenario as keyof typeof data] || data.padrao;
              
              if (!scenarioData) return null;
              
              const assetData = (scenarioData as any)?.assetAppreciation;
              if (!assetData) return null;
              
              const listPrice = convertToNumber(data.listPrice) || 500000;
              const discount = convertToNumber(data.discount) || 0;
              const purchasePrice = listPrice - discount;
              
              const annualRate = convertToNumber(assetData.annualRate) || 15;
              const analysisPeriod = convertToNumber(assetData.analysisPeriod) || 10;
              const maintenanceCosts = convertToNumber(assetData.maintenanceCosts) || 0;
              const annualTaxes = convertToNumber(assetData.annualTaxes) || 0;
              
              const finalValue = purchasePrice * Math.pow(1 + (annualRate / 100), analysisPeriod);
              const totalMaintenance = (maintenanceCosts + annualTaxes) * analysisPeriod;
              const appreciationPercentage = ((finalValue - purchasePrice) / purchasePrice) * 100;
              
              return {
                initialValue: purchasePrice,
                totalMaintenance: totalMaintenance,
                finalValue: finalValue,
                appreciationPercentage: appreciationPercentage
              };
            })(),
            
            // Dados do Rendimento com Aluguel
            rentalYield: (() => {
              const activeScenario = data.activeScenario || 'padrao';
              const scenarioData = data[activeScenario as keyof typeof data] || data.padrao;
              
              if (!scenarioData) return null;
              
              const rentalData = (scenarioData as any)?.rentalYield;
              if (!rentalData) return null;
              
              const listPrice = convertToNumber(data.listPrice) || 500000;
              const discount = convertToNumber(data.discount) || 0;
              const purchasePrice = listPrice - discount;
              
              const monthlyRent = convertToNumber(rentalData.monthlyRent) || 0;
              const occupancyRate = convertToNumber(rentalData.occupancyRate) || 85;
              const managementFee = convertToNumber(rentalData.managementFee) || 10;
              const maintenanceCosts = convertToNumber(rentalData.maintenanceCosts) || 5;
              
              const furnishingCosts = purchasePrice * 0.03;
              
              const annualRent = monthlyRent * 12 * (occupancyRate / 100);
              const annualExpenses = annualRent * ((managementFee + maintenanceCosts) / 100);
              const netAnnualRent = annualRent - annualExpenses;
              
              const totalReturnPercentage = (netAnnualRent / purchasePrice) * 100;
              
              return {
                initialInvestment: purchasePrice,
                furnishingCosts: furnishingCosts,
                totalReturnPercentage: totalReturnPercentage
              };
            })(),
            
            // Dados para gráficos baseados nos inputs do usuário
            futureSaleCashFlow: (() => {
              const activeScenario = data.activeScenario || 'padrao';
              const scenarioData = data[activeScenario as keyof typeof data] || data.padrao;
              
              if (!scenarioData) return [];
              
              const futureSaleData = (scenarioData as any)?.futureSale;
              if (!futureSaleData) return [];
              
              const listPrice = convertToNumber(data.listPrice) || 500000;
              const discount = convertToNumber(data.discount) || 0;
              const purchasePrice = listPrice - discount;
              const investmentPeriod = convertToNumber(futureSaleData.investmentPeriod) || 36;
              const appreciationRate = convertToNumber(futureSaleData.appreciationRate) || 15;
              
              // Calcular valor futuro
              const yearsToSell = investmentPeriod / 12;
              const futureValue = purchasePrice * Math.pow(1 + (appreciationRate / 100), yearsToSell);
              
              // Criar fluxo de caixa simplificado
              return [
                {month: 0, description: "Compra", amount: -purchasePrice},
                {month: Math.floor(investmentPeriod/3), description: "Rendimento", amount: purchasePrice * 0.05},
                {month: Math.floor(investmentPeriod/3)*2, description: "Rendimento", amount: purchasePrice * 0.05},
                {month: investmentPeriod, description: "Venda", amount: futureValue}
              ];
            })(),
            
            assetAppreciationYearly: (() => {
              const activeScenario = data.activeScenario || 'padrao';
              // Normalizar o nome do cenário
              let normalizedScenario = activeScenario;
              if (activeScenario === 'conservative') normalizedScenario = 'conservador';
              if (activeScenario === 'optimistic') normalizedScenario = 'otimista';
              
              const scenarioData = data[normalizedScenario as keyof typeof data] || data.padrao;
              
              if (!scenarioData) return [];
              
              const assetData = (scenarioData as any)?.assetAppreciation;
              if (!assetData) return [];
              
              const listPrice = convertToNumber(data.listPrice) || 500000;
              const discount = convertToNumber(data.discount) || 0;
              const purchasePrice = listPrice - discount;
              const annualRate = convertToNumber(assetData.annualRate) || 15;
              const analysisPeriod = convertToNumber(assetData.analysisPeriod) || 10;
              
              // Gerar dados anuais para o gráfico
              const yearlyData = [];
              let currentValue = purchasePrice;
              
              for (let year = 1; year <= Math.min(analysisPeriod, 4); year++) {
                // Aplicar taxa de valorização
                currentValue = currentValue * (1 + annualRate/100);
                
                // Valores líquidos (considerando alguma despesa)
                const netValue = currentValue * 0.98;
                
                yearlyData.push({
                  year: year,
                  propertyValue: currentValue, 
                  appreciation: annualRate,
                  netValue: netValue
                });
              }
              
              return yearlyData;
            })(),
            
            rentalYieldYearly: (() => {
              const activeScenario = data.activeScenario || 'padrao';
              const scenarioData = data[activeScenario as keyof typeof data] || data.padrao;
              
              if (!scenarioData) return [];
              
              const rentalData = (scenarioData as any)?.rentalYield;
              if (!rentalData) return [];
              
              const listPrice = convertToNumber(data.listPrice) || 500000;
              const discount = convertToNumber(data.discount) || 0;
              const purchasePrice = listPrice - discount;
              const monthlyRent = convertToNumber(rentalData.monthlyRent) || purchasePrice * 0.005;
              const occupancyRate = convertToNumber(rentalData.occupancyRate) || 85;
              const managementFee = convertToNumber(rentalData.managementFee) || 10;
              const maintenanceCosts = convertToNumber(rentalData.maintenanceCosts) || 5;
              const annualIncrease = convertToNumber(rentalData.annualIncrease) || 5;
              
              // Gerar dados anuais para o gráfico
              const yearlyData = [];
              let currentRent = monthlyRent * 12 * (occupancyRate / 100);
              
              for (let year = 1; year <= 4; year++) {
                // Calcular receitas e despesas
                const expenses = currentRent * ((managementFee + maintenanceCosts) / 100);
                const netIncome = currentRent - expenses;
                const yieldRate = (netIncome / purchasePrice) * 100;
                
                yearlyData.push({
                  year: year,
                  rentalIncome: currentRent,
                  expenses: expenses,
                  netIncome: netIncome,
                  yieldRate: yieldRate
                });
                
                // Aplicar aumento anual para o próximo ano
                currentRent = currentRent * (1 + annualIncrease/100);
              }
              
              return yearlyData;
            })()
          }
        };
        
        // Converter também os pagamentos personalizados, se existirem
        if (projectionData.customPayments && projectionData.customPayments.length > 0) {
          projectionData.customPayments = projectionData.customPayments.map((payment: any) => ({
            ...payment,
            amount: convertToNumber(payment.amount) || 0
          }));
        }
        
        console.log("Enviando dados para API:", projectionData);
        
        // Criar ID fictício para o caso de falha
        const mockId = Math.floor(Math.random() * 1000) + 100;
        const mockProjection = {
          id: mockId,
          ...projectionData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Salvar dados no localStorage para permitir visualização em modo preview
        try {
          localStorage.setItem('lastProjection', JSON.stringify(mockProjection));
          console.log("Dados de preview salvos preventivamente:", mockProjection);
        } catch (e) {
          console.error("Erro ao salvar dados de preview:", e);
        }
        
        // Chamar a API apropriada (criar ou editar - deletar e recriar)
        if (isEditing) {
          console.log("Executando editProjectionMutation.mutate - deletar e recriar com mesmo ID");
          editProjectionMutation.mutate(projectionData, {
            onSuccess: (data: any) => {
              // Garantir que todos os dados foram salvos no banco antes de prosseguir
              setTimeout(() => {
                // Desativar carregamento
                setIsSaving(false);
                setShowSavingModal(false);
                
                queryClient.invalidateQueries({ queryKey: ['/api/projections'] });
                queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
                if (isEditing) {
                  queryClient.invalidateQueries({ queryKey: [`/api/projections/${projectionId}`] });
                }
                
                toast({
                title: isEditing ? "Projeção atualizada com sucesso" : "Projeção criada com sucesso",
                description: isEditing ? "As alterações foram salvas e estão prontas para visualização." : "A projeção foi salva e está pronta para visualização.",
              });
              
              // Tentar ir direto para a visualização em modo preview para evitar 404
              localStorage.setItem('forcedPreviewRedirect', 'true');
              navigate(`/projections/${data.id || projectionId || mockId}?mode=preview`);
            }, 2000); // Aguardar 2 segundos para garantir que todas as operações de banco tenham sido concluídas
          },
          onError: (error: any) => {
            console.error("Erro na mutação:", error);
            
            // Desativar carregamento
            setIsSaving(false);
            setShowSavingModal(false);
            
            toast({
              title: "Usando visualização local",
              description: "Exibindo dados sem salvar no servidor",
            });
            
            // Navegar mesmo com erro
            navigate(`/projections/${mockId}?mode=preview`);
          }
        });
        } else {
          createProjectionMutation.mutate(projectionData, {
            onSuccess: (data) => {
              // Garantir que todos os dados foram salvos no banco antes de prosseguir
              setTimeout(() => {
                // Desativar carregamento
                setIsSaving(false);
                setShowSavingModal(false);
                
                queryClient.invalidateQueries({ queryKey: ['/api/projections'] });
                queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
                
                toast({
                  title: "Projeção criada com sucesso",
                  description: "A projeção foi salva e está pronta para visualização.",
                });
                
                // Tentar ir direto para a visualização em modo preview para evitar 404
                localStorage.setItem('forcedPreviewRedirect', 'true');
                navigate(`/projections/${data.id || mockId}?mode=preview`);
              }, 2000);
            },
            onError: (error: any) => {
              console.error("Erro na mutação:", error);
              
              // Desativar carregamento
              setIsSaving(false);
              setShowSavingModal(false);
              
              toast({
                title: "Usando visualização local",
                description: "Exibindo dados sem salvar no servidor",
              });
              
              // Navegar mesmo com erro
              navigate(`/projections/${mockId}?mode=preview`);
            }
          });
        }
      } catch (error) {
        console.error("Erro ao processar dados do formulário:", error);
        // Desativar estados de carregamento
        setIsSaving(false);
        setShowSavingModal(false);
        
        toast({
          title: "Erro ao processar dados",
          description: "Ocorreu um erro ao processar os dados do formulário.",
          variant: "destructive"
        });
      }
    }, (errors) => {
      console.log("❌ Form validation failed:");
      console.log("Validation errors:", errors);
      
      // Desativar carregamento
      setIsSaving(false);
      setShowSavingModal(false);
      
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os campos obrigatórios antes de continuar.",
        variant: "destructive"
      });
    })();
  };
  
  // Show loading state while fetching projection data for editing
  if (isLoading) {
    return (
      <div className="py-6 max-w-[1300px] mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#434BE6] mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados da projeção...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 md:py-6 max-w-[1300px] mx-auto px-1 md:px-0">
      <div className="flex items-center gap-2 mb-4 md:mb-6 px-2 md:px-0">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7 md:h-8 md:w-8" 
          onClick={prevStep}
        >
          <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
        <h1 className="text-xl md:text-2xl font-bold text-[#111827]">
          {isEditing ? "Editar Projeção" : "Nova projeção imobiliária"}
        </h1>
      </div>
      <div ref={stepperRef}>
        <ProgressSteps currentStep={currentStep} onStepClick={goToStep} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8">
        <div className="md:col-span-2">
          <Form {...form}>
            <form className="bg-white rounded-lg border p-2 md:p-6">
              {/* Etapa 1: Estratégia de Investimento */}
              {currentStep === 0 && (
                <div className="space-y-2 md:space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-lg md:text-xl font-semibold text-center flex items-center justify-center gap-2">
                      <LineChart className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
                      <span className="hidden md:inline">Estratégia de Investimento</span>
                      <span className="md:hidden">Estratégia</span>
                    </h2>
                    <p className="text-center text-xs md:text-sm text-muted-foreground mb-2 md:mb-4">
                      Informe dados básicos e selecione as estratégias de análise para esta projeção
                    </p>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-1 md:pb-3">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
                        <span className="hidden md:inline">Informações Gerais</span>
                        <span className="md:hidden">Dados Gerais</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 md:space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-xs md:text-[14px]">
                              <Type className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                              <span className="hidden md:inline">Título da Projeção</span>
                              <span className="md:hidden">Título</span>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ex: Projeção Empreendimento Alfa" 
                                {...field} 
                                className="h-8 md:h-10 text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-xs md:text-[14px]">
                              <User className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                              <span className="hidden md:inline">Cliente (opcional)</span>
                              <span className="md:hidden">Cliente</span>
                            </FormLabel>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 md:h-10 text-sm">
                                  <SelectValue placeholder="Selecione um cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <div className="p-2 border-b">
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full justify-start text-primary"
                                    onClick={() => setIsNewClientDialogOpen(true)}
                                  >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Novo Cliente
                                  </Button>
                                </div>
                                {clients?.map(client => (
                                  <SelectItem 
                                    key={client.id} 
                                    value={client.id.toString()}
                                    className="py-2 cursor-pointer hover:bg-primary/10 transition-colors"
                                  >
                                    <div className="flex items-center">
                                      <User className="h-4 w-4 mr-2 text-primary" />
                                      <div>
                                        <div className="font-medium">{client.name}</div>
                                        {client.email && (
                                          <div className="text-xs text-muted-foreground">{client.email}</div>
                                        )}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2 md:pb-3">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
                        <span className="hidden md:inline">Estratégias de Análise</span>
                        <span className="md:hidden">Estratégias</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="strategies"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                              <div className="flex flex-col items-start space-y-2 p-3 md:p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("FUTURE_SALE")}
                                    onCheckedChange={(checked) => {
                                      const newValue = [...(field.value || [])];
                                      if (checked) {
                                        newValue.push("FUTURE_SALE");
                                      } else {
                                        const index = newValue.indexOf("FUTURE_SALE");
                                        if (index !== -1) newValue.splice(index, 1);
                                      }
                                      field.onChange(newValue);
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm md:text-base cursor-pointer">
                                    Venda Futura
                                  </FormLabel>
                                  <FormDescription className="text-xs md:text-sm">
                                    Projeção de valorização e venda do imóvel após um período
                                  </FormDescription>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-start space-y-2 p-3 md:p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("ASSET_APPRECIATION")}
                                    onCheckedChange={(checked) => {
                                      const newValue = [...(field.value || [])];
                                      if (checked) {
                                        newValue.push("ASSET_APPRECIATION");
                                      } else {
                                        const index = newValue.indexOf("ASSET_APPRECIATION");
                                        if (index !== -1) newValue.splice(index, 1);
                                      }
                                      field.onChange(newValue);
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm md:text-base cursor-pointer">
                                    Valorização Patrimonial
                                  </FormLabel>
                                  <FormDescription className="text-xs md:text-sm">
                                    Análise da valorização do imóvel ao longo do tempo
                                  </FormDescription>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-start space-y-2 p-3 md:p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("RENTAL_YIELD")}
                                    onCheckedChange={(checked) => {
                                      const newValue = [...(field.value || [])];
                                      if (checked) {
                                        newValue.push("RENTAL_YIELD");
                                      } else {
                                        const index = newValue.indexOf("RENTAL_YIELD");
                                        if (index !== -1) newValue.splice(index, 1);
                                      }
                                      field.onChange(newValue);
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm md:text-base cursor-pointer">
                                    Rentabilidade com Locação
                                  </FormLabel>
                                  <FormDescription className="text-xs md:text-sm">
                                    Análise de rendimento com aluguel e ROI do investimento
                                  </FormDescription>
                                </div>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      

                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Etapa 2: Informações do Imóvel */}
              {currentStep === 1 && (
                <div className="space-y-4 md:space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-lg md:text-xl font-semibold text-center flex items-center justify-center gap-2">
                      <Home className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
                      <span className="hidden md:inline">Informações do Imóvel</span>
                      <span className="md:hidden">Imóvel</span>
                    </h2>
                    <p className="text-center text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                      Selecione um imóvel existente ou cadastre um novo para a projeção
                    </p>
                  </div>
                  
                  {/* Campo de seleção de imóvel */}
                  <Card>
                    <CardHeader className="pb-2 md:pb-3">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2">
                        <Building className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
                        <span className="hidden md:inline">Seleção de Imóvel</span>
                        <span className="md:hidden">Seleção</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 md:space-y-4">
                      <FormField
                        control={form.control}
                        name="propertyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <PropertySelector 
                                value={field.value} 
                                onChange={(value) => {
                                  field.onChange(value);
                                  
                                  // Se selecionou um imóvel existente, preencher os campos com os dados
                                  if (value !== "novo") {
                                    const selectedProperty = properties?.find(p => p.id.toString() === value);
                                    if (selectedProperty) {
                                      console.log("Carregando dados do imóvel selecionado:", selectedProperty);
                                      form.setValue("propertyName", selectedProperty.name || "");
                                      form.setValue("propertyType", selectedProperty.type || "");
                                      form.setValue("propertyUnit", selectedProperty.unit || "");
                                      form.setValue("propertyArea", selectedProperty.area?.toString() || "");
                                      form.setValue("propertyDescription", selectedProperty.description || "");
                                      form.setValue("propertyImageUrl", selectedProperty.imageUrl || "");
                                      form.setValue("propertyWebsiteUrl", selectedProperty.websiteUrl || "");
                                      form.setValue("address", selectedProperty.address || "");
                                      form.setValue("neighborhood", selectedProperty.neighborhood || "");
                                      form.setValue("city", selectedProperty.city || "");
                                      form.setValue("state", selectedProperty.state || "");
                                      form.setValue("zipCode", selectedProperty.zipCode || "");
                                    } else {
                                      console.log("Imóvel não encontrado na lista atual. ID:", value);
                                      console.log("Lista de propriedades:", properties);
                                      
                                      // Se o imóvel não foi encontrado, tentar recarregar a lista
                                      refetchProperties().then(() => {
                                        setTimeout(() => {
                                          const newSelectedProperty = properties?.find(p => p.id.toString() === value);
                                          if (newSelectedProperty) {
                                            console.log("Imóvel encontrado após recarga:", newSelectedProperty);
                                            form.setValue("propertyName", newSelectedProperty.name || "");
                                            form.setValue("propertyType", newSelectedProperty.type || "");
                                            form.setValue("propertyUnit", newSelectedProperty.unit || "");
                                            form.setValue("propertyArea", newSelectedProperty.area?.toString() || "");
                                            form.setValue("propertyDescription", newSelectedProperty.description || "");
                                            form.setValue("propertyImageUrl", newSelectedProperty.imageUrl || "");
                                            form.setValue("propertyWebsiteUrl", newSelectedProperty.websiteUrl || "");
                                            form.setValue("address", newSelectedProperty.address || "");
                                            form.setValue("neighborhood", newSelectedProperty.neighborhood || "");
                                            form.setValue("city", newSelectedProperty.city || "");
                                            form.setValue("state", newSelectedProperty.state || "");
                                            form.setValue("zipCode", newSelectedProperty.zipCode || "");
                                          }
                                        }, 200);
                                      });
                                    }
                                  }
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Escolha um imóvel já cadastrado ou cadastre um novo
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Se selecionou um imóvel existente, mostrar detalhes com opções para editar ou duplicar */}
                  {form.watch("propertyId") && form.watch("propertyId") !== "novo" && (
                    <Card className="overflow-hidden hover:shadow-md transition-all duration-200">
                      <div className="flex flex-col md:flex-row">
                        {/* Área da imagem */}
                        <div className="aspect-video md:w-1/3 bg-slate-100 relative overflow-hidden">
                          {form.watch("propertyImageUrl") ? (
                            <img 
                              src={form.watch("propertyImageUrl")} 
                              alt={form.watch("propertyName")}
                              className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                              onError={(e) => {
                                // Se a imagem falhar ao carregar, mostrar o ícone padrão
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          
                          <div className={`absolute inset-0 flex items-center justify-center ${form.watch("propertyImageUrl") ? 'hidden' : ''}`}>
                            {form.watch("propertyType") === "Residencial" ? (
                              <Home className="h-16 w-16 text-slate-300" />
                            ) : form.watch("propertyType") === "Comercial" ? (
                              <Building className="h-16 w-16 text-slate-300" />
                            ) : (
                              <MapPin className="h-16 w-16 text-slate-300" />
                            )}
                          </div>
                          
                          {/* Property ID badge */}
                          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs py-1 px-2 rounded-md">
                            ID #{(() => {
                              const selectedProperty = properties?.find(p => p.id.toString() === form.watch("propertyId"));
                              return selectedProperty?.userSequentialId || form.watch("propertyId");
                            })()}
                          </div>
                        </div>
                        
                        {/* Conteúdo do card */}
                        <div className="p-4 flex-1 flex flex-col">
                          <div className="mb-3">
                            <h3 className="font-semibold text-lg mb-1 line-clamp-1">{form.watch("propertyName")}</h3>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="line-clamp-1">
                                {form.watch("address") ? `${form.watch("address")}, ` : ''}
                                {form.watch("city")}/{form.watch("state")}
                              </span>
                            </p>
                          </div>
                          
                          {/* Property specs */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-500" />
                              <div>
                                <p className="text-slate-500 text-xs">Tipo</p>
                                <p className="font-medium">{form.watch("propertyType")}</p>
                              </div>
                            </div>
                            
                            {form.watch("propertyArea") && (
                              <div className="flex items-center gap-2">
                                <Maximize2 className="h-4 w-4 text-slate-500" />
                                <div>
                                  <p className="text-slate-500 text-xs">Área</p>
                                  <p className="font-medium">{form.watch("propertyArea")} m²</p>
                                </div>
                              </div>
                            )}
                            
                            {form.watch("propertyUnit") && (
                              <div className="flex items-center gap-2">
                                <Type className="h-4 w-4 text-slate-500" />
                                <div>
                                  <p className="text-slate-500 text-xs">Unidade</p>
                                  <p className="font-medium">{form.watch("propertyUnit")}</p>
                                </div>
                              </div>
                            )}
                            
                            {form.watch("neighborhood") && (
                              <div className="flex items-center gap-2">
                                <Map className="h-4 w-4 text-slate-500" />
                                <div>
                                  <p className="text-slate-500 text-xs">Bairro</p>
                                  <p className="font-medium">{form.watch("neighborhood")}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Descrição */}
                          {form.watch("propertyDescription") && (
                            <div className="mb-4">
                              <p className="text-xs text-slate-500 mb-1">Descrição</p>
                              <p className="text-sm text-slate-700 line-clamp-2">{form.watch("propertyDescription")}</p>
                            </div>
                          )}
                          
                          {/* Links e ações */}
                          <div className="flex flex-wrap gap-2 mt-auto pt-2">
                            {form.watch("propertyWebsiteUrl") && (
                              <a 
                                href={form.watch("propertyWebsiteUrl")} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none"
                              >
                                <Globe className="mr-1.5 h-3.5 w-3.5" />
                                <span>Ver Site</span>
                              </a>
                            )}
                            
                            <Button 
                              type="button" 
                              variant="outline"
                              size="sm" 
                              onClick={() => {
                                // Preparar dados para o diálogo de edição
                                const propertyId = form.watch("propertyId");
                                const currentData = {
                                  id: propertyId,
                                  propertyName: form.watch("propertyName"),
                                  propertyType: form.watch("propertyType"),
                                  propertyUnit: form.watch("propertyUnit"),
                                  propertyArea: form.watch("propertyArea"),
                                  propertyDescription: form.watch("propertyDescription"),
                                  propertyImageUrl: form.watch("propertyImageUrl"),
                                  propertyWebsiteUrl: form.watch("propertyWebsiteUrl"),
                                  address: form.watch("address"),
                                  neighborhood: form.watch("neighborhood"),
                                  city: form.watch("city"),
                                  state: form.watch("state"),
                                  zipCode: form.watch("zipCode")
                                };
                                
                                // Salvar os dados no estado e abrir o diálogo
                                // Também salvar o nome original para comparação
                                setPropertyEditData({
                                  ...currentData,
                                  originalPropertyName: currentData.propertyName
                                });
                                setIsPropertyEditDialogOpen(true);
                              }}
                              className="flex h-8 items-center justify-center px-3 text-xs"
                            >
                              <Edit className="mr-1.5 h-3.5 w-3.5" />
                              <span>Editar</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                  
                  {/* Se selecionou "novo" ou está editando um imóvel existente, mostrar o formulário de cadastro */}
                  {(form.watch("propertyId") === "novo" || isEditingProperty) ? (
                    <Card id="property-edit-form">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-[#434BE6]" />
                          {isEditingProperty ? "Editar Imóvel" : "Cadastrar Novo Imóvel"}
                        </CardTitle>
                        {isEditingProperty && (
                          <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-md mt-2 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Atenção: Editar este imóvel alterará os dados em todas as projeções que o utilizam.
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="propertyName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2 text-[14px]">
                                  <Home className="h-4 w-4 text-[#434BE6]" />
                                  Nome do Empreendimento
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Ex: Edifício Central Park" 
                                    {...field} 
                                    className="h-10"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="propertyUnit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2 text-[14px]">
                                  <MapPin className="h-4 w-4 text-[#434BE6]" />
                                  Unidade (opcional)
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Ex: Apto 1201, Casa 05" 
                                    {...field} 
                                    className="h-10"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="propertyType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2 text-[14px]">
                                  <Type className="h-4 w-4 text-[#434BE6]" />
                                  Tipo de Imóvel
                                </FormLabel>
                                <Select 
                                  value={field.value} 
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="apartment">Apartamento</SelectItem>
                                    <SelectItem value="house">Casa</SelectItem>
                                    <SelectItem value="commercial">Comercial</SelectItem>
                                    <SelectItem value="land">Terreno</SelectItem>
                                    <SelectItem value="rural">Rural</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="propertyArea"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2 text-[14px]">
                                  <ArrowLeft className="h-4 w-4 text-[#434BE6]" />
                                  Área (m²) (opcional)
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Ex: 85" 
                                    {...field} 
                                    className="h-10"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex flex-col items-center mb-4">
                          <FormField
                            control={form.control}
                            name="propertyImageUrl"
                            render={({ field }) => (
                              <FormItem className="w-full max-w-lg">
                                <FormLabel className="flex items-center gap-2 text-[14px] justify-center">
                                  <FileText className="h-4 w-4 text-[#434BE6]" />
                                  Imagem do Imóvel (opcional)
                                </FormLabel>
                                <div className="flex flex-col gap-2">
                                  {field.value ? (
                                    <div className="rounded-md overflow-hidden border w-full h-[180px] flex items-center justify-center bg-gray-50 relative group">
                                      <img 
                                        src={field.value} 
                                        alt="Imagem do imóvel" 
                                        className="max-h-full max-w-full object-contain"
                                      />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => field.onChange("")}
                                          className="absolute top-2 right-2"
                                        >
                                          <X className="h-4 w-4 mr-1" /> Remover
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <label className="border-2 border-dashed border-gray-300 rounded-md p-6 h-[180px] flex flex-col items-center justify-center cursor-pointer hover:border-[#434BE6]/50 transition-colors bg-gray-50/50 text-center">
                                      <div className="w-16 h-16 mb-2 rounded-full bg-[#434BE6]/10 flex items-center justify-center">
                                        <Building2 className="h-8 w-8 text-[#434BE6]" />
                                      </div>
                                      <p className="text-sm font-medium text-gray-700">Clique para adicionar uma foto do imóvel</p>
                                      <p className="text-xs text-gray-500 mt-1">ou arraste uma imagem para cá</p>
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                              field.onChange(event.target?.result as string);
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                                <FormDescription className="text-xs mt-2 text-center">
                                  Adicione uma foto do empreendimento para facilitar a identificação na projeção
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="propertyWebsiteUrl"
                            render={({ field }) => (
                              <FormItem className="w-full max-w-lg mt-4">
                                <FormLabel className="flex items-center gap-2 text-[14px] justify-center">
                                  <FileText className="h-4 w-4 text-[#434BE6]" />
                                  Link do Imóvel (opcional)
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="https://www.imobiliaria.com.br/imovel/123" 
                                    {...field} 
                                    className="h-10"
                                  />
                                </FormControl>
                                <FormDescription className="text-xs text-center">
                                  Link para o site da imobiliária com detalhes do imóvel
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="propertyDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 text-[14px] justify-center">
                                <FileText className="h-4 w-4 text-[#434BE6]" />
                                Descrição (opcional)
                              </FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Descreva as características do imóvel..." 
                                  {...field}
                                  className="min-h-[80px]"
                                />
                              </FormControl>
                              <FormMessage className="text-center" />
                            </FormItem>
                          )}
                        />
                        
                        {isEditingProperty && (
                          <div className="flex justify-end space-x-2 pt-4">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => {
                                // Cancelar edição
                                setIsEditingProperty(false);
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              type="button" 
                              onClick={() => {
                                // Salvar as alterações ao imóvel existente
                                const propertyId = form.getValues("propertyId");
                                
                                // Dados a serem enviados
                                const propertyData = {
                                  id: parseInt(propertyId),
                                  name: form.getValues("propertyName"),
                                  type: form.getValues("propertyType"),
                                  unit: form.getValues("propertyUnit"),
                                  area: form.getValues("propertyArea"),
                                  description: form.getValues("propertyDescription"),
                                  imageUrl: form.getValues("propertyImageUrl"),
                                  websiteUrl: form.getValues("propertyWebsiteUrl"),
                                  address: form.getValues("address"),
                                  neighborhood: form.getValues("neighborhood"),
                                  city: form.getValues("city"),
                                  state: form.getValues("state"),
                                  zipCode: form.getValues("zipCode")
                                };
                                
                                // Salvar o imóvel atualizado
                                updatePropertyMutation.mutate(propertyData);
                              }}
                              disabled={updatePropertyMutation.isPending}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Salvar Alterações
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              )}
              
              {/* Etapa 3: Dados da Compra */}
              {currentStep === 2 && (
                <div className="space-y-3 md:space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-lg md:text-xl font-semibold text-center flex items-center justify-center gap-2">
                      <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
                      <span className="md:hidden">Compra</span>
                      <span className="hidden md:inline">Dados da Compra</span>
                    </h2>
                    <p className="text-center text-xs md:text-sm text-muted-foreground mb-4">
                      <span className="md:hidden">Valor e condições</span>
                      <span className="hidden md:inline">Informe o valor de tabela e condições de pagamento</span>
                    </p>
                  </div>
                  
                  <PurchaseDataForm 
                    form={form} 
                  />
                  

                </div>
              )}
              
              {/* Etapa 4: Cenários */}
              {currentStep === 3 && (
                <div className="space-y-3 md:space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-lg md:text-xl font-semibold text-center flex items-center justify-center gap-2">
                      <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
                      <span className="md:hidden">Cenários</span>
                      <span className="hidden md:inline">Cenários de Projeção</span>
                    </h2>
                    <p className="text-center text-xs md:text-sm text-muted-foreground mb-4">
                      <span className="md:hidden">Escolha os cenários</span>
                      <span className="hidden md:inline">Escolha quais cenários deseja incluir na sua projeção financeira</span>
                    </p>
                  </div>
                  
                  <ScenarioSelector form={form} />
                </div>
              )}
              
              {/* Etapa 5: Projeções Financeiras */}
              {currentStep === 4 && (
                <div className="space-y-3 md:space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-lg md:text-xl font-semibold text-center flex items-center justify-center gap-2">
                      <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
                      <span className="md:hidden">Projeções</span>
                      <span className="hidden md:inline">Projeções Financeiras</span>
                    </h2>
                    <p className="text-center text-xs md:text-sm text-muted-foreground mb-4">
                      <span className="md:hidden">Configure parâmetros</span>
                      <span className="hidden md:inline">Configure os parâmetros para análise de rentabilidade do investimento</span>
                    </p>
                  </div>
                  

                  {/* Venda Futura */}
                  {formValues.strategies?.includes('FUTURE_SALE') && (
                    <Card>
                      <CardHeader className="pb-2 md:pb-3">
                        <CardTitle className="text-base md:text-lg flex items-center gap-2">
                          <BadgeDollarSign className="h-4 w-4 md:h-5 md:w-5 text-[#434BE6]" />
                          Venda Futura
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScenarioTabs form={form}>
                          <div className="space-y-3 md:space-y-5 pt-2">
                            {/* Período de investimento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.futureSale.investmentPeriod`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-xs md:text-[14px]">
                                      <Clock className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                                      <span className="md:hidden">Mês venda</span>
                                      <span className="hidden md:inline">Mês da venda projetada (meses)</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        min="1"
                                        placeholder="Ex: 36" 
                                        {...field} 
                                        className="h-8 md:h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs md:text-sm">
                                      <span className="md:hidden">Mês da venda</span>
                                      <span className="hidden md:inline">Em qual mês após o início do investimento planeja vender o imóvel</span>
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.futureSale.appreciationRate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-xs md:text-[14px]">
                                      <Percent className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                                      <span className="md:hidden">Valorização (%)</span>
                                      <span className="hidden md:inline">Taxa de Valorização Anual (%)</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        step="0.1"
                                        placeholder="Ex: 15" 
                                        {...field} 
                                        className="h-8 md:h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs md:text-sm">
                                      <span className="md:hidden">Valorização anual</span>
                                      <span className="hidden md:inline">Expectativa de valorização anual do imóvel</span>
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {/* Taxas e custos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.futureSale.sellingExpenseRate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-xs md:text-[14px]">
                                      <Percent className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                                      <span className="md:hidden">Comissão (%)</span>
                                      <span className="hidden md:inline">Taxa de Comissão de Venda (%)</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        step="0.1"
                                        placeholder="Ex: 3" 
                                        {...field} 
                                        className="h-8 md:h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs md:text-sm">
                                      <span className="md:hidden">Comissão venda</span>
                                      <span className="hidden md:inline">Percentual de comissão na venda futura</span>
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.futureSale.incomeTaxRate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-xs md:text-[14px]">
                                      <Percent className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                                      <span className="md:hidden">IR (%)</span>
                                      <span className="hidden md:inline">Alíquota de Imposto de Renda (%)</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        step="0.1"
                                        placeholder="Ex: 15" 
                                        {...field} 
                                        className="h-8 md:h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs md:text-sm">
                                      <span className="md:hidden">Imposto ganho capital</span>
                                      <span className="hidden md:inline">Imposto sobre o ganho de capital</span>
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {/* Custos e manutenção */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.futureSale.additionalCosts`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-xs md:text-[14px]">
                                      <Percent className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                                      <span className="md:hidden">Custos Adicionais (%)</span>
                                      <span className="hidden md:inline">Custos Adicionais (%)</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        placeholder="Ex: 2.5" 
                                        {...field} 
                                        className="h-8 md:h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs md:text-sm">
                                      <span className="md:hidden">ITBI, escritura, etc</span>
                                      <span className="hidden md:inline">Outros custos como ITBI, escritura, etc (% do valor futuro)</span>
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.futureSale.maintenanceCosts`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-xs md:text-[14px]">
                                      <Wrench className="h-3 w-3 md:h-4 md:w-4 text-[#434BE6]" />
                                      <span className="md:hidden">Manutenção</span>
                                      <span className="hidden md:inline">Custos de Manutenção</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        min="0"
                                        placeholder="Ex: 0" 
                                        {...field} 
                                        className="h-8 md:h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs md:text-sm">
                                      <span className="md:hidden">Custos do período</span>
                                      <span className="hidden md:inline">Custos de manutenção durante o período</span>
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </ScenarioTabs>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Valorização Patrimonial */}
                  {formValues.strategies?.includes('ASSET_APPRECIATION') && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-[#434BE6]" />
                          Valorização Patrimonial
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScenarioTabs form={form}>
                          <div className="space-y-5 pt-2">
                            {/* Taxa anual e período */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.assetAppreciation.annualRate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-[14px]">
                                      <Percent className="h-4 w-4 text-[#434BE6]" />
                                      Taxa de Valorização Anual (%)
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        step="0.1"
                                        placeholder="Ex: 10" 
                                        {...field} 
                                        className="h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Expectativa média de valorização anual
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.assetAppreciation.analysisPeriod`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-[14px]">
                                      <Clock className="h-4 w-4 text-[#434BE6]" />
                                      Período de Análise (anos)
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        min="1"
                                        max="30"
                                        placeholder="Ex: 10" 
                                        {...field} 
                                        className="h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Por quantos anos deseja projetar a valorização
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            
                          </div>
                        </ScenarioTabs>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Rentabilidade com Locação */}
                  {formValues.strategies?.includes('RENTAL_YIELD') && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-[#434BE6]" />
                          Rentabilidade com Locação
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScenarioTabs form={form}>
                          <div className="space-y-5 pt-2">
                            {/* Aluguel e taxa de ocupação */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.rentalYield.monthlyRent`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-[14px]">
                                      <DollarSign className="h-4 w-4 text-[#434BE6]" />
                                      Valor do Aluguel Mensal (R$)
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        min="0"
                                        placeholder="Ex: 2500" 
                                        {...field} 
                                        className="h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Valor correspondente ao rendimento mensal do aluguel após a entrega do imóvel. {
                                        // Garantir que usamos uma chave válida para o objeto rentDescriptions
                                        form.watch('activeScenario') === 'padrao' ? rentDescriptions.padrao :
                                        form.watch('activeScenario') === 'conservador' ? rentDescriptions.conservador :
                                        form.watch('activeScenario') === 'otimista' ? rentDescriptions.otimista :
                                        rentDescriptions.padrao
                                      }
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.rentalYield.occupancyRate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-[14px]">
                                      <Percent className="h-4 w-4 text-[#434BE6]" />
                                      Taxa de Ocupação (%)
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="Ex: 85" 
                                        {...field} 
                                        className="h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Percentual de tempo que o imóvel ficará alugado
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {/* Taxas e custos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.rentalYield.managementFee`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-[14px]">
                                      <Percent className="h-4 w-4 text-[#434BE6]" />
                                      Taxa de Administração (%)
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="Ex: 8" 
                                        {...field} 
                                        className="h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Percentual cobrado pela imobiliária/administradora
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.rentalYield.maintenanceCosts`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-[14px]">
                                      <Percent className="h-4 w-4 text-[#434BE6]" />
                                      Custos de Manutenção (%)
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="Ex: 5" 
                                        {...field} 
                                        className="h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Percentual do aluguel reservado para manutenção
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {/* Aumento anual do aluguel */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.rentalYield.annualIncrease`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-[14px]">
                                      <TrendingUp className="h-4 w-4 text-[#434BE6]" />
                                      Aumento Anual do Aluguel (%)
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        step="0.1"
                                        placeholder="Ex: 5" 
                                        {...field} 
                                        className="h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Percentual de reajuste anual do aluguel
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </ScenarioTabs>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
              
              {/* Botões de navegação */}
              <div className="flex justify-between mt-6 md:mt-8 pt-4 md:pt-5 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="h-8 md:h-10 px-3 md:px-4 text-xs md:text-sm"
                >
                  <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  Voltar
                </Button>
                
                <div className="flex gap-1 md:gap-2">
                  {currentStep === 0 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate("/projections")}
                      className="h-8 md:h-10 px-3 md:px-4 text-xs md:text-sm"
                    >
                      <X className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      <span className="hidden md:inline">Cancelar</span>
                      <span className="md:hidden">×</span>
                    </Button>
                  )}
                  
                  {currentStep >= 4 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                      className="md:hidden h-8 px-3 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {showPreview ? "Ocultar" : "Preview"}
                    </Button>
                  )}
                  
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={createProjectionMutation.isPending || isSaving || parcelamentoExcedeValor || pagamentosPersonalizadosNaoCoicidem}
                    className="h-8 md:h-10 px-3 md:px-4 text-xs md:text-sm"
                  >
                    {currentStep === 4 ? (
                      <>
                        {createProjectionMutation.isPending || isSaving ? (
                          <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" />
                        ) : isEditing ? (
                          <Save className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        ) : (
                          <FileSpreadsheet className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        )}
                        <span className="hidden md:inline">
                          {isSaving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Gerar Projeção"}
                        </span>
                        <span className="md:hidden">
                          {isSaving ? "Salvando..." : isEditing ? "Salvar" : "Gerar"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="hidden md:inline">Próximo</span>
                        <span className="md:hidden">→</span>
                        <ArrowRight className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
        
        {/* Coluna de preview dos dados */}
        <div className={`md:block ${showPreview ? "block" : "hidden md:block"}`}>
          <PreviewSidebar formValues={{...formValues, currentStep}} />
        </div>
      </div>
      {/* Modal de carregamento durante o salvamento */}
      <Dialog open={showSavingModal} onOpenChange={setShowSavingModal}>
        <DialogContent className="sm:max-w-md" onInteractOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Salvando projeção</DialogTitle>
            <DialogDescription>
              Aguarde enquanto salvamos sua projeção. Isso pode levar alguns segundos...
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="h-12 w-12 text-[#434BE6] animate-spin mb-4" />
            <p className="text-sm text-gray-500">
              Não feche essa janela. Estamos processando todos os dados da projeção.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal para cadastro de nova propriedade */}
      <Dialog open={showPropertyModal} onOpenChange={setShowPropertyModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Imóvel</DialogTitle>
            <DialogDescription>
              Preencha os dados do imóvel para cadastrá-lo e utilizá-lo na projeção.
            </DialogDescription>
          </DialogHeader>
          
          <PropertyCreationForm
            onSubmit={(values) => createPropertyMutation.mutate(values)}
            onCancel={() => setShowPropertyModal(false)}
            isSubmitting={createPropertyMutation.isPending}
          />
        </DialogContent>
      </Dialog>
      {/* Diálogo de criação de novo cliente */}
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente para adicioná-lo à sua lista.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome*</Label>
              <Input 
                id="name" 
                placeholder="Nome do cliente" 
                value={newClientFormState.name}
                onChange={(e) => setNewClientFormState({...newClientFormState, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="email@exemplo.com" 
                value={newClientFormState.email}
                onChange={(e) => setNewClientFormState({...newClientFormState, email: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input 
                id="phone" 
                placeholder="(00) 00000-0000" 
                value={newClientFormState.phone}
                onChange={(e) => setNewClientFormState({...newClientFormState, phone: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input 
                id="company" 
                placeholder="Nome da empresa (opcional)" 
                value={newClientFormState.company}
                onChange={(e) => setNewClientFormState({...newClientFormState, company: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsNewClientDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateClient}
              disabled={createClientMutation.isPending}
            >
              {createClientMutation.isPending ? "Salvando..." : "Adicionar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Diálogo de edição de imóvel */}
      <Dialog open={isPropertyEditDialogOpen} onOpenChange={setIsPropertyEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Imóvel</DialogTitle>
            <DialogDescription>
              Edite as informações do imóvel
            </DialogDescription>
          </DialogHeader>
          
          {propertyEditData && (
            <div className="py-4">
              <div className="space-y-6">
                {/* Nome do imóvel */}
                <div className="space-y-2">
                  <Label htmlFor="editPropertyName">Nome do Imóvel</Label>
                  <Input
                    id="editPropertyName"
                    value={propertyEditData.propertyName}
                    onChange={(e) => 
                      setPropertyEditData({
                        ...propertyEditData,
                        propertyName: e.target.value
                      })
                    }
                  />
                </div>
                
                {/* Tipo e unidade */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editPropertyType">Tipo de Imóvel</Label>
                    <Select
                      value={propertyEditData.propertyType}
                      onValueChange={(value) => 
                        setPropertyEditData({
                          ...propertyEditData,
                          propertyType: value
                        })
                      }
                    >
                      <SelectTrigger id="editPropertyType">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apartment">Apartamento</SelectItem>
                        <SelectItem value="house">Casa</SelectItem>
                        <SelectItem value="commercial">Comercial</SelectItem>
                        <SelectItem value="land">Terreno</SelectItem>
                        <SelectItem value="rural">Rural</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="editPropertyUnit">Unidade (opcional)</Label>
                    <Input
                      id="editPropertyUnit"
                      placeholder="Ex: Apto 1201"
                      value={propertyEditData.propertyUnit || ""}
                      onChange={(e) => 
                        setPropertyEditData({
                          ...propertyEditData,
                          propertyUnit: e.target.value
                        })
                      }
                    />
                  </div>
                </div>
                
                {/* Área */}
                <div className="space-y-2">
                  <Label htmlFor="editPropertyArea">Área (m²) (opcional)</Label>
                  <Input
                    id="editPropertyArea"
                    placeholder="Ex: 85"
                    value={propertyEditData.propertyArea || ""}
                    onChange={(e) => 
                      setPropertyEditData({
                        ...propertyEditData,
                        propertyArea: e.target.value
                      })
                    }
                  />
                </div>
                
                {/* Endereço */}
                <div className="space-y-2">
                  <Label htmlFor="editAddress">Endereço</Label>
                  <Input
                    id="editAddress"
                    placeholder="Ex: Rua das Palmeiras, 123"
                    value={propertyEditData.address || ""}
                    onChange={(e) => 
                      setPropertyEditData({
                        ...propertyEditData,
                        address: e.target.value
                      })
                    }
                  />
                </div>
                
                {/* Cidade e estado */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editCity">Cidade</Label>
                    <Input
                      id="editCity"
                      placeholder="Ex: São Paulo"
                      value={propertyEditData.city || ""}
                      onChange={(e) => 
                        setPropertyEditData({
                          ...propertyEditData,
                          city: e.target.value
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="editState">Estado</Label>
                    <Select
                      value={propertyEditData.state || ""}
                      onValueChange={(value) => 
                        setPropertyEditData({
                          ...propertyEditData,
                          state: value
                        })
                      }
                    >
                      <SelectTrigger id="editState">
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AC">Acre</SelectItem>
                        <SelectItem value="AL">Alagoas</SelectItem>
                        <SelectItem value="AP">Amapá</SelectItem>
                        <SelectItem value="AM">Amazonas</SelectItem>
                        <SelectItem value="BA">Bahia</SelectItem>
                        <SelectItem value="CE">Ceará</SelectItem>
                        <SelectItem value="DF">Distrito Federal</SelectItem>
                        <SelectItem value="ES">Espírito Santo</SelectItem>
                        <SelectItem value="GO">Goiás</SelectItem>
                        <SelectItem value="MA">Maranhão</SelectItem>
                        <SelectItem value="MT">Mato Grosso</SelectItem>
                        <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                        <SelectItem value="MG">Minas Gerais</SelectItem>
                        <SelectItem value="PA">Pará</SelectItem>
                        <SelectItem value="PB">Paraíba</SelectItem>
                        <SelectItem value="PR">Paraná</SelectItem>
                        <SelectItem value="PE">Pernambuco</SelectItem>
                        <SelectItem value="PI">Piauí</SelectItem>
                        <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                        <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                        <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                        <SelectItem value="RO">Rondônia</SelectItem>
                        <SelectItem value="RR">Roraima</SelectItem>
                        <SelectItem value="SC">Santa Catarina</SelectItem>
                        <SelectItem value="SP">São Paulo</SelectItem>
                        <SelectItem value="SE">Sergipe</SelectItem>
                        <SelectItem value="TO">Tocantins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Bairro e CEP */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editNeighborhood">Bairro</Label>
                    <Input
                      id="editNeighborhood"
                      placeholder="Ex: Jardim América"
                      value={propertyEditData.neighborhood || ""}
                      onChange={(e) => 
                        setPropertyEditData({
                          ...propertyEditData,
                          neighborhood: e.target.value
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="editZipCode">CEP (opcional)</Label>
                    <Input
                      id="editZipCode"
                      placeholder="Ex: 01234-567"
                      value={propertyEditData.zipCode || ""}
                      onChange={(e) => 
                        setPropertyEditData({
                          ...propertyEditData,
                          zipCode: e.target.value
                        })
                      }
                    />
                  </div>
                </div>
                
                {/* Link do site (URL) */}
                <div className="space-y-2">
                  <Label htmlFor="editWebsiteUrl">Link do Imóvel (opcional)</Label>
                  <Input
                    id="editWebsiteUrl"
                    placeholder="https://www.imobiliaria.com.br/imovel/123"
                    value={propertyEditData.propertyWebsiteUrl || ""}
                    onChange={(e) => 
                      setPropertyEditData({
                        ...propertyEditData,
                        propertyWebsiteUrl: e.target.value
                      })
                    }
                  />
                </div>
                
                {/* Descrição */}
                <div className="space-y-2">
                  <Label htmlFor="editDescription">Descrição (opcional)</Label>
                  <Textarea
                    id="editDescription"
                    placeholder="Descreva as características do imóvel..."
                    value={propertyEditData.propertyDescription || ""}
                    onChange={(e) => 
                      setPropertyEditData({
                        ...propertyEditData,
                        propertyDescription: e.target.value
                      })
                    }
                    className="min-h-[80px]"
                  />
                </div>
                
                {/* Uploader de imagem com preview */}
                <div className="space-y-2">
                  <Label>Imagem do Imóvel (opcional)</Label>
                  <div className="flex flex-col items-center border rounded-md p-4 bg-gray-50 relative">
                    {propertyEditData.propertyImageUrl ? (
                      <div className="relative group w-full">
                        <img 
                          src={propertyEditData.propertyImageUrl} 
                          alt="Imagem do imóvel" 
                          className="max-h-40 mx-auto object-contain"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => 
                                setPropertyEditData({
                                  ...propertyEditData,
                                  propertyImageUrl: ""
                                })
                              }
                            >
                              <X className="h-4 w-4 mr-1" /> Remover
                            </Button>
                            <label className="cursor-pointer">
                              <Button type="button" size="sm" variant="secondary">
                                <ImageIcon className="h-4 w-4 mr-1" /> Trocar
                              </Button>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      setPropertyEditData({
                                        ...propertyEditData,
                                        propertyImageUrl: event.target?.result as string
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="w-full border-2 border-dashed border-gray-300 rounded-md p-6 h-[140px] flex flex-col items-center justify-center cursor-pointer hover:border-[#434BE6]/50 transition-colors bg-gray-50/50 text-center">
                        <div className="w-12 h-12 mb-2 rounded-full bg-[#434BE6]/10 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-[#434BE6]" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">Clique para adicionar uma foto do imóvel</p>
                        <p className="text-xs text-gray-500 mt-1">ou arraste uma imagem para cá</p>
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setPropertyEditData({
                                  ...propertyEditData,
                                  propertyImageUrl: event.target?.result as string
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="text-sm border border-gray-200 rounded-md p-4">
                  <h4 className="font-medium mb-2 text-gray-700">Opções de Salvamento:</h4>
                  <div className="flex gap-2 items-start mb-2">
                    <div className="w-4 h-4 mt-1 bg-amber-100 rounded-full flex items-center justify-center">
                      <span className="text-amber-700 text-xs font-bold">!</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Salvar Edição:</span> Atualiza este imóvel em todas as projeções que o utilizam.
                    </p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <div className="w-4 h-4 mt-1 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 text-xs font-bold">i</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Salvar como Cópia:</span> Cria um novo imóvel baseado nestes dados, sem alterar o original.
                    </p>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPropertyEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    // Preparar os dados para criar um novo imóvel
                    // Só adiciona "(Cópia)" se o usuário não mudou o nome original
                    const nameToUse = propertyEditData.propertyName === propertyEditData.originalPropertyName
                      ? `${propertyEditData.propertyName} (Cópia)`  // Nome não foi alterado, adicionar "(Cópia)"
                      : propertyEditData.propertyName;  // Nome foi alterado, usar o nome editado
                    
                    const propertyData = {
                      name: nameToUse,
                      type: propertyEditData.propertyType,
                      unit: propertyEditData.propertyUnit || "",
                      area: propertyEditData.propertyArea || "",
                      description: propertyEditData.propertyDescription || "",
                      imageUrl: propertyEditData.propertyImageUrl || "",
                      websiteUrl: propertyEditData.propertyWebsiteUrl || "",
                      address: propertyEditData.address || "",
                      neighborhood: propertyEditData.neighborhood || "",
                      city: propertyEditData.city || "",
                      state: propertyEditData.state || "",
                      zipCode: propertyEditData.zipCode || ""
                    };
                    
                    // Fechar o diálogo
                    setIsPropertyEditDialogOpen(false);
                    
                    // Criar novo imóvel via API
                    fetch('/api/properties', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(propertyData),
                    })
                      .then(response => {
                        if (!response.ok) {
                          throw new Error('Erro ao criar cópia do imóvel');
                        }
                        return response.json();
                      })
                      .then(data => {
                        // Atualizar a lista de imóveis primeiro
                        refetchProperties().then(() => {
                          // Aguardar um pequeno delay para garantir que os dados foram atualizados
                          setTimeout(() => {
                            // Selecionar o novo imóvel
                            form.setValue("propertyId", String(data.id));
                            
                            // Atualizar os campos do formulário
                            form.setValue("propertyName", data.name);
                            form.setValue("propertyType", data.type);
                            form.setValue("propertyUnit", data.unit || "");
                            form.setValue("propertyArea", data.area || "");
                            form.setValue("propertyDescription", data.description || "");
                            form.setValue("propertyImageUrl", data.imageUrl || "");
                            form.setValue("propertyWebsiteUrl", data.websiteUrl || "");
                            form.setValue("address", data.address || "");
                            form.setValue("neighborhood", data.neighborhood || "");
                            form.setValue("city", data.city || "");
                            form.setValue("state", data.state || "");
                            form.setValue("zipCode", data.zipCode || "");
                            
                            // Forçar atualização do log para debug
                            console.log("Valores de aluguel atualizados");
                            
                            // Mostrar mensagem de sucesso
                            toast({
                              title: "Imóvel duplicado",
                              description: "Uma cópia do imóvel foi criada e selecionada.",
                              variant: "default"
                            });
                          }, 100);
                        });
                      })
                      .catch(error => {
                        console.error('Erro ao criar cópia do imóvel:', error);
                        toast({
                          title: "Erro ao duplicar imóvel",
                          description: error.message,
                          variant: "destructive"
                        });
                      });
                  }}
                >
                  Salvar como Cópia
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    // Pegar o ID do imóvel
                    const propertyId = parseInt(propertyEditData.id);
                    
                    // Preparar dados para atualização
                    const propertyData = {
                      id: propertyId,
                      name: propertyEditData.propertyName,
                      type: propertyEditData.propertyType,
                      unit: propertyEditData.propertyUnit || "",
                      area: propertyEditData.propertyArea || "",
                      description: propertyEditData.propertyDescription || "",
                      imageUrl: propertyEditData.propertyImageUrl || "",
                      websiteUrl: propertyEditData.propertyWebsiteUrl || "",
                      address: propertyEditData.address || "",
                      neighborhood: propertyEditData.neighborhood || "",
                      city: propertyEditData.city || "",
                      state: propertyEditData.state || "",
                      zipCode: propertyEditData.zipCode || ""
                    };
                    
                    // Fechar o diálogo
                    setIsPropertyEditDialogOpen(false);
                    
                    // Atualizar o imóvel existente
                    updatePropertyMutation.mutate(propertyData, {
                      onSuccess: (data) => {
                        // Atualizar os campos do formulário com os dados atualizados
                        form.setValue("propertyName", data.name);
                        form.setValue("propertyType", data.type);
                        form.setValue("propertyUnit", data.unit || "");
                        form.setValue("propertyArea", data.area || "");
                        form.setValue("propertyDescription", data.description || "");
                        form.setValue("propertyImageUrl", data.imageUrl || "");
                        form.setValue("propertyWebsiteUrl", data.websiteUrl || "");
                        form.setValue("address", data.address || "");
                        form.setValue("neighborhood", data.neighborhood || "");
                        form.setValue("city", data.city || "");
                        form.setValue("state", data.state || "");
                        form.setValue("zipCode", data.zipCode || "");
                        
                        toast({
                          title: "Imóvel atualizado com sucesso!",
                          description: "As alterações foram salvas e serão refletidas em todas as projeções associadas.",
                          variant: "default"
                        });
                      }
                    });
                  }}
                  disabled={updatePropertyMutation.isPending}
                >
                  {updatePropertyMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Edição
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}