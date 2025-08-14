/**
 * Utilitário para cálculo de lucro líquido e ROI com consideração dos custos de manutenção
 */

import { Projection, CalculoProjecao } from "@shared/schema";
import { calcularVendaProjetada, calcularDetalhamentoTotalPago, calcularSaldoDevedor } from "./financial";
import { calcularDespesasVenda } from "./expense-calculator";

/**
 * Calcula o lucro líquido considerando todos os componentes de despesas,
 * incluindo os custos de manutenção
 */
export function calcularLucroLiquido(
  projection: Projection,
  calculosProjecao: CalculoProjecao[],
  scenario: string
) {
  // Usar o valor da venda projetada calculado pela função calcularVendaProjetada
  const resultadoVendaProjetada = calcularVendaProjetada(
    projection,
    scenario
  );
  
  // Obter os valores para o cálculo do Lucro Bruto
  const valorVendaProjetada = resultadoVendaProjetada.valorVendaProjetada;
  
  // Calcular o total pago (como valor negativo)
  const detalhamentoTotalPago = calcularDetalhamentoTotalPago(
    projection,
    calculosProjecao,
    scenario
  );
  const totalPago = -detalhamentoTotalPago.total;
  
  // Obter ou calcular o saldo devedor
  const calculosParaUsar = calculosProjecao && calculosProjecao.length > 0 
    ? calculosProjecao 
    : projection.calculationResults?.calculosProjecao || [];
    
  const saldoDevedorResult = calcularSaldoDevedor(
    projection,
    calculosParaUsar,
    scenario
  );
  const saldoDevedor = -saldoDevedorResult.saldoDevedorCorrigido;
  
  // Calcular as despesas de venda (como valor negativo)
  // Usar a função calcularDespesasVenda para obter todos os componentes de despesa
  const despesasResult = calcularDespesasVenda(
    projection,
    valorVendaProjetada,
    scenario
  );
  
  const comissaoVenda = despesasResult.comissaoVenda;
  const custosAdicionais = despesasResult.custosAdicionais;
  const outrosCustos = despesasResult.outrosCustos;
  const despesasVenda = -(comissaoVenda + custosAdicionais + outrosCustos);
  
  console.log("Despesas de venda para o cálculo do lucro líquido:", {
    comissaoVenda,
    custosAdicionais,
    outrosCustos,
    total: comissaoVenda + custosAdicionais + outrosCustos
  });
  
  // Calcular o lucro bruto: Venda Projetada + Total Pago + Saldo Devedor + Despesas de Vendas
  const lucroBruto = valorVendaProjetada + totalPago + saldoDevedor + despesasVenda;
  
  // Calcular o imposto de renda (valor negativo se lucro bruto for positivo)
  let impostoRenda = 0;
  if (lucroBruto > 0) {
    // Obter a taxa de imposto de acordo com o cenário
    // Valor fixo de 15% para todos os cenários (pode ser alterado no futuro)
    const taxaImposto = 0.15;
    
    // Calcular o imposto como um valor negativo
    impostoRenda = -(lucroBruto * taxaImposto);
  }
  
  // Calcular o lucro líquido: Lucro Bruto + Imposto de Renda (já é negativo)
  const lucroLiquido = lucroBruto + impostoRenda;
  
  console.log("Cálculo do Lucro Líquido:", {
    lucroBruto,
    impostoRenda,
    lucroLiquido
  });
  
  return {
    valorVendaProjetada,
    totalPago: Math.abs(totalPago), // Valor positivo para exibição
    saldoDevedor: Math.abs(saldoDevedor), // Valor positivo para exibição
    despesasVenda: Math.abs(despesasVenda), // Valor positivo para exibição
    comissaoVenda,
    custosAdicionais,
    outrosCustos,
    lucroBruto,
    impostoRenda: Math.abs(impostoRenda), // Valor positivo para exibição
    lucroLiquido
  };
}

/**
 * Calcula o ROI (Return on Investment) considerando todos os custos,
 * incluindo os custos de manutenção
 */
export function calcularROI(
  projection: Projection,
  calculosProjecao: CalculoProjecao[],
  scenario: string
) {
  // Usar a função calcularLucroLiquido para obter o lucro líquido
  const resultadoLucro = calcularLucroLiquido(
    projection,
    calculosProjecao,
    scenario
  );
  
  // Obter o lucro líquido e o total pago
  const lucroLiquido = resultadoLucro.lucroLiquido;
  const totalPago = resultadoLucro.totalPago;
  
  // Calcular o ROI como valor decimal primeiro
  const roiDecimal = totalPago > 0 ? (lucroLiquido / totalPago) : 0;
  
  // Convertendo para percentual multiplicando por 100 para exibição no console
  const roiPercentage = roiDecimal * 100;
  
  console.log("Cálculo do ROI:", {
    lucroLiquido,
    totalPago,
    roiDecimal,
    roiPercentage
  });
  
  return {
    roiDecimal,
    roiPercentage
  };
}