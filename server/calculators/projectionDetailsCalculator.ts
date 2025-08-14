import { Projection, ParcelaFinanciamento, CalculoProjecao, InsertCalculoProjecao } from "@shared/schema";

type Scenario = 'padrao' | 'conservador' | 'otimista';

/**
 * Calcula os valores dos totais de parcelas, reforços e chaves baseado no cenário específico
 * @param projection Projeção atual
 * @param scenario Cenário específico
 */
export function calculatePaymentTotals(projection: Projection, scenario: Scenario = 'padrao') {
  const parcelas = projection.calculationResults?.financiamentoPlanta?.parcelas || [];
  if (parcelas.length === 0) {
    return {
      totalParcelasPagas: 0,
      totalParcelas: 0,
      totalReforcosPagos: 0,
      totalReforcos: 0,
      totalChavesPago: 0,
      totalChaves: 0,
      totalPagamentos: 0,
      mesDaVenda: 0
    };
  }

  // Determinar o mês da venda baseado no cenário
  const mesDaVenda = getInvestmentPeriod(projection, scenario);

  // Acumuladores
  let totalParcelasPagas = 0;
  let totalParcelas = 0;
  let totalReforcosPagos = 0;
  let totalReforcos = 0;
  let totalChavesPago = 0;
  let totalChaves = 0;

  // Calcular totais baseados nas parcelas
  parcelas.forEach(parcela => {
    // Apenas considerar pagamentos até o mês da venda
    if (parcela.mes <= mesDaVenda) {
      if (parcela.tipoPagamento === 'Parcela') {
        totalParcelasPagas += parcela.valorCorrigido;
        totalParcelas += parcela.valorBase;
      }
      else if (parcela.tipoPagamento === 'Reforço') {
        totalReforcosPagos += parcela.valorCorrigido;
        totalReforcos += parcela.valorBase;
      }
      else if (parcela.tipoPagamento === 'Chaves') {
        totalChavesPago += parcela.valorCorrigido;
        totalChaves += parcela.valorBase;
      }
    }
  });

  // Total geral de pagamentos
  const totalPagamentos = totalParcelasPagas + totalReforcosPagos + totalChavesPago;

  return {
    totalParcelasPagas,
    totalParcelas,
    totalReforcosPagos,
    totalReforcos,
    totalChavesPago,
    totalChaves,
    totalPagamentos,
    mesDaVenda
  };
}

/**
 * Determina o período de investimento baseado no cenário
 */
function getInvestmentPeriod(projection: Projection, scenario: Scenario): number {
  // Por padrão usa o período de entrega + 1 mês
  const entregaDefault = Number(projection.deliveryMonths) || 36;
  
  // Baseado no cenário, buscar o período específico
  switch (scenario) {
    case 'padrao':
      const periodoStr = projection.padraoFutureSaleInvestmentPeriod;
      return periodoStr ? parseInt(periodoStr) : entregaDefault + 1;
    
    case 'conservador':
      const periodoConservador = projection.conservadorFutureSaleInvestmentPeriod;
      return periodoConservador ? 
        parseInt(periodoConservador) : 
        Math.round(entregaDefault * 1.3); // 30% mais tempo que o padrão
    
    case 'otimista':
      const periodoOtimista = projection.otimistaFutureSaleInvestmentPeriod;
      return periodoOtimista ? 
        parseInt(periodoOtimista) : 
        Math.max(1, Math.round(entregaDefault * 0.7)); // 30% menos tempo que o padrão
    
    default:
      return entregaDefault + 1;
  }
}

/**
 * Cria registros de cálculo de projeção para todos os cenários
 */
export function createProjectionCalculations(
  projection: Projection
): InsertCalculoProjecao[] {
  const calculosProjecao: InsertCalculoProjecao[] = [];
  
  // Parcelas do financiamento
  const parcelas = projection.calculationResults?.financiamentoPlanta?.parcelas || [];
  if (parcelas.length === 0) return calculosProjecao;

  // Calcular para cada cenário
  const cenarios: Scenario[] = ['padrao', 'conservador', 'otimista'];
  
  cenarios.forEach(cenario => {
    const mesDaVenda = getInvestmentPeriod(projection, cenario);
    
    // Para cada mês até o mês da venda, criar um registro
    for (let mes = 0; mes <= mesDaVenda; mes++) {
      // Encontrar a parcela correspondente
      const parcela = parcelas.find(p => p.mes === mes);
      
      if (parcela) {
        // Criar entrada para o mês atual
        calculosProjecao.push({
          projectionId: projection.id,
          mes: mes,
          scenario: cenario,
          mesDaVenda: mesDaVenda,
          valorEntrada: String(mes === 0 ? parcela.valorBase : 0),
          parcelaBase: String(parcela.tipoPagamento === 'Parcela' ? parcela.valorBase : 0),
          parcelaCorrigida: String(parcela.tipoPagamento === 'Parcela' ? parcela.valorCorrigido : 0),
          reforcoBase: String(parcela.tipoPagamento === 'Reforço' ? parcela.valorBase : 0),
          reforcoCorrigido: String(parcela.tipoPagamento === 'Reforço' ? parcela.valorCorrigido : 0),
          valorChaves: String(parcela.tipoPagamento === 'Chaves' ? parcela.valorBase : 0),
          chavesCorrigido: String(parcela.tipoPagamento === 'Chaves' ? parcela.valorCorrigido : 0),
          pagamentoTotal: String(parcela.valorCorrigido),
          pagamentoTotalLiquido: String(parcela.valorBase),
          saldoLiquido: String(parcela.saldoLiquido),
          saldoDevedorCorrigido: String(parcela.saldoDevedor),
          taxaCorrecao: String(parcela.percentualCorrecao),
          taxaAcumulada: String(parcela.correcaoAcumulada || 1)
        });
      }
    }
  });

  return calculosProjecao;
}

/**
 * Calcula os totais da projeção para todos os cenários
 */
export function calculateProjectionTotals(projection: Projection) {
  const totals = {
    padrao: calculatePaymentTotals(projection, 'padrao'),
    conservador: calculatePaymentTotals(projection, 'conservador'),
    otimista: calculatePaymentTotals(projection, 'otimista')
  };
  
  return totals;
}