import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Client, PROJECTION_STRATEGY, ProjectionStrategy } from "@shared/schema";
import { CheckIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ProjectionPreviewProps {
  form: UseFormReturn<any>;
  clients: Client[];
}

export default function ProjectionPreview({ form, clients }: ProjectionPreviewProps) {
  const formValues = form.watch();
  
  // Get strategy names
  const getStrategyName = (strategy: string): string => {
    switch (strategy) {
      case PROJECTION_STRATEGY.FUTURE_SALE:
        return "Projeção de Venda Futura";
      case PROJECTION_STRATEGY.ASSET_APPRECIATION:
        return "Projeção de Patrimônio/Valorização";
      case PROJECTION_STRATEGY.RENTAL_YIELD:
        return "Projeção de Rentabilidade com Locação";
      default:
        return strategy;
    }
  };
  
  // Get client name
  const getClientName = (clientId: number): string => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "-";
  };
  
  // Format numeric value with currency
  const formatValue = (value: string | number | undefined): string => {
    if (!value) return "-";
    
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "-";
    
    return formatCurrency(numValue);
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>Prévia</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Strategy Selection Preview */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Estratégias Selecionadas</h3>
            <div className="space-y-2">
              {(formValues.strategies || []).map((strategy: ProjectionStrategy, index: number) => (
                <div key={index} className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-success mr-2" />
                  <span className="text-sm text-slate-600">{getStrategyName(strategy)}</span>
                </div>
              ))}
              {(!formValues.strategies || formValues.strategies.length === 0) && (
                <p className="text-sm text-slate-500">Nenhuma estratégia selecionada</p>
              )}
            </div>
          </div>
          
          {/* Basic Details Preview */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Detalhes Básicos</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1">
                <p className="text-xs text-slate-500">Título:</p>
                <p className="text-xs text-slate-700 font-medium">{formValues.title || "-"}</p>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <p className="text-xs text-slate-500">Cliente:</p>
                <p className="text-xs text-slate-700 font-medium">
                  {formValues.clientId ? getClientName(formValues.clientId) : "-"}
                </p>
              </div>
            </div>
          </div>
          
          {/* Property Preview */}
          {formValues.propertyId || formValues.propertyName ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Imóvel</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Nome:</p>
                  <p className="text-xs text-slate-700 font-medium">{formValues.propertyName || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Tipo:</p>
                  <p className="text-xs text-slate-700 font-medium">{formValues.propertyType || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Localização:</p>
                  <p className="text-xs text-slate-700 font-medium">
                    {formValues.propertyCity ? `${formValues.propertyCity}, ${formValues.propertyState}` : "-"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          
          {/* Financial Preview */}
          {formValues.listPrice ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Financeiro</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Valor:</p>
                  <p className="text-xs text-slate-700 font-medium">{formatValue(formValues.listPrice)}</p>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Entrada:</p>
                  <p className="text-xs text-slate-700 font-medium">{formValues.downPayment}%</p>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Prazo:</p>
                  <p className="text-xs text-slate-700 font-medium">{formValues.paymentMonths} meses</p>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Correção:</p>
                  <p className="text-xs text-slate-700 font-medium">{formValues.monthlyCorrection}% a.m.</p>
                </div>
              </div>
            </div>
          ) : null}
          
          {/* Future Sale Preview - A lógica condicional inclui verificação para os diferentes cenários */}
          {formValues.strategies?.includes(PROJECTION_STRATEGY.FUTURE_SALE) && 
            ((formValues.activeScenario === "padrao" && (formValues.futureValuePercentage || formValues.futureValueFixed)) ||
             (formValues.activeScenario === "conservative" && formValues.conservative?.futureSale?.appreciationRate) ||
             (formValues.activeScenario === "conservador" && formValues.conservador?.futureSale?.appreciationRate) ||
             (formValues.activeScenario === "optimistic" && formValues.optimistic?.futureSale?.appreciationRate) ||
             (formValues.activeScenario === "otimista" && formValues.otimista?.futureSale?.appreciationRate)) ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Venda Futura</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Valorização:</p>
                  <p className="text-xs text-slate-700 font-medium">
                    {(formValues.activeScenario === "padrao" && formValues.futureValuePercentage) ? 
                      `${formValues.futureValuePercentage}%` : 
                     (formValues.activeScenario === "padrao" && formValues.futureValueFixed) ?
                      formatValue(formValues.futureValueFixed) :
                     (formValues.activeScenario === "conservative" || formValues.activeScenario === "conservador") ?
                      `${formValues[formValues.activeScenario]?.futureSale?.appreciationRate || "0"}%` :
                     (formValues.activeScenario === "optimistic" || formValues.activeScenario === "otimista") ?
                      `${formValues[formValues.activeScenario]?.futureSale?.appreciationRate || "0"}%` : 
                      "0%"
                    }
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Mês da venda:</p>
                  <p className="text-xs text-slate-700 font-medium">
                    {(formValues.activeScenario === "padrao") ? 
                      `Mês ${formValues.futureValueMonth}` : 
                     (formValues.activeScenario === "conservative" || formValues.activeScenario === "conservador") ?
                      `Mês ${formValues[formValues.activeScenario]?.futureSale?.investmentPeriod || "0"}` :
                     (formValues.activeScenario === "optimistic" || formValues.activeScenario === "otimista") ?
                      `Mês ${formValues[formValues.activeScenario]?.futureSale?.investmentPeriod || "0"}` : 
                      "Não definido"
                    }
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          
          {/* Rental Yield Preview - Com suporte para diferentes cenários */}
          {formValues.strategies?.includes(PROJECTION_STRATEGY.RENTAL_YIELD) && 
            ((formValues.activeScenario === "padrao" && formValues.monthlyRental) ||
             (formValues.activeScenario === "conservative" && formValues.conservative?.rentalYield?.monthlyRent) ||
             (formValues.activeScenario === "conservador" && formValues.conservador?.rentalYield?.monthlyRent) ||
             (formValues.activeScenario === "optimistic" && formValues.optimistic?.rentalYield?.monthlyRent) ||
             (formValues.activeScenario === "otimista" && formValues.otimista?.rentalYield?.monthlyRent)) ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Rentabilidade com Locação</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Aluguel:</p>
                  <p className="text-xs text-slate-700 font-medium">
                    {(formValues.activeScenario === "padrao") ? 
                      `${formatValue(formValues.monthlyRental)}/mês` : 
                     (formValues.activeScenario === "conservative" || formValues.activeScenario === "conservador") ?
                      `${formatValue(formValues[formValues.activeScenario]?.rentalYield?.monthlyRent || "0")}/mês` :
                     (formValues.activeScenario === "optimistic" || formValues.activeScenario === "otimista") ?
                      `${formatValue(formValues[formValues.activeScenario]?.rentalYield?.monthlyRent || "0")}/mês` : 
                      "R$ 0,00/mês"
                    }
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Tipo:</p>
                  <p className="text-xs text-slate-700 font-medium">
                    {formValues.rentalType === "annual" ? "Anual" : "Temporada"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Taxa de Ocupação:</p>
                  <p className="text-xs text-slate-700 font-medium">
                    {(formValues.activeScenario === "padrao") ? 
                      `${formValues.rentalYieldOccupancyRate || "75"}%` : 
                     (formValues.activeScenario === "conservative" || formValues.activeScenario === "conservador") ?
                      `${formValues[formValues.activeScenario]?.rentalYield?.occupancyRate || "75"}%` :
                     (formValues.activeScenario === "optimistic" || formValues.activeScenario === "otimista") ?
                      `${formValues[formValues.activeScenario]?.rentalYield?.occupancyRate || "95"}%` : 
                      "75%"
                    }
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          
          {/* Asset Appreciation Preview - Com suporte para diferentes cenários */}
          {formValues.strategies?.includes(PROJECTION_STRATEGY.ASSET_APPRECIATION) && 
            ((formValues.activeScenario === "padrao" && formValues.appreciationYears) ||
             (formValues.activeScenario === "conservative" && formValues.conservative?.assetAppreciation?.analysisPeriod) ||
             (formValues.activeScenario === "conservador" && formValues.conservador?.assetAppreciation?.analysisPeriod) ||
             (formValues.activeScenario === "optimistic" && formValues.optimistic?.assetAppreciation?.analysisPeriod) ||
             (formValues.activeScenario === "otimista" && formValues.otimista?.assetAppreciation?.analysisPeriod)) ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Patrimônio/Valorização</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Período:</p>
                  <p className="text-xs text-slate-700 font-medium">
                    {(formValues.activeScenario === "padrao") ? 
                      `${formValues.appreciationYears} anos` : 
                     (formValues.activeScenario === "conservative" || formValues.activeScenario === "conservador") ?
                      `${formValues[formValues.activeScenario]?.assetAppreciation?.analysisPeriod || "0"} anos` :
                     (formValues.activeScenario === "optimistic" || formValues.activeScenario === "otimista") ?
                      `${formValues[formValues.activeScenario]?.assetAppreciation?.analysisPeriod || "0"} anos` : 
                      "Não definido"
                    }
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-xs text-slate-500">Valorização anual:</p>
                  <p className="text-xs text-slate-700 font-medium">
                    {(formValues.activeScenario === "padrao") ? 
                      `${formValues.annualAppreciation}% a.a.` : 
                     (formValues.activeScenario === "conservative" || formValues.activeScenario === "conservador") ?
                      `${formValues[formValues.activeScenario]?.assetAppreciation?.annualRate || "0"}% a.a.` :
                     (formValues.activeScenario === "optimistic" || formValues.activeScenario === "otimista") ?
                      `${formValues[formValues.activeScenario]?.assetAppreciation?.annualRate || "0"}% a.a.` : 
                      "0% a.a."
                    }
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          
          {/* Empty State */}
          {!formValues.title && !formValues.clientId && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center text-center">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-slate-400 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-slate-500">A prévia será atualizada conforme você preenche os dados</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
