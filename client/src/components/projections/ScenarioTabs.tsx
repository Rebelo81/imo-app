import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

interface ScenarioTabsProps {
  children: React.ReactNode;
  form: UseFormReturn<any>;
  defaultScenario?: string;
  className?: string;
}

// Mapeamento de valores internos para rótulos exibidos
const scenarioLabels = {
  conservative: "Conservador",
  padrao: "Padrão",
  optimistic: "Otimista"
};

// Mapeamento de cenários selecionados pelo usuário para valores internos
const scenarioMapping = {
  conservador: "conservador", // Mantendo em português para consistência
  padrao: "padrao",
  otimista: "otimista" // Mantendo em português para consistência
};

export function ScenarioTabs({ 
  children, 
  form, 
  defaultScenario = "padrao", 
  className 
}: ScenarioTabsProps) {
  // Obter o tipo de cenário e os cenários selecionados
  const scenarioType = form.watch("scenarioType");
  const selectedScenarios = form.watch("selectedScenarios") || [];
  
  // Estado para controlar qual cenário está selecionado
  const [activeScenario, setActiveScenario] = React.useState(
    form.getValues("activeScenario") || defaultScenario
  );

  // Atualizar o formulário quando o cenário mudar
  const handleScenarioChange = (value: string) => {
    console.log("ScenarioTabs: Mudando para cenário", value);
    setActiveScenario(value);
    form.setValue("activeScenario", value);
  };

  // Determinar quais cenários mostrar
  const getAvailableScenarios = () => {
    // Caso padrão (único cenário) - mostrar apenas o padrão
    if (scenarioType === "padrao" || scenarioType === "padrao_selecionado") {
      return ["padrao"];
    }
    
    // Caso múltiplos cenários - mostrar os selecionados pelo usuário
    if (scenarioType === "multiplos" || scenarioType === "multiplos_selecionados") {
      // Converter os nomes em português para os valores internos em inglês
      return selectedScenarios.map((scenario: string) => {
        return scenarioMapping[scenario as keyof typeof scenarioMapping] || "padrao";
      });
    }
    
    // Caso padrão, mostrar todos
    return ["conservador", "padrao", "otimista"];
  };

  // Obter os cenários disponíveis
  const availableScenarios = getAvailableScenarios();
  
  // Verificar se o cenário ativo está entre os disponíveis
  React.useEffect(() => {
    if (availableScenarios.length > 0 && !availableScenarios.includes(activeScenario)) {
      setActiveScenario(availableScenarios[0]);
      form.setValue("activeScenario", availableScenarios[0]);
    }
  }, [availableScenarios, activeScenario, form]);

  return (
    <Tabs 
      value={activeScenario} 
      onValueChange={handleScenarioChange}
      className={cn("w-full", className)}
    >
      <TabsList className={cn(`grid mb-4 w-full`, {
        'grid-cols-1': availableScenarios.length === 1,
        'grid-cols-2': availableScenarios.length === 2,
        'grid-cols-3': availableScenarios.length === 3
      })}>
        {availableScenarios.includes("conservador") && (
          <TabsTrigger 
            value="conservador" 
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 flex items-center gap-2"
          >
            Conservador
          </TabsTrigger>
        )}
        
        {availableScenarios.includes("padrao") && (
          <TabsTrigger 
            value="padrao" 
            className="data-[state=active]:bg-[#434BE6]/15 data-[state=active]:text-[#434BE6] flex items-center gap-2"
          >
            Padrão
          </TabsTrigger>
        )}
        
        {availableScenarios.includes("otimista") && (
          <TabsTrigger 
            value="otimista" 
            className="data-[state=active]:bg-green-100 data-[state=active]:text-green-800 flex items-center gap-2"
          >
            Otimista
          </TabsTrigger>
        )}
      </TabsList>

      {availableScenarios.includes("conservador") && (
        <TabsContent value="conservador">
          {children}
        </TabsContent>
      )}
      
      {availableScenarios.includes("padrao") && (
        <TabsContent value="padrao">
          {children}
        </TabsContent>
      )}
      
      {availableScenarios.includes("otimista") && (
        <TabsContent value="otimista">
          {children}
        </TabsContent>
      )}
    </Tabs>
  );
}