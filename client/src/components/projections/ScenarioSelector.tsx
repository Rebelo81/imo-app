import React, { useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LineChart } from "lucide-react";

interface ScenarioSelectorProps {
  form: UseFormReturn<any>;
  isDialog?: boolean;
}

export default function ScenarioSelector({ form, isDialog = false }: ScenarioSelectorProps) {
  const scenarioType = form.watch("scenarioType");
  const selectedScenarios = form.watch("selectedScenarios") || [];

  // Se já tiver um tipo de cenário configurado, ajustar a visualização
  // para corresponder ao estado atual
  useEffect(() => {
    // Se o tipo já estiver como "padrao_selecionado", converter de volta para "padrao" ao editar
    if (scenarioType === "padrao_selecionado" && !isDialog) {
      form.setValue("scenarioType", "padrao");
    } 
    // Se o tipo já estiver como "multiplos_selecionados", converter de volta para "multiplos" ao editar
    else if (scenarioType === "multiplos_selecionados" && !isDialog) {
      form.setValue("scenarioType", "multiplos");
      
      // Garantir que os cenários selecionados anteriormente sejam mantidos
      const currentSelectedScenarios = form.getValues("selectedScenarios") || [];
      if (currentSelectedScenarios.length === 0) {
        // Se não houver cenários selecionados, usar o cenário ativo como padrão
        const activeScenario = form.getValues("activeScenario");
        if (activeScenario) {
          form.setValue("selectedScenarios", [activeScenario]);
        } else {
          // Fallback para realista como cenário padrão
          form.setValue("selectedScenarios", ["realista"]);
        }
      }
    }
  }, []);
  
  // Não renderizar nada em modo não-diálogo se o tipo for final
  // (isso não deve ocorrer após useEffect acima, mas é uma segurança extra)
  if (
    !isDialog && 
    (scenarioType === "padrao_selecionado" ||
    scenarioType === "multiplos_selecionados")
  ) {
    return null;
  }

  // Handlers para selecionar/deselecionar cenários
  const handleToggleConservador = () => {
    const newScenarios = [...selectedScenarios];
    const index = newScenarios.indexOf("conservador");
    
    if (index === -1) {
      newScenarios.push("conservador");
    } else {
      newScenarios.splice(index, 1);
    }
    
    form.setValue("selectedScenarios", newScenarios);
  };
  
  const handleTogglePadrao = () => {
    const newScenarios = [...selectedScenarios];
    const index = newScenarios.indexOf("padrao");
    
    if (index === -1) {
      newScenarios.push("padrao");
    } else {
      newScenarios.splice(index, 1);
    }
    
    form.setValue("selectedScenarios", newScenarios);
  };
  
  const handleToggleOtimista = () => {
    const newScenarios = [...selectedScenarios];
    const index = newScenarios.indexOf("otimista");
    
    if (index === -1) {
      newScenarios.push("otimista");
    } else {
      newScenarios.splice(index, 1);
    }
    
    form.setValue("selectedScenarios", newScenarios);
  };

  // Handlers para os botões de opção
  const selectPadrao = () => {
    form.setValue("scenarioType", "padrao");
    form.setValue("activeScenario", "padrao");
    form.setValue("selectedScenarios", []);
  };
  
  const selectMultiplos = () => {
    form.setValue("scenarioType", "multiplos");
    form.setValue("selectedScenarios", ["padrao"]);
  };

  // Handlers para os botões continuar
  const handlePadraoContinuar = () => {
    form.setValue("scenarioType", "padrao_selecionado");
  };
  
  const handleMultiplosContinuar = () => {
    if (selectedScenarios.length > 0) {
      form.setValue("scenarioType", "multiplos_selecionados");
    } else {
      form.trigger("selectedScenarios");
    }
  };

  return (
    <Card>
      <CardContent>
        <div className="text-gray-700 mb-4">
          <p className="mb-3">
            Os cenários permitem comparar diferentes perspectivas para sua estratégia de investimento:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Valores de venda futura</li>
            <li>Taxas de valorização do imóvel</li>
            <li>Rendimentos de aluguel</li>
          </ul>
        </div>

        <FormField
          control={form.control}
          name="scenarioType"
          render={({ field }) => (
            <FormItem className="space-y-3 mt-4">
              <div className="flex flex-col space-y-4">
                <div 
                  className={`relative overflow-hidden rounded-lg border-2 ${field.value === "padrao" ? 'border-[#434BE6] shadow-md' : 'border-gray-200'} cursor-pointer transition-all hover:border-[#434BE6]/60 hover:shadow-sm`}
                  onClick={selectPadrao}
                >
                  {field.value === "padrao" && (
                    <div className="absolute top-0 right-0 bg-[#434BE6] text-white p-1 px-2 rounded-bl-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  )}
                  <div className={`p-5 ${field.value === "padrao" ? 'bg-[#434BE6]/5' : 'bg-white'}`}>
                    <div className="flex items-center mb-3">
                      <FormControl>
                        <div className="h-5 w-5 rounded-full border-2 border-[#434BE6] relative flex items-center justify-center mr-3">
                          {field.value === "padrao" && (
                            <div className="h-2.5 w-2.5 rounded-full bg-[#434BE6]" />
                          )}
                        </div>
                      </FormControl>
                      <FormLabel className="text-base font-medium cursor-pointer block text-gray-800">
                        Cenário único (Padrão)
                      </FormLabel>
                    </div>
                    <p className="text-sm text-gray-600 pl-8">
                      Utilize o cenário padrão para sua projeção
                    </p>
                  </div>
                </div>
                
                <div 
                  className={`relative overflow-hidden rounded-lg border-2 ${field.value === "multiplos" ? 'border-[#434BE6] shadow-md' : 'border-gray-200'} cursor-pointer transition-all hover:border-[#434BE6]/60 hover:shadow-sm`}
                  onClick={selectMultiplos}
                >
                  {field.value === "multiplos" && (
                    <div className="absolute top-0 right-0 bg-[#434BE6] text-white p-1 px-2 rounded-bl-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  )}
                  <div className={`p-5 ${field.value === "multiplos" ? 'bg-[#434BE6]/5' : 'bg-white'}`}>
                    <div className="flex items-center mb-3">
                      <FormControl>
                        <div className="h-5 w-5 rounded-full border-2 border-[#434BE6] relative flex items-center justify-center mr-3">
                          {field.value === "multiplos" && (
                            <div className="h-2.5 w-2.5 rounded-full bg-[#434BE6]" />
                          )}
                        </div>
                      </FormControl>
                      <FormLabel className="text-base font-medium cursor-pointer block text-gray-800">
                        Múltiplos cenários
                      </FormLabel>
                    </div>
                    <p className="text-sm text-gray-600 pl-8">
                      Compare diferentes perspectivas na mesma projeção
                    </p>
                  </div>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Mostrar seleção de cenários apenas quando tipo for "múltiplos" */}
        {scenarioType === "multiplos" && (
          <div className="mt-4 pt-4 border-t">
            <div>
              <FormLabel className="text-base">Cenários a incluir</FormLabel>
              <FormDescription>
                Selecione quais cenários deseja incluir em sua projeção
              </FormDescription>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                {/* Cenário Conservador */}
                <div className={`flex flex-col rounded-md border ${selectedScenarios.includes("conservador") ? 'border-blue-300 bg-blue-50' : 'border-gray-200'} p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors`}
                  onClick={handleToggleConservador}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="h-4 w-4 rounded border border-gray-300 flex items-center justify-center">
                      {selectedScenarios.includes("conservador") && (
                        <div className="h-2 w-2 rounded-sm bg-blue-600" />
                      )}
                    </div>
                    <span className="font-medium text-blue-800">Conservador</span>
                  </div>
                  <p className="text-xs text-blue-700 pl-7">
                    Parâmetros mais cautelosos para investidores com menor tolerância a riscos
                  </p>
                </div>

                {/* Cenário Padrão */}
                <div className={`flex flex-col rounded-md border ${selectedScenarios.includes("padrao") ? 'border-[#434BE6]/30 bg-[#434BE6]/5' : 'border-gray-200'} p-4 cursor-pointer hover:border-[#434BE6]/30 hover:bg-[#434BE6]/5 transition-colors`}
                  onClick={handleTogglePadrao}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="h-4 w-4 rounded border border-gray-300 flex items-center justify-center">
                      {selectedScenarios.includes("padrao") && (
                        <div className="h-2 w-2 rounded-sm bg-[#434BE6]" />
                      )}
                    </div>
                    <span className="font-medium text-[#434BE6]">Padrão</span>
                  </div>
                  <p className="text-xs text-[#434BE6]/80 pl-7">
                    Parâmetros equilibrados que refletem as projeções de mercado mais prováveis
                  </p>
                </div>

                {/* Cenário Otimista */}
                <div className={`flex flex-col rounded-md border ${selectedScenarios.includes("otimista") ? 'border-green-300 bg-green-50' : 'border-gray-200'} p-4 cursor-pointer hover:border-green-300 hover:bg-green-50/50 transition-colors`}
                  onClick={handleToggleOtimista}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="h-4 w-4 rounded border border-gray-300 flex items-center justify-center">
                      {selectedScenarios.includes("otimista") && (
                        <div className="h-2 w-2 rounded-sm bg-green-600" />
                      )}
                    </div>
                    <span className="font-medium text-green-800">Otimista</span>
                  </div>
                  <p className="text-xs text-green-700 pl-7">
                    Parâmetros mais favoráveis para cenários com alta valorização de mercado
                  </p>
                </div>
              </div>

              <div className="h-0 mt-2">
                <FormField
                  control={form.control}
                  name="selectedScenarios"
                  render={() => <FormMessage />}
                />
              </div>
            </div>
          </div>
        )}


      </CardContent>
    </Card>
  );
}