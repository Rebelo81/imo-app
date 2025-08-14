import { CalculationResultAssetAppreciation, YearlyDataItem, Projection } from "@shared/schema";

/**
 * Calcula a valorização patrimonial do imóvel ao longo do tempo
 * @param projection Dados da projeção
 */
export function calculateAssetAppreciation(projection: Projection): CalculationResultAssetAppreciation {
  // Obter os dados da projeção
  const listPrice = Number(projection.listPrice) || 0;
  
  // Usar valores do cenário ativo (padrão, conservador ou otimista)
  const cenarioAtivo = projection.activeScenario || 'padrao';
  
  // Valores padrão
  let appreciationPeriod = 5; // 5 anos por padrão
  let annualAppreciationRate = 0.10; // 10% por ano por padrão
  let annualMaintenanceCosts = 0; // Custo de manutenção anual por padrão
  
  // Buscar valores da projeção baseado no cenário ativo
  if (cenarioAtivo === 'padrao') {
    const periodoStr = projection.padraoAssetAppreciationAnalysisPeriod;
    appreciationPeriod = periodoStr ? parseInt(periodoStr) : 5;
    
    // Obter taxa de valorização da coluna específica
    if (projection.padrao_valorizacao_taxa_anual) {
      annualAppreciationRate = parseFloat(projection.padrao_valorizacao_taxa_anual) / 100;
      console.log('Taxa anual padrão:', annualAppreciationRate);
    } else if (projection.padrao_venda_valorizacao) {
      // Fallback para o campo de valorização da venda se o específico não estiver presente
      annualAppreciationRate = parseFloat(projection.padrao_venda_valorizacao) / 100;
      console.log('Taxa anual padrão (fallback):', annualAppreciationRate);
    } else {
      console.error('Taxa de valorização do cenário padrão não encontrada');
      annualAppreciationRate = 0.20; // Valor padrão se não houver valor
    }
    
    annualMaintenanceCosts = projection.padraoAssetAppreciationMaintenanceCosts ? 
      parseFloat(projection.padraoAssetAppreciationMaintenanceCosts) : 0;
  } else if (cenarioAtivo === 'conservador') {
    const periodoStr = projection.conservadorAssetAppreciationAnalysisPeriod;
    appreciationPeriod = periodoStr ? parseInt(periodoStr) : 5;
    
    // Obter taxa de valorização da coluna específica
    if (projection.conservador_valorizacao_taxa_anual) {
      annualAppreciationRate = parseFloat(projection.conservador_valorizacao_taxa_anual) / 100;
      console.log('Taxa anual conservadora:', annualAppreciationRate);
    } else if (projection.conservador_venda_valorizacao) {
      // Fallback para o campo de valorização da venda se o específico não estiver presente
      annualAppreciationRate = parseFloat(projection.conservador_venda_valorizacao) / 100;
      console.log('Taxa anual conservadora (fallback):', annualAppreciationRate);
    } else {
      console.error('Taxa de valorização do cenário conservador não encontrada');
      annualAppreciationRate = 0.15; // Valor padrão conservador se não houver valor
    }
    
    annualMaintenanceCosts = projection.conservadorAssetAppreciationMaintenanceCosts ? 
      parseFloat(projection.conservadorAssetAppreciationMaintenanceCosts) : 0;
  } else if (cenarioAtivo === 'otimista') {
    const periodoStr = projection.otimistaAssetAppreciationAnalysisPeriod;
    appreciationPeriod = periodoStr ? parseInt(periodoStr) : 5;
    
    // Obter taxa de valorização da coluna específica 
    if (projection.otimista_valorizacao_taxa_anual) {
      annualAppreciationRate = parseFloat(projection.otimista_valorizacao_taxa_anual) / 100;
      console.log('Taxa anual otimista:', annualAppreciationRate);
    } else if (projection.otimista_venda_valorizacao) {
      // Fallback para o campo de valorização da venda se o específico não estiver presente
      annualAppreciationRate = parseFloat(projection.otimista_venda_valorizacao) / 100;
      console.log('Taxa anual otimista (fallback):', annualAppreciationRate);
    } else {
      console.error('Taxa de valorização do cenário otimista não encontrada');
      annualAppreciationRate = 0.25; // Valor padrão otimista se não houver valor
    }
    
    annualMaintenanceCosts = projection.otimistaAssetAppreciationMaintenanceCosts ? 
      parseFloat(projection.otimistaAssetAppreciationMaintenanceCosts) : 0;
  }

  // Calcular a valorização total usando a fórmula de valorização composta correta
  // Valor atual = Valor anterior + (Valor anterior * Taxa)
  let finalValue = listPrice;
  for (let year = 1; year <= appreciationPeriod; year++) {
    finalValue = finalValue + (finalValue * annualAppreciationRate);
  }
  
  // Total de custos de manutenção ao longo do período
  const totalMaintenance = annualMaintenanceCosts * appreciationPeriod;
  
  // Percentual de valorização total
  const appreciationPercentage = (finalValue - listPrice) / listPrice;

  return {
    initialValue: listPrice,
    totalMaintenance,
    finalValue,
    appreciationPercentage
  };
}

/**
 * Gera dados anuais para a visualização da valorização patrimonial
 * @param projection Dados da projeção
 * @param selectedTimeframe Período selecionado (5, 10 ou 15 anos)
 */
