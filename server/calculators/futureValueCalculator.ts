import { CashFlowItem, CalculationResultFutureSale, Projection } from "@shared/schema";

/**
 * Calcula o valor futuro de um imóvel e o ROI (Retorno sobre Investimento)
 * @param projection Dados da projeção
 */
export function calculateFutureValue(projection: Projection): CalculationResultFutureSale {
  // Obter os dados da projeção
  const listPrice = Number(projection.listPrice) || 0;
  const downPayment = Number(projection.downPayment) || 0;
  
  // Usar valores do cenário ativo (padrão, conservador ou otimista)
  const cenarioAtivo = projection.activeScenario || 'padrao';
  
  // Obter período de investimento baseado no cenário
  let investmentPeriodInMonths = 60; // 5 anos por padrão
  let appreciationRate = 0.10; // 10% por ano por padrão
  let sellingExpenseRate = 0.05; // 5% por padrão
  let incomeTaxRate = 0.15; // 15% por padrão
  let maintenanceCosts = 0; // Custo de manutenção anual por padrão

  // Buscar valores da projeção baseado no cenário ativo
  if (cenarioAtivo === 'padrao') {
    const periodoStr = projection.padraoFutureSaleInvestmentPeriod;
    investmentPeriodInMonths = periodoStr ? parseInt(periodoStr) * 12 : 60;
    appreciationRate = projection.padraoFutureSaleAppreciationRate ? 
      parseFloat(projection.padraoFutureSaleAppreciationRate) / 100 : 0.10;
    sellingExpenseRate = projection.padraoFutureSaleSellingExpenseRate ? 
      parseFloat(projection.padraoFutureSaleSellingExpenseRate) / 100 : 0.05;
    incomeTaxRate = projection.padraoFutureSaleIncomeTaxRate ? 
      parseFloat(projection.padraoFutureSaleIncomeTaxRate) / 100 : 0.15;
    maintenanceCosts = projection.padraoFutureSaleMaintenanceCosts ? 
      parseFloat(projection.padraoFutureSaleMaintenanceCosts) : 0;
  } else if (cenarioAtivo === 'conservador') {
    const periodoStr = projection.conservadorFutureSaleInvestmentPeriod;
    investmentPeriodInMonths = periodoStr ? parseInt(periodoStr) * 12 : 60;
    appreciationRate = projection.conservadorFutureSaleAppreciationRate ? 
      parseFloat(projection.conservadorFutureSaleAppreciationRate) / 100 : 0.07;
    sellingExpenseRate = projection.conservadorFutureSaleSellingExpenseRate ? 
      parseFloat(projection.conservadorFutureSaleSellingExpenseRate) / 100 : 0.06;
    incomeTaxRate = projection.conservadorFutureSaleIncomeTaxRate ? 
      parseFloat(projection.conservadorFutureSaleIncomeTaxRate) / 100 : 0.15;
    maintenanceCosts = projection.conservadorFutureSaleMaintenanceCosts ? 
      parseFloat(projection.conservadorFutureSaleMaintenanceCosts) : 0;
  } else if (cenarioAtivo === 'otimista') {
    const periodoStr = projection.otimistaFutureSaleInvestmentPeriod;
    investmentPeriodInMonths = periodoStr ? parseInt(periodoStr) * 12 : 60;
    appreciationRate = projection.otimistaFutureSaleAppreciationRate ? 
      parseFloat(projection.otimistaFutureSaleAppreciationRate) / 100 : 0.15;
    sellingExpenseRate = projection.otimistaFutureSaleSellingExpenseRate ? 
      parseFloat(projection.otimistaFutureSaleSellingExpenseRate) / 100 : 0.04;
    incomeTaxRate = projection.otimistaFutureSaleIncomeTaxRate ? 
      parseFloat(projection.otimistaFutureSaleIncomeTaxRate) / 100 : 0.15;
    maintenanceCosts = projection.otimistaFutureSaleMaintenanceCosts ? 
      parseFloat(projection.otimistaFutureSaleMaintenanceCosts) : 0;
  }

  // Cálculos
  const investmentYears = investmentPeriodInMonths / 12;
  const monthlyRate = Math.pow(1 + appreciationRate, 1/12) - 1;
  
  // Total de pagamentos durante a construção (do financiamento na planta)
  const totalPayments = downPayment + (projection.calculationResults?.financiamentoPlanta?.resumo?.valorTotal || 0) - downPayment;
  
  // Valor total do investimento (incluindo entrada, parcelas e custos adicionais)
  const totalInvestment = totalPayments + (maintenanceCosts * investmentYears);

  // Valor futuro do imóvel após a valorização no período
  const futureValue = listPrice * Math.pow(1 + appreciationRate, investmentYears);
  
  // Despesas de venda (comissão de corretores, etc.)
  const saleExpenses = futureValue * sellingExpenseRate;
  
  // Lucro bruto (valor futuro - despesas de venda)
  const grossProfit = futureValue - saleExpenses - totalInvestment;
  
  // Imposto de renda sobre o lucro (apenas se for positivo)
  const incomeTax = grossProfit > 0 ? grossProfit * incomeTaxRate : 0;
  
  // Lucro líquido
  const netProfit = grossProfit - incomeTax;
  
  // ROI - Retorno sobre investimento
  const roi = netProfit > 0 ? netProfit / totalInvestment : 0;
  
  // TIR - Taxa Interna de Retorno (simplificada)
  // Para uma TIR mais precisa, precisaríamos de todos os fluxos de caixa mensais
  const irr = Math.pow(1 + (netProfit / totalInvestment), 1/investmentYears) - 1;
  
  // Payback em meses (aproximado)
  let paybackMonths = 0;
  if (netProfit > 0) {
    // Quanto tempo levaria para recuperar o investimento com a valorização mensal
    const monthlyAppreciation = listPrice * monthlyRate;
    paybackMonths = Math.ceil(totalInvestment / monthlyAppreciation);
  }

  return {
    purchasePrice: listPrice,
    totalInvestment,
    futureValue,
    saleExpenses,
    grossProfit,
    incomeTax,
    netProfit,
    roi,
    irr,
    paybackMonths
  };
}

