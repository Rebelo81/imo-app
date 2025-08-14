import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import {
  Home,
  MapPin,
  LineChart,
  DollarSign,
  TrendingUp,
  ArrowLeft,
  Save,
  Check,
  X,
  Percent,
  CreditCard,
  Calendar,
  FileText,
  User,
  Type,
  Wrench,
  Receipt,
  Clock,
  BadgeDollarSign,
  Pen,
  Building2,
  FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  activeScenario: z.string().default("realistic"),
  
  // Etapa 2: Informações do Imóvel
  propertyName: z.string().min(1, "O nome do imóvel é obrigatório"),
  propertyUnit: z.string().optional(),
  propertyType: z.string().min(1, "O tipo do imóvel é obrigatório"),
  propertyArea: z.string().optional(),
  propertyDescription: z.string().optional(),
  propertyImage: z.any().optional(),
  
  // Etapa 3: Localização
  address: z.string().min(1, "O endereço é obrigatório"),
  neighborhood: z.string().min(1, "O bairro é obrigatório"),
  city: z.string().min(1, "A cidade é obrigatória"),
  state: z.string().min(1, "O estado é obrigatório"),
  zipCode: z.string().optional(),
  
  // Etapa 4: Dados da Compra
  deliveryTime: z.string().optional(),
  listPrice: z.string().optional(),
  discount: z.string().optional(),
  downPayment: z.string().optional(),
  tipoParcelamento: z.string().optional(),
  paymentPeriod: z.string().optional(),
  monthlyCorrection: z.string().optional(),
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
    
  // Cenário Conservador
  conservative: z.object({
    futureSale: z.object({
      investmentPeriod: z.string().optional(),
      appreciationRate: z.string().optional(),
      sellingExpenseRate: z.string().optional(),
      incomeTaxRate: z.string().optional(),
      additionalCosts: z.string().optional(),
      maintenanceCosts: z.string().optional(),
    }).optional(),
    assetAppreciation: z.object({
      annualRate: z.string().optional(),
      analysisPeriod: z.string().optional(),
      maintenanceCosts: z.string().optional(),
      annualTaxes: z.string().optional(),
      yearlyRates: z.array(z.number()).optional(),
    }).optional(),
    rentalYield: z.object({
      monthlyRent: z.string().optional(),
      occupancyRate: z.string().optional(),
      managementFee: z.string().optional(),
      maintenanceCosts: z.string().optional(),
      annualIncrease: z.string().optional(),
    }).optional(),
  }).optional(),
  
  // Cenário Realista
  realistic: z.object({
    futureSale: z.object({
      investmentPeriod: z.string().optional(),
      appreciationRate: z.string().optional(),
      sellingExpenseRate: z.string().optional(),
      incomeTaxRate: z.string().optional(),
      additionalCosts: z.string().optional(),
      maintenanceCosts: z.string().optional(),
    }).optional(),
    assetAppreciation: z.object({
      annualRate: z.string().optional(),
      analysisPeriod: z.string().optional(),
      maintenanceCosts: z.string().optional(),
      annualTaxes: z.string().optional(),
      yearlyRates: z.array(z.number()).optional(),
    }).optional(),
    rentalYield: z.object({
      monthlyRent: z.string().optional(),
      occupancyRate: z.string().optional(),
      managementFee: z.string().optional(),
      maintenanceCosts: z.string().optional(),
      annualIncrease: z.string().optional(),
    }).optional(),
  }).optional(),
  
  // Cenário Otimista
  optimistic: z.object({
    futureSale: z.object({
      investmentPeriod: z.string().optional(),
      appreciationRate: z.string().optional(),
      sellingExpenseRate: z.string().optional(),
      incomeTaxRate: z.string().optional(),
      additionalCosts: z.string().optional(),
      maintenanceCosts: z.string().optional(),
    }).optional(),
    assetAppreciation: z.object({
      annualRate: z.string().optional(),
      analysisPeriod: z.string().optional(),
      maintenanceCosts: z.string().optional(),
      annualTaxes: z.string().optional(),
      yearlyRates: z.array(z.number()).optional(),
    }).optional(),
    rentalYield: z.object({
      monthlyRent: z.string().optional(),
      occupancyRate: z.string().optional(),
      managementFee: z.string().optional(),
      maintenanceCosts: z.string().optional(),
      annualIncrease: z.string().optional(),
    }).optional(),
  }).optional(),
  
  // Etapa 5: Projeções Financeiras (campos legados)
  projectedSaleMonth: z.string().optional(),
  projectedSaleValue: z.string().optional(),
  yearlyAppreciation: z.string().optional(),
  saleCommission: z.string().optional(),
  taxes: z.string().optional(),
  otherCosts: z.string().optional(),
  incomeTax: z.string().optional(),
});