export function generateAssetAppreciationYearlyData(
  projection: Projection, 
  selectedTimeframe: number = 5
): YearlyDataItem[] {
  const yearlyData: YearlyDataItem[] = [];
  
  // Obter os dados da projeção
  const listPrice = Number(projection.listPrice) || 0;
  
  // Usar valores do cenário ativo (padrão, conservador ou otimista)
  const cenarioAtivo = projection.activeScenario || 'padrao';
  
  // Valores padrão
  let annualAppreciationRate = 0.10; // 10% por ano por padrão
  let annualMaintenanceCosts = 0; // Custo de manutenção anual por padrão
  let annualTaxes = 0; // Impostos anuais (IPTU, etc)
  
  // Buscar valores da projeção baseado no cenário ativo
  if (cenarioAtivo === 'padrao') {
    // Obter taxa de valorização da coluna específica
    if (projection.padrao_valorizacao_taxa_anual) {
      annualAppreciationRate = parseFloat(projection.padrao_valorizacao_taxa_anual) / 100;
      console.log('Taxa anual padrão (gerador de dados):', annualAppreciationRate);
    } else if (projection.padrao_venda_valorizacao) {
      // Fallback para o campo de valorização da venda se o específico não estiver presente
      annualAppreciationRate = parseFloat(projection.padrao_venda_valorizacao) / 100;
      console.log('Taxa anual padrão fallback (gerador de dados):', annualAppreciationRate);
    } else {
      console.error('Taxa de valorização do cenário padrão não encontrada');
      annualAppreciationRate = 0.20; // Valor padrão
    }
    
    annualMaintenanceCosts = projection.padraoAssetAppreciationMaintenanceCosts ? 
      parseFloat(projection.padraoAssetAppreciationMaintenanceCosts) : 0;
    annualTaxes = projection.padraoAssetAppreciationAnnualTaxes ? 
      parseFloat(projection.padraoAssetAppreciationAnnualTaxes) : 0;
  } else if (cenarioAtivo === 'conservador') {
    // Obter taxa de valorização da coluna específica
    if (projection.conservador_valorizacao_taxa_anual) {
      annualAppreciationRate = parseFloat(projection.conservador_valorizacao_taxa_anual) / 100;
      console.log('Taxa anual conservadora (gerador de dados):', annualAppreciationRate);
    } else if (projection.conservador_venda_valorizacao) {
      // Fallback para o campo de valorização da venda se o específico não estiver presente
      annualAppreciationRate = parseFloat(projection.conservador_venda_valorizacao) / 100;
      console.log('Taxa anual conservadora fallback (gerador de dados):', annualAppreciationRate);
    } else {
      console.error('Taxa de valorização do cenário conservador não encontrada');
      annualAppreciationRate = 0.15; // Valor padrão
    }
    
    annualMaintenanceCosts = projection.conservadorAssetAppreciationMaintenanceCosts ? 
      parseFloat(projection.conservadorAssetAppreciationMaintenanceCosts) : 0;
    annualTaxes = projection.conservadorAssetAppreciationAnnualTaxes ? 
      parseFloat(projection.conservadorAssetAppreciationAnnualTaxes) : 0;
  } else if (cenarioAtivo === 'otimista') {
    // Obter taxa de valorização da coluna específica
    if (projection.otimista_valorizacao_taxa_anual) {
      annualAppreciationRate = parseFloat(projection.otimista_valorizacao_taxa_anual) / 100;
      console.log('Taxa anual otimista (gerador de dados):', annualAppreciationRate);
    } else if (projection.otimista_venda_valorizacao) {
      // Fallback para o campo de valorização da venda se o específico não estiver presente
      annualAppreciationRate = parseFloat(projection.otimista_venda_valorizacao) / 100;
      console.log('Taxa anual otimista fallback (gerador de dados):', annualAppreciationRate);
    } else {
      console.error('Taxa de valorização do cenário otimista não encontrada');
      annualAppreciationRate = 0.25; // Valor padrão
    }
    
    annualMaintenanceCosts = projection.otimistaAssetAppreciationMaintenanceCosts ? 
      parseFloat(projection.otimistaAssetAppreciationMaintenanceCosts) : 0;
    annualTaxes = projection.otimistaAssetAppreciationAnnualTaxes ? 
      parseFloat(projection.otimistaAssetAppreciationAnnualTaxes) : 0;
  }

  // Prazo de entrega em anos (arredondado para cima)
  const deliveryMonths = Number(projection.deliveryMonths) || 36;
  const deliveryYears = Math.ceil(deliveryMonths / 12);
  
  // Gerar dados para cada ano até o timeframe selecionado
  let currentValue = listPrice;
  for (let year = 1; year <= selectedTimeframe; year++) {
    // No período de construção, o valor do imóvel cresce com a construção (não com a valorização)
    // Após a entrega, aplicamos a taxa de valorização anual
    if (year <= deliveryYears) {
      // Durante a construção, o valor cresce linearmente até o valor total
      currentValue = listPrice * (year / deliveryYears);
      
      yearlyData.push({
        year,
        propertyValue: currentValue,
        appreciation: currentValue - (year > 1 ? yearlyData[year - 2].propertyValue : 0),
        netValue: currentValue - (annualMaintenanceCosts + annualTaxes)
      });
    } else {
      // Após a entrega, aplicamos a valorização anual usando a fórmula correta
      // Valor atual = Valor anterior + (Valor anterior * Taxa)
      const appreciation = currentValue * annualAppreciationRate; 
      currentValue = currentValue + appreciation;
      
      yearlyData.push({
        year,
        propertyValue: currentValue,
        appreciation: appreciation, // Agora appreciation é o valor da valorização no ano, não a diferença
        netValue: currentValue - (annualMaintenanceCosts + annualTaxes) * (year - deliveryYears + 1)
      });
    }
  }
  
  return yearlyData;
}