/**
 * Gera o fluxo de caixa para a estratégia de venda futura
 * @param projection Dados da projeção
 */
export function generateFutureSaleCashFlow(projection: Projection): CashFlowItem[] {
  const cashFlow: CashFlowItem[] = [];
  
  // Valor do imóvel e entrada
  const listPrice = Number(projection.listPrice) || 0;
  const downPayment = Number(projection.downPayment) || 0;
  
  // Dados do financiamento
  const parcelas = projection.calculationResults?.financiamentoPlanta?.parcelas || [];
  
  // Adicionar entrada
  cashFlow.push({
    month: 0,
    description: "Entrada",
    amount: -downPayment // Valor negativo pois é uma saída
  });
  
  // Adicionar parcelas do financiamento (apenas valores corrigidos)
  parcelas.forEach(parcela => {
    if (parcela.mes > 0) { // Pular a entrada que já foi adicionada
      cashFlow.push({
        month: parcela.mes,
        description: parcela.tipoPagamento,
        amount: -parcela.valorCorrigido // Valor negativo pois são saídas
      });
    }
  });
  
  // Obter dados do cenário ativo
  const cenarioAtivo = projection.activeScenario || 'padrao';
  
  // Período de investimento baseado no cenário
  let investmentPeriodInMonths = 60; // 5 anos por padrão
  let appreciationRate = 0.10; // 10% por ano por padrão
  let sellingExpenseRate = 0.05; // 5% por padrão
  let incomeTaxRate = 0.15; // 15% por padrão
  
  // Buscar valores da projeção baseado no cenário ativo
  if (cenarioAtivo === 'padrao') {
    const periodoStr = projection.padraoFutureSaleInvestmentPeriod;
    investmentPeriodInMonths = periodoStr ? parseInt(periodoStr) * 12 : 60;
    appreciationRate = projection.padraoFutureSaleAppreciationRate ? 
      parseFloat(projection.padraoFutureSaleAppreciationRate) / 100 : 0.10;
    sellingExpenseRate = projection.padraoFutureSaleSellingExpenseRate ? 
      parseFloat(projection.padraoFutureSaleSellingExpenseRate) / 100 : 0.05;
    incomeTaxRate = projection.padraoFutureSaleIncomeTaxRate ? 
      parseFloat(projection.padraoFutureSaleIncomeTaxRate) / 100 : 0.15;
  } else if (cenarioAtivo === 'conservador') {
    const periodoStr = projection.conservadorFutureSaleInvestmentPeriod;
    investmentPeriodInMonths = periodoStr ? parseInt(periodoStr) * 12 : 60;
    appreciationRate = projection.conservadorFutureSaleAppreciationRate ? 
      parseFloat(projection.conservadorFutureSaleAppreciationRate) / 100 : 0.07;
    sellingExpenseRate = projection.conservadorFutureSaleSellingExpenseRate ? 
      parseFloat(projection.conservadorFutureSaleSellingExpenseRate) / 100 : 0.06;
    incomeTaxRate = projection.conservadorFutureSaleIncomeTaxRate ? 
      parseFloat(projection.conservadorFutureSaleIncomeTaxRate) / 100 : 0.15;
  } else if (cenarioAtivo === 'otimista') {
    const periodoStr = projection.otimistaFutureSaleInvestmentPeriod;
    investmentPeriodInMonths = periodoStr ? parseInt(periodoStr) * 12 : 60;
    appreciationRate = projection.otimistaFutureSaleAppreciationRate ? 
      parseFloat(projection.otimistaFutureSaleAppreciationRate) / 100 : 0.15;
    sellingExpenseRate = projection.otimistaFutureSaleSellingExpenseRate ? 
      parseFloat(projection.otimistaFutureSaleSellingExpenseRate) / 100 : 0.04;
    incomeTaxRate = projection.otimistaFutureSaleIncomeTaxRate ? 
      parseFloat(projection.otimistaFutureSaleIncomeTaxRate) / 100 : 0.15;
  }
  
  // Calcular valor futuro do imóvel
  const monthlyRate = Math.pow(1 + appreciationRate, 1/12) - 1;
  const futureValue = listPrice * Math.pow(1 + monthlyRate, investmentPeriodInMonths);
  
  // Despesas de venda
  const saleExpenses = futureValue * sellingExpenseRate;
  
  // Lucro bruto
  const grossProfit = futureValue - saleExpenses - listPrice;
  
  // Imposto de renda
  const incomeTax = grossProfit > 0 ? grossProfit * incomeTaxRate : 0;
  
  // Valor líquido da venda
  const netSaleValue = futureValue - saleExpenses - incomeTax;
  
  // Adicionar venda do imóvel ao final do período
  cashFlow.push({
    month: investmentPeriodInMonths,
    description: "Venda do Imóvel",
    amount: netSaleValue // Valor positivo pois é uma entrada
  });
  
  return cashFlow;
}