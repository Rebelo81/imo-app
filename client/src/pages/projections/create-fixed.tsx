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
                <div className="text-xs text-gray-600">
                  {formValues.customPayments.length} pagamentos personalizados configurados
                </div>
              ) : (
                <div className="text-xs text-gray-600">
                  Nenhum parcelamento configurado
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CreateProjectionPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  
  // Formulário com validação
  const form = useForm<ProjectionFormValues>({
    resolver: zodResolver(projectionSchema),
    defaultValues: {
      title: "",
      strategies: [],
      activeScenario: "realistic",
      propertyName: "",
      propertyType: "",
      address: "",
      neighborhood: "",
      city: "",
      state: "",
      // Valores padrão para os cenários
      realistic: {
        futureSale: {
          investmentPeriod: "36",
          appreciationRate: "0.8",
          sellingExpenseRate: "3",
          incomeTaxRate: "15",
          additionalCosts: "0",
          maintenanceCosts: "0",
        },
        assetAppreciation: {
          annualRate: "10",
          analysisPeriod: "10",
          maintenanceCosts: "0",
          annualTaxes: "0",
        },
        rentalYield: {
          monthlyRent: "",
          occupancyRate: "85",
          managementFee: "8",
          maintenanceCosts: "5",
          annualIncrease: "8",
        },
      },
      conservative: {
        futureSale: {
          investmentPeriod: "36",
          appreciationRate: "0.5",
          sellingExpenseRate: "3",
          incomeTaxRate: "15",
          additionalCosts: "0",
          maintenanceCosts: "0",
        },
        assetAppreciation: {
          annualRate: "6",
          analysisPeriod: "10",
          maintenanceCosts: "0",
          annualTaxes: "0",
        },
        rentalYield: {
          monthlyRent: "",
          occupancyRate: "75",
          managementFee: "8",
          maintenanceCosts: "8",
          annualIncrease: "5",
        },
      },
      optimistic: {
        futureSale: {
          investmentPeriod: "36",
          appreciationRate: "1",
          sellingExpenseRate: "3",
          incomeTaxRate: "15",
          additionalCosts: "0",
          maintenanceCosts: "0",
        },
        assetAppreciation: {
          annualRate: "12",
          analysisPeriod: "10",
          maintenanceCosts: "0",
          annualTaxes: "0",
        },
        rentalYield: {
          monthlyRent: "",
          occupancyRate: "95",
          managementFee: "8",
          maintenanceCosts: "3",
          annualIncrease: "10",
        },
      },
    }
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
  
  // Buscar clientes para o formulário
  const { data: clients, isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
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
    form.handleSubmit(function(data) {
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
                      onClick={() => navigate("/projections")}
                    >
                      Cancelar
                    </Button>
                  )}
                  
                  {currentStep >= 4 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                      className="md:hidden"
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