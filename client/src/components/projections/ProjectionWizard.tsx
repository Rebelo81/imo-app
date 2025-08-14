import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { InsertProjection, ProjectionStrategy, PROJECTION_STRATEGY, Projection, Client, insertProjectionSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  calculateFutureSaleProjection, 
  calculateAssetAppreciationProjection, 
  calculateRentalYieldProjection 
} from "@/lib/financial";
import ProgressSteps from "@/components/projections/ProgressSteps";
import StrategySelection from "@/components/projections/StrategySelection";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import PropertyForm from "@/components/projections/PropertyForm";
import FinancialForm from "@/components/projections/FinancialForm";
import FutureSaleForm from "@/components/projections/FutureSaleForm";
import AssetAppreciationForm from "@/components/projections/AssetAppreciationForm";
import RentalYieldForm from "@/components/projections/RentalYieldForm";
import ProjectionPreview from "@/components/projections/ProjectionPreview";

// Extended schema for the projection form
const projectionFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  clientId: z.coerce.number().min(1, "Cliente é obrigatório"),
  strategies: z.array(z.string()).min(1, "Selecione pelo menos uma estratégia").transform(
    (val) => val as unknown as ProjectionStrategy[]
  ),
  
  // Property fields
  propertyId: z.coerce.number().optional(),
  propertyName: z.string().optional(),
  propertyType: z.string().optional(),
  propertyUnit: z.string().optional(),
  propertyArea: z.string().optional(),
  propertyDescription: z.string().optional(),
  propertyImageUrl: z.string().optional(),
  propertyAddress: z.string().optional(),
  propertyNeighborhood: z.string().optional(),
  propertyCity: z.string().optional(),
  propertyState: z.string().optional(),
  propertyZipCode: z.string().optional(),
  
  // Financial fields
  deliveryMonths: z.coerce.number().int().min(0),
  listPrice: z.string().min(1, "Valor de tabela é obrigatório"),
  discount: z.string().default("0"),
  downPayment: z.string().min(1, "Entrada é obrigatória"),
  paymentMonths: z.coerce.number().int().min(1),
  monthlyCorrection: z.string().min(0),
  postDeliveryCorrection: z.string().default("0"),
  includeBonusPayments: z.boolean().default(false),
  bonusFrequency: z.coerce.number().int().min(0),
  tipoParcelamento: z.enum(["automatico", "personalizado"]).default("automatico"),
  
  // Future Sale fields
  futureValuePercentage: z.string().optional(),
  futureValueFixed: z.string().optional(),
  futureValueMonth: z.coerce.number().int().optional(),
  saleCommission: z.string().optional(),
  saleTaxes: z.string().optional(),
  incomeTax: z.string().optional(),
  
  // Asset Appreciation fields
  appreciationYears: z.coerce.number().int().optional(),
  annualAppreciation: z.string().optional(),
  maintenanceCosts: z.string().optional(),
  
  // Rental Yield fields
  rentalType: z.enum(["annual", "seasonal"]).optional(),
  monthlyRental: z.string().optional(),
  furnishingCosts: z.string().optional(),
  condoFees: z.string().optional(),
  propertyTax: z.string().optional(),
  
  // Calculation results (to be filled programmatically)
  calculationResults: z.record(z.any()).optional(),
});

type ProjectionFormValues = z.infer<typeof projectionFormSchema>;

interface ProjectionWizardProps {
  existingData?: Projection;
  onCancel: () => void;
}