type ProjectionFormValues = z.infer<typeof projectionSchema>;

// Componente para a barra de progresso com etapas
function ProgressSteps({ currentStep, onStepClick }: { currentStep: number, onStepClick: (step: number) => void }) {
  const steps = [
    { name: "Estratégia de Investimento", icon: <LineChart className="h-5 w-5" /> },
    { name: "Informações do Imóvel", icon: <Home className="h-5 w-5" /> },
    { name: "Localização", icon: <MapPin className="h-5 w-5" /> },
    { name: "Dados da Compra", icon: <DollarSign className="h-5 w-5" /> },
    { name: "Projeções Financeiras", icon: <TrendingUp className="h-5 w-5" /> }
  ];
  
  return (
    <div className="relative mb-12">
      <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0"></div>
      
      <div className="flex justify-between relative">
        {steps.map((step, index) => {
          const isActive = currentStep === index;
          const isCompleted = currentStep > index;
          
          return (
            <div key={index} className="flex flex-col items-center relative z-10">
              <button
                type="button"
                onClick={() => onStepClick(index)}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                  isActive ? "bg-[#434BE6] text-white" : 
                  isCompleted ? "bg-[#434BE6] text-white" : 
                  "bg-white border-2 border-gray-300 text-gray-500"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.icon
                )}
              </button>
              <span className={`mt-2 text-xs font-medium ${
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
      
      {formValues.listPrice && (
        <>
          <div className="border-t border-gray-100 pt-4 mb-4">
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-[#434BE6]" />
              Detalhes da Compra
            </h4>
            <div className="grid grid-cols-2 gap-y-2">
              <div className="text-xs text-[#6B7280]">Valor Tabela</div>
              <div className="text-xs font-medium text-right">{formatCurrency(Number(formValues.listPrice))}</div>
              
              {formValues.discount && Number(formValues.discount) > 0 && (
                <>
                  <div className="text-xs text-[#6B7280]">Valor Desconto</div>
                  <div className="text-xs font-medium text-right">{formatCurrency(Number(formValues.discount))}</div>
                </>
              )}
              
              <div className="text-xs text-[#6B7280]">Valor Compra</div>
              <div className="text-xs font-medium text-right">
                {formatCurrency(valorCompra)}
              </div>
              
              {formValues.downPayment && Number(formValues.downPayment) > 0 && (
                <>
                  <div className="text-xs text-[#6B7280]">Valor Entrada</div>
                  <div className="text-xs font-medium text-right">{formatCurrency(Number(formValues.downPayment))}</div>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-[#434BE6]/5 p-3 rounded-md border border-[#434BE6]/10">
            <div className="flex justify-between items-center">
              <span className="text-gray-800 font-medium text-xs flex items-center gap-1.5">
                <CreditCard className="h-3 w-3 text-[#434BE6]" />
                Saldo a financiar
              </span>
              <span className="font-semibold text-[#434BE6] text-sm">
                {formatCurrency(saldoDevedor)}
              </span>
            </div>
            
            {/* Resumo do Parcelamento */}
            <div className="mt-3 pt-3 border-t border-[#434BE6]/10">
              <h4 className="text-xs font-medium mb-2 text-gray-800">Resumo do Parcelamento</h4>
              {formValues.tipoParcelamento === 'automatico' && formValues.paymentPeriod && Number(formValues.paymentPeriod) > 0 ? (
                <ul className="space-y-1.5">
                  <li className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs">{formValues.paymentPeriod} Parcelas mensais:</span>
                    <span className="font-medium text-xs">
                      {formatCurrency(
                        (saldoDevedor -
                          (formValues.hasBoost && formValues.boostValue ? Number(formValues.boostValue) * getBoostCount(formValues) : 0) -
                          (formValues.hasKeys && formValues.keysValue ? Number(formValues.keysValue) : 0)) /
                          Number(formValues.paymentPeriod)
                      )}
                    </span>
                  </li>
                  
                  {formValues.hasBoost && formValues.boostValue && Number(formValues.boostValue) > 0 && (
                    <>
                      <li className="flex justify-between items-center">
                        <span className="text-gray-600 text-xs">{getBoostCount(formValues)} reforços/balões:</span>
                        <span className="font-medium text-xs">{formatCurrency(Number(formValues.boostValue))}</span>
                      </li>
                      <li className="flex justify-between items-center font-medium border-t border-[#434BE6]/10 pt-1 mt-1">
                        <span className="text-gray-600 text-xs">Valor total dos reforços/balões:</span>
                        <span className="text-[#434BE6] text-xs">{formatCurrency(Number(formValues.boostValue) * getBoostCount(formValues))}</span>
                      </li>
                    </>
                  )}
                  
                  {formValues.hasKeys && formValues.keysValue && Number(formValues.keysValue) > 0 && (
                    <li className="flex justify-between items-center">
                      <span className="text-gray-600 text-xs">Valor das chaves:</span>
                      <span className="font-medium text-xs">{formatCurrency(Number(formValues.keysValue))}</span>
                    </li>
                  )}
                </ul>
              ) : formValues.tipoParcelamento === 'personalizado' && formValues.customPayments && formValues.customPayments.length > 0 ? (
                <ul className="space-y-1.5">
                  <li className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs">Parcelas personalizadas:</span>
                    <span className="font-medium text-xs">{formValues.customPayments.length} parcelas</span>
                  </li>
                  
                  <li className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs">Valor médio das parcelas:</span>
                    <span className="font-medium text-xs">
                      {formatCurrency(
                        formValues.customPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0) / formValues.customPayments.length
                      )}
                    </span>
                  </li>
                  
                  <li className="flex justify-between items-center font-medium border-t border-[#434BE6]/10 pt-1 mt-1">
                    <span className="text-gray-600 text-xs">Total de parcelas personalizadas:</span>
                    <span className="text-[#434BE6] text-xs">
                      {formatCurrency(formValues.customPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0))}
                    </span>
                  </li>
                  
                  {formValues.hasKeys && formValues.keysValue && Number(formValues.keysValue) > 0 && (
                    <li className="flex justify-between items-center mt-1 pt-1">
                      <span className="text-gray-600 text-xs">Valor das chaves:</span>
                      <span className="font-medium text-xs">{formatCurrency(Number(formValues.keysValue))}</span>
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  Preencha os dados de parcelamento para visualizar o resumo
                </p>
              )}
            </div>
            
            {formValues.deliveryTime && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#434BE6]/10">
                <span className="text-gray-800 font-medium text-xs flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-[#434BE6]" />
                  Entrega em
                </span>
                <span className="font-medium text-gray-700 text-xs">
                  {formValues.deliveryTime} meses
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function CreateProjectionPage() {
  const [location, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Inicializar o formulário
  const form = useForm<ProjectionFormValues>({
    resolver: zodResolver(projectionSchema),
    defaultValues: {
      title: "",
      clientId: "",
      strategies: [],
      activeScenario: "realistic",
      propertyName: "",
      propertyUnit: "",
      propertyType: "",
      propertyArea: "",
      propertyDescription: "",
      address: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      deliveryTime: "",
      listPrice: "",
      discount: "",
      downPayment: "",
      tipoParcelamento: "automatico",
      paymentPeriod: "",
      monthlyCorrection: "",
      indiceCorrecao: "incc",
      hasBoost: false,
      periodicidadeReforco: "semestral",
      boostValue: "",
      hasKeys: false,
      keysValue: "",
      projectedSaleMonth: "",
      projectedSaleValue: "",
      yearlyAppreciation: "",
      saleCommission: "",
      taxes: "",
      otherCosts: "",
      incomeTax: "",
      
      // Valores iniciais para os cenários
      conservative: {
        futureSale: {
          investmentPeriod: "36",
          appreciationRate: "5",
          sellingExpenseRate: "3",
          incomeTaxRate: "15",
          additionalCosts: "",
          maintenanceCosts: "0.5",
        },
        assetAppreciation: {
          annualRate: "5",
          analysisPeriod: "5",
          maintenanceCosts: "0.5",
          annualTaxes: "1",
          yearlyRates: [],
        },
        rentalYield: {
          monthlyRent: "",
          occupancyRate: "80",
          managementFee: "8",
          maintenanceCosts: "0.5",
          annualIncrease: "5",
        }
      },
      
      realistic: {
        futureSale: {
          investmentPeriod: "36",
          appreciationRate: "8",
          sellingExpenseRate: "3",
          incomeTaxRate: "15",
          additionalCosts: "",
          maintenanceCosts: "0.5",
        },
        assetAppreciation: {
          annualRate: "8",
          analysisPeriod: "5",
          maintenanceCosts: "0.5",
          annualTaxes: "1",
          yearlyRates: [],
        },
        rentalYield: {
          monthlyRent: "",
          occupancyRate: "85",
          managementFee: "8",
          maintenanceCosts: "0.5",
          annualIncrease: "6",
        }
      },
      
      optimistic: {
        futureSale: {
          investmentPeriod: "36",
          appreciationRate: "12",
          sellingExpenseRate: "3",
          incomeTaxRate: "15",
          additionalCosts: "",
          maintenanceCosts: "0.5",
        },
        assetAppreciation: {
          annualRate: "12",
          analysisPeriod: "5",
          maintenanceCosts: "0.5",
          annualTaxes: "1",
          yearlyRates: [],
        },
        rentalYield: {
          monthlyRent: "",
          occupancyRate: "95",
          managementFee: "8",
          maintenanceCosts: "0.5",
          annualIncrease: "8",
        }
      }
    }
  });
  
  // Buscar clientes para o formulário
  const { data: clients, isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });
  
  // Mutation para salvar projeção
  const createProjectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/projections", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Projeção criada com sucesso",
        description: "A projeção foi salva e está pronta para visualização.",
      });
      // Redirecionar para a página de relatório
      navigate(`/projections/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar projeção",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const formValues = form.watch();
  
  // Função para avançar para a próxima etapa
  const nextStep = () => {
    // Validar apenas os campos da etapa atual antes de avançar
    switch (currentStep) {
      case 0:
        form.trigger(["title", "clientId", "strategies"]).then(isValid => {
          if (isValid) setCurrentStep(prev => prev + 1);
        });
        break;
      case 1:
        form.trigger(["propertyName", "propertyType"]).then(isValid => {
          if (isValid) setCurrentStep(prev => prev + 1);
        });
        break;
      case 2:
        form.trigger(["address", "neighborhood", "city", "state"]).then(isValid => {
          if (isValid) setCurrentStep(prev => prev + 1);
        });
        break;
      case 3:
        setCurrentStep(prev => prev + 1);
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
    }
  };
  
  const handleSubmit = () => {
    // Adicionar logs para debug
    console.log("Iniciando submissão do formulário");
    
    // Validar todos os campos obrigatórios de todas as etapas antes de enviar
    form.handleSubmit((data) => {
      console.log("Dados do formulário:", data);
      
      try {
        // Criar estrutura necessária para o backend
        const projectionData = {
          ...data,
          // Converter alguns campos para números se necessário
          clientId: data.clientId ? parseInt(data.clientId) : undefined,
          // Incluir calculationResults para facilitar a exibição no relatório
          calculationResults: {
            // Valores padrão para garantir visualização
            roi: 15,
            irr: 12,
            paybackMonths: 36
          }
        };
        
        console.log("Enviando dados para API:", projectionData);
        
        // Chamar a API para salvar os dados
        createProjectionMutation.mutate(projectionData);
      } catch (error) {
        console.error("Erro ao processar dados do formulário:", error);
        toast({
          title: "Erro ao processar dados",
          description: "Ocorreu um erro ao processar os dados do formulário.",
          variant: "destructive"
        });
      }
    })();
  };
  
  return (
    <div className="py-6 max-w-[1300px] mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8" 
          onClick={prevStep}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-[#434BE6]">Nova projeção imobiliária</h1>
      </div>
      
      <ProgressSteps currentStep={currentStep} onStepClick={goToStep} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Form {...form}>
            <form className="bg-white rounded-lg border p-6">
              {/* Etapa 1: Estratégia de Investimento */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-center flex items-center justify-center gap-2">
                      <LineChart className="h-5 w-5 text-[#434BE6]" />
                      Estratégia de Investimento
                    </h2>
                    <p className="text-center text-sm text-muted-foreground mb-4">
                      Informe dados básicos e selecione as estratégias de análise para esta projeção
                    </p>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#434BE6]" />
                        Informações Gerais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-[14px]">
                              <Type className="h-4 w-4 text-[#434BE6]" />
                              Título da Projeção
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ex: Projeção Empreendimento Alfa" 
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
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-[14px]">
                              <User className="h-4 w-4 text-[#434BE6]" />
                              Cliente (opcional)
                            </FormLabel>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Selecione um cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients?.map(client => (
                                  <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.name}
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
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-[#434BE6]" />
                        Estratégias de Análise
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="strategies"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex flex-col items-start space-y-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
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
                                  <FormLabel className="text-base cursor-pointer">
                                    Venda Futura
                                  </FormLabel>
                                  <FormDescription>
                                    Projeção de valorização e venda do imóvel após um período
                                  </FormDescription>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-start space-y-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
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
                                  <FormLabel className="text-base cursor-pointer">
                                    Valorização Patrimonial
                                  </FormLabel>
                                  <FormDescription>
                                    Análise da valorização do imóvel ao longo do tempo
                                  </FormDescription>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-start space-y-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
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
                                  <FormLabel className="text-base cursor-pointer">
                                    Rentabilidade com Locação
                                  </FormLabel>
                                  <FormDescription>
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
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-center flex items-center justify-center gap-2">
                      <Home className="h-5 w-5 text-[#434BE6]" />
                      Informações do Imóvel
                    </h2>
                    <p className="text-center text-sm text-muted-foreground mb-4">
                      Informe os dados básicos e características do imóvel a ser analisado
                    </p>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#434BE6]" />
                        Dados do Empreendimento
                      </CardTitle>
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
                                Área (m²)
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: 75" 
                                  {...field} 
                                  className="h-10"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#434BE6]" />
                        Descrição do Imóvel
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="propertyDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="Informações adicionais sobre o imóvel..." 
                                className="min-h-[120px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Etapa 3: Localização */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-center flex items-center justify-center gap-2">
                      <MapPin className="h-5 w-5 text-[#434BE6]" />
                      Localização do Imóvel
                    </h2>
                    <p className="text-center text-sm text-muted-foreground mb-4">
                      Informe o endereço completo e localização do imóvel para análise
                    </p>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-[#434BE6]" />
                        Endereço Completo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-[14px]">
                              <MapPin className="h-4 w-4 text-[#434BE6]" />
                              Endereço Completo
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ex: Av. Paulista, 1000" 
                                {...field} 
                                className="h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="neighborhood"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 text-[14px]">
                                <FileText className="h-4 w-4 text-[#434BE6]" />
                                Bairro
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: Centro" 
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
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 text-[14px]">
                                <FileText className="h-4 w-4 text-[#434BE6]" />
                                CEP
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: 01310-000" 
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
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 text-[14px]">
                                <Home className="h-4 w-4 text-[#434BE6]" />
                                Cidade
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: São Paulo" 
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
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 text-[14px]">
                                <MapPin className="h-4 w-4 text-[#434BE6]" />
                                Estado
                              </FormLabel>
                              <Select 
                                value={field.value} 
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Selecione o estado" />
                                  </SelectTrigger>
                                </FormControl>
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Etapa 4: Dados da Compra */}
              {currentStep === 3 && (
                <PurchaseDataForm form={form} />
              )}
              
              {/* Etapa 5: Projeções Financeiras */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-center flex items-center justify-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[#434BE6]" />
                      Projeções Financeiras
                    </h2>
                    <p className="text-center text-sm text-muted-foreground mb-4">
                      Configure os parâmetros para as projeções financeiras e análises selecionadas
                    </p>
                  </div>
                  
                  {form.watch("strategies")?.includes("FUTURE_SALE") && (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-[#434BE6]" />
                            Projeção de Venda Futura
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <ScenarioTabs form={form}>
                            <div className="space-y-4">
                              {/* Período de investimento e valorização esperada */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`${form.watch('activeScenario')}.futureSale.investmentPeriod`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="flex items-center gap-2 text-[14px]">
                                        <Calendar className="h-4 w-4 text-[#434BE6]" />
                                        Período de Investimento (meses)
                                      </FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="number"
                                          placeholder="Ex: 36" 
                                          {...field} 
                                          className="h-10"
                                        />
                                      </FormControl>
                                      <FormDescription className="text-xs">
                                        Tempo planejado até a venda do imóvel
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
                                      <FormLabel className="flex items-center gap-2 text-[14px]">
                                        <TrendingUp className="h-4 w-4 text-[#434BE6]" />
                                        Valorização Esperada (% ao ano)
                                      </FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="number"
                                          step="0.1"
                                          placeholder="Ex: 12" 
                                          {...field} 
                                          className="h-10"
                                        />
                                      </FormControl>
                                      <FormDescription className="text-xs">
                                        Percentual de valorização anual do imóvel
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              {/* Despesas de Venda */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`${form.watch('activeScenario')}.futureSale.sellingExpenseRate`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="flex items-center gap-2 text-[14px]">
                                        <Percent className="h-4 w-4 text-[#434BE6]" />
                                        Comissão e Despesas (%)
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
                                        Percentual sobre o valor da venda
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
                                      <FormLabel className="flex items-center gap-2 text-[14px]">
                                        <DollarSign className="h-4 w-4 text-[#434BE6]" />
                                        Imposto de Renda (%)
                                      </FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="number"
                                          step="0.1"
                                          placeholder="Ex: 15" 
                                          {...field} 
                                          className="h-10"
                                        />
                                      </FormControl>
                                      <FormDescription className="text-xs">
                                        Alíquota de imposto sobre o ganho de capital
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              {/* Custos adicionais */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`${form.watch('activeScenario')}.futureSale.additionalCosts`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="flex items-center gap-2 text-[14px]">
                                        <FileText className="h-4 w-4 text-[#434BE6]" />
                                        Custos Adicionais
                                      </FormLabel>
                                      <div className="relative">
                                        <DollarSign className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                                        <FormControl>
                                          <Input 
                                            type="text"
                                            placeholder="Ex: 5.000,00" 
                                            {...field} 
                                            className="h-10 pl-9"
                                          />
                                        </FormControl>
                                      </div>
                                      <FormDescription className="text-xs">
                                        Outros custos associados à venda
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
                                      <FormLabel className="flex items-center gap-2 text-[14px]">
                                        <Wrench className="h-4 w-4 text-[#434BE6]" />
                                        Manutenção Anual (%)
                                      </FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="number"
                                          step="0.1"
                                          placeholder="Ex: 0.5" 
                                          {...field} 
                                          className="h-10"
                                        />
                                      </FormControl>
                                      <FormDescription className="text-xs">
                                        Percentual do valor do imóvel para manutenção anual
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
                    </div>
                  )}
                  
                  {form.watch("strategies")?.includes("ASSET_APPRECIATION") && (
                    <Card className="mt-4">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-[#434BE6]" />
                          Valorização Patrimonial
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ScenarioTabs form={form}>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Valorização anual (%) */}
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario') || 'realistic'}.assetAppreciation.annualRate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-[14px]">
                                      <TrendingUp className="h-4 w-4 text-[#434BE6]" />
                                      Valorização Anual (%)
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="Ex: 5.5" 
                                        {...field} 
                                        className="h-10"
                                        step="0.1"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Valorização média anual do imóvel
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              {/* Período de análise (anos) */}
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario') || 'realistic'}.assetAppreciation.analysisPeriod`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-[14px]">
                                      <Clock className="h-4 w-4 text-[#434BE6]" />
                                      Período de Análise
                                    </FormLabel>
                                    <Select 
                                      value={field.value?.toString()} 
                                      onValueChange={(value) => field.onChange(parseInt(value))}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="h-10">
                                          <SelectValue placeholder="Selecione o período" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="5">5 anos</SelectItem>
                                        <SelectItem value="10">10 anos</SelectItem>
                                        <SelectItem value="15">15 anos</SelectItem>
                                        <SelectItem value="20">20 anos</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormDescription className="text-xs">
                                      Período total para análise da valorização
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Custos de manutenção anual (%) */}
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario') || 'realistic'}.assetAppreciation.maintenanceCosts`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-[14px]">
                                      <Wrench className="h-4 w-4 text-[#434BE6]" />
                                      Custos de Manutenção Anual (%)
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="Ex: 0.5" 
                                        {...field} 
                                        className="h-10"
                                        step="0.1"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Percentual do valor do imóvel gasto anualmente com manutenção
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              {/* IPTU e taxas anuais */}
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario') || 'realistic'}.assetAppreciation.annualTaxes`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-[14px]">
                                      <Receipt className="h-4 w-4 text-[#434BE6]" />
                                      IPTU e Taxas Anuais
                                    </FormLabel>
                                    <div className="relative">
                                      <DollarSign className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                                      <FormControl>
                                        <Input 
                                          type="text"
                                          placeholder="Ex: 2,500.00" 
                                          {...field} 
                                          className="h-10 pl-9"
                                        />
                                      </FormControl>
                                    </div>
                                    <FormDescription className="text-xs">
                                      Valor do IPTU e outras taxas anuais
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {/* Botão para editar valorização por ano */}
                            <div className="flex justify-end">
                              <AssetAppreciationYearlyEditor 
                                form={form}
                                scenario={form.watch('activeScenario') || 'realistic'}
                                years={form.watch(`${form.watch('activeScenario') || 'realistic'}.assetAppreciation.analysisPeriod`) || 10}
                                baseAppreciation={form.watch(`${form.watch('activeScenario') || 'realistic'}.assetAppreciation.annualRate`) || 5}
                              />
                            </div>
                          </div>
                        </ScenarioTabs>
                      </CardContent>
                    </Card>
                  )}
                  
                  {form.watch("strategies")?.includes("RENTAL_YIELD") && (
                    <Card className="mt-4">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Home className="h-5 w-5 text-[#434BE6]" />
                          Rentabilidade com Locação
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ScenarioTabs form={form}>
                          <div className="space-y-4">
                            {/* Valor mensal do aluguel e taxa de ocupação */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.rentalYield.monthlyRent`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-[14px]">
                                      <DollarSign className="h-4 w-4 text-[#434BE6]" />
                                      Valor do Aluguel (mensal)
                                    </FormLabel>
                                    <div className="relative">
                                      <DollarSign className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                                      <FormControl>
                                        <Input 
                                          type="text"
                                          placeholder="Ex: 2.500,00" 
                                          {...field} 
                                          className="h-10 pl-9"
                                        />
                                      </FormControl>
                                    </div>
                                    <FormDescription className="text-xs">
                                      Valor estimado do aluguel mensal
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
                                      <Calendar className="h-4 w-4 text-[#434BE6]" />
                                      Taxa de Ocupação (%)
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="100"
                                        placeholder="Ex: 85" 
                                        {...field} 
                                        className="h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Percentual do tempo em que o imóvel estará alugado
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {/* Taxa de administração e custo de manutenção */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`${form.watch('activeScenario')}.rentalYield.managementFee`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-[14px]">
                                      <Building2 className="h-4 w-4 text-[#434BE6]" />
                                      Taxa de Administração (%)
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        step="0.1"
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
                                      <Wrench className="h-4 w-4 text-[#434BE6]" />
                                      Manutenção Anual (%)
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        step="0.1"
                                        placeholder="Ex: 0.5" 
                                        {...field} 
                                        className="h-10"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Percentual do valor do imóvel para manutenção anual
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
              <div className="flex justify-between mt-8 pt-5 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                >
                  Voltar
                </Button>
                
                <div className="flex gap-2">
                  {currentStep === 0 && (
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                      className="mr-2"
                    >
                      {showPreview ? "Ocultar Preview" : "Mostrar Preview"}
                    </Button>
                  )}
                  
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={createProjectionMutation.isPending}
                  >
                    {currentStep === 4 ? (
                      <>
                        {createProjectionMutation.isPending ? (
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-white"></div>
                        ) : (
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                        )}
                        Gerar Projeção
                      </>
                    ) : (
                      "Próximo"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
        
        {/* Coluna de preview dos dados */}
        <div className={`md:block ${showPreview ? "block" : "hidden md:block"}`}>
          <PreviewSidebar formValues={formValues} />
        </div>
      </div>
    </div>
  );
}
