import { CalculationResultRentalYield, YearlyDataItem, Projection } from "@shared/schema";

/**
 * Calcula o retorno sobre aluguel para o imóvel
 * @param projection Dados da projeção
 */
export function calculateRentalYield(projection: Projection): CalculationResultRentalYield {
  // Obter os dados da projeção
  const listPrice = Number(projection.listPrice) || 0;
  const furnishingCosts = Number(projection.furnishingCosts) || 0;
  
  // Usar valores do cenário ativo (padrão, conservador ou otimista)
  const cenarioAtivo = projection.activeScenario || 'padrao';
  
  // Valores padrão
  let monthlyRental = 0; // Valor do aluguel mensal
  let occupancyRate = 0.95; // Taxa de ocupação (95% por padrão)
  let managementFee = 0.08; // Taxa de administração (8% por padrão)
  let maintenanceCosts = 0; // Custo de manutenção anual por padrão
  
  // Buscar valores da projeção baseado no cenário ativo
  if (cenarioAtivo === 'padrao') {
    monthlyRental = projection.padrao_aluguel_valor_mensal ? 
      parseFloat(projection.padrao_aluguel_valor_mensal) : (listPrice * 0.005); // 0.5% do valor por padrão
    occupancyRate = projection.padrao_aluguel_ocupacao ? 
      parseFloat(projection.padrao_aluguel_ocupacao) / 100 : 0.95;
    managementFee = projection.padrao_aluguel_taxa_administracao ? 
      parseFloat(projection.padrao_aluguel_taxa_administracao) / 100 : 0.08;
    maintenanceCosts = projection.padrao_aluguel_manutencao ? 
      parseFloat(projection.padrao_aluguel_manutencao) / 100 : 0;
  } else if (cenarioAtivo === 'conservador') {
    monthlyRental = projection.conservador_aluguel_valor_mensal ? 
      parseFloat(projection.conservador_aluguel_valor_mensal) : (listPrice * 0.004); // 0.4% do valor por padrão
    occupancyRate = projection.conservador_aluguel_ocupacao ? 
      parseFloat(projection.conservador_aluguel_ocupacao) / 100 : 0.90;
    managementFee = projection.conservador_aluguel_taxa_administracao ? 
      parseFloat(projection.conservador_aluguel_taxa_administracao) / 100 : 0.08;
    maintenanceCosts = projection.conservador_aluguel_manutencao ? 
      parseFloat(projection.conservador_aluguel_manutencao) / 100 : 0;
  } else if (cenarioAtivo === 'otimista') {
    monthlyRental = projection.otimista_aluguel_valor_mensal ? 
      parseFloat(projection.otimista_aluguel_valor_mensal) : (listPrice * 0.006); // 0.6% do valor por padrão
    occupancyRate = projection.otimista_aluguel_ocupacao ? 
      parseFloat(projection.otimista_aluguel_ocupacao) / 100 : 0.98;
    managementFee = projection.otimista_aluguel_taxa_administracao ? 
      parseFloat(projection.otimista_aluguel_taxa_administracao) / 100 : 0.07;
    maintenanceCosts = projection.otimista_aluguel_manutencao ? 
      parseFloat(projection.otimista_aluguel_manutencao) / 100 : 0;
  }

  // Investimento inicial (valor do imóvel + mobília)
  const initialInvestment = listPrice + furnishingCosts;
  
  // Receita anual bruta (aluguel mensal * 12 meses * taxa de ocupação)
  const annualGrossIncome = monthlyRental * 12 * occupancyRate;
  
  // Despesas anuais (taxa de administração + manutenção)
  const annualExpenses = (annualGrossIncome * managementFee) + maintenanceCosts;
  
  // Receita anual líquida
  const annualNetIncome = annualGrossIncome - annualExpenses;
  
  // Percentual de retorno anual (Yield)
  const annualYieldPercentage = annualNetIncome / initialInvestment * 100;
  
  // Cálculo de rendimento mensal líquido
  // Rendimento mensal líquido = (aluguel valor mensal * taxa de ocupação) - (aluguel valor mensal * Taxa de administração) - (aluguel valor mensal * Manutenção Mensal)
  const monthlyGrossIncome = monthlyRental * occupancyRate;
  const monthlyManagementExpense = monthlyGrossIncome * managementFee;
  const monthlyMaintenanceExpense = monthlyRental * (maintenanceCosts / 100); // Manutenção como percentual do aluguel
  const monthlyNetIncome = monthlyGrossIncome - monthlyManagementExpense - monthlyMaintenanceExpense;

  return {
    initialInvestment,
    furnishingCosts,
    totalReturnPercentage: annualYieldPercentage,
    monthlyNetIncome,
    annualNetIncome
  };
}

/**
 * Gera dados anuais para a visualização da rentabilidade com aluguel
 * @param projection Dados da projeção
 * @param deliveryMonths Número de meses até a entrega do imóvel
 * @param selectedTimeframe Período selecionado (5, 10 ou 15 anos)
 */