export default function ProjectionWizard({ existingData, onCancel }: ProjectionWizardProps) {
  const [location, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | undefined>(existingData?.propertyId);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });
  
  // Set up form with defaults or existing data
  const form = useForm<ProjectionFormValues>({
    resolver: zodResolver(projectionFormSchema),
    defaultValues: existingData ? {
      title: existingData.title,
      clientId: existingData.clientId,
      strategies: existingData.strategies as ProjectionStrategy[],
      propertyId: existingData.propertyId,
      deliveryMonths: existingData.deliveryMonths,
      listPrice: existingData.listPrice.toString(),
      discount: existingData.discount?.toString() || "0",
      downPayment: existingData.downPayment.toString(),
      paymentMonths: existingData.paymentMonths,
      monthlyCorrection: existingData.monthlyCorrection.toString(),
      postDeliveryCorrection: existingData.postDeliveryCorrection?.toString() || "0",
      includeBonusPayments: existingData.includeBonusPayments || false,
      bonusFrequency: existingData.bonusFrequency || 0,
      tipoParcelamento: (existingData as any).tipoParcelamento || "automatico",
      futureValuePercentage: existingData.futureValuePercentage?.toString(),
      futureValueMonth: existingData.futureValueMonth ?? undefined,
      saleCommission: existingData.saleCommission?.toString(),
      saleTaxes: existingData.saleTaxes?.toString(),
      incomeTax: existingData.incomeTax?.toString(),
      appreciationYears: existingData.appreciationYears ?? undefined,
      annualAppreciation: existingData.annualAppreciation?.toString(),
      maintenanceCosts: existingData.maintenanceCosts?.toString(),
      rentalType: existingData.rentalType === "annual" ? "annual" : existingData.rentalType === "seasonal" ? "seasonal" : undefined,
      monthlyRental: existingData.monthlyRental?.toString(),
      furnishingCosts: existingData.furnishingCosts?.toString(),
      condoFees: existingData.condoFees?.toString(),
      propertyTax: existingData.propertyTax?.toString(),
      calculationResults: existingData.calculationResults as Record<string, any>,
    } : {
      title: "",
      clientId: 0,
      strategies: [PROJECTION_STRATEGY.FUTURE_SALE],
      deliveryMonths: 24,
      listPrice: "",
      discount: "0",
      downPayment: "20",
      paymentMonths: 36,
      monthlyCorrection: "1",
      postDeliveryCorrection: "0.5",
      includeBonusPayments: false,
      bonusFrequency: 6,
      tipoParcelamento: "automatico" as const,
    }
  });
  
  // Watch for strategy changes
  const selectedStrategies = form.watch("strategies") as ProjectionStrategy[];
  const paymentMonths = form.watch("paymentMonths");
  
  // Create projection mutation
  const createProjectionMutation = useMutation({
    mutationFn: async (data: InsertProjection) => {
      const response = await apiRequest('POST', '/api/projections', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Projeção criada com sucesso",
        description: "A projeção foi salva e está pronta para visualização.",
      });
      setLocation(`/projections/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar projeção",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update projection mutation
  const updateProjectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Projection> }) => {
      const response = await apiRequest('PUT', `/api/projections/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Projeção atualizada com sucesso",
        description: "As alterações foram salvas com sucesso.",
      });
      setLocation(`/projections/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar projeção",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Steps for the wizard
  const steps = [
    "Identificação",
    "Imóvel",
    "Financeiro",
    "Estratégias",
    "Revisão",
  ];
  
  // Go to next step
  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  // Go to previous step
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Go to specific step
  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  };
  
  // Handle strategy change
  const handleStrategyChange = (strategies: ProjectionStrategy[]) => {
    form.setValue('strategies', strategies as any);
  };
  
  // Handle property selection
  const handlePropertySelect = (propertyId: number) => {
    setSelectedPropertyId(propertyId);
    form.setValue('propertyId', propertyId);
  };
  
  // Handle wizard completion
  const handleComplete = (formData: ProjectionFormValues) => {
    // Prepare data for submission
    // Convert strategies to proper enum values by transforming each string to its corresponding enum value
    const strategiesArray: ProjectionStrategy[] = formData.strategies.map(strategy => {
      // Ensure each strategy is properly converted to the enum type
      if (strategy === PROJECTION_STRATEGY.FUTURE_SALE || 
          strategy === PROJECTION_STRATEGY.RENTAL_YIELD || 
          strategy === PROJECTION_STRATEGY.ASSET_APPRECIATION) {
        return strategy;
      }
      // Default to FUTURE_SALE as fallback
      return PROJECTION_STRATEGY.FUTURE_SALE;
    });
    
    const preparedData: InsertProjection = {
      title: formData.title,
      clientId: formData.clientId,
      strategies: strategiesArray,
      propertyId: formData.propertyId || 0,
      deliveryMonths: formData.deliveryMonths,
      listPrice: formData.listPrice,
      discount: formData.discount,
      downPayment: formData.downPayment,
      paymentMonths: formData.paymentMonths,
      monthlyCorrection: formData.monthlyCorrection,
      postDeliveryCorrection: formData.postDeliveryCorrection,
      includeBonusPayments: formData.includeBonusPayments,
      bonusFrequency: formData.bonusFrequency,
      tipoParcelamento: formData.tipoParcelamento,
      scenarioType: formData.scenarioType,
      activeScenario: formData.activeScenario,
      selectedScenarios: formData.selectedScenarios,
      userId: 1 // For demo, always use user ID 1
    };
    
    // Add strategy-specific fields
    if (selectedStrategies.includes(PROJECTION_STRATEGY.FUTURE_SALE)) {
      preparedData.futureValuePercentage = formData.futureValuePercentage;
      preparedData.futureValueMonth = formData.futureValueMonth;
      preparedData.saleCommission = formData.saleCommission;
      preparedData.saleTaxes = formData.saleTaxes;
      preparedData.incomeTax = formData.incomeTax;
      preparedData.additionalCosts = formData.additionalCosts;
    }
    
    if (selectedStrategies.includes(PROJECTION_STRATEGY.ASSET_APPRECIATION)) {
      preparedData.appreciationYears = formData.appreciationYears;
      preparedData.annualAppreciation = formData.annualAppreciation;
      preparedData.maintenanceCosts = formData.maintenanceCosts;
    }
    
    if (selectedStrategies.includes(PROJECTION_STRATEGY.RENTAL_YIELD)) {
      preparedData.rentalType = formData.rentalType;
      preparedData.monthlyRental = formData.monthlyRental;
      preparedData.furnishingCosts = formData.furnishingCosts;
      preparedData.condoFees = formData.condoFees;
      preparedData.propertyTax = formData.propertyTax;
    }
    
    // Inicializar valores padrão para cada cenário se não existirem
    // Se o tipo de cenário for múltiplos, garantir que todos os cenários selecionados tenham dados
    if (preparedData.scenarioType === 'multiplos' || preparedData.scenarioType === 'multiplos_selecionados') {
      // Determinar quais cenários devem ser incluídos
      const scenariosToInclude = preparedData.selectedScenarios || ['padrao'];
      
      // Inicializar cenário padrão
      if (scenariosToInclude.includes('padrao')) {
        const padraoData = formData.padrao || {
          futureSale: {
            investmentPeriod: '36',
            appreciationRate: '25',
            sellingExpenseRate: '6',
            incomeTaxRate: '15',
            additionalCosts: '2',
            maintenanceCosts: '0'
          },
          assetAppreciation: {
            annualRate: '15',
            analysisPeriod: '10',
            maintenanceCosts: '0',
            annualTaxes: '0'
          },
          rentalYield: {
            monthlyRent: '0.6',
            occupancyRate: '85',
            managementFee: '10',
            maintenanceCosts: '5',
            annualIncrease: '5'
          }
        };
        preparedData.padrao = padraoData;
        
        // Mapear campos individuais
        if (padraoData.futureSale) {
          preparedData.padraoFutureSaleInvestmentPeriod = padraoData.futureSale.investmentPeriod;
          preparedData.padraoFutureSaleAppreciationRate = padraoData.futureSale.appreciationRate;
          preparedData.padraoFutureSaleSellingExpenseRate = padraoData.futureSale.sellingExpenseRate;
          preparedData.padraoFutureSaleIncomeTaxRate = padraoData.futureSale.incomeTaxRate;
          preparedData.padraoFutureSaleAdditionalCosts = padraoData.futureSale.additionalCosts;
          preparedData.padraoFutureSaleMaintenanceCosts = padraoData.futureSale.maintenanceCosts;
        }
        
        if (padraoData.assetAppreciation) {
          preparedData.padraoAssetAppreciationAnnualRate = padraoData.assetAppreciation.annualRate;
          preparedData.padraoAssetAppreciationAnalysisPeriod = padraoData.assetAppreciation.analysisPeriod;
          preparedData.padraoAssetAppreciationMaintenanceCosts = padraoData.assetAppreciation.maintenanceCosts;
          preparedData.padraoAssetAppreciationAnnualTaxes = padraoData.assetAppreciation.annualTaxes;
        }
        
        if (padraoData.rentalYield) {
          preparedData.padraoRentalYieldMonthlyRent = padraoData.rentalYield.monthlyRent;
          preparedData.padraoRentalYieldOccupancyRate = padraoData.rentalYield.occupancyRate;
          preparedData.padraoRentalYieldManagementFee = padraoData.rentalYield.managementFee;
          preparedData.padraoRentalYieldMaintenanceCosts = padraoData.rentalYield.maintenanceCosts;
          preparedData.padraoRentalYieldAnnualIncrease = padraoData.rentalYield.annualIncrease;
        }
      }
      
      // Inicializar cenário conservador
      if (scenariosToInclude.includes('conservador')) {
        const conservadorData = formData.conservador || {
          futureSale: {
            investmentPeriod: '48',
            appreciationRate: '20',
            sellingExpenseRate: '6',
            incomeTaxRate: '15',
            additionalCosts: '3',
            maintenanceCosts: '1'
          },
          assetAppreciation: {
            annualRate: '12',
            analysisPeriod: '10',
            maintenanceCosts: '1',
            annualTaxes: '1'
          },
          rentalYield: {
            monthlyRent: '0.4',
            occupancyRate: '75',
            managementFee: '10',
            maintenanceCosts: '7',
            annualIncrease: '4'
          }
        };
        preparedData.conservador = conservadorData;
        
        // Mapear campos individuais
        if (conservadorData.futureSale) {
          preparedData.conservadorFutureSaleInvestmentPeriod = conservadorData.futureSale.investmentPeriod;
          preparedData.conservadorFutureSaleAppreciationRate = conservadorData.futureSale.appreciationRate;
          preparedData.conservadorFutureSaleSellingExpenseRate = conservadorData.futureSale.sellingExpenseRate;
          preparedData.conservadorFutureSaleIncomeTaxRate = conservadorData.futureSale.incomeTaxRate;
          preparedData.conservadorFutureSaleAdditionalCosts = conservadorData.futureSale.additionalCosts;
          preparedData.conservadorFutureSaleMaintenanceCosts = conservadorData.futureSale.maintenanceCosts;
        }
        
        if (conservadorData.assetAppreciation) {
          preparedData.conservadorAssetAppreciationAnnualRate = conservadorData.assetAppreciation.annualRate;
          preparedData.conservadorAssetAppreciationAnalysisPeriod = conservadorData.assetAppreciation.analysisPeriod;
          preparedData.conservadorAssetAppreciationMaintenanceCosts = conservadorData.assetAppreciation.maintenanceCosts;
          preparedData.conservadorAssetAppreciationAnnualTaxes = conservadorData.assetAppreciation.annualTaxes;
        }
        
        if (conservadorData.rentalYield) {
          preparedData.conservadorRentalYieldMonthlyRent = conservadorData.rentalYield.monthlyRent;
          preparedData.conservadorRentalYieldOccupancyRate = conservadorData.rentalYield.occupancyRate;
          preparedData.conservadorRentalYieldManagementFee = conservadorData.rentalYield.managementFee;
          preparedData.conservadorRentalYieldMaintenanceCosts = conservadorData.rentalYield.maintenanceCosts;
          preparedData.conservadorRentalYieldAnnualIncrease = conservadorData.rentalYield.annualIncrease;
        }
      }
      
      // Inicializar cenário otimista
      if (scenariosToInclude.includes('otimista')) {
        const otimistaData = formData.otimista || {
          futureSale: {
            investmentPeriod: '24',
            appreciationRate: '30',
            sellingExpenseRate: '5',
            incomeTaxRate: '15',
            additionalCosts: '1',
            maintenanceCosts: '0'
          },
          assetAppreciation: {
            annualRate: '18',
            analysisPeriod: '10',
            maintenanceCosts: '0',
            annualTaxes: '0'
          },
          rentalYield: {
            monthlyRent: '0.8',
            occupancyRate: '95',
            managementFee: '8',
            maintenanceCosts: '3',
            annualIncrease: '6'
          }
        };
        preparedData.otimista = otimistaData;
        
        // Mapear campos individuais
        if (otimistaData.futureSale) {
          preparedData.otimistaFutureSaleInvestmentPeriod = otimistaData.futureSale.investmentPeriod;
          preparedData.otimistaFutureSaleAppreciationRate = otimistaData.futureSale.appreciationRate;
          preparedData.otimistaFutureSaleSellingExpenseRate = otimistaData.futureSale.sellingExpenseRate;
          preparedData.otimistaFutureSaleIncomeTaxRate = otimistaData.futureSale.incomeTaxRate;
          preparedData.otimistaFutureSaleAdditionalCosts = otimistaData.futureSale.additionalCosts;
          preparedData.otimistaFutureSaleMaintenanceCosts = otimistaData.futureSale.maintenanceCosts;
        }
        
        if (otimistaData.assetAppreciation) {
          preparedData.otimistaAssetAppreciationAnnualRate = otimistaData.assetAppreciation.annualRate;
          preparedData.otimistaAssetAppreciationAnalysisPeriod = otimistaData.assetAppreciation.analysisPeriod;
          preparedData.otimistaAssetAppreciationMaintenanceCosts = otimistaData.assetAppreciation.maintenanceCosts;
          preparedData.otimistaAssetAppreciationAnnualTaxes = otimistaData.assetAppreciation.annualTaxes;
        }
        
        if (otimistaData.rentalYield) {
          preparedData.otimistaRentalYieldMonthlyRent = otimistaData.rentalYield.monthlyRent;
          preparedData.otimistaRentalYieldOccupancyRate = otimistaData.rentalYield.occupancyRate;
          preparedData.otimistaRentalYieldManagementFee = otimistaData.rentalYield.managementFee;
          preparedData.otimistaRentalYieldMaintenanceCosts = otimistaData.rentalYield.maintenanceCosts;
          preparedData.otimistaRentalYieldAnnualIncrease = otimistaData.rentalYield.annualIncrease;
        }
      }
    } else {
      // Para cenário único, garantir que o padrão esteja preenchido
      const padraoData = formData.padrao || {
        futureSale: {
          investmentPeriod: '36',
          appreciationRate: '25',
          sellingExpenseRate: '6',
          incomeTaxRate: '15',
          additionalCosts: '2',
          maintenanceCosts: '0'
        },
        assetAppreciation: {
          annualRate: '15',
          analysisPeriod: '10',
          maintenanceCosts: '0',
          annualTaxes: '0'
        },
        rentalYield: {
          monthlyRent: '0.6',
          occupancyRate: '85',
          managementFee: '10',
          maintenanceCosts: '5',
          annualIncrease: '5'
        }
      };
      preparedData.padrao = padraoData;
      
      if (padraoData.futureSale) {
        preparedData.padraoFutureSaleInvestmentPeriod = padraoData.futureSale.investmentPeriod;
        preparedData.padraoFutureSaleAppreciationRate = padraoData.futureSale.appreciationRate;
        preparedData.padraoFutureSaleSellingExpenseRate = padraoData.futureSale.sellingExpenseRate;
        preparedData.padraoFutureSaleIncomeTaxRate = padraoData.futureSale.incomeTaxRate;
        preparedData.padraoFutureSaleAdditionalCosts = padraoData.futureSale.additionalCosts;
        preparedData.padraoFutureSaleMaintenanceCosts = padraoData.futureSale.maintenanceCosts;
      }
      
      if (padraoData.assetAppreciation) {
        preparedData.padraoAssetAppreciationAnnualRate = padraoData.assetAppreciation.annualRate;
        preparedData.padraoAssetAppreciationAnalysisPeriod = padraoData.assetAppreciation.analysisPeriod;
        preparedData.padraoAssetAppreciationMaintenanceCosts = padraoData.assetAppreciation.maintenanceCosts;
        preparedData.padraoAssetAppreciationAnnualTaxes = padraoData.assetAppreciation.annualTaxes;
      }
      
      if (padraoData.rentalYield) {
        preparedData.padraoRentalYieldMonthlyRent = padraoData.rentalYield.monthlyRent;
        preparedData.padraoRentalYieldOccupancyRate = padraoData.rentalYield.occupancyRate;
        preparedData.padraoRentalYieldManagementFee = padraoData.rentalYield.managementFee;
        preparedData.padraoRentalYieldMaintenanceCosts = padraoData.rentalYield.maintenanceCosts;
        preparedData.padraoRentalYieldAnnualIncrease = padraoData.rentalYield.annualIncrease;
      }
    }
    
    // Perform actual calculations based on the inputs
    const listPriceValue = parseFloat(formData.listPrice.replace(/[^\d.-]/g, ''));
    const discountValue = parseFloat(formData.discount.replace(/[^\d.-]/g, '') || '0');
    const downPaymentValue = parseFloat(formData.downPayment.replace(/[^\d.-]/g, ''));
    const monthlyCorrectionValue = parseFloat(formData.monthlyCorrection.replace(/[^\d.-]/g, '') || '0');
    const postDeliveryCorrectionValue = parseFloat(formData.postDeliveryCorrection.replace(/[^\d.-]/g, '') || '0');

    // Initialize calculationResults object
    const calculationResults: Record<string, any> = {};
    
    if (selectedStrategies.includes(PROJECTION_STRATEGY.FUTURE_SALE)) {
      const futureValuePercentageValue = parseFloat(formData.futureValuePercentage?.replace(/[^\d.-]/g, '') || '0');
      const futureValueMonthValue = formData.futureValueMonth || 60; // Default to 60 months if not specified
      const saleCommissionValue = parseFloat(formData.saleCommission?.replace(/[^\d.-]/g, '') || '0');
      const saleTaxesValue = parseFloat(formData.saleTaxes?.replace(/[^\d.-]/g, '') || '0');
      const incomeTaxValue = parseFloat(formData.incomeTax?.replace(/[^\d.-]/g, '') || '0');
      // Obter custos adicionais como percentual do valor futuro
      const additionalCostsValue = parseFloat(formData.additionalCosts?.replace(/[^\d.-]/g, '') || '0');

      // Calculate future sale projection
      const futureSaleResult = calculateFutureSaleProjection(
        listPriceValue,
        discountValue,
        downPaymentValue,
        formData.paymentMonths,
        monthlyCorrectionValue,
        formData.deliveryMonths,
        postDeliveryCorrectionValue,
        formData.includeBonusPayments,
        formData.bonusFrequency,
        0, // Bonus amount (not implemented in UI)
        futureValuePercentageValue,
        futureValueMonthValue,
        saleCommissionValue,
        saleTaxesValue,
        incomeTaxValue,
        additionalCostsValue // Custos adicionais como % do valor futuro
      );

      // Add future sale results to calculation results
      calculationResults.futureSale = futureSaleResult.summary;
      calculationResults.futureSaleCashFlow = futureSaleResult.cashFlow;
    }

    if (selectedStrategies.includes(PROJECTION_STRATEGY.ASSET_APPRECIATION)) {
      const appreciationYearsValue = formData.appreciationYears || 10; // Default to 10 years if not specified
      const annualAppreciationValue = parseFloat(formData.annualAppreciation?.replace(/[^\d.-]/g, '') || '0');
      const maintenanceCostsValue = parseFloat(formData.maintenanceCosts?.replace(/[^\d.-]/g, '') || '0');

      // Calculate asset appreciation projection
      const assetAppreciationResult = calculateAssetAppreciationProjection(
        listPriceValue * (1 - discountValue / 100), // Use discounted price
        appreciationYearsValue,
        annualAppreciationValue,
        maintenanceCostsValue
      );

      // Add asset appreciation results to calculation results
      calculationResults.assetAppreciation = assetAppreciationResult.summary;
      calculationResults.assetAppreciationYearly = assetAppreciationResult.yearlyProjection;
    }

    if (selectedStrategies.includes(PROJECTION_STRATEGY.RENTAL_YIELD)) {
      const monthlyRentalValue = parseFloat(formData.monthlyRental?.replace(/[^\d.-]/g, '') || '0');
      const furnishingCostsValue = parseFloat(formData.furnishingCosts?.replace(/[^\d.-]/g, '') || '0');
      const condoFeesValue = parseFloat(formData.condoFees?.replace(/[^\d.-]/g, '') || '0');
      const propertyTaxValue = parseFloat(formData.propertyTax?.replace(/[^\d.-]/g, '') || '0');

      // Assume 5% annual appreciation and 10 year projection if not specified in the UI
      // Could be extended to include these as form fields
      const rentalYieldResult = calculateRentalYieldProjection(
        listPriceValue * (1 - discountValue / 100), // Use discounted price
        monthlyRentalValue,
        furnishingCostsValue,
        condoFeesValue,
        propertyTaxValue,
        5, // Default annual appreciation
        10 // Default projection years
      );

      // Add rental yield results to calculation results
      calculationResults.rentalYield = rentalYieldResult.summary;
      calculationResults.rentalYieldYearly = rentalYieldResult.yearlyProjection;
    }

    // Add overall summary metrics based on the selected strategies
    // Use the most favorable metrics for the overall summary
    let maxRoi = 0;
    let maxIrr = 0;
    let minPayback = Infinity;
    let maxProfit = 0;

    if (calculationResults.futureSale) {
      maxRoi = Math.max(maxRoi, calculationResults.futureSale.roi);
      maxIrr = Math.max(maxIrr, calculationResults.futureSale.irr);
      minPayback = Math.min(minPayback, calculationResults.futureSale.paybackMonths);
      maxProfit = Math.max(maxProfit, calculationResults.futureSale.netProfit);
    }

    if (calculationResults.assetAppreciation) {
      maxRoi = Math.max(maxRoi, calculationResults.assetAppreciation.appreciationPercentage);
      maxIrr = Math.max(maxIrr, calculationResults.assetAppreciation.annualizedReturn);
      // Asset appreciation doesn't have a direct payback period concept
      maxProfit = Math.max(maxProfit, calculationResults.assetAppreciation.netGain);
    }

    if (calculationResults.rentalYield) {
      maxRoi = Math.max(maxRoi, calculationResults.rentalYield.totalReturnPercentage);
      maxIrr = Math.max(maxIrr, calculationResults.rentalYield.averageYield);
      // Calculate approximate payback: initialInvestment / annualNetIncome
      const rentalPayback = calculationResults.rentalYield.annualNetIncome > 0 
        ? calculationResults.rentalYield.initialInvestment / calculationResults.rentalYield.annualNetIncome * 12 
        : Infinity;
      minPayback = Math.min(minPayback, rentalPayback);
      maxProfit = Math.max(maxProfit, calculationResults.rentalYield.totalReturn);
    }

    // Add overall summary
    calculationResults.roi = maxRoi;
    calculationResults.irr = maxIrr;
    calculationResults.paybackMonths = minPayback === Infinity ? 0 : minPayback;
    calculationResults.netProfit = maxProfit;

    // Store calculation results to the prepared data
    preparedData.calculationResults = calculationResults;
    
    // Submit the data
    if (existingData) {
      updateProjectionMutation.mutate({ 
        id: existingData.id, 
        data: preparedData
      });
    } else {
      createProjectionMutation.mutate(preparedData);
    }
  };

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        <ProgressSteps 
          steps={steps} 
          currentStep={currentStep} 
          onStepClick={goToStep}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Identification */}
            {currentStep === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Identificação da Projeção</CardTitle>
                  <CardDescription>
                    Selecione as estratégias e forneça informações básicas para começar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <StrategySelection 
                    selectedStrategies={selectedStrategies} 
                    onChange={handleStrategyChange}
                  />
                  
                  <Form {...form}>
                    <form className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título da Projeção</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ex: Investimento Apartamento Vila Nova" 
                                {...field} 
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
                            <FormLabel>Cliente</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">
                                  Selecione um cliente
                                </SelectItem>
                                {clients.map((client) => (
                                  <SelectItem 
                                    key={client.id} 
                                    value={client.id.toString()}
                                  >
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
            
            {/* Step 2: Property */}
            {currentStep === 1 && (
              <PropertyForm 
                onSubmit={() => goToNextStep()}
                existingPropertyId={selectedPropertyId}
                onPropertySelect={handlePropertySelect}
              />
            )}
            
            {/* Step 3: Financial */}
            {currentStep === 2 && (
              <FinancialForm 
                onSubmit={() => goToNextStep()}
                defaultValues={{
                  deliveryMonths: form.getValues("deliveryMonths"),
                  listPrice: form.getValues("listPrice"),
                  discount: form.getValues("discount"),
                  downPayment: form.getValues("downPayment"),
                  paymentMonths: form.getValues("paymentMonths"),
                  monthlyCorrection: form.getValues("monthlyCorrection"),
                  postDeliveryCorrection: form.getValues("postDeliveryCorrection"),
                  includeBonusPayments: form.getValues("includeBonusPayments"),
                  bonusFrequency: form.getValues("bonusFrequency"),
                }}
                onChange={(values) => {
                  Object.entries(values).forEach(([key, value]) => {
                    form.setValue(key as any, value);
                  });
                }}
              />
            )}
            
            {/* Step 4: Strategy-specific forms */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {selectedStrategies.includes(PROJECTION_STRATEGY.FUTURE_SALE) && (
                  <FutureSaleForm 
                    onSubmit={() => {}}
                    onChange={(values) => {
                      Object.entries(values).forEach(([key, value]) => {
                        if (key === "futureValueMethod") return;
                        form.setValue(key as any, value);
                      });
                    }}
                    defaultValues={{
                      futureValuePercentage: form.getValues("futureValuePercentage"),
                      futureValueFixed: form.getValues("futureValueFixed"),
                      futureValueMonth: form.getValues("futureValueMonth"),
                      saleCommission: form.getValues("saleCommission"),
                      saleTaxes: form.getValues("saleTaxes"),
                      incomeTax: form.getValues("incomeTax"),
                      additionalCosts: form.getValues("additionalCosts"),
                    }}
                    paymentMonths={paymentMonths}
                  />
                )}
                
                {selectedStrategies.includes(PROJECTION_STRATEGY.ASSET_APPRECIATION) && (
                  <AssetAppreciationForm 
                    onSubmit={() => {}}
                    onChange={(values) => {
                      Object.entries(values).forEach(([key, value]) => {
                        form.setValue(key as any, value);
                      });
                    }}
                    defaultValues={{
                      appreciationYears: form.getValues("appreciationYears"),
                      annualAppreciation: form.getValues("annualAppreciation"),
                      maintenanceCosts: form.getValues("maintenanceCosts"),
                    }}
                    listPrice={form.getValues("listPrice")}
                  />
                )}
                
                {selectedStrategies.includes(PROJECTION_STRATEGY.RENTAL_YIELD) && (
                  <RentalYieldForm 
                    onSubmit={() => {}}
                    onChange={(values) => {
                      Object.entries(values).forEach(([key, value]) => {
                        form.setValue(key as any, value);
                      });
                    }}
                    defaultValues={{
                      rentalType: form.getValues("rentalType"),
                      monthlyRental: form.getValues("monthlyRental"),
                      furnishingCosts: form.getValues("furnishingCosts"),
                      condoFees: form.getValues("condoFees"),
                      propertyTax: form.getValues("propertyTax"),
                    }}
                    listPrice={form.getValues("listPrice")}
                  />
                )}
              </div>
            )}
            
            {/* Step 5: Review */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Revisão da Projeção</CardTitle>
                  <CardDescription>
                    Revise os detalhes abaixo antes de finalizar a projeção
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 className="text-sm font-medium text-slate-700 mb-2">Informações Básicas</h3>
                        <dl className="grid grid-cols-3 gap-1">
                          <dt className="text-xs text-slate-500 col-span-1">Título:</dt>
                          <dd className="text-xs text-slate-700 font-medium col-span-2">{form.getValues("title")}</dd>
                          
                          <dt className="text-xs text-slate-500 col-span-1">Cliente:</dt>
                          <dd className="text-xs text-slate-700 font-medium col-span-2">
                            {clients.find(c => c.id === form.getValues("clientId"))?.name || ""}
                          </dd>
                          
                          <dt className="text-xs text-slate-500 col-span-1">Estratégias:</dt>
                          <dd className="text-xs text-slate-700 font-medium col-span-2">
                            {selectedStrategies.map(s => {
                              switch(s) {
                                case PROJECTION_STRATEGY.FUTURE_SALE:
                                  return "Venda Futura";
                                case PROJECTION_STRATEGY.ASSET_APPRECIATION:
                                  return "Patrimônio/Valorização";
                                case PROJECTION_STRATEGY.RENTAL_YIELD:
                                  return "Rentabilidade com Locação";
                                default:
                                  return s;
                              }
                            }).join(", ")}
                          </dd>
                        </dl>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 className="text-sm font-medium text-slate-700 mb-2">Dados Financeiros</h3>
                        <dl className="grid grid-cols-3 gap-1">
                          <dt className="text-xs text-slate-500 col-span-1">Valor:</dt>
                          <dd className="text-xs text-slate-700 font-medium col-span-2">R$ {form.getValues("listPrice")}</dd>
                          
                          <dt className="text-xs text-slate-500 col-span-1">Entrada:</dt>
                          <dd className="text-xs text-slate-700 font-medium col-span-2">{form.getValues("downPayment")}%</dd>
                          
                          <dt className="text-xs text-slate-500 col-span-1">Prazo:</dt>
                          <dd className="text-xs text-slate-700 font-medium col-span-2">{form.getValues("paymentMonths")} meses</dd>
                          
                          <dt className="text-xs text-slate-500 col-span-1">Correção:</dt>
                          <dd className="text-xs text-slate-700 font-medium col-span-2">{form.getValues("monthlyCorrection")}% a.m.</dd>
                        </dl>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h3 className="text-sm font-medium text-slate-700 mb-2">Resultados Financeiros (Simulados)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-slate-500">ROI</p>
                          <p className="text-base font-bold text-success">22.5%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">TIR (IRR)</p>
                          <p className="text-base font-bold text-success">18.3%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Payback</p>
                          <p className="text-base font-bold text-primary">32 meses</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Lucro</p>
                          <p className="text-base font-bold text-success">R$ 191.250,00</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Navigation Buttons */}
            <div className="flex justify-end space-x-2 mt-6">
              {currentStep > 0 && (
                <Button 
                  variant="outline" 
                  onClick={goToPreviousStep}
                >
                  Anterior
                </Button>
              )}
              
              {currentStep === 0 && (
                <Button 
                  variant="outline" 
                  onClick={onCancel}
                >
                  Cancelar
                </Button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <Button onClick={goToNextStep}>
                  Próximo
                </Button>
              ) : (
                <Button 
                  onClick={form.handleSubmit(handleComplete)} 
                  disabled={createProjectionMutation.isPending || updateProjectionMutation.isPending}
                >
                  {existingData ? "Atualizar Projeção" : "Finalizar Projeção"}
                </Button>
              )}
            </div>
          </div>
          
          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <ProjectionPreview form={form} clients={clients} />
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