export function generateRentalYieldYearlyData(
  projection: Projection,
  deliveryMonths: number = 36,
  selectedTimeframe: number = 5
): YearlyDataItem[] {
  const yearlyData: YearlyDataItem[] = [];
  
  // Obter os dados da projeção
  const listPrice = Number(projection.listPrice) || 0;
  const furnishingCosts = Number(projection.furnishingCosts) || 0;
  const condoFees = Number(projection.condoFees) || 0;
  const propertyTax = Number(projection.propertyTax) || 0;
  
  // Usar valores do cenário ativo (padrão, conservador ou otimista)
  const cenarioAtivo = projection.activeScenario || 'padrao';
  
  // Valores padrão
  let monthlyRental = 0; // Valor do aluguel mensal
  let occupancyRate = 0.95; // Taxa de ocupação (95% por padrão)
  let managementFee = 0.08; // Taxa de administração (8% por padrão)
  let maintenanceCosts = 0; // Custo de manutenção anual por padrão
  let annualRentalIncrease = 0.05; // Reajuste anual do aluguel (5% por padrão)
  
  // Buscar valores da projeção baseado no cenário ativo
  if (cenarioAtivo === 'padrao') {
    monthlyRental = projection.padrao_aluguel_valor_mensal ? 
      parseFloat(projection.padrao_aluguel_valor_mensal) : (listPrice * 0.005); // 0.5% do valor por padrão
    occupancyRate = projection.padrao_aluguel_ocupacao ? 
      parseFloat(projection.padrao_aluguel_ocupacao) / 100 : 0.95;
    managementFee = projection.padrao_aluguel_taxa_administracao ? 
      parseFloat(projection.padrao_aluguel_taxa_administracao) / 100 : 0.08;
    maintenanceCosts = projection.padrao_aluguel_manutencao ? 
      parseFloat(projection.padrao_aluguel_manutencao) / 100 : 0;
    annualRentalIncrease = projection.padrao_aluguel_reajuste_anual ? 
      parseFloat(projection.padrao_aluguel_reajuste_anual) / 100 : 0.05;
  } else if (cenarioAtivo === 'conservador') {
    monthlyRental = projection.conservador_aluguel_valor_mensal ? 
      parseFloat(projection.conservador_aluguel_valor_mensal) : (listPrice * 0.004); // 0.4% do valor por padrão
    occupancyRate = projection.conservador_aluguel_ocupacao ? 
      parseFloat(projection.conservador_aluguel_ocupacao) / 100 : 0.90;
    managementFee = projection.conservador_aluguel_taxa_administracao ? 
      parseFloat(projection.conservador_aluguel_taxa_administracao) / 100 : 0.08;
    maintenanceCosts = projection.conservador_aluguel_manutencao ? 
      parseFloat(projection.conservador_aluguel_manutencao) / 100 : 0;
    annualRentalIncrease = projection.conservador_aluguel_reajuste_anual ? 
      parseFloat(projection.conservador_aluguel_reajuste_anual) / 100 : 0.04;
  } else if (cenarioAtivo === 'otimista') {
    monthlyRental = projection.otimista_aluguel_valor_mensal ? 
      parseFloat(projection.otimista_aluguel_valor_mensal) : (listPrice * 0.006); // 0.6% do valor por padrão
    occupancyRate = projection.otimista_aluguel_ocupacao ? 
      parseFloat(projection.otimista_aluguel_ocupacao) / 100 : 0.98;
    managementFee = projection.otimista_aluguel_taxa_administracao ? 
      parseFloat(projection.otimista_aluguel_taxa_administracao) / 100 : 0.07;
    maintenanceCosts = projection.otimista_aluguel_manutencao ? 
      parseFloat(projection.otimista_aluguel_manutencao) / 100 : 0;
    annualRentalIncrease = projection.otimista_aluguel_reajuste_anual ? 
      parseFloat(projection.otimista_aluguel_reajuste_anual) / 100 : 0.06;
  }

  // Investimento inicial (valor do imóvel + mobília)
  const initialInvestment = listPrice + furnishingCosts;
  
  // Prazo de entrega em anos (arredondado para cima)
  const deliveryYears = Math.ceil(deliveryMonths / 12);
  
  // Gerar dados para cada ano até o timeframe selecionado
  let currentRental = monthlyRental;
  
  for (let year = 1; year <= selectedTimeframe; year++) {
    if (year <= deliveryYears) {
      // Durante o período de construção não há renda de aluguel
      yearlyData.push({
        year,
        rentalIncome: 0,
        expenses: 0,
        netIncome: 0,
        yieldRate: 0
      });
    } else {
      // Após a entrega, inicia-se a renda de aluguel
      // Reajuste anual do aluguel
      if (year > deliveryYears + 1) {
        currentRental *= (1 + annualRentalIncrease);
      }
      
      // Receita anual bruta (aluguel mensal * 12 meses * taxa de ocupação)
      const annualGrossIncome = currentRental * 12 * occupancyRate;
      
      // Despesas anuais (taxa de administração + manutenção + condomínio + IPTU)
      const managementExpense = annualGrossIncome * managementFee;
      const annualExpenses = managementExpense + maintenanceCosts + (condoFees * 12) + propertyTax;
      
      // Receita anual líquida
      const annualNetIncome = annualGrossIncome - annualExpenses;
      
      // Percentual de retorno anual (Yield)
      const annualYieldPercentage = annualNetIncome / initialInvestment;
      
      yearlyData.push({
        year,
        rentalIncome: annualGrossIncome,
        expenses: annualExpenses,
        netIncome: annualNetIncome,
        yieldRate: annualYieldPercentage
      });
    }
  }
  
  return yearlyData;
}

/**
 * Calcula a média da renda mensal líquida (após entrega do imóvel)
 * @param yearlyData Dados anuais do rendimento de aluguel
 */
export function calculateAverageMonthlyIncome(yearlyData: YearlyDataItem[] | undefined): number {
  if (!yearlyData || yearlyData.length === 0) return 0;
  
  // Filtra apenas os anos com renda positiva (após entrega)
  const yearsWithIncome = yearlyData.filter(item => (item.netIncome || 0) > 0);
  if (yearsWithIncome.length === 0) return 0;
  
  // Calcula a média da renda líquida
  const totalNetIncome = yearsWithIncome.reduce((sum, item) => sum + (item.netIncome || 0), 0);
  const averageAnnualIncome = totalNetIncome / yearsWithIncome.length;
  
  // Converte para renda mensal
  return averageAnnualIncome / 12;
}